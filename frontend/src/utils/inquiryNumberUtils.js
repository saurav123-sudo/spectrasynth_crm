/**
 * Parse date from various formats (ISO, DD/MM/YYYY, en-IN locale, etc.)
 * Returns a valid Date or null if unparseable.
 */
function parseDateSafe(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (!isNaN(d.getTime())) return d;
  // Try DD/MM/YYYY or D/M/YYYY (e.g. "21/2/2026")
  const slashMatch = String(dateInput).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const parsed = new Date(year, parseInt(month, 10) - 1, parseInt(day, 10));
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/**
 * Format inquiry number for display as SSPC-INQ-YYMM-NNN
 * - Already in new format (SSPC-INQ-YYMM-NNN): return as-is
 * - Old format (INQ75): convert using createdAt/date → SSPC-INQ-YYMM-075
 * - If date is invalid: return original to avoid NaNaN
 */
export function formatInquiryNumberForDisplay(inquiryNumber, dateInput) {
  if (!inquiryNumber) return inquiryNumber || "";

  // Already in new format SSPC-INQ-YYMM-NNN
  if (/^SSPC-INQ-\d{4}-\d{3}$/.test(inquiryNumber)) {
    return inquiryNumber;
  }

  // Old format INQ + digits
  const match = inquiryNumber.match(/^INQ(\d+)$/i);
  if (match) {
    const seq = match[1];
    const date = parseDateSafe(dateInput) || new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    if (isNaN(year) || isNaN(month)) return inquiryNumber; // fallback to avoid NaNaN
    const yearYY = String(year).slice(-2);
    const monthMM = String(month).padStart(2, "0");
    const paddedSeq = String(parseInt(seq, 10)).padStart(3, "0");
    return `SSPC-INQ-${yearYY}${monthMM}-${paddedSeq}`;
  }

  return inquiryNumber;
}
