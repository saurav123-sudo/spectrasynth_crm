#!/usr/bin/env node
/**
 * Chemical Price Scraper — CLI
 *
 * Usage:
 *   node index.js "aspirin"
 *   node index.js "50-78-2"
 *   node index.js "Acetylsalicylic Acid" --sites tci,sigma
 *   node index.js "50-78-2" --save          (saves results to results/<query>.json)
 *
 * Options:
 *   --sites  Comma-separated list: tci, sigma, ambeed, bld  (default: all)
 *   --save   Save JSON output to results/ folder
 */

const path = require('path');
const fs = require('fs');
const { search, closeBrowser } = require('./search');

// ── Parse CLI arguments ───────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
  Chemical Price Scraper
  ──────────────────────
  Usage:
    node index.js "<name or CAS>"
    node index.js "50-78-2"
    node index.js "aspirin" --sites tci,sigma
    node index.js "50-78-2" --save

  Options:
    --sites   Comma-separated sites to query (tci, sigma, ambeed, bld)
              Default: all 4 sites
    --save    Save result JSON to results/<query>.json
  `);
  process.exit(0);
}

const query = args[0];

// Parse --sites flag
let sites = ['tci', 'sigma', 'ambeed', 'bld'];
const sitesIdx = args.indexOf('--sites');
if (sitesIdx !== -1 && args[sitesIdx + 1]) {
  sites = args[sitesIdx + 1].split(',').map((s) => s.trim().toLowerCase());
}

const shouldSave = args.includes('--save');

// ── Helpers ───────────────────────────────────────────────────────────────────
function printHeader() {
  console.log('\n' + '═'.repeat(60));
  console.log(`  Chemical Price Scraper`);
  console.log(`  Query   : "${query}"`);
  console.log(`  Sites   : ${sites.join(', ')}`);
  console.log(`  Started : ${new Date().toLocaleTimeString()}`);
  console.log('═'.repeat(60) + '\n');
}

function printResult(entry) {
  const TICK = '✓';
  const CROSS = '✗';
  const hr = '─'.repeat(56);

  console.log(`  ${hr}`);

  if (entry.result.error && !entry.result.productName) {
    console.log(`  ${CROSS} ${entry.site}`);
    console.log(`    Error: ${entry.result.error}`);
    console.log();
    return;
  }

  console.log(`  ${TICK} ${entry.site}`);
  console.log(`    Product : ${entry.result.productName}`);
  console.log(`    CAS No  : ${entry.result.casNo}`);
  console.log(`    HSN Code: ${entry.result.hsnCode}`);
  console.log(`    URL     : ${entry.result.sourceUrl}`);

  if (entry.result.pricingOptions && entry.result.pricingOptions.length > 0) {
    console.log(`    Pricing :`);
    entry.result.pricingOptions.forEach((p) => {
      console.log(`      ${String(p.packSize).padEnd(12)}  ${p.price}`);
    });
  } else {
    console.log(`    Pricing : Not available`);
  }

  if (entry.result.error) {
    console.log(`    Note    : ${entry.result.error}`);
  }

  console.log();
}

function saveResults(results) {
  const dir = path.join(__dirname, 'results');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  const safeName = query.replace(/[^a-z0-9_\-]/gi, '_');
  const file = path.join(dir, `${safeName}_${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(results, null, 2), 'utf8');
  console.log(`  Results saved to: ${file}\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  printHeader();

  console.log('  Launching browser and querying all sites in parallel...\n');

  const startTime = Date.now();

  let results;
  try {
    results = await search(query, { sites });
  } catch (err) {
    console.error('  Fatal error:', err.message);
    await closeBrowser();
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('  Results\n');
  results.forEach(printResult);

  console.log(`  Completed in ${elapsed}s`);
  console.log('═'.repeat(60) + '\n');

  if (shouldSave) {
    saveResults(results);
  }

  await closeBrowser();
  process.exit(0);
})();
