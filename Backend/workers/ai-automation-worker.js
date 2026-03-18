/**
 * ============================================================
 * AI Email-Parsing Automation Worker (1-Request Strict Limit)
 * ============================================================
 */

// ── Bootstrap ────────────────────────────────────────────────
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const cron = require("node-cron");
const { convert } = require("html-to-text");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Sequelize instance & models
const sequelize = require("../config/db");
const EmailBody = require("../models/EmailBody");
const EmailAttachment = require("../models/EmailAttachment");
const Inquiry = require("../models/Inquiry");
const InquiryProduct = require("../models/InquiryProduct");
const Product = require("../models/Product");
const ProductPrices = require("../models/ProductPrices");
const generateInquiryNumber = require("../Services/generateInquiryNumber");
const { extractBase64Images, saveImages } = require("./image-extractor-worker");
const { search: chemSearch, closeBrowser: chemCloseBrowser } = require("../ChemScraper/search");

// ── Gemini AI Setup ──────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_MODEL = process.env.GEMINI_MODEL;

// ── Config ───────────────────────────────────────────────────
const CRON_SCHEDULE = process.env.AI_WORKER_CRON || "*/2 * * * *"; // every 2 min
const VALID_UNITS = ["mg", "gm", "ml", "kg", "mt", "ltr", "litre", "liters", "litres", "liter", "g"];

// ── Logger helper ────────────────────────────────────────────
const log = (msg) =>
    console.log(`[AI-Worker] [${new Date().toISOString()}] ${msg}`);
const logErr = (msg, err) =>
    console.error(`[AI-Worker] [${new Date().toISOString()}] ${msg}`, err);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Greek-letter map for normalization ───────────────────────
const GREEK_MAP = {
    α: "alpha", β: "beta", γ: "gamma", δ: "delta", ε: "epsilon",
    ζ: "zeta", η: "eta", θ: "theta", ι: "iota", κ: "kappa",
    λ: "lambda", μ: "mu", ν: "nu", ξ: "xi", ο: "omicron",
    π: "pi", ρ: "rho", σ: "sigma", τ: "tau", υ: "upsilon",
    φ: "phi", χ: "chi", ψ: "psi", ω: "omega",
};

// UPDATED: Added Pharma Sanitizer to handle "as per EP", "USP", etc.
function normalizeName(name) {
    if (!name) return "";
    let n = name.toLowerCase();

    for (const [greek, english] of Object.entries(GREEK_MAP)) {
        n = n.replaceAll(greek, english);
    }

    // REMOVED pharma standard stripping to ensure EP vs USP are matched correctly
    // n = n.replace(/\b(as per ep|as per usp|as per bp|ep|usp|bp|ip|reference standard)\b/g, "");

    return n.replace(/[^a-z0-9]/g, "");
}

