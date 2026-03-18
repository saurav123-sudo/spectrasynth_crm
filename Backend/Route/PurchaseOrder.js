const express = require("express");
const router = express.Router();
const purchaseOrderController = require("../Controllers/PurchaseOrderController");

// POST — create new Purchase Order
router.post("/", purchaseOrderController.createPurchaseOrder);
router.get("/:po_number", purchaseOrderController.FetchPoByPoNumber);
router.get("/", purchaseOrderController.fetchPurchaseOrder);
router.patch("/cancel/:po_number",purchaseOrderController.cancelPurchaseOrder)
router.patch("/:po_number/confirm",purchaseOrderController.confirmPurchaseOrder)

module.exports = router;
