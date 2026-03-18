/**
 * Shared Puppeteer browser instance.
 * One Chromium process is reused across all scrapers to avoid overhead.
 * Each scraper opens its own page (tab) and closes it when done.
 */

const puppeteer = require('puppeteer');

let _browser = null;

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-blink-features=AutomationControlled',
  '--disable-infobars',
  '--disable-extensions',
  '--window-size=1920,1080',
];

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function getBrowser() {
  if (!_browser || !_browser.connected) {
    _browser = await puppeteer.launch({
      headless: true,
      args: LAUNCH_ARGS,
      defaultViewport: { width: 1920, height: 1080 },
    });
  }
  return _browser;
}

async function newPage() {
  const browser = await getBrowser();

  // Use an incognito context so cookies/cache don't leak between scrapes
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  await page.setUserAgent(USER_AGENT);
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const type = req.resourceType();
    if (['image', 'font', 'media'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  // Patch close() to also dispose the incognito context
  const originalClose = page.close.bind(page);
  page.close = async () => {
    await originalClose();
    await context.close().catch(() => { });
  };

  return page;
}

async function closeBrowser() {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Navigate with automatic retry on timeout.
 * Retries up to `retries` times with a 3s pause between attempts.
 *
 * @param {import('puppeteer').Page} page
 * @param {string} url
 * @param {object} options  - Puppeteer goto options
 * @param {number} retries  - number of retry attempts (default 2)
 */
async function gotoWithRetry(page, url, options = {}, retries = 2) {
  const opts = { waitUntil: 'networkidle2', timeout: 45000, ...options };
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await page.goto(url, opts);
    } catch (err) {
      const isTimeout =
        err.message.includes('timeout') || err.message.includes('Timeout');
      if (isTimeout && attempt < retries) {
        await delay(3000);
        continue;
      }
      throw err;
    }
  }
}

module.exports = { getBrowser, newPage, closeBrowser, delay, gotoWithRetry };
