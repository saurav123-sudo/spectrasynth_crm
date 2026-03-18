const express = require("express");

const path = require("path");

const router = express.Router();
const Quotation = require("../models/Quotation");
const QuotationProduct = require("../models/QuotationProduct");
const Product = require("../models/Product");
const Inquiry = require("../models/Inquiry");
const QuotationRevision = require("../models/QuotationRevision")
const ProductPrice = require("../models/ProductPrices");
const User = require("../models/User");
const InquiryProduct = require("../models/InquiryProduct");
const { generateQuotationPDF } = require("../Services/pdfgenerate");
const nodemailer = require("nodemailer");
const fs = require("fs");
const QuotationReviced = require("../models/QuotationReviced");
const { Op } = require("sequelize");
// const {generateRevicedQuotationPDF} =require("../services/reviceePdfgeneration")


exports.createQuotation = async (req, res) => {
  const { inquiry_number } = req.params;
  console.log("Email Unique ID:", inquiry_number);

  const {
    quotation_number,
    quotation_by,
    date,
    total_price,
    gst,
    products,
    remark
  } = req.body;

  // Assuming you have user info in req.user from auth middleware
  const user_id = req.user ? req.user.id : null;

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

    // Fetch inquiry's internal ID
    const inquiry_id = await Inquiry.findOne({
      where: { inquiry_number },
      attributes: ["id"],
    }).then((inq) => (inq ? inq.id : null));

    if (!inquiry_id) {
      return res.status(404).json({ message: "Inquiry not found" });
    }

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

    const result = await Quotation.sequelize.transaction(async (t) => {
      // Create quotation with user_id and recalculated totals
      const quotation = await Quotation.create(
        {
          quotation_number,
          inquiry_number: inquiry_id, // store inquiry internal ID
          quotation_by,
          date,
          total_price: calculatedTotalPrice, // ✅ Use calculated value
          gst: calculatedGst, // ✅ Use calculated value
          quotation_pdf: null,
          remark,
          user_id, // <-- store user_id here
        },
        { transaction: t }
      );

      let storedProducts = [];

      for (const productData of products) {
        const { product_name, cas_no, product_code, company_name, quantity, quantity_unit, price, lead_time } = productData;

        const qp = await QuotationProduct.create(
          {
            quotation_number: quotation.quotation_number,
            product_name,
            cas_number: cas_no,
            hsn_number: product_code,
            company_name,
            quantity,
            quantity_unit,
            price,
            lead_time,
          },
          { transaction: t }
        );

        storedProducts.push({ ...productData, qp_id: qp.id });
      }

      const inquiry = await Inquiry.findOne({ where: { id: quotation.inquiry_number } });

      // Generate PDF
      const pdfPath = await generateQuotationPDF(quotation, products, inquiry);

      quotation.quotation_pdf = pdfPath;
      await quotation.save({ transaction: t });

      return { quotation, storedProducts };
    });

    res.status(201).json({
      message: "Quotation created successfully",
      quotation: result.quotation,
      products: result.storedProducts,
    });
  } catch (error) {
    console.error("Error creating quotation:", error);
    res.status(500).json({ message: "Error creating quotation", error: error.message });
  }
};




