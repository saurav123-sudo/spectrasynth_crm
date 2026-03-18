const { Op } = require("sequelize");
const Inquiry = require("../models/Inquiry");
const InquiryProduct = require("../models/InquiryProduct");
const Quotation = require("../models/Quotation");
const QuotationProduct = require("../models/QuotationProduct");
const ProductPrice = require("../models/ProductPrices");
const Product = require("../models/Product");

exports.getProcessedInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.findAll({
      where: {
        current_stage: {
          [Op.ne]: "inquiry_received",
        },
      },
      include: [
        {
          model: InquiryProduct,
          as: "products",
          attributes: ["product_name", "cas_number"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Add product_names and cas_numbers arrays for frontend search
    const result = inquiries.map((inq) => {
      const json = inq.toJSON();
      json.product_names = (json.products || []).map((p) => p.product_name);
      json.cas_numbers = (json.products || [])
        .map((p) => p.cas_number)
        .filter((c) => c && c !== "N/A");
      return json;
    });

    res.status(200).json(result);
  } catch (err) {
    console.error("Error fetching processed inquiries:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
};
module.exports.createQuotation = async (req, res) => {
  const { inquiry_number } = req.params;
  console.log("Inquiry Number:", inquiry_number);

  const {
    quotation_number,
    quotation_by,
    date,
    total_price,
    gst,
    products,
    remark,
  } = req.body;

  try {
    if (
      !quotation_number ||
      !inquiry_number ||
      !quotation_by ||
      !date ||
      !products ||
      !products.length ||
      !total_price ||
      !gst
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const inquiry = await Inquiry.findOne({ where: { inquiry_number } });
    if (!inquiry) {
      return res.status(404).json({ message: "Inquiry not found" });
    }

    const user_id = req.user ? req.user.id : null;

    // ✅ Recalculate total_price and GST from products to ensure accuracy
    // Total price is sum of prices only (no multiplication with quantity) - per user preference
    const calculatedTotalPrice = products.reduce(
      (sum, p) => sum + (parseFloat(p.price) || 0),
      0
    );
    const calculatedGst = calculatedTotalPrice * 0.18; // 18% GST

    console.log("💰 Quotation Totals Calculation:");
    console.log("  - Frontend sent total_price:", total_price);
    console.log("  - Calculated total_price:", calculatedTotalPrice);
    console.log("  - Frontend sent gst:", gst);
    console.log("  - Calculated gst:", calculatedGst);

    // 🔹 Begin transaction
    const result = await Quotation.sequelize.transaction(async (t) => {
      // 1️⃣ Create the main quotation with recalculated totals
      const quotation = await Quotation.create(
        {
          quotation_number,
          inquiry_number,
          quotation_by,
          date,
          total_price: calculatedTotalPrice, // ✅ Use calculated value
          gst: calculatedGst, // ✅ Use calculated value
          quotation_pdf: null,
          remark,
          user_id,
        },
        { transaction: t }
      );

      const storedProducts = [];

      // 2️⃣ Loop through each product
      for (const productData of products) {
        const {
          product_name,
          cas_no,
          product_code,
          quantity,
          price,
          lead_time,
          quantity_unit,
          company,
        } = productData;

        //  Create QuotationProduct
        const qp = await QuotationProduct.create(
          {
            quotation_number: quotation.quotation_number,
            product_name,
            cas_number: cas_no,
            hsn_number: product_code,
            quantity,
            quantity_unit,
            price,
            lead_time,
          },
          { transaction: t }
        );

        storedProducts.push({ ...productData, qp_id: qp.id });

        // Find or create Product
        let productRecord = await Product.findOne({
          where: { product_name },
          transaction: t,
        });

        if (!productRecord) {
          productRecord = await Product.create(
            { product_name, cas_number: cas_no, product_code },
            { transaction: t }
          );
        } else {
          // Update existing product if it was previously saved with 'N/A'
          let updated = false;
          if (product_code && product_code !== "N/A" && product_code !== "MANUAL_REVIEW" && productRecord.product_code === "N/A") {
            productRecord.product_code = product_code;
            updated = true;
          }
          if (cas_no && cas_no !== "N/A" && cas_no !== "UNKNOWN" && productRecord.cas_number === "N/A") {
            productRecord.cas_number = cas_no;
            updated = true;
          }
          if (updated) {
            await productRecord.save({ transaction: t });
          }
        }

        // 💰 Find or update ProductPrice (same company, unit, quantity)
        const existingPrice = await ProductPrice.findOne({
          where: {
            productId: productRecord.id,
            company,
            unit: quantity_unit,
            quantity,
          },
          transaction: t,
        });

        if (existingPrice) {
          existingPrice.price = price;
          await existingPrice.save({ transaction: t });
        } else {
          await ProductPrice.create(
            {
              productId: productRecord.id,
              company,
              price,
              quantity,
              unit: quantity_unit,
            },
            { transaction: t }
          );
        }
      }

      return { quotation, storedProducts };
    });

    // 🔹 Update inquiry after transaction
    inquiry.technical_status = "forwarded";
    inquiry.current_stage = "management_review";
    inquiry.technical_update_date = new Date();
    if (req.user && req.user.name) {
      inquiry.technical_quotation_by = req.user.name;
    }

    await inquiry.save();

    res.status(201).json({
      message: "Quotation created successfully",
      quotation: result.quotation,
      products: result.storedProducts,
    });
  } catch (error) {
    console.error("Error creating quotation:", error);
    res.status(500).json({
      message: "Error creating quotation",
      error: error.message,
    });
  }
};


// Update technical status (only if pending) and set technical_update_date
exports.updateInquiryStatus = async (req, res) => {
  try {
    const { inquiry_number } = req.params;
    console.log(inquiry_number)

    const inquiry = await Inquiry.findOne({ where: { inquiry_number: inquiry_number } });
    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    // Only allow update if status is pending
    if (inquiry.technical_status === "forwarded") {
      return res.status(400).json({
        error: "Technical status is already forwarded and cannot be updated.",
      });
    }

    inquiry.technical_status = "forwarded";
    inquiry.current_stage = "management_review"
    inquiry.technical_update_date = new Date();

    if (req.user && req.user.name) {
      inquiry.technical_quotation_by = req.user.name;
    }
    await inquiry.save();

    res.json({ message: "Technical status updated successfully.", inquiry });
  } catch (error) {
    console.error("Error updating technical status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
