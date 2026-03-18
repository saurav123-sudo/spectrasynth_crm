const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const UPLOADS_DIR = path.join(__dirname, "../uploads");
const EMAIL_IMG_DIR = path.join(UPLOADS_DIR, "email-images");

function log(msg) {
    console.log(`[Image-Extractor] ${msg}`);
}

function extractBase64Images(htmlBody) {
    const images = [];
    if (!htmlBody) return images;

    const $ = cheerio.load(htmlBody);

    // PASS 1: Collect all valid image positions and mark them in the HTML
    const imgElements = [];
    $("img").each((i, el) => {
        const src = $(el).attr("src") || "";
        const match = src.match(/^data:image\/(png|jpeg|jpg|gif|webp|bmp);base64,(.+)$/i);
        if (match) {
            const ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
            const base64 = match[2];
            const buffer = Buffer.from(base64, "base64");
            if (buffer.length > 1024) {
                imgElements.push({ el, ext, base64, buffer, mimeType: `image/${match[1].toLowerCase()}` });
            }
        }
    });

    if (imgElements.length === 0) return images;

    // PASS 2: Get the full text of the HTML body, split by image positions
    // Replace each valid image with a unique marker
    imgElements.forEach((img, idx) => {
        $(img.el).replaceWith(`%%IMG_MARKER_${idx}%%`);
    });

    // Get the full text with markers
    const fullText = $("body").text();

    // Split by markers to get text segments between images
    const segments = fullText.split(/%%IMG_MARKER_(\d+)%%/);
    // segments = [textBefore0, "0", textBetween0and1, "1", textBetween1and2, "2", ...]

    imgElements.forEach((img, idx) => {
        let context = "";
        try {
            // The text BEFORE this image is at position idx*2 in segments
            const textBefore = (segments[idx * 2] || "").trim();
            // Take the last 300 chars of text before this image (most relevant)
            const relevantBefore = textBefore.length > 300
                ? "..." + textBefore.substring(textBefore.length - 300)
                : textBefore;
            // Also grab a bit of text after the image for context
            const textAfter = (segments[idx * 2 + 2] || "").trim().substring(0, 100);

            const parts = [];
            if (relevantBefore) parts.push(`BEFORE: "${relevantBefore}"`);
            if (textAfter) parts.push(`AFTER: "${textAfter}"`);
            context = parts.join(" | ");
        } catch (e) { /* ignore */ }

        images.push({
            ext: img.ext,
            buffer: img.buffer,
            base64: img.base64,
            mimeType: img.mimeType,
            context,
        });
    });

    return images;
}

/**
 * Save images to disk organized by email body ID.
 * Returns array of relative paths.
 */
function saveImages(emailBodyId, images) {
    if (images.length === 0) return [];

    const imgDir = path.join(EMAIL_IMG_DIR, String(emailBodyId));
    if (!fs.existsSync(imgDir)) {
        fs.mkdirSync(imgDir, { recursive: true });
    }

    const savedPaths = [];
    images.forEach((img, idx) => {
        const filename = `product_${idx + 1}_${Date.now()}.${img.ext}`;
        const fullPath = path.join(imgDir, filename);
        fs.writeFileSync(fullPath, img.buffer);
        savedPaths.push(`uploads/email-images/${emailBodyId}/${filename}`);
    });

    log(`📎 Saved ${savedPaths.length} image(s) for email id=${emailBodyId}`);
    return savedPaths;
}

module.exports = { extractBase64Images, saveImages };
