/**
 * BLD Pharm scraper (bldpharm.com)
 *
 * Flow:
 *  1. Log in with credentials from .env (BLD_USERNAME / BLD_PASSWORD)
 *     Login page: /user/login.html  — form submits via Enter (no visible submit button)
 *     Success: sets bld_access_token cookie
 *  2. Find product URL (direct CAS route or homepage autocomplete)
 *  3. Navigate to product page; extract proid from #proid hidden input
 *  4. Call /webapi/v1/product/productPriceInfo/{proid} — returns real USD prices when logged in
 *  5. DOM fallback for name/CAS
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { newPage, delay, gotoWithRetry } = require('../browser');

const BASE = 'https://www.bldpharm.com';
const LOGIN_URL = `${BASE}/user/login.html`;
const CAS_REGEX = /^[\d]{2,7}-[\d]{2}-[\d]$/;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nameScore(candidate, query) {
  const c = (candidate || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const q = query.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!c || !q) return 0;
  if (c === q) return 100;
  if (c.startsWith(q + ' ') || c.startsWith(q + '[') || c.startsWith(q + ',')) return 60;
  if (c.startsWith(q)) return 50;
  return 0;
}

// ─── Login ────────────────────────────────────────────────────────────────────

async function loginBLD(page) {
  const user = process.env.BLD_USERNAME;
  const pass = process.env.BLD_PASSWORD;
  if (!user || !pass) return false;

  try {
    await gotoWithRetry(page, LOGIN_URL);
    await delay(2000);

    // Already logged in?
    const cookies = await page.cookies();
    if (cookies.some(c => c.name === 'bld_access_token' || c.name === 'access_token')) return true;

    // Confirmed selectors from debug:
    //   Email: input[name="Email"] id="ipt_email" (type="text", NOT type="email")
    //   Password: id="ipt_password"
    await page.waitForSelector('#ipt_email', { visible: true, timeout: 5000 });
    await page.click('#ipt_email', { clickCount: 3 });
    await page.type('#ipt_email', user, { delay: 80 });

    await page.waitForSelector('#ipt_password', { visible: true, timeout: 5000 });
    await page.click('#ipt_password', { clickCount: 3 });
    await page.type('#ipt_password', pass, { delay: 80 });

    // The form has no visible submit button — submission via Enter (confirmed working)
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => { }),
      page.keyboard.press('Enter'),
    ]);
    await delay(2000);

    const cookiesAfter = await page.cookies();
    return cookiesAfter.some(c => c.name === 'bld_access_token' || c.name === 'access_token');
  } catch (err) {
    return false;
  }
}

// ─── Main scraper ─────────────────────────────────────────────────────────────

async function scrapeBLDPharm(query) {
  const result = {
    company: 'www.bldpharm.com',
    sourceUrl: '',
    productName: 'Not Found',
    casNo: 'Not Found',
    hsnCode: 'Not Found',
    pricingOptions: [],
    error: null,
  };

  const page = await newPage();

  try {
    // ── Step 1: Log in ────────────────────────────────────────────────────
    const loggedIn = await loginBLD(page);

    let productUrl = null;

    // ── Step 2: Find product URL ──────────────────────────────────────────
    if (CAS_REGEX.test(query.trim())) {
      productUrl = `${BASE}/products/${query.trim()}.html`;
    } else {
      await gotoWithRetry(page, `${BASE}/`);
      await delay(1500);

      await page.focus('#search_info');
      await page.type('#search_info', query, { delay: 100 });
      await delay(2500);

      const candidates = await page.evaluate((baseUrl) => {
        const out = [];
        const seen = new Set();
        const add = (selector) => {
          document.querySelectorAll(selector).forEach((a) => {
            const href = a.getAttribute('href');
            if (!href) return;
            const full = href.startsWith('http') ? href : baseUrl + href;
            if (seen.has(full)) return;
            seen.add(full);
            out.push({ href: full, label: (a.innerText || a.textContent || '').trim() });
          });
        };
        add('.search_result_list a');
        add('[class*="result_list"] a');
        add('[class*="autocomplete"] a');
        add('a[href*="/products/"]');
        return out;
      }, BASE);

      if (candidates.length === 0) {
        result.error = `Product not found on BLD Pharm for query: "${query}"`;
        return result;
      }

      let best = candidates[0];
      let bestScore = -1;
      for (const c of candidates) {
        const score = nameScore(c.label, query);
        if (score > bestScore) { bestScore = score; best = c; }
        if (bestScore === 100) break;
      }
      productUrl = best.href;
    }

    result.sourceUrl = productUrl;

    // ── Step 3: Navigate to product page ─────────────────────────────────
    await gotoWithRetry(page, productUrl);
    await delay(3000);

    // Check 404
    const pageTitle = await page.title();
    if (pageTitle.toLowerCase().includes('404') || pageTitle.toLowerCase().includes('not found')) {
      result.error = `Product not found on BLD Pharm for query: "${query}"`;
      return result;
    }

    // ── Step 4: Get product ID, extract name from API, then get INR prices ──
    // proid is stored in a hidden input: <input id="proid" value="P000093933">
    const proid = await page.evaluate(() => document.querySelector('#proid')?.value);

    if (proid && loggedIn) {
      const xsrf = (await page.cookies()).find(c => c.name === '_xsrf')?.value || '';

      // Fetch initial pricing API to get product name from proInfo
      const priceData = await page.evaluate(async (proId, xsrfToken) => {
        try {
          const url = `/webapi/v1/product/productPriceInfo/${proId}?num=${Date.now()}&is_query_web_price=true&_xsrf=${xsrfToken}`;
          const res = await fetch(url, { headers: { 'x-requested-with': 'XMLHttpRequest' } });
          if (!res.ok) return { error: `HTTP ${res.status}` };
          return await res.json();
        } catch (e) {
          return { error: e.message };
        }
      }, proid, xsrf);

      if (!priceData.error && priceData.value) {
        const val = priceData.value;

        // proInfo → product name
        if (val.proInfo) {
          const firstKey = Object.keys(val.proInfo)[0];
          const info = typeof val.proInfo[firstKey] === 'object' ? val.proInfo[firstKey] : val.proInfo;
          result.productName = info.p_name_en || info.p_proper_name3 || result.productName;
        }
      }
    }

    // ── Step 4b: Click INR toggle and scrape INR prices from DOM ────────────
    // BLD Pharm has an <a href="javascript:;">INR</a> link that switches pricing
    // to Indian Rupees. Clicking it triggers /webapi/v1/countrycookie and
    // re-renders the price table with INR values.
    const clickedINR = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href="javascript:;"]');
      for (const a of links) {
        if (a.textContent.trim() === 'INR') {
          a.click();
          return true;
        }
      }
      return false;
    });

    if (clickedINR) {
      await delay(4000); // Wait for countrycookie API + price table re-render
    }

    // Scrape pricing from the DOM table (now showing INR after toggle click)
    const domPrices = await page.evaluate(() => {
      const packs = [];
      const seen = new Set();
      document.querySelectorAll('table tr').forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) return;
        const size = cells[0].innerText.trim();
        const priceText = cells[1].innerText.trim();
        // Only capture rows with a known pack size pattern and a price value
        if (!size || size.length > 10 || seen.has(size)) return;
        if (!/^\d/.test(size) && size !== 'Others') return;
        seen.add(size);

        if (/^INR\s/i.test(priceText)) {
          // Format "INR 2108" → "₹2,108"
          const numStr = priceText.replace(/^INR\s*/i, '').replace(/,/g, '').trim();
          const num = parseFloat(numStr);
          if (!isNaN(num) && num > 0) {
            const formatted = '₹' + num.toLocaleString('en-IN');
            packs.push({ packSize: size, price: formatted });
          } else {
            packs.push({ packSize: size, price: priceText });
          }
        } else if (/inquiry/i.test(priceText) || /tbc/i.test(priceText)) {
          packs.push({ packSize: size, price: 'Requires business account' });
        } else if (/sign\s*in/i.test(priceText)) {
          packs.push({ packSize: size, price: 'Requires business account' });
        } else if (priceText) {
          packs.push({ packSize: size, price: priceText });
        }
      });
      return packs;
    });

    if (domPrices.length > 0) {
      result.pricingOptions = domPrices;
    }

    // ── Step 5: DOM fallback ───────────────────────────────────────────────
    const domData = await page.evaluate(() => {
      let name = 'Not Found';
      const titleParts = document.title.split('|');
      if (titleParts.length >= 2) name = titleParts[1].trim();
      if (!name || name === 'Not Found') {
        document.querySelectorAll('table tr').forEach((row) => {
          if (name !== 'Not Found') return;
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2 && /Product\s*Name/i.test(cells[0].innerText)) {
            name = cells[1].innerText.trim();
          }
        });
      }
      if (!name || name === 'Not Found') {
        const h2 = document.querySelector('h2');
        if (h2) name = h2.innerText.split('\n')[0].trim();
      }

      let cas = 'Not Found';
      const titleCas = document.title.match(/([\d]{2,7}-[\d]{2}-[\d])/);
      if (titleCas) cas = titleCas[1];
      if (cas === 'Not Found') {
        document.querySelectorAll('table tr').forEach((row) => {
          if (cas !== 'Not Found') return;
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2 && /CAS\s*No/i.test(cells[0].innerText)) {
            const val = cells[1].innerText.trim();
            if (val && /[\d]/.test(val)) cas = val;
          }
        });
      }

      return { name, cas };
    });

    if (!result.productName || result.productName === 'Not Found') {
      result.productName = domData.name;
    }
    if (result.casNo === 'Not Found') result.casNo = domData.cas;

    // Add note if prices aren't real
    const hasRealPrices = result.pricingOptions.some(p =>
      /^₹[\d,.]+$/.test(p.price)
    );
    if (!hasRealPrices) {
      if (result.pricingOptions.length === 0) {
        result.note = loggedIn
          ? 'Prices not returned by API — BLD Pharm may require a business account'
          : 'Login failed — set BLD_USERNAME / BLD_PASSWORD in .env to view prices';
      } else {
        result.note = 'Prices require an approved BLD Pharm business account';
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

module.exports = scrapeBLDPharm;
