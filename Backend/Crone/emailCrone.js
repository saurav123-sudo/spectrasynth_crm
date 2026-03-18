const cron = require("node-cron");
const { fetchRecentEmails } = require("../Services/inquiryEmailfetch");

let isRunning = false;
let currentAccountIndex = 0;

/**
 * Parse email accounts from EMAIL_ACCOUNTS env var (JSON array).
 */
function getEmailAccounts() {
  const accountsJson = process.env.EMAIL_ACCOUNTS;
  if (accountsJson) {
    try {
      const accounts = JSON.parse(accountsJson);
      if (Array.isArray(accounts) && accounts.length > 0) {
        return accounts;
      }
    } catch (e) {
      console.error("❌ Failed to parse EMAIL_ACCOUNTS:", e.message);
    }
  }

  // Fallback to single account if no multi-account config is found
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return [{
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      host: process.env.IMAP_HOST || "imap.gmail.com",
      port: Number(process.env.IMAP_PORT) || 993
    }];
  }

  return [];
}

// Run every 1 minute — fetches from ONE account per cycle (round-robin)
// Account 1 → Account 2 → ... → Account 5 → Account 1 → ...
cron.schedule("* * * * *", async () => {
  if (isRunning) {
    console.log("⏳ Email fetch still running, skipping this cycle...");
    return;
  }
  isRunning = true;
  try {
    const accounts = getEmailAccounts();
    if (accounts.length === 0) {
      console.log("⚠️ No email accounts configured");
      return;
    }

    const account = accounts[currentAccountIndex];
    console.log(`📬 [${currentAccountIndex + 1}/${accounts.length}] Fetching from: ${account.user}`);

    try {
      await fetchRecentEmails(account);
    } catch (err) {
      console.error(`❌ Error fetching from ${account.user}:`, err.message);
    }

    // Move to next account for the next cycle
    currentAccountIndex = (currentAccountIndex + 1) % accounts.length;
  } catch (err) {
    console.error("❌ Email fetch cron error:", err.message);
  } finally {
    isRunning = false;
  }
});
