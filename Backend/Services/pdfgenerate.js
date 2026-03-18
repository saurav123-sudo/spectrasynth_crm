const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

function numberToWords(num) {
  const converter = require("number-to-words");
  if (num === 0) return "Zero";
  return converter.toWords(num).replace(/\b\w/g, c => c.toUpperCase());
}

async function generateQuotationPDF(quotation, products, inquiry, revisionNumber = null) {
  const pdfDir = path.join(__dirname, "../uploads/quotations");
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  // Ensure revisionNumber is a number or null
  const revNum = (revisionNumber !== null && revisionNumber !== undefined && revisionNumber !== '')
    ? parseInt(revisionNumber)
    : null;

  // Set PDF filename based on revision number
  const fileName = revNum
    ? `${quotation.quotation_number}-Rev-${revNum}.pdf`
    : `${quotation.quotation_number}.pdf`;

  const pdfPath = path.join(pdfDir, fileName);

  // Build the display quotation number
  const displayQuotationNumber = revNum
    ? `${quotation.quotation_number}-REV-${revNum}`
    : quotation.quotation_number;

  // Debug logging
  console.log("🔍 PDF Generation Debug:");
  console.log("  - Quotation Number:", quotation.quotation_number);
  console.log("  - Revision Number (raw):", revisionNumber, "Type:", typeof revisionNumber);
  console.log("  - Revision Number (parsed):", revNum, "Type:", typeof revNum);
  console.log("  - Display Quotation Number:", displayQuotationNumber);

  // --- FIX STARTS HERE ---

  // 1. Define the logoPath variable.
  // This creates a correct, absolute path to your image file.
  const logoPath = path.join(__dirname, '../assests/Spectrasynthicon.png');

  // This block of code can now correctly find and read the file.
  let logoImage = '';
  if (fs.existsSync(logoPath)) {
    const logoFile = fs.readFileSync(logoPath);
    logoImage = `data:image/png;base64,${logoFile.toString('base64')}`;
  } else {
    console.log("Warning: Logo file not found at", logoPath);
  }
  // --- FIX ENDS HERE ---


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
  console.log("💰 PDF GST Calculation Debug:");
  console.log("  - Subtotal:", subtotal);
  console.log("  - Stored GST (quotation.gst):", quotation.gst);
  console.log("  - GST Amount (used):", gstAmount);
  console.log("  - GST Rate (display):", gstRate);
  console.log("  - Grand Total:", grandTotal);

  let productRowsHtml = products.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td style="text-align: left;">${p.product_name}</td>
      <td>${p.cas_no || "-"}</td>
      <td>${p.product_code || "-"}</td>
      <td>${p.quantity || "-"}</td>
      <td>${p.quantity_unit || "-"}</td>
      <td>${Number(p.price).toFixed(2)}</td>
      <td>${p.lead_time || "-"}</td>
    </tr>
  `).join("");

  const minRows = 5;
  const emptyRowsCount = minRows - products.length;
  if (emptyRowsCount > 0) {
    for (let i = 0; i < emptyRowsCount; i++) {
      productRowsHtml += `<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;
    }
  }

  const html = `
  <html>
    <head>
      <style>
        /* CSS styles remain the same as before */
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        body { font-family: 'Roboto', Arial, sans-serif; margin: 0; padding: 0; color: #333; -webkit-print-color-adjust: exact; }
        .page-container { width: 210mm; height: 297mm; margin: auto; padding: 1cm; box-sizing: border-box; display: flex; flex-direction: column; }
        .header-bar { background-color: #862c82 !important; height: 10px; width: 100%; }
        .main-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 0; border-bottom: 2px solid #e0e0e0; }
        .company-details { flex: 1; }
        .logo-container { display: flex; align-items: center; margin-bottom: 15px; }
        .logo-text { font-size: 26px; font-weight: bold; color: #862c82; margin-left: 10px; position: relative; }
        .logo-text span { font-size: 14px; font-weight: normal; color: #555; position: absolute; bottom: -15px; left: 2px; }
        .company-address { font-size: 13px; color: #555; line-height: 1.5; }
        .quotation-info { text-align: right; }
        .quotation-title { font-size: 28px; font-weight: 300; color: #a0a0a0; margin-bottom: 20px; }
        .quotation-fields div { font-size: 13px; padding: 4px 0; border-bottom: 1px solid #ccc; }
        .quotation-fields span { font-weight: 500; color: #000; margin-right: 15px; }
        .quoted-to { margin-top: 20px; font-size: 13px; line-height: 1.6; }
        .product-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        .product-table th, .product-table td { border: 1px solid #000; padding: 8px; text-align: center; }
        .product-table th { background-color: #e0e0e0 !important; font-weight: 500; }
        .bottom-section { display: flex; margin-top: 20px; width: 100%; justify-content: space-between; align-items: flex-start; }
        .terms-conditions { width: 55%; font-size: 10px; line-height: 1.5; }
        .terms-conditions strong { font-size: 11px; }
        .terms-conditions ul { padding-left: 15px; margin: 5px 0 0 0; list-style: none; }
        .terms-conditions li { padding-left: 15px; text-indent: -15px; }
        .terms-conditions li:before { content: '→'; padding-right: 5px; }
        .totals-section { width: 40%; }
        .totals-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .totals-table td { padding: 8px; border-bottom: 1px solid #e0e0e0; }
        .totals-table td:last-child { text-align: right; }
        .totals-table tr:last-child td { border-bottom: none; }
        .grand-total td { font-weight: bold; font-size: 14px; }
        .value-in-word { font-size: 12px; margin-top: 10px; }
        .footer { margin-top: auto; padding-top: 20px; text-align: right; }
        .signature { font-weight: bold; font-size: 14px; }
        .final-note { text-align: center; font-size: 11px; margin-top: 20px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="page-container">
        <div class="header-bar"></div>
        <div class="main-header">
          <div class="company-details">
            <div class="logo-container">
              
              <img src="${logoImage}" alt="Spectrasynth Logo" style="width: 60px; height: auto;">
              
              <div class="logo-text">Spectrasynth<span>Pharmachem</span></div>
            </div>
            <div class="company-address">
              <strong>Spectrasynth Pharmachem</strong><br>
              34, Shivbhumi Industrial Estate Vibhag 1,<br>
              Bakrol Bujrang, Bakrol Circle, Ahmedabad, Gujarat, 382430<br>
              <strong>GSTIN:</strong> 24AEQFS6522R1Z6
            </div>
          </div>
          <div class="quotation-info">
            <div class="quotation-title">QUOTATION</div>
            <div class="quotation-fields">
              <div><span>QUOTATION NO.</span>${displayQuotationNumber}</div>
              <div><span>DATE</span>${formattedDate}</div>
              <div><span>QUOTATION VALIDITY</span>15 Days</div>
            </div>
          </div>
        </div>

        <div class="quoted-to">
            <strong>QUOTED TO:</strong><br>${customerName}<br>${customerAddress}
        </div>
        <table class="product-table">
            <thead><tr><th>SI No</th><th>DESCRIPTION</th><th>CAS NO.</th><th>HSN CODE</th><th>QTY</th><th>Unit</th><th>Price in INR</th><th>Lead Time</th></tr></thead>
            <tbody>${productRowsHtml}</tbody>
        </table>
        <div class="bottom-section">
            <div class="terms-conditions">
                <strong>Terms and Condition-</strong><br>Please Read Terms & conditions:
                <ul>
                    <li>Payment Term: 30 Days from date of Delivery</li>
                    <li>Material will be supplied with its complete structure elucidation and Interpretation ie IR 1H-NMR, MASS, HPLC Purity, TGA,COA and Chromatographic purity (Please Inquir for any extra test required i.e C13 NMR,UV etc.)</li>
                    <li>Material will be Inhouse & supplied as per pharmacopoeia requirement with Data characterization (MOA with RRT required for Non-Pharmacopoeial Compounds) we cannot supply any pharmacopoeial Vials</li>
                    <li>Price valid for all impurities in single PO in specified quantity, For standalone product, please inquire for revise quotation</li>
                    <li>Quotation validity: 15 days</li>
                    <li>Most of shipment is made at ambient temperature unless required any product specific cold shipment. There would be additional cost of handling such shipment and this would be communicated on case to case basis depending on product.</li>
                    <li>Deliverables quoted are R&D products and are not suitable for human use. Spectrasynth pharmachem does not warrant the suitability of the deliverables for any other use.</li>
                    <li>Technical query will be accepted within a period of 30 days from delivery.</li>
                    <li>Subject to availability for Instock products/ Delivery of product would be subjected to successful outcome of Synthesis research efforts</li>
                </ul>
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
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
  });
  await browser.close();

  // Verify PDF was created
  if (fs.existsSync(pdfPath)) {
    console.log("✅ PDF generated successfully:", pdfPath);
    console.log("✅ PDF contains quotation number:", displayQuotationNumber);
  } else {
    console.error("❌ ERROR: PDF file was not created at:", pdfPath);
  }

  return `uploads/quotations/${fileName}`;
}

module.exports = { generateQuotationPDF };

