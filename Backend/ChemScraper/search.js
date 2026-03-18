/**
 * Main search orchestrator.
 *
 * Runs all 4 scrapers IN PARALLEL using Promise.allSettled so that:
 *  - All 4 start at the same time (4 browser tabs open simultaneously)
 *  - If one site is slow or fails, others are NOT affected
 *  - Total wait time = slowest site, not sum of all sites
 *
 * Usage:
 *   const { search } = require('./search');
 *   const results = await search('aspirin');
 *   const results = await search('50-78-2');
 */

const { closeBrowser } = require('./browser');
const scrapeTCI = require('./scrapers/tci');
const scrapeSigma = require('./scrapers/sigma');
const scrapeAmbeed = require('./scrapers/ambeed');
const scrapeBLDPharm = require('./scrapers/bldpharm');

/**
 * Searches all 4 chemical websites in parallel.
 *
 * @param {string} query - Chemical name (e.g. "aspirin") or CAS number (e.g. "50-78-2")
 * @param {object} options
 * @param {string[]} [options.sites] - Which sites to query. Default: all 4.
 *   Possible values: 'tci', 'sigma', 'ambeed', 'bld'
 * @returns {Promise<object[]>} Array of result objects, one per site
 */
async function search(query, options = {}) {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    throw new Error('query must be a non-empty string');
  }

  const q = query.trim();
  const sites = options.sites || ['tci', 'sigma', 'ambeed', 'bld'];

  // Map site key → scraper function
  const scrapers = {
    tci: { fn: scrapeTCI, label: 'TCI Chemicals' },
    sigma: { fn: scrapeSigma, label: 'Sigma-Aldrich' },
    ambeed: { fn: scrapeAmbeed, label: 'Ambeed' },
    bld: { fn: scrapeBLDPharm, label: 'BLD Pharm' },
  };

  // Build list of tasks to run
  const tasks = sites
    .filter((s) => scrapers[s])
    .map((s) => {
      const { fn, label } = scrapers[s];
      return fn(q).then(
        (result) => ({ status: 'fulfilled', site: label, result }),
        (err) => ({ status: 'rejected', site: label, result: { error: err.message } })
      );
    });

  // Run all in parallel, wait for all to finish (success or failure)
  const settled = await Promise.allSettled(tasks);

  // Flatten: Promise.allSettled wraps each resolved value one more time
  return settled.map((s) => (s.status === 'fulfilled' ? s.value : s.reason));
}

module.exports = { search, closeBrowser };
