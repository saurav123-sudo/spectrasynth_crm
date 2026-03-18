/**
 * Ambeed custom price-font decoder.
 *
 * Ambeed encodes all prices server-side using a custom web-font (am-new2.woff)
 * that remaps ordinary Latin-extended Unicode characters to digit glyphs.
 * The API response contains these encoded characters; the browser renders them
 * as real numbers only because the custom CSS font is applied.
 *
 * Character mapping discovered by:
 *  1. Logging API charCodes for known products (salicylic acid, acetone, etc.)
 *  2. Cross-referencing with rendered screenshots (non-headless Puppeteer)
 *  3. Confirming via glyph-contour analysis of am-new2.woff (opentype.js)
 *
 * Price format: ł [digit…] ¶ Ê Ê  →  $ [digits] . 0 0
 * Prices always end in ".00" — only whole-dollar amounts are stored.
 */

const CHAR_MAP = {
  322: '$',   // ł  U+0142  lslash glyph
  182: '.',   // ¶  U+00B6  paragraph glyph (decimal point)
  202: '0',   // Ê  U+00CA  Ecircumflex glyph
  199: '1',   // Ç  U+00C7  Ccedilla glyph  (narrow, fewest path cmds)
  203: '2',   // Ë  U+00CB  Edieresis glyph
  167: '3',   // §  U+00A7  section glyph
  205: '4',   // Í  U+00CD  Iacute glyph
  255: '5',   // ÿ  U+00FF  ydieresis glyph
  242: '6',   // ò  U+00F2  ograve glyph   (2 contours)
  271: '7',   // ď  U+010F  dcaron glyph   (1 contour)
  243: '8',   // ó  U+00F3  oacute glyph   (3 contours → two holes)
  238: '9',   // î  U+00EE  icircumflex glyph (2 contours)
};

/**
 * Decodes an Ambeed-encoded price string into a human-readable price.
 *
 * @param {string} encoded  Raw pr_usd value from the product_price API
 * @returns {string}        Decoded price like "$29.00", or original string if undecoded
 */
function decodeAmbeedPrice(encoded) {
  if (!encoded || typeof encoded !== 'string') return encoded;

  // Fast check: if the string only contains printable ASCII it's already decoded
  if (/^[\x20-\x7E]+$/.test(encoded)) return encoded;

  let result = '';
  for (const char of encoded) {
    const code = char.charCodeAt(0);
    if (CHAR_MAP[code] !== undefined) {
      result += CHAR_MAP[code];
    } else {
      // Unknown char — fallback: keep the original to avoid silent corruption
      result += char;
    }
  }
  return result;
}

module.exports = { decodeAmbeedPrice };