// Levenshtein distance for fuzzy name matching (handles 1-2 letter differences)
function levenshtein(a, b) {
    if (!a || !b) return Infinity;
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

/**
 * Check if two chemical names share enough meaningful words.
 * Returns a ratio (0–1) of overlapping words relative to the query.
 */
function wordOverlap(queryNorm, scrapedNorm) {
    // Tokenize on non-alphanumeric boundaries, filter short fragments
    const tokenize = (s) => s.replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(t => t.length >= 3);
    const qWords = tokenize(queryNorm);
    const sWords = tokenize(scrapedNorm);
    if (qWords.length === 0) return 0;
    const matched = qWords.filter(w => sWords.some(sw => sw.includes(w) || w.includes(sw)));
    return matched.length / qWords.length;
}

function stripHtml(html) {
    return convert(html, {
        wordwrap: false,
        selectors: [
            { selector: "img", format: "skip" },
            { selector: "a", options: { ignoreHref: true } },
        ],
    });
}

// ── Gemini AI call (multimodal: text + images + files) ──────
async function extractProductsFromText(cleanText, images = [], files = []) {
    const hasImages = images.length > 0;
    const hasFiles = files.length > 0;

    const systemPrompt = `You are a product-extraction assistant for a chemical/pharmaceutical CRM.
Given email text${hasImages ? ' and chemical structure images' : ''}${hasFiles ? ' and attached documents (PDFs, spreadsheets, etc.)' : ''}, extract every product name, quantity, and available identifiers.

CRITICAL RULES:
1. Return ONLY a valid JSON array.
2. DO NOT extract table headers, form labels, or placeholder text.
3. Only extract ACTUAL chemical names, impurities, or pharmacopoeia standards.
4. "cas_number" is a MANDATORY Technical Field. 
   - If a CAS is not in the email, you MUST use your internal knowledge to research and find the globally recognized CAS for that specific name. ONLY output the CAS number if you are 100% confident it is accurate.
   - For Peptides/Impurities (e.g., "9-Gly-Carbetocin Acid", "Impurity B"): Find the specific CAS mapping for that sequence or standard.
   - Standards Rule: "Impurity A/B" usually follows EP/BP standards. "Impurity 1/2" usually follows USP. Dig deeply into your data to find the EXACT CAS.
   - Use "" only if exhaustive research yields no result, or if you are not 90% confident.
5. Each element must have exactly these keys: 
   "product_name" (string), 
   "cas_number" (string), 
   "hsn_code" (string - Extract from the email if available, or deduce the HSN code if unknown. CRITICAL: DO NOT INCLUDE DOTS. For example, use "38220090" instead of "3822.00.90". Use "" if unknown), 
   "quantity" (number), 
   "unit" (string), 
   "package_size" (string)${hasImages ? `, 
   "image_index" (number or null)` : ''}.
6. If no valid products are found, return [].`;

    const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: systemPrompt,
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
        },
    });

    // Build multimodal content parts
    const parts = [];

    // Add images first so Gemini can reference them by index
    if (hasImages) {
        parts.push({
            text: [
                `There are ${images.length} image(s) attached (numbered 0 to ${images.length - 1}).`,
                `Each image has BEFORE/AFTER text context showing what text appeared near it in the email.`,
                ``,
                `IMAGE MATCHING RULES:`,
                `- The text IMMEDIATELY BEFORE an image usually names the product it belongs to.`,
                `- Use the BEFORE context as your PRIMARY guide for matching.`,
                `- Only match images that are chemical structure diagrams or molecular structure drawings.`,
                `- Do NOT match screenshots, tables, product lists, logos, or signatures.`,
                `- Every valid structure image should be matched to exactly one product.`,
                `- If unsure, set image_index to null rather than guessing wrong.`,
                ``
            ].join("\n")
        });
        images.forEach((img, idx) => {
            const contextHint = img.context ? `\n  Context: ${img.context}` : "";
            parts.push({ text: `\nImage ${idx}:${contextHint}` });
            parts.push({
                inlineData: {
                    mimeType: img.mimeType,
                    data: img.base64,
                },
            });
        });
    }
    // Add non-image file attachments (PDFs, spreadsheets, etc.)
    if (hasFiles) {
        parts.push({
            text: [
                ``,
                `There are ${files.length} attached document file(s) (PDFs, spreadsheets, text files, etc.).`,
                `Use tables and product details inside these files as additional context when extracting products.`,
                `Focus on actual product rows, not headers or boilerplate.`,
                ``
            ].join("\n")
        });
        files.forEach((file, idx) => {
            parts.push({ text: `\nAttachment ${idx}: filename="${file.filename}", mimeType="${file.mimeType}"` });
            parts.push({
                inlineData: {
                    mimeType: file.mimeType,
                    data: file.base64,
                },
            });
        });
    }

    parts.push({ text: `\nExtract all product names and quantities from the following email (and any attached documents if present):\n\n${cleanText}` });

    // STRICT 1-REQUEST LOGIC (No Retries)
    let result;
    try {
        result = await model.generateContent(parts);
    } catch (err) {
        log(`  ✗ Gemini API Error (Rate Limit/Network): ${err.message}`);
        return null; // Return null so the email is safely ignored until next cycle
    }

    const rawText = result.response.text().trim();
    log(`  === RAW GEMINI OUTPUT === ${rawText.substring(0, 300)}`);

    let parsed;
    try {
        parsed = JSON.parse(rawText);
    } catch (parseError) {
        log(`  ⚠ JSON parse failed — Gemini output was: ${rawText.substring(0, 200)}`);
        return [];
    }

    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") {
        for (const key of ["products", "items", "inquiries", ...Object.keys(parsed)]) {
            if (Array.isArray(parsed[key])) return parsed[key];
        }
    }

    log("  ⚠ Gemini response has no recognizable product array — treating as empty");
    return [];
}

