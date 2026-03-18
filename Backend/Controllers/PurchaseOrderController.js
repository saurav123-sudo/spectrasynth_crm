const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");

// ✅ Create a new Purchase Order
exports.createPurchaseOrder = async (req, res) => {
  try {
    const {
      po_number,
      quotation_number,
      po_date,
      total_amount,
      CompanyName,
    } = req.body;

    // Check if quotation exists
    const quotation = await Quotation.findOne({ where: { quotation_number } });
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    // Check if PO already exists for this quotation
    const existingPO = await PurchaseOrder.findOne({ where: { quotation_number } });
    if (existingPO) {
      return res.status(400).json({
        message: "A Purchase Order already exists for this quotation.",
      });
    }

    // Create new Purchase Order
    const newPO = await PurchaseOrder.create({
      po_number,
      quotation_number,
      po_date,
      total_amount,
      CompanyName,
      po_status: "active", // default
    });

    // Optionally update quotation status
    quotation.quotation_status = "generate_po";
    await quotation.save();

    res.status(201).json({
      message: "Purchase Order created successfully",
      data: newPO,
    });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    res.status(500).json({
      message: "Error creating purchase order",
      error: error.message,
    });
  }
};

exports.fetchPurchaseOrder = async (req, res) => {
  try {
    const purchaseOrders = await PurchaseOrder.findAll({
      include: [
        {
          model: Quotation,
          as: "quotation",
          attributes: [
            "quotation_number",
            "date",
            "quotation_by",
            "total_price",
            "gst",
            "remark",
            "quotation_status",
          ],
        },
      ],
      order: [["createdAt", "DESC"]], // latest first
    });

    res.json({
      message: "All purchase orders fetched successfully",
      data: purchaseOrders,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


exports.FetchPoByPoNumber = async (req, res) => {
  try {
    const { po_number } = req.params;

    const po = await PurchaseOrder.findOne({
      where: { po_number },
      include: [
        {
          model: Quotation,
          as: "quotation",
          attributes: [
            "quotation_number",
            "date",
            "quotation_by",
            "total_price",
            "gst",
            "remark",
            "quotation_status",
          ],
        },
      ],
    });

    if (!po) {
      return res.status(404).json({ message: "Purchase Order not found" });
    }

    res.json({
      message: "Purchase Order fetched successfully",
      data: po,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.cancelPurchaseOrder = async (req, res) => {
  try {
    const { po_number } = req.params;
    const po = await PurchaseOrder.findOne({ where: { po_number } });

    if (!po)
      return res.status(404).json({ message: "Purchase Order not found" });

    po.po_status = "cancel";
    await po.save();

    res.json({ message: "Purchase Order canceled successfully", data: po });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.confirmPurchaseOrder = async (req, res) => {
  try {
    const { po_number } = req.params;
    const po = await PurchaseOrder.findOne({ where: { po_number } });

    if (!po)
      return res.status(404).json({ message: "Purchase Order not found" });

    po.po_status = "confirm";
    await po.save();

    res.json({ message: "Purchase Order confirm successfully", data: po });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
