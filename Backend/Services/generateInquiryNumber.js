const Inquiry = require("../models/Inquiry");
const { Op } = require("sequelize");

const generateInquiryNumber = async () => {
  const t = await Inquiry.sequelize.transaction();
  try {
    const now = new Date();
    const yearYY = now.getFullYear().toString().slice(-2);
    const monthMM = String(now.getMonth() + 1).padStart(2, "0");
    const datePart = `${yearYY}${monthMM}`;
    const prefix = `SSPC-INQ-${datePart}-`;

    // Find the last inquiry with SSPC-INQ-YYMM-XXX format for this month
    const lastInquiry = await Inquiry.findOne({
      where: {
        inquiry_number: { [Op.like]: `${prefix}%` },
      },
      order: [["inquiry_number", "DESC"]],
      attributes: ["inquiry_number"],
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    let nextSeq = 1;
    if (lastInquiry) {
      const parts = lastInquiry.inquiry_number.split("-");
      const lastSeqPart = parseInt(parts[3], 10);
      if (!isNaN(lastSeqPart)) {
        nextSeq = lastSeqPart + 1;
      }
    }

    const newNumber = `${prefix}${String(nextSeq).padStart(3, "0")}`;
    await t.commit();
    return newNumber;
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

module.exports = generateInquiryNumber;
