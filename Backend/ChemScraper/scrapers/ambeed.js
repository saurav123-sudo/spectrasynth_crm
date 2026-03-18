/**
 * Ambeed scraper (ambeed.com)
 *
 * Flow:
 *  1. Log in with credentials from .env (AMBEED_USERNAME / AMBEED_PASSWORD)
 *  2. Call Ambeed's internal search API (base64-encoded JSON params + XSRF cookie)
 *  3. Pick the best-matching product from results
 *  4. Navigate to product page and scrape name, CAS, pack sizes, and REAL prices
 *     (Prices are decoded from Ambeed's custom font encoding via ambeedDecode.js)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { newPage, delay, gotoWithRetry } = require('../browser');
const { decodeAmbeedPrice } = require('../utils/ambeedDecode');

const BASE = 'https://www.ambeed.com';
const LOGIN_URL = `${BASE}/user/login.html`;
const CAS_REGEX = /^[\d]{2,7}-[\d]{2}-[\d]$/;

// ─── Login ────────────────────────────────────────────────────────────────────

async function loginAmbeed(page) {
  const user = process.env.AMBEED_USERNAME;
  const pass = process.env.AMBEED_PASSWORD;
  if (!user || !pass) return false;

  try {
    await gotoWithRetry(page, LOGIN_URL);
    await delay(2000);

    // Already logged in?
    const alreadyIn = await page.evaluate(() =>
      !!(document.querySelector('a[href*="logout"]') ||
        document.querySelector('[class*="user-center"]') ||
        document.querySelector('[class*="user_center"]'))
    );
    if (alreadyIn) return true;

    // Fill email (input type="text", id="email") and password (id="password")
    await page.waitForSelector('#email', { visible: true, timeout: 5000 });
    await page.click('#email', { clickCount: 3 });
    await page.type('#email', user, { delay: 80 });

    await page.waitForSelector('#password', { visible: true, timeout: 5000 });
    await page.click('#password', { clickCount: 3 });
    await page.type('#password', pass, { delay: 80 });

    // Submit via Enter (more reliable than clicking the button)
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => { }),
      page.keyboard.press('Enter'),
    ]);
    await delay(2000);

    // Verify: access_token cookie must be present after login
    const cookies = await page.cookies();
    return cookies.some(c => c.name === 'access_token');
  } catch (err) {
    return false;
  }
}

// ─── Product matching helpers ─────────────────────────────────────────────────

function nameScore(productName, query) {
  const p = (productName || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const q = query.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!p || !q) return 0;
  if (p === q) return 100;
  if (p.startsWith(q + ' ') || p.startsWith(q + '[') || p.startsWith(q + ',')) return 60;
  if (p.startsWith(q)) return 50;
  return 0;
}

function pickBestProduct(products, query) {
  const isCas = CAS_REGEX.test(query.trim());
  let best = products[0];
  let bestScore = -1;

  for (const p of products) {
    let score = 0;
    if (isCas) {
      if ((p.p_cas || '').trim() === query.trim()) score = 100;
    } else {
      score = nameScore(p.p_name_en || p.en_name || p.name || '', query);
    }
    if (score > bestScore) { bestScore = score; best = p; }
    if (bestScore === 100) break;
  }
  return best;
}

// ─── Main scraper ─────────────────────────────────────────────────────────────

async function scrapeAmbeed(query) {
  const result = {
    company: 'www.ambeed.com',
    sourceUrl: '',
    productName: 'Not Found',
    casNo: 'Not Found',
    hsnCode: 'Not Found',
    pricingOptions: [],
    error: null,
  };

  const page = await newPage();
  const captured = new Map();

  page.on('response', async (res) => {
    try {
      const u = res.url();
      const ct = res.headers()['content-type'] || '';
      if (!ct.includes('json')) return;
      if (res.status() < 200 || res.status() >= 300) return;
      const json = await res.json().catch(() => null);
      if (json) captured.set(u, json);
    } catch (_) { }
  });

  try {
    // ── Step 1: Log in ────────────────────────────────────────────────────
    const loggedIn = await loginAmbeed(page);

    // ── Step 2: Load homepage to refresh XSRF cookie ─────────────────────
    await gotoWithRetry(page, `${BASE}/`);
    await delay(1000);

    // ── Step 3: Search API ────────────────────────────────────────────────
    const searchData = await page.evaluate(async (apiBase, searchQuery) => {
      try {
        const paramsObj = { keyword: searchQuery, country: '', one_menu_id: 0, one_menu_life_id: 0, menu_id: 0 };
        const params = btoa(JSON.stringify(paramsObj));
        const xsrf = document.cookie.split(';').map(c => c.trim())
          .find(c => c.startsWith('_xsrf='))?.replace('_xsrf=', '') || '';

        const url = `${apiBase}/webapi/v1/productlistbykeyword?params=${encodeURIComponent(params)}&_xsrf=${xsrf}`;
        const res = await fetch(url, {
          headers: { Accept: 'application/json', 'x-requested-with': 'XMLHttpRequest' },
        });
        if (!res.ok) return { error: `HTTP ${res.status}` };
        return await res.json();
      } catch (e) {
        return { error: e.message };
      }
    }, BASE, query);

    if (searchData.error) throw new Error('Ambeed API error: ' + searchData.error);

    const products = searchData?.value?.result;
    if (!Array.isArray(products) || products.length === 0) {
      result.error = `Product not found on Ambeed for query: "${query}"`;
      return result;
    }

    const first = pickBestProduct(products, query);
    const sUrl = first.s_url;
    if (!sUrl) {
      result.error = 'Ambeed returned a product with no URL';
      return result;
    }

    result.productName = first.p_name_en || first.en_name || first.name || 'Not Found';
    result.casNo = first.p_cas || first.cas || first.cas_no || 'Not Found';

    // ── Step 4: Navigate to product page ─────────────────────────────────
    const cleanUrl = sUrl.split('?')[0];
    const productUrl = `${BASE}/products/${cleanUrl}`;
    result.sourceUrl = productUrl;
    captured.clear();

    await gotoWithRetry(page, productUrl);
    await delay(3000);

    // ── Step 5: Parse intercepted product_price API ───────────────────────
    // When logged in, pr_usd contains Ambeed's custom font-encoded price string.
    // We decode it using the complete character map in utils/ambeedDecode.js.
    let foundFromApi = false;

    for (const [u, data] of captured) {
      if (u.includes('product_price') && data?.value) {
        const val = data.value;

        // Extract product name from proInfo
        if (val.proInfo) {
          const proInfo = val.proInfo;
          // proInfo can be { BD_XX: { p_name_en, ... } } or { p_name_en, ... }
          const firstKey = Object.keys(proInfo)[0];
          const info = typeof proInfo[firstKey] === 'object' ? proInfo[firstKey] : proInfo;
          if (info.p_name_en || info.p_proper_name3) {
            result.productName = info.p_name_en || info.p_proper_name3;
          }
        }

        // Extract pricing from array keys
        const allPacks = [];
        for (const key of Object.keys(val)) {
          if (!Array.isArray(val[key])) continue;
          for (const item of val[key]) {
            const size = item.pr_size;
            const encodedPrice = item.price_dict?.pr_usd ?? item.pr_usd;
            if (!size) continue;

            // Decode the font-encoded price
            let price = 'Not available';
            if (encodedPrice !== undefined && encodedPrice !== null && encodedPrice !== '') {
              const decoded = decodeAmbeedPrice(String(encodedPrice));
              if (decoded && decoded !== 'Not available') {
                price = decoded;
              }
            }

            allPacks.push({ packSize: size, price });
          }
        }

        if (allPacks.length > 0) {
          result.pricingOptions = allPacks;
          foundFromApi = true;
        }
        break;
      }
    }

    // ── Step 6: DOM fallback (name, CAS, pack sizes) ──────────────────────
    const domData = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const name = h1 ? h1.innerText.split('\n')[0].trim() : 'Not Found';

      let cas = 'Not Found';
      document.querySelectorAll('table.pro_table tr').forEach((row) => {
        if (cas !== 'Not Found') return;
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2 && /CAS\s*No/i.test(cells[0].innerText)) {
          const val = cells[1].innerText.trim();
          if (val) cas = val;
        }
      });
      if (cas === 'Not Found') {
        const m = document.body.innerText.match(/([\d]{2,7}-[\d]{2}-[\d])/);
        if (m) cas = m[1];
      }

      // Pack sizes from DOM table (used as fallback if API not captured)
      const packs = [];
      const seen = new Set();
      document.querySelectorAll('table.pro_tab_side tr').forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) return;
        const size = cells[0].innerText.trim();
        if (!size || size === 'Size' || size.length > 20) return;
        if (seen.has(size)) return;
        seen.add(size);
        packs.push({ packSize: size, price: 'Login required' });
      });

      return { name, cas, packs };
    });

    if (!result.productName || result.productName === 'Not Found') {
      result.productName = domData.name;
    }
    if (result.casNo === 'Not Found') result.casNo = domData.cas;

    // Use API prices if captured, otherwise fall back to DOM pack sizes
    if (!foundFromApi) {
      result.pricingOptions = domData.packs;
    }

    // Add note if login failed and prices couldn't be decoded
    const allLoginGated = result.pricingOptions.every(p => p.price === 'Login required');
    if (allLoginGated && result.pricingOptions.length > 0) {
      result.note = loggedIn
        ? 'Prices still gated — Ambeed may require email verification on this account'
        : 'Login failed — set AMBEED_USERNAME / AMBEED_PASSWORD in .env to view prices';
    }

    return result;
  } catch (err) {
    result.error = err.message;
    return result;
  } finally {
    await page.close();
  }
}

module.exports = scrapeAmbeed;
