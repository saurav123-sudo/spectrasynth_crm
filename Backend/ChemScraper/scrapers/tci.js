/**
 * TCI Chemicals scraper (tcichemicals.com)
 *
 * Confirmed working approach (from debug):
 *  1. Navigate to TCI India homepage
 *  2. Type query into search box (#js-site-search-input) and press Enter
 *  3. Wait for search results to load
 *  4. Click the first product link
 *  5. Extract product name (h1), CAS from page title or table, prices from table rows with ₹
 *
 * Price row format confirmed: "25G | ₹1,800.00 | 1 | ≥100"
 *   → cells[0] = packSize, cells[1] = price (contains ₹)
 */

const { newPage, delay, gotoWithRetry } = require('../browser');

const BASE = 'https://www.tcichemicals.com/IN/en';

const CAS_REGEX = /^[\d]{2,7}-[\d]{2}-[\d]$/;

async function scrapeTCI(query) {
  const result = {
    company: 'www.tcichemicals.com',
    sourceUrl: '',
    productName: 'Not Found',
    casNo: 'Not Found',
    hsnCode: 'Not Found',
    pricingOptions: [],
    error: null,
  };

  const page = await newPage();
  const isCAS = CAS_REGEX.test(query.trim());

  try {
    // ── Step 1: Load TCI India homepage ──────────────────────────────────
    await gotoWithRetry(page, BASE);
    await delay(1500);

    // ── Step 2: Type query in the search box and submit ───────────────────
    // Confirmed input id: #js-site-search-input
    await page.waitForSelector('#js-site-search-input', { timeout: 10000 });
    await page.click('#js-site-search-input');
    await page.type('#js-site-search-input', query, { delay: 80 });
    await page.keyboard.press('Enter');

    // ── Step 3: Wait for search results page to load ──────────────────────
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 });
    await delay(2500);

    const pageTitle = await page.title();
    const isNoResults =
      pageTitle.toLowerCase().includes('no result') ||
      pageTitle.toLowerCase().includes('not found');

    if (isNoResults) {
      result.error = `Product not found on TCI India for query: "${query}"`;
      return result;
    }

    // ── Step 4: Find and click the first product link ─────────────────────
    const productHref = await page.evaluate(() => {
      // TCI search results — product links are in the main content
      const selectors = [
        'main a[href*="/IN/en/p/"]',
        '[class*="product"] a[href*="/p/"]',
        '.product-listing a[href*="/p/"]',
        'a[href*="/IN/en/p/"]',
      ];
      for (const sel of selectors) {
        const link = document.querySelector(sel);
        if (link) return link.getAttribute('href');
      }
      return null;
    });

    if (!productHref) {
      result.error = 'Could not find any product link in search results';
      return result;
    }

    // Build absolute URL if needed
    const productUrl = productHref.startsWith('http')
      ? productHref
      : `https://www.tcichemicals.com${productHref}`;

    result.sourceUrl = productUrl;

    // ── Step 5: Navigate to product page ─────────────────────────────────
    await gotoWithRetry(page, productUrl);
    await delay(2000);

    // ── Step 6: Extract product data from DOM ─────────────────────────────
    // Confirmed:
    //   - Name is in <h1>
    //   - CAS is in page title AND in the specs table (look for "50-78-2" pattern)
    //   - Prices are in table rows where cells[1] contains ₹

    const domData = await page.evaluate(() => {
      // ── Product name ──
      const h1 = document.querySelector('h1');
      const name = h1 ? h1.innerText.trim() : 'Not Found';

      // ── CAS: extract from page title (format: "Name | CAS | Company") ──
      let cas = 'Not Found';
      const titleMatch = document.title.match(/([\d]{2,7}-[\d]{2}-[\d])/);
      if (titleMatch) {
        cas = titleMatch[1];
      } else {
        // Fallback: scan spec table rows for a row containing "CAS"
        document.querySelectorAll('table tr').forEach((row) => {
          if (cas !== 'Not Found') return;
          const text = row.innerText || '';
          if (/C\.?A\.?S/i.test(text)) {
            const m = text.match(/([\d]{2,7}-[\d]{2}-[\d])/);
            if (m) cas = m[1];
          }
        });
      }

      // ── Prices: rows where cells[1] contains ₹ ──
      // Confirmed format: cells[0]=packSize, cells[1]=price (₹1,800.00), cells[2]=minQty, cells[3]=leadTime
      const prices = [];
      const seen = new Set();

      document.querySelectorAll('table tr').forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) return;
        const pack = cells[0].innerText.trim();
        const priceCell = cells[1].innerText.trim();
        // Price cell must start with ₹
        if (/^₹/.test(priceCell) && pack && pack.length < 20 && !seen.has(pack)) {
          seen.add(pack);
          prices.push({ packSize: pack, price: priceCell });
        }
      });

      return { name, cas, prices };
    });

    result.productName = domData.name;
    result.casNo = domData.cas;
    result.pricingOptions = domData.prices;

    // ── Verification: reject wrong results ────────────────────────────────
    // TCI returns the first search result even for non-matching queries.
    if (result.casNo !== 'Not Found') {
      if (isCAS) {
        // CAS search: verify the returned CAS matches what we searched for
        if (result.casNo.trim() !== query.trim()) {
          result.productName = 'Not Found';
          result.casNo = 'Not Found';
          result.pricingOptions = [];
          result.error = `TCI returned wrong CAS: searched "${query}" but got "${domData.cas}"`;
          return result;
        }
      } else if (result.productName !== 'Not Found') {
        // Name search: verify the scraped product name is relevant
        const qNorm = query.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const pNorm = result.productName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isSubstring = qNorm.length >= 4 && (pNorm.includes(qNorm) || qNorm.includes(pNorm));

        if (!isSubstring) {
          const tokenize = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(t => t.length >= 3);
          const qWords = tokenize(query);
          const pWords = tokenize(result.productName);
          const matchCount = qWords.filter(w => pWords.some(pw => pw.includes(w) || w.includes(pw))).length;
          const overlapRatio = qWords.length > 0 ? matchCount / qWords.length : 0;

          if (overlapRatio < 0.5) {
            result.productName = 'Not Found';
            result.casNo = 'Not Found';
            result.pricingOptions = [];
            result.error = `TCI returned irrelevant product for query: "${query}"`;
            return result;
          }
        }
      }
    }

    return result;
  } catch (err) {
    result.error = err.message;
    return result;
  } finally {
    await page.close();
  }
}

module.exports = scrapeTCI;
