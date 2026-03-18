const { v4: uuidv4 } = require("uuid");

const Inquiry = require("../models/Inquiry");
const InquiryProduct = require("../models/InquiryProduct");
const Product = require("../models/Product");
const EmailBody = require("../models/EmailBody");
const EmailAttachment = require("../models/EmailAttachment");
const Quotation = require("../models/Quotation");
const User = require("../models/User");
const Permission = require("../models/Permission");
const sequelize = require("../config/db");
const { Op, fn, col, literal } = require("sequelize");

// Controllers/inquiryController.js
const generateInquiryNumber = require("../Services/generateInquiryNumber"); // ✅ Default import

// Fetch all inquiries
exports.getAllInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.findAll({
      include: [
        {
          model: InquiryProduct,
          as: "products",
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json({ message: "Inquiries fetched successfully", data: inquiries });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Add new inquiry (customer + multiple products)
// Add new inquiry (customer + multiple products)
exports.addInquiry = async (req, res) => {
  try {
    let { customer_name, email, products } = req.body;

    if (!customer_name || !email || !products) {
      return res
        .status(400)
        .json({ error: "Customer info and products are required." });
    }

    if (typeof products === "string") {
      try {
        products = JSON.parse(products);
      } catch (err) {
        return res
          .status(400)
          .json({ error: "Products must be a valid JSON array." });
      }
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res
        .status(400)
        .json({ error: "Products must be a non-empty array." });
    }

    // Generate inquiry number automatically
    const inquiry_number = await generateInquiryNumber();
    const inquiry_by = req.user.name;

    const today = new Date(); // current date/time

    // Create main inquiry record
    const newInquiry = await Inquiry.create({
      inquiry_number,
      customer_name,
      email,
      inquiry_status: "forwarded",
      current_stage: "technical_review",
      inquiry_by,
      inquiry_update_date: today, // set update date to today
    });

    // Map and insert products
    const productData = products.map((p) => ({
      inquiry_number,
      product_name: p.ProductName,
      cas_number: p.cas_number || "N/A",
      product_code: p.product_code || "N/A",
      quantity_required: p.quantity_required || 0,
      quantity_unit: p.quantity_unit || "mg",
      package_size: p.package_size || null,
      image_url: p.image_url || null,
    }));

    const createdProducts = await InquiryProduct.bulkCreate(productData);

    res.status(201).json({
      message: "Inquiries added successfully!",
      inquiries: [{ inquiry: newInquiry, products: createdProducts }],
    });
  } catch (err) {
    console.error("Error adding inquiry:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
};

// Grouped inquiries
exports.getGroupedInquiries = async (req, res) => {
  try {
    const { email } = req.user;

    // Sales users list
    const salesUsers = [
      "sales@spectrasynth.com",
      "sales1@spectrasynth.com",
      "sales2@spectrasynth.com",
      "sales3@spectrasynth.com",
      "sales4@spectrasynth.com",
    ].map((e) => e.toLowerCase());

    const userEmail = String(email || "").toLowerCase();

    const whereCondition = {};

    // If user is in sales list → restrict to own email
    if (salesUsers.includes(userEmail)) {
      whereCondition.email = userEmail;
    }
    // Else → no filter → show all inquiries

    const inquiries = await Inquiry.findAll({
      where: whereCondition,
      include: [
        {
          model: InquiryProduct,
          as: "products",
          attributes: ["product_name", "cas_number", "has_catalog_match"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // 1. Collect all CAS and names from all inquiries to do ONE batch lookup for performance
    const allCasSize = new Set();
    const allNamesSize = new Set();
    inquiries.forEach(inq => {
      inq.products.forEach(p => {
        if (p.cas_number && p.cas_number !== "N/A" && p.cas_number !== "UNKNOWN") allCasSize.add(p.cas_number.trim());
        if (p.product_name) allNamesSize.add(p.product_name.toLowerCase().trim());
      });
    });

    const catalogProducts = await Product.findAll({
      where: {
        [Op.or]: [
          { cas_number: { [Op.in]: Array.from(allCasSize) } },
          { product_name: { [Op.in]: Array.from(allNamesSize) } }
        ]
      },
      attributes: ["cas_number", "product_name"]
    });

    const catalogCasSet = new Set(catalogProducts.map(cp => cp.cas_number?.trim()));
    const catalogNameSet = new Set(catalogProducts.map(cp => cp.product_name?.toLowerCase().trim()));

    const grouped = inquiries.map((inq) => {
      const isFullCatalogMatch = inq.products.length > 0 && inq.products.every(p => {
        const casMatch = p.cas_number && catalogCasSet.has(p.cas_number.trim());
        const nameMatch = p.product_name && catalogNameSet.has(p.product_name.toLowerCase().trim());
        return p.has_catalog_match || casMatch || nameMatch;
      });

      return {
        inquiry_number: inq.inquiry_number,
        customer_name: inq.customer_name,
        email: inq.email,
        inquiry_status: inq.inquiry_status,
        current_stage: inq.current_stage,
        inquiry_update_date: inq.inquiry_update_date,
        createdAt: inq.createdAt,
        impurities: inq.products.map((p) => p.product_name),
        cas_numbers: inq.products.map((p) => p.cas_number).filter(c => c && c !== "N/A"),
        is_full_catalog_match: isFullCatalogMatch,
      };
    });

    res.json(grouped);
  } catch (err) {
    console.error("Error fetching inquiries:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// Get inquiries by inquiry_number (same as inquiry_number)
exports.getInquiriesByEmailId = async (req, res) => {
  try {
    const { inquiry_number } = req.params; // inquiry_number

    if (!inquiry_number) {
      return res.status(400).json({ error: "inquiry_number is required" });
    }

    const inquiry = await Inquiry.findOne({
      where: { inquiry_number: inquiry_number },
      include: [
        {
          model: InquiryProduct,
          as: "products",
          attributes: [
            "id",
            "product_name",
            "cas_number",
            "quantity_required",
            "image_url",
            "product_code",
            "createdAt",
            "quantity_unit",
            "package_size",
            "has_catalog_match",
          ],
        },
      ],
    });

    if (!inquiry) {
      return res
        .status(404)
        .json({ error: "No inquiries found for this email ID" });
    }

    // Fetch the original email body + attachments if linked
    let originalEmail = null;
    if (inquiry.email_body_id) {
      const emailRecord = await EmailBody.findByPk(inquiry.email_body_id);
      if (emailRecord) {
        const attachments = await EmailAttachment.findAll({
          where: { email_body_id: emailRecord.id },
          order: [["createdAt", "ASC"]],
        });

        originalEmail = {
          id: emailRecord.id,
          sender_email: emailRecord.sender_email,
          subject: emailRecord.subject,
          body: emailRecord.body,
          format: emailRecord.format,
          received_at: emailRecord.received_at,
          attachments,
        };
      }
    }

    const productCasNumbers = inquiry.products.map(p => p.cas_number).filter(cas => cas && cas !== "N/A" && cas !== "UNKNOWN");
    const catalogProducts = await Product.findAll({
      where: {
        [Op.or]: [
          { cas_number: { [Op.in]: productCasNumbers } },
          { product_name: { [Op.in]: inquiry.products.map(p => p.product_name) } }
        ]
      },
      attributes: ["id", "cas_number", "product_name", "stock", "stock_unit"]
    });

    const catalogCasSet = new Set(catalogProducts.map(cp => cp.cas_number?.trim()));
    const catalogNameSet = new Set(catalogProducts.map(cp => cp.product_name?.toLowerCase().trim()));

    const response = {
      inquiry_number,
      customer_name: inquiry.customer_name,
      technical_status: inquiry.technical_status,
      marketing_status: inquiry.marketing_status,
      po_status: inquiry.po_status,
      original_email: originalEmail,
      inquiries: inquiry.products.map((p) => {
        const productData = p.toJSON ? p.toJSON() : p;
        const casMatch = productData.cas_number && catalogCasSet.has(productData.cas_number.trim());
        const nameMatch = productData.product_name && catalogNameSet.has(productData.product_name.toLowerCase().trim());
        const hasCatalogMatch = productData.has_catalog_match || casMatch || nameMatch;

        // Find matched catalog product for stock info
        const matchedProduct = catalogProducts.find(cp =>
          (productData.cas_number && cp.cas_number?.trim() === productData.cas_number.trim()) ||
          (productData.product_name && cp.product_name?.toLowerCase().trim() === productData.product_name.toLowerCase().trim())
        );

        return {
          id: productData.id,
          ProductName: productData.product_name,
          cas_number: productData.cas_number,
          quantity_required: productData.quantity_required,
          quantity_unit: productData.quantity_unit,
          package_size: productData.package_size || null,
          product_code: productData.product_code,
          image_url: productData.image_url || null,
          has_catalog_match: !!hasCatalogMatch,
          stock: matchedProduct?.stock || null,
          stock_unit: matchedProduct?.stock_unit || null,
          email: inquiry.email,
          createdAt: productData.createdAt,
        };
      }),
    };

    res.json(response);
  } catch (err) {
    console.error("Error fetching inquiries:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update inquiry status
exports.updateInquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { inquiry_status, current_stage, technical_status } = req.body; // also receive stage & technical_status

    const inquiry = await Inquiry.findOne({ where: { inquiry_number: id } });
    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    // Update fields if provided
    if (inquiry_status) {
      inquiry.inquiry_status = inquiry_status;
      inquiry.inquiry_update_date = new Date(); // update inquiry date

      // store the name of the user updating the inquiry
      if (req.user && req.user.name) {
        inquiry.inquiry_by = req.user.name;
      }
    }

    if (technical_status) {
      inquiry.technical_status = technical_status;
    }

    if (current_stage) inquiry.current_stage = current_stage;

    await inquiry.save();

    res.status(200).json({
      message: "Inquiry status and stage updated successfully!",
      inquiry,
    });
  } catch (err) {
    console.error("Error updating inquiry status and stage:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
};

// Update inquiries (product updates)
exports.updateInquiry = async (req, res) => {
  try {
    const { inquiry_number } = req.params;
    const { inquiries } = req.body;

    if (!inquiries || inquiries.length === 0) {
      return res.status(400).json({ message: "No inquiries to update" });
    }

    for (let inq of inquiries) {
      const quantity =
        inq.quantity_required === "" ? 0 : inq.quantity_required;

      if (!inq.id) {
        // New product — create it
        await InquiryProduct.create({
          inquiry_number,
          product_name: inq.ProductName || "New Product",
          cas_number: inq.cas_number || "",
          product_code: inq.product_code || "",
          quantity_required: quantity,
          quantity_unit: inq.quantity_unit || "mg",
          package_size: inq.package_size || null,
          image_url: inq.image_url || null,
        });
      } else {
        // Existing product — update it
        const product = await InquiryProduct.findByPk(inq.id);
        if (product) {
          await product.update({
            product_name: inq.ProductName,
            cas_number: inq.cas_number,
            product_code: inq.product_code,
            quantity_required: quantity,
            quantity_unit: inq.quantity_unit,
            package_size: inq.package_size || null,
            image_url: inq.image_url || null,
          });
        }
      }
    }

    res.json({ message: "All inquiries updated successfully" });
  } catch (error) {
    console.error("Error updating inquiries:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add a new product to an existing inquiry
exports.addProductToInquiry = async (req, res) => {
  try {
    const { inquiry_number } = req.params;
    const { product_name, cas_number, product_code, quantity_required, quantity_unit, package_size } = req.body;

    // Verify the inquiry exists
    const inquiry = await Inquiry.findOne({ where: { inquiry_number } });
    if (!inquiry) {
      return res.status(404).json({ message: "Inquiry not found" });
    }

    const product = await InquiryProduct.create({
      inquiry_number,
      product_name: product_name || "New Product",
      cas_number: cas_number || "",
      product_code: product_code || "",
      quantity_required: quantity_required || 0,
      quantity_unit: quantity_unit || "mg",
      package_size: package_size || null,
    });

    res.status(201).json({ message: "Product added successfully", product });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a product from an inquiry
exports.deleteProductFromInquiry = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await InquiryProduct.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await product.destroy();
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Upload image for a specific product
exports.uploadProductImage = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await InquiryProduct.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const image_url = `uploads/inquiry-images/${req.file.filename}`;
    await product.update({ image_url });

    res.json({ message: "Image uploaded successfully", image_url });
  } catch (error) {
    console.error("Error uploading product image:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete inquiry + its products
exports.deleteInquiry = async (req, res) => {
  try {
    const { inquiry_number } = req.params; // inquiry_number
    console.log(inquiry_number);

    const inquiry = await Inquiry.findOne({
      where: { inquiry_number: inquiry_number },
      include: [{ model: InquiryProduct, as: "products" }],
    });

    if (!inquiry) {
      return res.status(404).json({ message: "Inquiry not found" });
    }

    const quotations = await Quotation.findAll({
      where: { inquiry_id: inquiry.id },
    });

    if (quotations && quotations.length > 0) {
      return res.status(400).json({
        message:
          "Cannot delete this inquiry because a quotation has already been created for it.",
      });
    }

    await inquiry.destroy();

    res.json({ message: "Inquiry deleted successfully" });
  } catch (error) {
    console.error("Delete Inquiry Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get inquiry permissions
exports.getInquiryPermissions = async (req, res) => {
  try {
    const user_id = req.user.id;

    const user = await User.findByPk(user_id, {
      attributes: ["id", "name", "email"],
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const permission = await Permission.findOne({
      where: { user_id, module_name: "inquiry" },
      attributes: [
        "id",
        "module_name",
        "can_create",
        "can_read",
        "can_update",
        "can_delete",
      ],
    });

    if (!permission) {
      return res
        .status(404)
        .json({ message: "No permissions found for inquiry module" });
    }

    res.json({ user, permission });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get recent inquiries (now supports days OR date range)
exports.getRecentInquiry = async (req, res) => {
  try {
    const { days, startDate, endDate } = req.query;

    let whereClause = {};

    if (startDate && endDate) {
      // --- Global Filter Logic ---

      // --- START FIX ---
      // Create date objects from the query strings
      const start = new Date(startDate);
      const end = new Date(endDate);

      // By default, a date string like '2025-10-24' becomes '2025-10-24T00:00:00Z'.
      // We must set the *end* date to the very end of that day.
      end.setHours(23, 59, 59, 999);
      // --- END FIX ---

      whereClause.createdAt = {
        // Use the modified start and end dates
        [Op.between]: [start, end],
      };
    } else {
      // --- Individual Filter Logic (Fallback) ---
      const daysToFetch = parseInt(days) || 30;
      const sinceDate = new Date();

      // Also apply start-of-day logic here for consistency
      sinceDate.setDate(sinceDate.getDate() - daysToFetch);
      sinceDate.setHours(0, 0, 0, 0);

      whereClause.createdAt = { [Op.gte]: sinceDate };
    }

    const inquiries = await Inquiry.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(inquiries);
  } catch (error) {
    console.error("Error fetching recent inquiries:", error);
    res.status(500).json({ message: "Failed to fetch recent inquiries" });
  }
};

// Count inquiries by stage (now supports range OR date range)
exports.getInquiryCount = async (req, res) => {
  try {
    const { range, startDate, endDate } = req.query;

    let whereClause = {};

    if (startDate && endDate) {
      // --- Global Filter Logic ---
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else {
      // --- Individual Filter Logic (Fallback) ---
      const daysToFetch = parseInt(range) || 30;
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - daysToFetch);
      whereClause.createdAt = { [Op.gte]: sinceDate };
    }

    const counts = await Inquiry.findAll({
      attributes: [
        "current_stage",
        [sequelize.fn("COUNT", sequelize.col("current_stage")), "count"],
      ],
      where: whereClause,
      group: ["current_stage"],
    });

    res.json(counts);
  } catch (error) {
    console.error("Error fetching inquiry counts:", error);
    res.status(500).json({ message: "Failed to fetch inquiry counts" });
  }
};

// Yearly inquiries (now supports months OR date range)
exports.getInquiriesByYear = async (req, res) => {
  try {
    const { months, startDate, endDate } = req.query;

    let whereClause = {};

    if (startDate && endDate) {
      // --- Global Filter Logic ---
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else {
      // --- Individual Filter Logic (Fallback) ---
      const monthsToFetch = parseInt(months) || 12;
      const sinceDate = new Date();
      sinceDate.setMonth(sinceDate.getMonth() - monthsToFetch);
      whereClause.createdAt = { [Op.gte]: sinceDate };
    }

    const counts = await Inquiry.findAll({
      attributes: [
        [fn("DATE_FORMAT", col("createdAt"), "%Y-%m"), "year_month"],
        [fn("COUNT", col("inquiry_number")), "count"],
      ],
      where: whereClause,
      group: [literal("DATE_FORMAT(createdAt, '%Y-%m')")],
      order: [literal("DATE_FORMAT(createdAt, '%Y-%m') ASC")],
    });

    res.json(counts);
  } catch (err) {
    console.error("Error in getInquiriesByYear:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getAllInquiriesNumber = async (req, res) => {
  try {
    const inquiries = await Inquiry.findAll({
      attributes: [
        "inquiry_number",
        "current_stage",
        "inquiry_update_date",
        "technical_update_date",
        "management_update_date",
        "po_update_date", // or finalize_quotation if you renamed it
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      message: "Inquiries fetched successfully",
      data: inquiries,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching inquiries", error });
  }
};
