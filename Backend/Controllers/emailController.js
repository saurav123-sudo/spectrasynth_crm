
const path = require("path");
const fs = require("fs");
const Inquiry = require("../models/Inquiry");
const InquiryProduct = require("../models/InquiryProduct");
const EmailBody = require("../models/EmailBody");
const EmailAttachment = require("../models/EmailAttachment");
const generateInquiryNumber = require("../Services/generateInquiryNumber"); // ✅ Default import
/**
 * Fetch all emails from the database
 */
exports.fetchEmails = async (req, res) => {
  try {
    const { email } = req.user;

    // pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // List of sales users
    const salesUsers = [
      "sales@spectrasynth.com",
      "sales1@spectrasynth.com",
      "sales2@spectrasynth.com",
      "sales3@spectrasynth.com",
      "sales4@spectrasynth.com",
    ].map(e => e.toLowerCase());

    const userEmail = String(email || "").toLowerCase();

    const whereCondition = {};

    // sales users see only their emails
    if (salesUsers.includes(userEmail)) {
      whereCondition.sender_email = userEmail;
    }

    const { count, rows } = await EmailBody.findAndCountAll({
      where: whereCondition,
      order: [["received_at", "DESC"]],
      limit,
      offset,
    });

    res.json({
      success: true,
      emails: rows,
      total: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      hasMore: offset + rows.length < count,
    });

  } catch (err) {
    console.error("Error fetching emails:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};



exports.getEmailById = async (req, res) => {
  try {
    const { id } = req.params; // assuming URL like /email/:id

    const email = await EmailBody.findByPk(id);

    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }

    const attachments = await EmailAttachment.findAll({
      where: { email_body_id: email.id },
      order: [["createdAt", "ASC"]],
    });

    res.status(200).json({
      ...email.toJSON(),
      attachments,
    });
  } catch (error) {
    console.error("Error fetching email:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}



exports.addInquiry = async (req, res) => {
  try {
    let { customer_name, email, emailBodyId, products } = req.body;

    if (!customer_name || !email || !products) {
      return res.status(400).json({ error: "Customer info and products are required." });
    }

    // ✅ Parse products safely
    let parsedProducts = [];
    if (typeof products === "string") {
      try {
        parsedProducts = JSON.parse(products);
      } catch (err) {
        return res.status(400).json({ error: "Products must be valid JSON array." });
      }
    } else {
      parsedProducts = products;
    }

    if (!Array.isArray(parsedProducts) || parsedProducts.length === 0) {
      return res.status(400).json({ error: "Products must be non-empty array." });
    }

    // ✅ Auto-generate inquiry number (ignore frontend inquiry_number)
    const inquiry_number = await generateInquiryNumber();
    const inquiry_by = req.user?.name || "System";
    const today = new Date();

    // ✅ Create inquiry with "pending" status for new email inquiries
    const newInquiry = await Inquiry.create({
      inquiry_number,
      customer_name,
      email,
      inquiry_status: "pending",  // ✅ Changed from "forwarded" to "pending"
      current_stage: "inquiry_received",  // ✅ Changed from "technical_review" to "inquiry_received"
      inquiry_by,
      inquiry_update_date: today,
    });

    // Debug log to verify status
    console.log("✅ Inquiry created with status:", newInquiry.inquiry_status, "and stage:", newInquiry.current_stage);

    // ✅ Add products
    const productData = parsedProducts.map((p, index) => {
      let image_url = null;
      const imageField = `product_${index}_image`;

      if (req.files && req.files.find((f) => f.fieldname === imageField)) {
        const file = req.files.find((f) => f.fieldname === imageField);
        image_url = `uploads/${file.filename}`;
      }

      // Handle quantity_unit - use provided value or default to "mg"
      const quantityUnit = (p.quantity_unit && p.quantity_unit.trim() !== "") ? p.quantity_unit.trim() : "mg";
      
      // Handle package_size - use provided value or null
      const packageSize = (p.package_size && p.package_size.trim() !== "") ? p.package_size.trim() : null;

      // Debug log for each product
      console.log(`📦 Product ${index + 1}:`, {
        product_name: p.ProductName,
        quantity_unit: quantityUnit,
        package_size: packageSize,
        received_quantity_unit: p.quantity_unit,
        received_package_size: p.package_size
      });

      return {
        inquiry_number,
        product_name: p.ProductName,
        cas_number: p.cas_number || "N/A",
        product_code: p.product_code || "N/A",
        quantity_required: p.quantity_required || 0,
        quantity_unit: quantityUnit,
        package_size: packageSize,
        image_url,
        // Company price mapping fields
        selected_company: p.selected_company_price?.company || null,
        selected_company_price: p.selected_company_price?.price || null,
        selected_price_quantity: p.selected_company_price?.quantity || null,
        selected_price_unit: p.selected_company_price?.unit || null,
        price_source: p.selected_company_price?.company || null,
      };
    });

    await InquiryProduct.bulkCreate(productData);

    // ✅ Mark related email
    if (emailBodyId) {
      await EmailBody.update(
        { inquiry_created: true },
        { where: { id: emailBodyId } }
      );
    }

    return res.status(201).json({
      message: "Inquiry created successfully!",
      inquiry_number,
      inquiry_status: newInquiry.inquiry_status,  // ✅ Return status in response for debugging
      current_stage: newInquiry.current_stage,     // ✅ Return stage in response for debugging
    });
  } catch (err) {
    console.error("Error adding inquiry:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
};

exports.getPendingEmailCount = async (req, res) => {
  try {
    const count = await EmailBody.count({
      where: { inquiry_created: false }
    });

    return res.status(200).json({
      message: "Pending email count fetched successfully",
      pending_count: count,
    });
  } catch (error) {
    console.error("Error counting pending emails:", error);
    return res.status(500).json({
      message: "Error fetching pending email count",
      error: error.message,
    });
  }
};



