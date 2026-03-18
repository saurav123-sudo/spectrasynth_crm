const { Op } = require("sequelize");
const Inquiry = require("../models/Inquiry");
const Quotation = require("../models/Quotation");
const QuotationProduct = require("../models/QuotationProduct");
const InquiryProduct=require("../models/InquiryProduct");
exports.getProcessedInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.findAll({
      where: {
        current_stage: {
          [Op.notIn]: ["inquiry_received", "technical_review"],
        },
      },
      order: [["createdAt", "DESC"]],

      // ⭐ INCLUDE INQUIRY PRODUCTS WITH IMAGES
      include: [
        {
          model: InquiryProduct,
          as: "products",
          attributes: [
            "id",
            "product_name",
            "cas_number",
            "product_code",
            "quantity_required",
            "quantity_unit",
            "image_url"  // 👈 required
          ],
        },
      ],
    });

    // Convert to JSON
    const result = inquiries.map(inquiry => inquiry.toJSON());

    res.status(200).json(result);

  } catch (err) {
    console.error("Error fetching processed inquiries:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
};