// ── Build a normalized product lookup from the catalog ───────
async function buildProductCatalog() {
    const products = await Product.findAll({
        attributes: ["id", "product_name", "cas_number", "product_code"],
    });

    return products.map(p => ({
        ...p.toJSON(),
        cas_number: p.cas_number ? p.cas_number.trim() : "",
        normalized_name: normalizeName(p.product_name),
    }));
}

// ── Process a single email ───────────────────────────────────
async function processEmail(email, catalog) {
    log(`Processing EmailBody id=${email.id}  from=${email.sender_email}  subject="${email.subject}"`);

    // LOCK: Mark email as "processing" immediately so no other cron cycle picks it up
    await EmailBody.update({ classification: "processing" }, { where: { id: email.id } });

    try {
        // Extract inline images BEFORE stripping HTML
        const inlineImages = email.format === "html" ? extractBase64Images(email.body) : [];

        // Also load any attachments saved on disk for this email
        const dbAttachments = await EmailAttachment.findAll({
            where: { email_body_id: email.id },
            order: [["createdAt", "ASC"]],
        });

        const attachmentImages = [];
        const attachmentFiles = [];
        const MAX_INLINE_BYTES = 8 * 1024 * 1024; // 8MB safety cap per file

        for (const att of dbAttachments) {
            const mime = (att.mime_type || "").toLowerCase();
            const fullPath = path.join(__dirname, "..", att.storage_path);
            if (!fs.existsSync(fullPath)) continue;

            try {
                const buffer = fs.readFileSync(fullPath);
                if (!buffer) continue;

                // Skip huge files to avoid exceeding model limits
                if (buffer.length > MAX_INLINE_BYTES) {
                    log(`  ⚠ Skipping large attachment "${att.filename}" (${buffer.length} bytes)`);
                    continue;
                }

                const ext = mime.split("/")[1] || "bin";
                const base64 = buffer.toString("base64");

                if (mime.startsWith("image/") && buffer.length >= 1024) {
                    // Treat as additional image for multimodal extraction
                    attachmentImages.push({
                        ext,
                        buffer,
                        base64,
                        mimeType: mime,
                        context: `Attachment image file: ${att.filename}`,
                    });
                } else {
                    // Treat as generic document attachment (PDF, CSV, text, etc.)
                    attachmentFiles.push({
                        filename: att.filename,
                        mimeType: mime || "application/octet-stream",
                        base64,
                    });
                }
            } catch (e) {
                log(`  ⚠ Failed to read attachment "${att.filename}": ${e.message}`);
            }
        }

        const emailImages = [...inlineImages, ...attachmentImages];
        if (emailImages.length > 0) {
            log(`  🖼️  Found ${emailImages.length} image(s) (inline + attachments) in email`);
        }

        const cleanText = stripHtml(email.body);

        log(`  → Sending to Gemini (${GEMINI_MODEL}) ${emailImages.length > 0 ? `with ${emailImages.length} image(s)` : '(text only)'}${attachmentFiles.length > 0 ? ` + ${attachmentFiles.length} document attachment(s)` : ''}…`);
        const extracted = await extractProductsFromText(cleanText, emailImages, attachmentFiles);

        // SAFETY NET: If the API crashed or was busy, stop processing but DO NOT mark as processed
        if (extracted === null) {
            log(`  ⏳ API Overloaded. Resetting email id=${email.id} for the next cron cycle.`);
            await EmailBody.update({ classification: "none" }, { where: { id: email.id } });
            return;
        }

        if (!Array.isArray(extracted) || extracted.length === 0) {
            log(`  ✓ No products found — marking email id=${email.id} as junk`);
            await EmailBody.update({ classification: "spam" }, { where: { id: email.id } });
            return;
        }
        log(`  ✓ Extracted ${extracted.length} product(s)`);

        // NEW: Assume it's a perfect catalog match until proven wrong
        let allProductsInCatalog = true;
        let scrapeCount = 0; // Cap ChemScraper calls per email
        const scrapedCasSet = new Set(); // Track CAS numbers found by scraper to prevent duplicates
        const productRows = [];

        // CHANGED: Use for...of to allow async scraping inside the loop
        for (const item of extracted) {
            const normalizedAI = normalizeName(item.product_name);
            const extractedCas = item.cas_number ? item.cas_number.trim() : "";

            let match = null;
            let matchMethod = "none";

            // PRIORITY 1: Exact CAS Number match (most reliable)
            if (extractedCas && extractedCas !== "" && extractedCas !== "N/A" && extractedCas !== "UNKNOWN") {
                match = catalog.find(p => p.cas_number && p.cas_number.trim() === extractedCas);
                if (match) matchMethod = "CAS";
            }

            // PRIORITY 2: Exact normalized name match
            if (!match && normalizedAI) {
                match = catalog.find(p => p.normalized_name === normalizedAI);
                if (match) matchMethod = "exact-name";
            }

            // PRIORITY 2.5: Fuzzy name match (handles 1-2 letter differences)
            if (!match && normalizedAI && normalizedAI.length >= 4) {
                // TIGHTENED: Chemical names (Ser, Thr, Tyr, Asp) are too similar. 
                // We reduce tolerance to avoid structural mismatches.
                let maxDist = 0;
                if (normalizedAI.length >= 8) maxDist = 1;
                if (normalizedAI.length >= 20) maxDist = 2;
                let bestDist = Infinity;
                let bestFuzzy = null;
                for (const p of catalog) {
                    if (!p.normalized_name) continue;
                    // Only compare if lengths are close (avoids "acid" matching "benzoicacid")
                    if (Math.abs(p.normalized_name.length - normalizedAI.length) > maxDist) continue;
                    const dist = levenshtein(normalizedAI, p.normalized_name);
                    if (dist <= maxDist && dist < bestDist) {
                        bestDist = dist;
                        bestFuzzy = p;
                    }
                }
                if (bestFuzzy) {
                    match = bestFuzzy;
                    matchMethod = `fuzzy-name (${bestDist} edit${bestDist > 1 ? 's' : ''})`;
                }
            }

            // NEW: Always attempt to fetch from ChemScraper to ensure pricing is up-to-date
            // Cap at 10 ChemScraper calls per email to handle larger inquiries (approx 5-7 mins)
            if (scrapeCount < 20) {
                scrapeCount++;
                // Use CAS number for scraping if available (much more accurate), otherwise use name
                const searchTerm = (extractedCas && extractedCas !== "N/A" && extractedCas !== "UNKNOWN")
                    ? extractedCas
                    : (match && match.cas_number && match.cas_number !== "N/A" && match.cas_number !== "UNKNOWN")
                        ? match.cas_number
                        : item.product_name;

                log(`    🔍 Scraping "${item.product_name}" (Term: "${searchTerm}") to update prices...`);
                try {
                    const scrapeResults = await chemSearch(searchTerm);

                    // 1. Check for valid chemical details and VERIFY RELEVANCE
                    // Priority Hierarchy: 
                    //   1. If Gemini extracted a CAS: SCRAPED_CAS MUST MATCH EXTR_CAS (Overrides Name)
                    //   2. If Search Term is a CAS: SCRAPED_CAS MUST MATCH SEARCH_TERM
                    //   3. Else: Fallback to 3-tier Name Verification

                    const clean = (s) => (s || "").replace(/[^0-9-]/g, "").trim();
                    const cleanExtractedCas = (extractedCas && extractedCas !== "N/A" && extractedCas !== "UNKNOWN") ? clean(extractedCas) : null;
                    const cleanSearchTerm = clean(searchTerm);

                    const bestResult = scrapeResults.find(r => {
                        if (!r.result || !r.result.casNo || r.result.casNo === "N/A" || r.result.casNo === "Not Found" || !r.result.productName || r.result.productName === "Not Found") {
                            return false;
                        }

                        const scrapedCas = clean(r.result.casNo);

                        // --- PRIORITY 1: CAS-MATCH OVERRIDE ---
                        // If we have a target CAS from the email, a match is 100% confirmation
                        if (cleanExtractedCas) {
                            if (scrapedCas === cleanExtractedCas) {
                                return true; // Same product (Synonym or Match)
                            }
                            // Mismatch on target CAS? Reject even if name looks okay
                            log(`      ⛔ CAS mismatch: expected "${cleanExtractedCas}" but scraper returned "${scrapedCas}" — rejecting`);
                            return false;
                        }

                        // --- PRIORITY 2: SEARCH-TERM IS CAS ---
                        // If the search term itself was a CAS string
                        const isCasSearch = /^[0-9]{2,7}-[0-9]{2}-[0-9]$/.test(searchTerm);
                        if (isCasSearch) {
                            if (scrapedCas === cleanSearchTerm) {
                                return true;
                            }
                            log(`      ⛔ CAS mismatch: searched "${searchTerm}" but scraper returned "${scrapedCas}" — rejecting`);
                            return false;
                        }

                        // --- PRIORITY 3: NAME-BASED SEARCH fallback ---
                        // Only reached if we had no target CAS to verify against
                        const termNorm = normalizeName(searchTerm);
                        const scrapedNorm = normalizeName(r.result.productName);

                        // Tier 1: Substring
                        if (termNorm.length >= 4 && (scrapedNorm.includes(termNorm) || termNorm.includes(scrapedNorm))) {
                            return true;
                        }

                        // Tier 2: Word overlap
                        const overlap = wordOverlap(termNorm, scrapedNorm);
                        if (overlap >= 0.5) return true;

                        // Tier 3: Edit distance
                        const dist = levenshtein(termNorm, scrapedNorm);
                        const maxAllowedDist = Math.floor(Math.max(termNorm.length, scrapedNorm.length) * 0.3);
                        if (dist > maxAllowedDist) {
                            log(`      ⛔ Name mismatch: "${searchTerm}" vs scraped "${r.result.productName}" (dist=${dist}, max=${maxAllowedDist}) — rejecting CAS ${r.result.casNo}`);
                            return false;
                        }

                        return true;
                    });

                    // 2. Collect all valid prices across all results
                    const validPrices = [];
                    if (bestResult) {
                        for (const entry of scrapeResults) {
                            const siteRes = entry.result;
                            if (siteRes && siteRes.pricingOptions) {
                                for (const p of siteRes.pricingOptions) {
                                    if (p.price && /\d/.test(p.price) && !p.price.toLowerCase().includes("login")) {
                                        validPrices.push({ ...p, company: siteRes.company });
                                    }
                                }
                            }
                        }
                    }

                    // 3. ONLY proceed if we have BOTH details AND at least one price
                    if (bestResult && validPrices.length > 0) {
                        const res = bestResult.result;

                        // DEDUP: If this CAS was already scraped for a different product in this email, skip it
                        if (scrapedCasSet.has(res.casNo)) {
                            log(`      ⚠️ CAS ${res.casNo} already scraped for another product in this email — likely wrong result. Skipping.`);
                        } else {
                            scrapedCasSet.add(res.casNo);
                            log(`      ✅ Scraped details + ${validPrices.length} price(s) for "${item.product_name}"`);

                            let targetProductId = null;

                            // RE-CHECK: Does this CAS already exist in our catalog under a different name?
                            const existingByCas = catalog.find(p => p.cas_number && p.cas_number.trim() === res.casNo.trim());
                            if (existingByCas) {
                                log(`      🔗 CAS ${res.casNo} already in catalog as "${existingByCas.product_name}" — using existing product`);
                                match = existingByCas;
                                matchMethod = "CAS-via-ChemScraper";
                                targetProductId = existingByCas.id;
                                // Cache alias so the same name in this email doesn't trigger another scrape
                                catalog.push({ ...existingByCas, normalized_name: normalizedAI });
                            } else {
                                // Only create a new product if the CAS truly doesn't exist
                                try {
                                    // Prepare clean HSN code just in case
                                    let cleanHsnForNewProd = item.hsn_code ? String(item.hsn_code).replace(/\./g, "") : "N/A";

                                    const newProd = await Product.create({
                                        product_name: item.product_name || res.productName,
                                        cas_number: res.casNo,
                                        product_code: cleanHsnForNewProd,
                                        status: "active"
                                    });

                                    match = {
                                        id: newProd.id,
                                        product_name: newProd.product_name,
                                        cas_number: newProd.cas_number,
                                        product_code: newProd.product_code,
                                        normalized_name: normalizeName(newProd.product_name)
                                    };

                                    targetProductId = newProd.id;
                                    catalog.push(match);
                                    matchMethod = "ChemScraper";
                                } catch (dbErr) {
                                    logErr(`      ✗ Failed to save scraped product to DB:`, dbErr);
                                }
                            }

                            // ── ALWAYS SAVE PRICES if we have a target product ──
                            if (targetProductId) {
                                for (const p of validPrices) {
                                    try {
                                        const numericPrice = parseFloat(p.price.replace(/[^\d.]/g, ""));
                                        const qtyMatch = p.packSize.match(/([\d.]+)\s*(mg|gm|g|ml|kg|ltr|l)/i);

                                        if (numericPrice && qtyMatch) {
                                            let qty = parseFloat(qtyMatch[1]);
                                            let unit = qtyMatch[2].toLowerCase();
                                            if (unit === "g") unit = "gm";
                                            if (unit === "l") unit = "ltr";

                                            let currency = "INR";
                                            if (p.price && p.price.includes("$")) {
                                                currency = "USD";
                                            }

                                            let cleanedCompany = p.company || "Unknown";
                                            if (cleanedCompany.toLowerCase().startsWith("www.")) {
                                                cleanedCompany = cleanedCompany.substring(4);
                                            }
                                            if (cleanedCompany.toLowerCase().endsWith(".com")) {
                                                cleanedCompany = cleanedCompany.substring(0, cleanedCompany.length - 4);
                                            }

                                            // Format specific companies as requested
                                            const companyMap = {
                                                "tcichemicals": "TCI",
                                                "ambeed": "Ambeed",
                                                "sigmaaldrich": "Sigma",
                                                "bldpharm": "BLD"
                                            };
                                            const lowerCleaned = cleanedCompany.toLowerCase();
                                            if (companyMap[lowerCleaned]) {
                                                cleanedCompany = companyMap[lowerCleaned];
                                            }

                                            const existingPrice = await ProductPrices.findOne({
                                                where: {
                                                    productId: targetProductId,
                                                    company: cleanedCompany,
                                                    quantity: qty,
                                                    unit: unit
                                                }
                                            });

                                            if (existingPrice) {
                                                await existingPrice.update({
                                                    price: numericPrice,
                                                    currency: currency
                                                });
                                                log(`      🔄 Updated existing price for ${cleanedCompany} (${qty} ${unit}): ${currency} ${numericPrice}`);
                                            } else {
                                                await ProductPrices.create({
                                                    productId: targetProductId,
                                                    company: cleanedCompany,
                                                    price: numericPrice,
                                                    currency: currency,
                                                    quantity: qty,
                                                    unit: unit
                                                });
                                                log(`      ➕ Added new price for ${cleanedCompany} (${qty} ${unit}): ${currency} ${numericPrice}`);
                                            }
                                        }

                                    } catch (priceErr) {
                                        log(`      ⚠️ Price error for "${item.product_name}": ${priceErr.message}`);
                                    }
                                }
                            }
                        }
                    } else {
                        log(`      ✗ ChemScraper: ${!bestResult ? "No details found" : "No pricing available"}. Skipping catalog update.`);
                    }
                } catch (scrapeErr) {
                    logErr(`      ✗ ChemScraper Error:`, scrapeErr);
                }
            }

            // If STILL no match found, flip the gatekeeper switch to false
            if (!match) {
                allProductsInCatalog = false;
            }

            log(`    • "${item.product_name}" → match: ${match ? match.product_name : "NONE"} (via ${matchMethod})`);

            let rawUnit = (item.unit || "").toLowerCase().trim();
            const unitMap = {
                "litre": "ltr", "liter": "ltr", "litres": "ltr", "liters": "ltr", "g": "gm"
            };
            const normalizedUnit = unitMap[rawUnit] || rawUnit;

            const unit = VALID_UNITS.includes(normalizedUnit)
                ? normalizedUnit
                : "mg";

            // CRITICAL: Prioritize the local database's HSN code over Gemini's extracted code!
            let cleanHsnCode = null;
            if (match && match.product_code && match.product_code !== "N/A") {
                // If it exists in the catalog, USE THE CATALOG'S HSN CODE
                cleanHsnCode = String(match.product_code).replace(/\./g, "");
            } else if (item.hsn_code) {
                // If not in catalog, fallback to Gemini's extracted code
                cleanHsnCode = String(item.hsn_code).replace(/\./g, "");
            }

            productRows.push({
                product_name: item.product_name, // Always use the name the customer/Gemini requested!
                cas_number: match ? match.cas_number : (extractedCas || "UNKNOWN"),
                product_code: cleanHsnCode || "N/A",
                quantity_required: (typeof item.quantity === "number" && item.quantity > 0) ? item.quantity : 1,
                quantity_unit: unit,
                package_size: item.package_size || null,
                image_index: item.image_index ?? null,
                has_catalog_match: !!match, // Set to true if matched in catalog or scraped
            });
        }

        // THE MAGIC GATE: Only passes if ALL products were found (either in catalog or scraped) + have valid Name, CAS, and Quantity
        const isComplete = allProductsInCatalog && productRows.every(
            (p) => p.product_name && p.cas_number && p.cas_number !== "UNKNOWN" && p.quantity_required > 0
        );

        const stage = isComplete ? "technical_review" : "inquiry_received";
        const status = isComplete ? "forwarded" : "pending";
        log(`  ${isComplete ? "✅" : "⚠"} Data completeness: ${stage} / ${status}`);

        const t = await sequelize.transaction();
        try {
            const inquiry_number = await generateInquiryNumber();

            await Inquiry.create({
                inquiry_number,
                customer_name: email.sender_email.split("@")[0] || "Unknown",
                email: email.sender_email,
                email_body_id: email.id,
                current_stage: stage,
                inquiry_status: status,
                inquiry_by: "AI-Worker",
                inquiry_update_date: new Date(),
            }, { transaction: t });

            const productData = productRows.map((p) => ({ inquiry_number, ...p }));
            await InquiryProduct.bulkCreate(productData, { transaction: t });

            await EmailBody.update({ inquiry_created: true, classification: "inquiry" }, { where: { id: email.id }, transaction: t });

            await t.commit();
            log(`  ✅ Inquiry ${inquiry_number} created with ${productRows.length} product(s) — email id=${email.id} marked done`);

            // Save and assign images using Gemini's image_index mapping
            if (emailImages.length > 0) {
                try {
                    const savedPaths = saveImages(email.id, emailImages);
                    // Update products with Gemini-matched image_index
                    const createdProducts = await InquiryProduct.findAll({
                        where: { inquiry_number },
                        order: [['id', 'ASC']],
                    });
                    for (let i = 0; i < createdProducts.length; i++) {
                        const imgIdx = productRows[i]?.image_index;
                        if (imgIdx !== null && imgIdx !== undefined && savedPaths[imgIdx]) {
                            await createdProducts[i].update({ image_url: savedPaths[imgIdx] });
                            log(`    🖼️  Product "${createdProducts[i].product_name}" → image ${imgIdx}`);
                        }
                    }
                } catch (imgErr) {
                    log(`  ⚠️ Image save/assign failed (non-fatal): ${imgErr.message}`);
                }
            }
        } catch (err) {
            await t.rollback();
            throw err;
        }
    } catch (processingErr) {
        // UNLOCK: Reset classification back to 'none' so the email can be retried next cycle
        log(`  ✗ Processing failed for email id=${email.id}, resetting classification to 'none'`);
        await EmailBody.update({ classification: "none" }, { where: { id: email.id } }).catch(() => { });
        throw processingErr;
    }
}