exports.getLastQuotationNumber = async (req, res) => {
  try {
    const lastQuotation = await Quotation.findOne({
      order: [["createdAt", "DESC"]],
      attributes: ["quotation_number"],
    });

    if (!lastQuotation) {
      return res.json({ lastQuotationNumber: null });
    }

    res.json({ lastQuotationNumber: lastQuotation.quotation_number });
  } catch (error) {
    console.error("Error fetching last quotation number:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


exports.getQuotationByNumber = async (req, res) => {
  try {
    const { quotation_number } = req.params;

    const requestingUserId = req.user?.id;
    if (!requestingUserId) {
      return res.status(401).json({ message: "Unauthorized: No user info" });
    }

    const quotation = await Quotation.findOne({
      where: { quotation_number },
      include: [
        {
          model: QuotationProduct,
          as: "quotation_products",
        },
        {
          model: Inquiry,
          as: "inquiry",
          include: [
            {
              model: InquiryProduct,
              as: "products",
              attributes: [
                "id",
                "product_name",
                "image_url",
                "cas_number",
                "product_code",
                "quantity_required",
                "quantity_unit",
                "package_size"
              ],
            },
          ],
        },
      ],
    });

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    const result = quotation.toJSON();
    result.products = result.quotation_products || [];
    const inquiryProducts = result.inquiry?.products || [];

    // Fetch stock info from Products table
    const productNames = result.products.map(qp => qp.product_name);
    const catalogProducts = await Product.findAll({
      where: { product_name: { [Op.in]: productNames } },
      attributes: ["product_name", "stock", "stock_unit"]
    });

    // ⭐ MATCH AND ADD image_url + stock to quotation_products
    result.products = result.products.map(qp => {
      const matched = inquiryProducts.find(
        ip => ip.product_name.toLowerCase() === qp.product_name.toLowerCase()
      );
      const catalogMatch = catalogProducts.find(
        cp => cp.product_name.toLowerCase() === qp.product_name.toLowerCase()
      );

      return {
        ...qp,
        image_url: matched?.image_url?.replace(/^uploads\//, "api/image/") || null,
        package_size: matched?.package_size || null,
        stock: catalogMatch?.stock || null,
        stock_unit: catalogMatch?.stock_unit || null
      };
    });

    if (requestingUserId !== quotation.user_id) {
      result.company_name = undefined;
      result.company_email_id = undefined;
    }

    res.status(200).json({
      message: "Quotation fetched successfully",
      data: result,
    });

  } catch (error) {
    console.error("Error fetching quotation:", error);
    res.status(500).json({
      message: "Error fetching quotation",
      error: error.message,
    });
  }
};



exports.getAllQuotations = async (req, res) => {
  try {
    const quotations = await Quotation.findAll({
      attributes: [
        "quotation_number",
        "date",
        "quotation_by",
        "total_price",
        "gst",
        "remark",
        "quotation_status",
        "quotation_pdf"
      ],
      include: [
        {
          model: Inquiry,
          as: "inquiry",
          attributes: [
            "inquiry_number",
            "customer_name",
            "current_stage",
            "management_status",
            "technical_update_date",
            "technical_quotation_by",
            "createdAt"
          ],
        },
        {
          model: QuotationProduct,
          as: "quotation_products",
          attributes: ["product_name", "cas_number"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Add product_names and cas_numbers for frontend search
    const result = quotations.map((q) => {
      const json = q.toJSON();
      const products = json.quotation_products || [];
      json.product_names = products.map((p) => p.product_name);
      json.cas_numbers = products
        .map((p) => p.cas_number)
        .filter((c) => c && c !== "N/A");
      delete json.quotation_products; // keep response clean
      return json;
    });

    res.status(200).json({
      message: "Quotations fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching quotations:", error);
    res.status(500).json({ message: "Error fetching quotations", error: error.message });
  }
};


// Delete quotation
exports.deleteQuotation = async (req, res) => {
  try {
    const { quotation_number } = req.params;

    const quotation = await Quotation.findByPk(quotation_number);
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    await QuotationProduct.destroy({
      where: { quotation_number: quotation.quotation_number },
    });

    await quotation.destroy();

    res.status(200).json({ message: "Quotation deleted successfully" });
  } catch (error) {
    console.error("Error deleting quotation:", error);
    res.status(500).json({ message: "Error deleting quotation", error: error.message });
  }
};

exports.sendQuotationEmail = async (req, res) => {
  try {
    const { id: quotation_number } = req.params;

    // Fetch quotation and related inquiry
    const quotation = await Quotation.findOne({
      where: { quotation_number },
      include: [
        {
          model: Inquiry,
          as: "inquiry",
          attributes: ["inquiry_number", "email"],
        },
      ],
    });

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    const recipientEmail = quotation.inquiry?.email;
    if (!recipientEmail) {
      return res.status(400).json({ message: "No email linked to this quotation" });
    }

    // Define path to quotation file
    const filePath = path.join(
      __dirname,
      "..",
      "uploads",
      "quotations",
      `${quotation.quotation_number}.pdf`
    );

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ message: "Quotation file not found" });
    }

    // Nodemailer configuration
    const transporter = nodemailer.createTransport({
      service: "Gmail", // or your email service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: `Quotation ${quotation.quotation_number}`,
      text: `Hello,\n\nPlease find attached your quotation ${quotation.quotation_number}.\n\nRegards,\nTeam`,
      attachments: [
        {
          filename: `${quotation.quotation_number}.pdf`,
          path: filePath,
        },
      ],
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Update quotation email fields
    await Quotation.update(
      {
        email_sent_date: new Date(),
        email_sent_by: req.user.name,
        quotation_status: "send_email"
      },
      { where: { quotation_number } }
    );

    const inquiry_number = quotation.inquiry.inquiry_number;
    if (inquiry_number) {
      await Inquiry.update(
        { quotation_status: "forwarded" },
        { where: { inquiry_number: inquiry_number } }
      );
    }

    res.json({
      message: "Quotation sent successfully, email info updated, and related inquiry forwarded",
    });
  } catch (error) {
    console.error("Error sending quotation email:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.editQuotation = async (req, res) => {
  const { quotation_number } = req.params;
  const {
    quotation_by,
    date,
    total_price,
    gst,
    products,
    remark,
    company_name,        // ✅ Added
    company_email_id,    // ✅ Added
  } = req.body;

  const user_id = req.user ? req.user.id : null;

  try {
    if (!quotation_number || !products || !products.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const quotation = await Quotation.findOne({
      where: { quotation_number },
      include: [{ model: Inquiry, as: "inquiry" }],
    });

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    // ✅ Recalculate total_price and GST from products to ensure accuracy
    // Total price is sum of prices only (no multiplication with quantity) - per user preference
    const calculatedTotalPrice = products.reduce(
      (sum, p) => sum + (parseFloat(p.price) || 0),
      0
    );
    const calculatedGst = calculatedTotalPrice * 0.18; // 18% GST

    console.log("💰 Edit Quotation Totals Calculation:");
    console.log("  - Frontend sent total_price:", total_price);
    console.log("  - Calculated total_price:", calculatedTotalPrice);
    console.log("  - Frontend sent gst:", gst);
    console.log("  - Calculated gst:", calculatedGst);

    const result = await Quotation.sequelize.transaction(async (t) => {
      // ✅ Update quotation details with recalculated totals
      quotation.quotation_by = quotation_by || quotation.quotation_by;
      quotation.date = date || quotation.date;
      quotation.total_price = calculatedTotalPrice; // ✅ Use calculated value
      quotation.gst = calculatedGst; // ✅ Use calculated value
      quotation.remark = remark || quotation.remark;
      quotation.quotation_status = "finalise";
      quotation.user_id = user_id || quotation.user_id;

      // ✅ Added company details update
      quotation.company_name = company_name || quotation.company_name;
      quotation.company_email_id = company_email_id || quotation.company_email_id;

      await quotation.save({ transaction: t });

      // ✅ Update linked inquiry (unchanged)
      const inquiry = quotation.inquiry;
      if (inquiry) {
        inquiry.management_status = "forwarded";
        inquiry.current_stage = "finalize_quotation";
        inquiry.management_update_date = new Date();
        inquiry.marketing_quotation_by = quotation_by || inquiry.marketing_quotation_by;
        await inquiry.save({ transaction: t });
      }

      // ✅ Handle quotation products
      const existingProducts = await QuotationProduct.findAll({
        where: { quotation_number },
        transaction: t,
      });
      const existingProductMap = new Map(existingProducts.map((p) => [p.id, p]));
      const updatedProductIds = [];

      for (const productData of products) {
        const {
          qp_id,
          product_name,
          cas_no,
          product_code,
          quantity,
          price,
          lead_time,
          quantity_unit,
        } = productData;

        // ✅ Ensure product record exists
        let productRecord = await Product.findOne({
          where: { product_name },
          transaction: t,
        });

        if (!productRecord) {
          productRecord = await Product.create(
            {
              product_name,
              cas_number: cas_no,
              product_code,
            },
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

        // ✅ Update existing quotation product or create new one
        if (qp_id && existingProductMap.has(qp_id)) {
          const product = existingProductMap.get(qp_id);
          await product.update(
            {
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
          updatedProductIds.push(qp_id);
        } else {
          const newProduct = await QuotationProduct.create(
            {
              quotation_number,
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
          updatedProductIds.push(newProduct.id);
        }

        // ✅ Update or create ProductPrice for Spectrasynth RND
        const company = "Ref.Quo.Price";
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

      // ✅ Delete removed quotation products
      const productsToDelete = existingProducts.filter(
        (p) => !updatedProductIds.includes(p.id)
      );
      if (productsToDelete.length > 0) {
        const deleteIds = productsToDelete.map((p) => p.id);
        await QuotationProduct.destroy({
          where: { id: deleteIds },
          transaction: t,
        });
      }

      // ✅ Regenerate PDF
      const updatedProducts = await QuotationProduct.findAll({
        where: { quotation_number },
        transaction: t,
      });

      // ✅ Transform database fields to match PDF generator expectations
      const productsForPDF = updatedProducts.map(p => ({
        ...p.toJSON(),
        cas_no: p.cas_number,  // Map cas_number to cas_no
        product_code: p.hsn_number  // Map hsn_number to product_code
      }));

      const pdfPath = await generateQuotationPDF(quotation, productsForPDF, inquiry);
      quotation.quotation_pdf = pdfPath;
      await quotation.save({ transaction: t });

      return { quotation, updatedProducts };
    });

    res.status(200).json({
      message: "Quotation updated successfully with ProductPrice synchronization",
      quotation: result.quotation,
      products: result.updatedProducts,
    });
  } catch (error) {
    console.error("Error updating quotation:", error);
    res.status(500).json({
      message: "Error updating quotation",
      error: error.message,
    });
  }
};



// Get latest quotation by inquiry_number
exports.getLatestQuotationByInquiry = async (req, res) => {
  try {
    const { inquiry_number } = req.params;

    const quotation = await Quotation.findOne({
      where: { inquiry_number },
      include: [
        {
          model: QuotationProduct,
          as: "quotation_products",
        },
        {
          model: Inquiry,
          as: "inquiry",
          include: [
            {
              model: InquiryProduct,
              as: "products",
              attributes: [
                "product_name",
                "image_url",
                "cas_number",
                "product_code",
                "quantity_required",
                "quantity_unit",
                "package_size"
              ]
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    if (!quotation) {
      return res.status(404).json({ message: "No quotation found for this inquiry" });
    }

    const result = quotation.toJSON();

    // Convert quotation_products to products[]
    const quotationProducts = result.quotation_products || [];
    const inquiryProducts = result.inquiry?.products || [];

    // Fetch stock info from Products table
    const productNames = quotationProducts.map(qp => qp.product_name);
    const catalogProducts = await Product.findAll({
      where: { product_name: { [Op.in]: productNames } },
      attributes: ["product_name", "stock", "stock_unit"]
    });

    // ⭐ MATCH BY PRODUCT NAME & ADD image_url + stock EXACTLY LIKE OTHER API
    result.products = quotationProducts.map(qp => {
      const matched = inquiryProducts.find(
        ip => ip.product_name.toLowerCase() === qp.product_name.toLowerCase()
      );
      const catalogMatch = catalogProducts.find(
        cp => cp.product_name.toLowerCase() === qp.product_name.toLowerCase()
      );

      return {
        ...qp,
        image_url: matched?.image_url?.replace(/^uploads\//, "api/image/") || null,
        package_size: matched?.package_size || null,
        stock: catalogMatch?.stock || null,
        stock_unit: catalogMatch?.stock_unit || null
      };
    });

    res.status(200).json({
      message: "Latest quotation fetched",
      data: result
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



exports.getAllProcessQuotations = async (req, res) => {
  try {
    const quotations = await Quotation.findAll({
      where: {
        quotation_status: { [Op.ne]: "Temp. Quatation" } // ❌ not equal
      },
      attributes: [
        "quotation_number",
        "date",
        "quotation_by",
        "total_price",
        "gst",
        "remark",
        "quotation_status",
        "email_sent_date"
      ],
      include: [
        {
          model: Inquiry,
          as: "inquiry",
          attributes: [
            "inquiry_number",
            "customer_name",
            "current_stage",
            "management_status",
            "technical_update_date",
            "technical_quotation_by"
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      message: "Quotations fetched successfully",
      data: quotations,
    });
  } catch (error) {
    console.error("Error fetching quotations:", error);
    res.status(500).json({ message: "Error fetching quotations", error: error.message });
  }
};

exports.reviseQuotation = async (req, res) => {
  try {
    const { quotation_number } = req.params;
    const updates = req.body;

    // Use authenticated user for changed_by
    const changed_by = req.user?.name || "System";

    const quotation = await Quotation.findOne({
      where: { quotation_number },
      include: [{ model: QuotationProduct, as: "quotation_products" }],
    });

    if (!quotation)
      return res.status(404).json({ message: "Quotation not found" });

    // Update main quotation fields
    const quotationFields = { ...updates };
    delete quotationFields.products;
    await quotation.update(quotationFields);

    // Handle products
    if (updates.products) {
      const existingProducts = quotation.quotation_products;
      const updatedProducts = updates.products;

      const existingIds = existingProducts.map((p) => p.id);
      const incomingIds = updatedProducts.map((p) => p.id).filter(Boolean);

      // Delete removed products
      const productsToDelete = existingProducts.filter(
        (p) => !incomingIds.includes(p.id)
      );

      for (const prod of productsToDelete) {
        await QuotationRevision.create({
          product_id: prod.id,
          field_name: "DELETED_PRODUCT",
          old_value: JSON.stringify({
            product_name: prod.product_name,
            cas_no: prod.cas_number,
            hsn_no: prod.hsn_number,
            quantity: prod.quantity,
            price: prod.price,
            lead_time: prod.lead_time,
          }),
          new_value: null,
          changed_by,
        });
        await QuotationProduct.destroy({ where: { id: prod.id } });
      }

      // Add or update products
      for (const product of updatedProducts) {
        if (product.id) {
          const existing = existingProducts.find((p) => p.id === product.id);
          const changedFields = [];

          for (const key of ["quantity", "price", "lead_time"]) {
            const oldVal = existing[key] ?? null;
            const newVal = product[key] ?? null;
            if (String(oldVal) !== String(newVal)) {
              changedFields.push({
                product_id: product.id,
                field_name: key,
                old_value: oldVal !== null ? String(oldVal) : null,
                new_value: newVal !== null ? String(newVal) : null,
                changed_by,
              });
            }
          }

          if (changedFields.length > 0) {
            await Promise.all(
              changedFields.map((change) => QuotationRevision.create(change))
            );

            await QuotationProduct.update(
              {
                quantity: product.quantity,
                price: product.price,
                lead_time: product.lead_time,
              },
              { where: { id: product.id } }
            );
          }
        } else {
          const newProduct = await QuotationProduct.create({
            product_name: product.product_name || "",
            cas_number: product.cas_no || "",
            hsn_number: product.hsn_no || "",
            quantity: product.quantity || 0,
            price: product.price || 0,
            lead_time: product.lead_time || "",
            quotation_id: quotation.id,
            quotation_number: quotation.quotation_number,
          });

          await QuotationRevision.create({
            product_id: newProduct.id,
            field_name: "NEW_PRODUCT",
            old_value: null,
            new_value: JSON.stringify({
              product_name: newProduct.product_name,
              cas_no: newProduct.cas_number,
              hsn_no: newProduct.hsn_number,
              quantity: newProduct.quantity,
              price: newProduct.price,
              lead_time: newProduct.lead_time,
            }),
            changed_by,
          });
        }
      }
    }

    res.json({ message: "Quotation updated successfully with revisions logged" });
  } catch (error) {
    console.error("Error updating quotation:", error);
    res.status(500).json({ message: "Error updating quotation", error });
  }
};



exports.getRevisionsByQuotationNumber = async (req, res) => {
  try {
    const { quotation_number } = req.params;
    console.log(quotation_number)

    // Find all products of the quotation
    const products = await QuotationProduct.findAll({
      where: { quotation_number },
      attributes: ["id", "product_name"],
    });

    if (!products.length) {
      return res.status(404).json({ message: "No products found for this quotation" });
    }

    const productIds = products.map((p) => p.id);

    // Get revisions for those product IDs
    const revisions = await QuotationRevision.findAll({
      where: { product_id: productIds },
      include: [
        {
          model: QuotationProduct,
          attributes: ["product_name", "cas_number", "hsn_number"],
        },
      ],
      order: [["changed_at", "DESC"]],
    });

    res.json({ quotation_number, revisions });
  } catch (error) {
    console.error("Error fetching revisions:", error);
    res.status(500).json({ message: "Error fetching revisions", error });
  }
};



exports.postReviseQuotation = async (req, res) => {
  try {
    const { quotation_number } = req.params;
    const { product_id, changes, changed_by } = req.body;

    // 1️⃣ Fetch latest revision number
    const latestRevision = await QuotationReviced.findOne({
      where: { quotation_number },
      order: [["revision_number", "DESC"]],
    });
    const nextRevisionNumber = latestRevision ? latestRevision.revision_number + 1 : 1;

    // 2️⃣ Fetch quotation and products
    const quotation = await Quotation.findOne({
      where: { quotation_number },
      include: [
        { model: QuotationProduct, as: "quotation_products" },
        { model: Inquiry, as: "inquiry" }
      ],
    });
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    // Debug: Check if quotation_products is loaded
    if (!quotation.quotation_products) {
      console.warn("⚠️ quotation_products is not loaded, fetching separately...");
      quotation.quotation_products = await QuotationProduct.findAll({
        where: { quotation_number }
      });
    }

    // Ensure it's an array
    if (!Array.isArray(quotation.quotation_products)) {
      console.warn("⚠️ quotation_products is not an array:", typeof quotation.quotation_products);
      quotation.quotation_products = [];
    }

    // 3️⃣ Prepare revised product data (in memory)
    const revisedProducts = quotation.quotation_products.map((p) => {
      const updatedItem = changes.items.find((i) => i.id === p.id);
      if (updatedItem) {
        return {
          ...p.toJSON(),
          product_name: updatedItem.product_name,
          cas_no: updatedItem.cas_no,
          hsn_no: updatedItem.hsn_no,
          quantity: updatedItem.quantity,
          price: updatedItem.price,
          lead_time: updatedItem.lead_time,
          company_name: updatedItem.company_name,
        };
      }
      return p.toJSON();
    });

    // 3.5️⃣ Calculate new total_price and GST from revised products
    // ✅ Total price is sum of prices only (no multiplication with quantity) - per user preference
    const newTotalPrice = revisedProducts.reduce(
      (sum, p) => sum + (parseFloat(p.price) || 0),
      0
    );
    const newGst = newTotalPrice * 0.18; // 18% GST

    // Update quotation with new totals
    quotation.total_price = newTotalPrice;
    quotation.gst = newGst;
    await quotation.save();

    console.log("💰 Updated Quotation Totals:");
    console.log("  - New Total Price:", newTotalPrice);
    console.log("  - New GST (18%):", newGst);
    console.log("  - Grand Total:", newTotalPrice + newGst);

    // 4️⃣ Generate PDF using revised data
    const pdfDir = path.join(__dirname, "../uploads/quotations");
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
    const pdfFileName = `${quotation_number}-Rev-${nextRevisionNumber}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFileName);

    // Delete old PDF if it exists to ensure fresh generation
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
      console.log("🗑️ Deleted existing PDF:", pdfFileName);
    }

    console.log("📄 Generating PDF with revision number:", nextRevisionNumber);
    console.log("📄 Quotation number:", quotation_number);
    console.log("📄 Full revision number will be:", `${quotation_number}-REV-${nextRevisionNumber}`);

    // Prepare quotation data with updated totals for PDF
    const quotationData = quotation.toJSON();
    quotationData.total_price = newTotalPrice;
    quotationData.gst = newGst;

    await generateQuotationPDF(
      quotationData, // ✅ Pass quotation with updated totals
      revisedProducts, // ✅ pass the revised product data here
      quotation.inquiry ? quotation.inquiry.toJSON() : null,
      nextRevisionNumber
    );

    // 5️⃣ Save revision in main table
    const revision = await QuotationReviced.create({
      quotation_number,
      revision_number: nextRevisionNumber,
      product_id: product_id || null,
      changes,
      changed_by,
      pdf_path: `api/pdf/${pdfFileName}`,
    });

    // 6️⃣ Save field-level changes in QuotationRevision table
    const QuotationRevision = require("../models/QuotationRevision");

    // Ensure changes.items exists and is an array
    if (!changes || !changes.items || !Array.isArray(changes.items)) {
      console.warn("⚠️ Invalid changes data structure:", changes);
      return res.status(400).json({ message: "Invalid changes data structure" });
    }

    for (const item of changes.items) {
      let prevItem = {};

      if (latestRevision) {
        // Parse latestRevision.changes if it's a string
        let latestChanges = latestRevision.changes;
        if (typeof latestChanges === 'string') {
          try {
            latestChanges = JSON.parse(latestChanges);
          } catch (e) {
            console.warn("⚠️ Failed to parse latestRevision.changes:", e);
            latestChanges = null;
          }
        }

        // Get previous item from latest revision if available
        if (latestChanges && latestChanges.items && Array.isArray(latestChanges.items)) {
          prevItem = latestChanges.items.find((p) => p && p.id === item.id) || {};
        }
      }

      // If no previous item found from revision, try to get from original quotation products
      if (!prevItem || Object.keys(prevItem).length === 0) {
        if (quotation.quotation_products && Array.isArray(quotation.quotation_products)) {
          const foundProduct = quotation.quotation_products.find((p) => p && p.id === item.id);
          if (foundProduct) {
            prevItem = foundProduct;
            // Convert Sequelize model to plain object if needed
            if (prevItem && typeof prevItem.toJSON === 'function') {
              prevItem = prevItem.toJSON();
            }
          }
        }
        // If still no prevItem, use empty object
        if (!prevItem || Object.keys(prevItem).length === 0) {
          prevItem = {};
        }
      }

      for (const key of Object.keys(item)) {
        if (key === "id") continue;
        const oldValue = prevItem ? prevItem[key] ?? null : null;
        const newValue = item[key] ?? null;

        if (oldValue != newValue) {
          await QuotationRevision.create({
            product_id: item.id,
            field_name: key,
            old_value: oldValue,
            new_value: newValue,
            changed_by,
          });
        }
      }
    }

    res.status(201).json({
      message: "Revision created successfully with updated PDF",
      data: revision,
    });
  } catch (error) {
    console.error("Error revising quotation:", error);
    res.status(500).json({ message: "Error revising quotation", error: error.message });
  }
};

exports.getRevisionHistory = async (req, res) => {
  try {
    const { quotation_number } = req.params;

    // Fetch all revisions ordered by revision_number
    const revisions = await QuotationReviced.findAll({
      where: { quotation_number },
      order: [["revision_number", "ASC"]],
      include: [{ model: QuotationProduct, attributes: ["id", "product_name"] }],
    });

    if (!revisions || revisions.length === 0) {
      return res.status(200).json({ revisions: [] });
    }

    const revisionHistory = [];

    for (let i = 0; i < revisions.length; i++) {
      const rev = revisions[i];

      // Ensure changes exists and has items
      // Sequelize JSON fields might be objects or need parsing
      let changesData = rev.changes;
      if (typeof changesData === 'string') {
        try {
          changesData = JSON.parse(changesData);
        } catch (e) {
          console.warn(`⚠️ Revision ${rev.revision_number} has invalid JSON string:`, e);
          changesData = null;
        }
      }

      if (!changesData || !changesData.items || !Array.isArray(changesData.items)) {
        console.warn(`⚠️ Revision ${rev.revision_number} has invalid changes data:`, changesData);
        revisionHistory.push({
          revision_number: rev.revision_number,
          changed_items: [],
          pdf_path: rev.pdf_path,
          changed_by: rev.changed_by,
          changed_at: rev.changed_at,
        });
        continue;
      }

      // Use parsed changes data
      rev.changes = changesData;

      // Previous values: first revision -> original products, else previous revision
      let prevChanges = [];
      if (i === 0) {
        // First revision: compare with original products
        const originalProducts = await QuotationProduct.findAll({ where: { quotation_number } });
        prevChanges = originalProducts.map(p => p.toJSON());
      } else {
        // Subsequent revisions: compare with previous revision
        const prevRev = revisions[i - 1];
        let prevRevChanges = prevRev.changes;
        if (typeof prevRevChanges === 'string') {
          try {
            prevRevChanges = JSON.parse(prevRevChanges);
          } catch (e) {
            prevRevChanges = null;
          }
        }

        if (prevRevChanges && prevRevChanges.items && Array.isArray(prevRevChanges.items)) {
          prevChanges = prevRevChanges.items;
        } else {
          // Fallback: get original products if previous revision data is invalid
          const originalProducts = await QuotationProduct.findAll({ where: { quotation_number } });
          prevChanges = originalProducts.map(p => p.toJSON());
        }
      }

      const changedItems = [];

      rev.changes.items.forEach((item) => {
        if (!item || typeof item !== 'object') return;

        const prevItem = prevChanges.find((p) => p && p.id === item.id) || {};
        Object.keys(item).forEach((key) => {
          if (key === "id") return;

          const oldValue = prevItem[key] ?? null;
          const newValue = item[key] ?? null;

          if (oldValue != newValue) {
            changedItems.push({
              product_id: item.id,
              product_name: item.product_name || prevItem.product_name || "",
              field_name: key,
              old_value: oldValue,
              new_value: newValue,
            });
          }
        });
      });

      revisionHistory.push({
        revision_number: rev.revision_number,
        changed_items: changedItems, // detailed list of changes
        pdf_path: rev.pdf_path,
        changed_by: rev.changed_by,
        changed_at: rev.changed_at,
      });
    }

    res.status(200).json({ revisions: revisionHistory });
  } catch (error) {
    console.error("Error fetching revision history:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      message: "Error fetching revision history",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};



exports.setReminder = async (req, res) => {
  try {
    const { quotation_number } = req.params;
    const { reminder_days } = req.body;
    const authUser = req.user; // from auth middleware

    // 1️⃣ Find the quotation
    const quotation = await Quotation.findOne({ where: { quotation_number } });
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    // 2️⃣ Authorization check
    // Allow only admins or the user who created the quotation
    if (authUser.role !== "admin" && quotation.user_id !== authUser.id) {
      return res.status(403).json({
        message: "You are not authorized to modify this reminder.",
      });
    }

    // 3️⃣ Block reminder setting for generated POs
    if (quotation.quotation_status === "generate_po") {
      return res
        .status(400)
        .json({ message: "Reminder cannot be set for generated PO" });
    }

    // 4️⃣ Calculate next reminder date
    const nextReminder = reminder_days
      ? new Date(Date.now() + reminder_days * 24 * 60 * 60 * 1000)
      : null;

    // 5️⃣ Update quotation fields
    quotation.reminder_days = reminder_days;
    quotation.next_reminder_date = nextReminder;
    quotation.reminder_active = !!reminder_days;

    await quotation.save();

    // 6️⃣ Send response
    res.status(200).json({
      message: "Reminder updated successfully",
      quotation,
      updated_by: {
        id: authUser.id,
        name: authUser.name,
        role: authUser.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error setting reminder",
      error: error.message,
    });
  }
};





exports.getReminders = async (req, res) => {
  try {
    const today = new Date();

    const reminders = await Quotation.findAll({
      where: {
        reminder_active: true,
        quotation_status: { [Op.ne]: "generate_po" },
        next_reminder_date: { [Op.gte]: today },
        user_id: req.user.id,
      },
      order: [["next_reminder_date", "ASC"]],
      include: [
        {
          model: Inquiry,
          as: "inquiry",
          attributes: ["customer_name"],
        },
        {
          model: User,
          as: "user",
          attributes: ["name", "email"],
        },
      ],
    });

    const formatted = reminders.map((r) => ({
      id: r.id,
      quotation_number: r.quotation_number,
      next_reminder_date: r.next_reminder_date,   // ✅ rename for frontend
      customer_name: r.inquiry?.customer_name || "N/A",
    }));

    res.status(200).json({
      message: "User reminders fetched successfully",
      data: formatted,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching reminders",
      error: error.message,
    });
  }
};

exports.getFollowupReminders = async (req, res) => {
  try {
    const days = parseInt(req.query.days || "7", 10); // default 7 days

    // Calculate date range
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const reminders = await Quotation.findAll({
      where: {
        reminder_active: false, // follow-up taken
        quotation_status: { [Op.ne]: "generate_po" },
        user_id: req.user.id,
        next_reminder_date: {
          [Op.ne]: null,
          [Op.gte]: fromDate, // ✅ filter by last N days
        },
      },
      order: [["next_reminder_date", "DESC"]],
      include: [
        {
          model: Inquiry,
          as: "inquiry",
          attributes: ["customer_name"],
        },
      ],
    });

    const formatted = reminders.map((r) => ({
      quotation_number: r.quotation_number,
      next_reminder_date: r.next_reminder_date,
      reminder_active: r.reminder_active,
      customer_name: r.inquiry?.customer_name || "N/A",
      remark: r.remark || "",
    }));

    return res.status(200).json({
      message: "Follow-up history fetched successfully",
      data: formatted,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error fetching follow-up history",
      error: error.message,
    });
  }
};

exports.deactivateReminder = async (req, res) => {
  try {
    const { quotation_number } = req.params;

    const quotation = await Quotation.findOne({ where: { quotation_number } });
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    quotation.reminder_active = false;
    quotation.remark = req.body.remark || null;
    await quotation.save();

    res.status(200).json({
      message: "Reminder deactivated successfully",
      quotation,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error deactivating reminder",
      error: error.message,
    });
  }
};


