const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

function numberToWords(num) {
  const converter = require("number-to-words");
  if (num === 0) return "Zero";
  return converter.toWords(num).replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Generate PDF for quotation with revision number
 * @param {Object} quotation - Quotation data
 * @param {Array} products - Array of products to include
 * @param {Object} inquiry - Inquiry / customer info
 * @param {number} revisionNumber - Revision number
 * @returns {Promise<string>} - Relative path to generated PDF
 */
async function generateRevicedQuotationPDF(quotation, products, inquiry, revisionNumber = null) {
  const pdfDir = path.join(__dirname, "../uploads/quotations");
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

  // Set PDF filename based on revision number
  const pdfFileName = revisionNumber
    ? `${quotation.quotation_number}-Rev-${revisionNumber}.pdf`
    : `${quotation.quotation_number}.pdf`;
  const pdfPath = path.join(pdfDir, pdfFileName);

  // Logo handling
  const logoPath = path.join(__dirname, "../assests/Spectrasynthicon.png");
  let logoImage = "";
  if (fs.existsSync(logoPath)) {
    const logoFile = fs.readFileSync(logoPath);
    logoImage = `data:image/png;base64,${logoFile.toString("base64")}`;
  } else {
    console.log("Warning: Logo file not found at", logoPath);
  }

  const customerName = inquiry?.customer_name || "N/A";
  const customerAddress = inquiry?.address || "N/A";

  // Format date to dd-mm-yy
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2); // Get last 2 digits of year
    return `${day}-${month}-${year}`;
  };
  const formattedDate = formatDate(quotation.date);

  const subtotal = Number(quotation.total_price);
  // ✅ FIX: Use stored GST value directly as amount (not as percentage rate)
  // If GST is not stored, calculate as 18% of subtotal
  const gstAmount = Number(quotation.gst) || (subtotal * 0.18);
  const gstRate = 18; // Always display as 18% for standard GST
  const grandTotal = subtotal + gstAmount;
  const amountInWords = numberToWords(Math.round(grandTotal)) + " Rupees Only";

  // 🔍 Debug logging for GST calculation
  console.log("💰 Revision PDF GST Calculation Debug:");
  console.log("  - Subtotal:", subtotal);
  console.log("  - Stored GST (quotation.gst):", quotation.gst);
  console.log("  - GST Amount (used):", gstAmount);
  console.log("  - GST Rate (display):", gstRate);
  console.log("  - Grand Total:", grandTotal);

  let productRowsHtml = products
    .map(
      (p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td style="text-align: left;">${p.product_name}</td>
        <td>${p.cas_no || "-"}</td>
        <td>${p.product_code || "-"}</td>
        <td>${p.quantity || "-"}</td>
        <td>${p.quantity_unit || "-"}</td>
        <td>${Number(p.price).toFixed(2)}</td>
        <td>${p.lead_time || "-"}</td>
      </tr>`
    )
    .join("");

  const minRows = 5;
  const emptyRowsCount = minRows - products.length;
  if (emptyRowsCount > 0) {
    for (let i = 0; i < emptyRowsCount; i++) {
      productRowsHtml += `<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;
    }
  }

  // Your existing HTML template
  const html = `
  <html>
    <head>
      <style>
        /* Keep your CSS as it is */
      </style>
    </head>
    <body>
      <div class="page-container">
        <!-- HEADER, LOGO -->
        <div class="header-bar"></div>
        <div class="main-header">
          <div class="company-details">
            <div class="logo-container">
              <img src="${logoImage}" alt="Spectrasynth Logo" style="width: 60px; height: auto;">
              <div class="logo-text">Spectrasynth<span>Pharmachem</span></div>
            </div>
          </div>
          <div class="quotation-info">
            <div class="quotation-title">QUOTATION</div>
            <div class="quotation-fields">
              <div><span>QUOTATION NO.</span>${revisionNumber ? `${quotation.quotation_number}-REV-${revisionNumber}` : quotation.quotation_number}</div>
              <div><span>DATE</span>${formattedDate}</div>
            </div>
          </div>
        </div>
        <!-- CUSTOMER INFO -->
        <div class="quoted-to">
          <strong>QUOTED TO:</strong><br>${customerName}<br>${customerAddress}
        </div>
        <!-- PRODUCTS TABLE -->
        <table class="product-table">
          <thead>
            <tr><th>SI No</th><th>DESCRIPTION</th><th>CAS NO.</th><th>HSN CODE</th><th>QTY</th><th>Unit</th><th>Price in INR</th><th>Lead Time</th></tr>
          </thead>
          <tbody>${productRowsHtml}</tbody>
        </table>
        <!-- TOTALS & TERMS -->
        <div class="bottom-section">
          <div class="terms-conditions">
            <strong>Terms and Condition-</strong><br>Please Read Terms & conditions:
            <!-- Keep your terms list here -->
          </div>
          <div class="totals-section">
            <table class="totals-table">
              <tr><td>SUBTOTAL (INR)</td><td>${subtotal.toFixed(2)}</td></tr>
              <tr><td>GST ${gstRate}%</td><td>${gstAmount.toFixed(2)}</td></tr>
              <tr class="grand-total"><td>Grand Total</td><td>${grandTotal.toFixed(2)}</td></tr>
            </table>
            <div class="value-in-word"><strong>Value in Word:</strong> ${amountInWords}</div>
          </div>
        </div>
        <div class="footer"><div class="signature">Authorised Signatory</div></div>
        <div class="final-note">**This is computer generated document and not required any signature and stamp</div>
      </div>
    </body>
  </html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
  });
  await browser.close();

  return `uploads/quotations/${pdfFileName}`;
}

module.exports = { generateRevicedQuotationPDF };