// ── Main pipeline ────────────────────────────────────────────
let isRunning = false;

async function runPipeline() {
    if (isRunning) {
        log("Previous run still in progress — skipping this cycle");
        return;
    }
    isRunning = true;

    try {
        const emails = await EmailBody.findAll({
            where: { inquiry_created: false, classification: "none" },
            order: [["received_at", "ASC"]],
        });

        if (emails.length === 0) {
            log("No unprocessed emails found");
            return;
        }

        log(`Found ${emails.length} unprocessed email(s)`);
        const catalog = await buildProductCatalog();
        log(`Product catalog loaded — ${catalog.length} active product(s)`);

        for (let i = 0; i < emails.length; i++) {
            try {
                await processEmail(emails[i], catalog);
            } catch (err) {
                logErr(`  ✗ Failed to process email id=${emails[i].id}:`, err);
            }
            if (i < emails.length - 1) {
                log("  ⏳ Waiting 4s before next email (rate limit cooldown)…");
                await sleep(4000);
            }
        }
    } catch (err) {
        logErr("Pipeline error:", err);
    } finally {
        await chemCloseBrowser().catch(() => { });
        isRunning = false;
    }
}

// ── Schedule ─────────────────────────────────────────────────
log("========================================");
log("  AI Email-Parsing Worker starting up");
log(`  AI engine       : Google Gemini (${GEMINI_MODEL})`);
log(`  Cron schedule   : ${CRON_SCHEDULE}`);
log("========================================");

// Only run the cron schedule if it's run directly (not required as a module)
function startWorker() {
    runPipeline();
    cron.schedule(CRON_SCHEDULE, () => {
        log("⏰ Cron triggered");
        runPipeline();
    });
}

if (require.main === module) {
    startWorker();
}

// ── EXPORTS ──────────────────────────────────────────────────
module.exports = { processEmail, startWorker };