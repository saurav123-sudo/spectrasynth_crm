/**
 * Sigma-Aldrich scraper (sigmaaldrich.com)
 *
 * Confirmed working approach (from debug):
 *  1. Search URL: /IN/en/search/{query}?focus=products&page=1&perpage=30&sort=relevance&term={query}&type=cas_number
 *  2. First product link: a[href*="/product/"]
 *  3. Product page:
 *     - Name in <h1>
 *     - CAS in page title ("Product name ... 69-72-7")
 *     - Prices in table.MuiTable-root rows:
 *       cells[0] = pack size, cells[3] = price (₹)
 *
 * No GraphQL or API interception needed — data is server-rendered.
 */

const { newPage, delay, gotoWithRetry } = require('../browser');

const BASE = 'https://www.sigmaaldrich.com/IN/en';

const CAS_REGEX = /^[\d]{2,7}-[\d]{2}-[\d]$/;

async function scrapeSigma(query) {
  const result = {
    company: 'www.sigmaaldrich.com',
    sourceUrl: '',
    productName: 'Not Found',
    casNo: 'Not Found',
    hsnCode: 'Not Found',
    pricingOptions: [],
    error: null,
  };

  const page = await newPage();

  try {
    // ── Step 1: Navigate to search results ───────────────────────────────
    const q = encodeURIComponent(query.trim());
    const isCAS = CAS_REGEX.test(query.trim());

    // Use confirmed search URL format — no SPA/GraphQL needed
    const searchUrl = isCAS
      ? `${BASE}/search/${q}?focus=products&page=1&perpage=30&sort=relevance&term=${q}&type=cas_number`
      : `${BASE}/search/${q}?focus=products&page=1&perpage=30&sort=relevance&term=${q}`;

    await gotoWithRetry(page, searchUrl);
    await delay(2500);

    const searchTitle = await page.title();
    if (searchTitle.toLowerCase().includes('no result') || searchTitle.toLowerCase().includes('not found')) {
      result.error = `Product not found on Sigma-Aldrich for query: "${query}"`;
      return result;
    }

    // ── Step 2: Get first product link ───────────────────────────────────
    const productUrl = await page.evaluate(() => {
      const link = document.querySelector('a[href*="/product/"]');
      return link ? link.href : null;
    });

    if (!productUrl) {
      result.error = 'No product link found in Sigma-Aldrich search results';
      return result;
    }

    result.sourceUrl = productUrl;

    // ── Step 3: Navigate to product page ─────────────────────────────────
    await gotoWithRetry(page, productUrl);
    await delay(3000);

    // ── Step 4: Extract data from confirmed selectors ─────────────────────
    const domData = await page.evaluate(() => {
      // ── Product name: h1 ──
      const h1 = document.querySelector('h1, [data-testid="product-name"]');
      const name = h1 ? h1.innerText.trim() : 'Not Found';

      // ── CAS: from page title ("Name ... CAS") ──
      let cas = 'Not Found';
      const titleMatch = document.title.match(/([\d]{2,7}-[\d]{2}-[\d])/);
      if (titleMatch) cas = titleMatch[1];

      if (cas === 'Not Found') {
        // Fallback: scan detail/spec sections
        document.querySelectorAll('dl, [class*="detail"], [class*="spec"]').forEach((el) => {
          if (cas !== 'Not Found') return;
          const text = el.innerText || '';
          if (/CAS/i.test(text)) {
            const m = text.match(/([\d]{2,7}-[\d]{2}-[\d])/);
            if (m) cas = m[1];
          }
        });
      }

      // ── Prices: confirmed table.MuiTable-root ──
      // Row format: cells[0]=Pack Size, cells[1]=SKU, cells[2]=Availability, cells[3]=Price
      const prices = [];
      const seen = new Set();

      // Try the primary confirmed selector first
      const tables = document.querySelectorAll('table.MuiTable-root, [class*="tss-1s76f0q-table"]');
      tables.forEach((table) => {
        const rows = table.querySelectorAll('tr');
        rows.forEach((row) => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 4) return;
          const pack = cells[0].innerText.trim();
          const price = cells[3].innerText.trim();
          // Skip header, empty rows
          if (!pack || pack === 'Pack Size' || pack.length > 20) return;
          // Ensure price has a currency symbol
          if (!/[₹$€£¥]/.test(price)) return;
          if (seen.has(pack)) return;
          seen.add(pack);
          prices.push({ packSize: pack, price });
        });
      });

      // Fallback: any table with "Pack Size" header
      if (prices.length === 0) {
        document.querySelectorAll('table').forEach((table) => {
          const headerRow = table.querySelector('tr');
          if (!headerRow || !headerRow.innerText.includes('Pack Size')) return;
          const dataRows = [...table.querySelectorAll('tr')].slice(1);
          dataRows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 2) return;
            const pack = cells[0].innerText.trim();
            // Price is usually last cell or cell with currency
            let priceText = null;
            cells.forEach((c) => {
              const t = c.innerText.trim();
              if (/[₹$€£¥]/.test(t) && /[\d]/.test(t)) priceText = t;
            });
            if (pack && priceText && !seen.has(pack)) {
              seen.add(pack);
              prices.push({ packSize: pack, price: priceText });
            }
          });
        });
      }

      return { name, cas, prices };
    });

    result.productName = domData.name;
    result.casNo = domData.cas;
    result.pricingOptions = domData.prices;

    // ── Name verification for name-based searches ─────────────────────
    // Sigma often returns "best match" results that are completely unrelated.
    // If searching by name, verify the scraped product is actually relevant.
    if (!isCAS && result.productName !== 'Not Found' && result.casNo !== 'Not Found') {
      const qNorm = query.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const pNorm = result.productName.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Accept if either name contains the other (handles partial matches)
      const isSubstring = qNorm.length >= 4 && (pNorm.includes(qNorm) || qNorm.includes(pNorm));

      if (!isSubstring) {
        // Check word overlap: tokenize and compare
        const tokenize = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(t => t.length >= 3);
        const qWords = tokenize(query);
        const pWords = tokenize(result.productName);
        const matchCount = qWords.filter(w => pWords.some(pw => pw.includes(w) || w.includes(pw))).length;
        const overlapRatio = qWords.length > 0 ? matchCount / qWords.length : 0;

        if (overlapRatio < 0.5) {
          // Irrelevant result — Sigma returned a "best match" that doesn't match
          result.productName = 'Not Found';
          result.casNo = 'Not Found';
          result.pricingOptions = [];
          result.error = `Sigma-Aldrich returned irrelevant product for query: "${query}"`;
          return result;
        }
      }
    }

    if (result.pricingOptions.length === 0) {
      result.note = 'Sigma-Aldrich pricing may require login or regional availability';
    }

    return result;
  } catch (err) {
    result.error = err.message;
    return result;
  } finally {
    await page.close();
  }
}

module.exports = scrapeSigma;
