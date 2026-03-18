const Imap = require("imap");
const { simpleParser } = require("mailparser");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const quotedPrintable = require("quoted-printable");
const iconv = require("iconv-lite");

const Inquiry = require("../models/Inquiry");
const InquiryProduct = require("../models/InquiryProduct");
const EmailBody = require("../models/EmailBody");
const EmailAttachment = require("../models/EmailAttachment");
const generateInquiryNumber = require("./generateInquiryNumber");

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Persist all attachments from a parsed message to disk and record them in DB.
 * This mirrors Gmail's two-step "message + attachment payload" pattern on a fully parsed MIME tree.
 */
async function saveAttachments(attachments = [], emailBodyId = null) {
  if (!attachments || attachments.length === 0) return;

  for (const att of attachments) {
    if (!att || !att.content) continue;

    const originalName = att.filename || "attachment";
    const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filename = `${Date.now()}_${safeName}`;
    const storagePath = path.join("uploads", filename);

    // Mailparser has already walked MIME parts and decoded content,
    // mirroring Gmail's pattern of first fetching the message, then each attachment payload.
    fs.writeFileSync(path.join(uploadsDir, filename), att.content);

    if (emailBodyId) {
      await EmailAttachment.create({
        email_body_id: emailBodyId,
        filename: originalName,
        mime_type: att.contentType || null,
        size: att.size || null,
        storage_path: storagePath,
        is_inline: !!att.contentId,
      });
    }
  }
}

const fetchRecentEmails = (accountConfig = null) => {
  return new Promise((resolve, reject) => {
    // Use provided config or fall back to legacy single-account env vars
    const config = accountConfig || {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      host: process.env.IMAP_HOST,
      port: Number(process.env.IMAP_PORT),
    };

    console.log(`  📬 Fetching from: ${config.user}`);

    const imap = new Imap({
      user: config.user,
      password: config.pass,
      host: config.host,
      port: config.port,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 30000,
    });

    const openInbox = (cb) => imap.openBox("INBOX", false, cb);

    imap.once("ready", () => {
      openInbox((err) => {
        if (err) throw err;

        const today = new Date();
        const searchCriteria = [["SINCE", today.toISOString().split("T")[0]]];

        imap.search(searchCriteria, (err, results) => {
          if (err) return console.log("Search error:", err);
          if (!results.length) {
            console.log("📭 No recent emails");
            imap.end();
            return;
          }

          const f = imap.fetch(results, { bodies: "", struct: true });

          f.on("message", (msg) => {
            let buffer = "";
            let emailDate = null;

            msg.on("body", (stream) => {
              stream.on("data", (chunk) => (buffer += chunk.toString("utf8")));
            });

            msg.once("attributes", (attrs) => {
              emailDate = new Date(attrs.date || attrs.internalDate);
            });

            msg.once("end", async () => {
              try {
                if (!emailDate) return;

                // Skip emails older than 24 hours (catch-up window for restarts/round-robin)
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                if (emailDate < twentyFourHoursAgo) return;

                const parsed = await simpleParser(buffer);
                const { text, html, attachments, subject, messageId } = parsed;

                // ── Deduplication: skip if this Message-ID is already stored ──
                if (messageId) {
                  const existing = await EmailBody.findOne({ where: { message_id: messageId } });
                  if (existing) {
                    console.log(`⏭️  Skipping duplicate email (Message-ID already saved): ${messageId}`);
                    return;
                  }
                }

                const customer_name = parsed.from?.value?.[0]?.name || "Unknown";
                const sender_email =
                  parsed.from?.value?.[0]?.address || "unknown@example.com";

                let emailHTML = html || "";

                // Handle quoted-printable encoding
                const headers = parsed.headers || new Map();
                let contentType = headers.get("content-type");
                if (contentType && typeof contentType !== "string") {
                  contentType = contentType.value || "";
                }

                const isQuotedPrintable =
                  typeof contentType === "string" &&
                  contentType.toLowerCase().includes("quoted-printable");

                if (!emailHTML && text) {
                  emailHTML = `<pre>${text}</pre>`;
                }

                if (isQuotedPrintable && emailHTML.includes("=")) {
                  const decoded = quotedPrintable.decode(emailHTML);
                  emailHTML = iconv.decode(decoded, "windows-1252");
                }

                /*
                // ===============================
                // 🔍 LEGACY INQUIRY DETECTION (DISABLED)
                // ===============================
                // This old code used to directly create inquiries if a table was found.
                // We've disabled it so all emails drop down to the EmailBody table
                // for the AI Worker to process instead.
                if (emailHTML.includes("<table")) {
                  const $ = cheerio.load(emailHTML);
                  const firstTable = $("table").first();
                  const tableHeader = firstTable.text().toLowerCase();

                  const isInquiryTable =
                    tableHeader.includes("name") &&
                    tableHeader.includes("cas") &&
                    (tableHeader.includes("qty") ||
                      tableHeader.includes("quantity"));

                  if (isInquiryTable) {
                    console.log("📋 Inquiry email detected (Skipped by AI Worker rules!)");
                    // return; // ❗ Old exit point
                  }
                }
                */

                // ===============================
                // 🧾 NORMAL EMAIL (SAVE ONCE)
                // ===============================
                console.log("🟢 Saving normal email ONCE");

                const emailRecord = await EmailBody.create({
                  message_id: messageId || null,
                  sender_email,
                  subject: subject ? subject.substring(0, 255) : "No Subject",
                  body: emailHTML || text,
                  format: html ? "html" : "plain",
                });
                // Save every attachment (images, PDFs, etc.) that was parsed off the message and link to this email.
                await saveAttachments(attachments, emailRecord.id);

                console.log("📧 Saved normal email (no inquiry table).");
              } catch (err) {
                console.error("❌ Error processing email:", err);
              }
            });
          });

          f.once("end", () => {
            console.log("✅ All recent emails processed.");
            imap.end(); // ✅ Close connection AFTER fetch completes
          });
        });
      });
    });

    imap.once("error", (err) => {
      console.log("❌ IMAP Error:", err);
      reject(err);
    });
    imap.once("end", () => resolve());
    imap.connect();
  }); // end Promise
};

module.exports = { fetchRecentEmails };
