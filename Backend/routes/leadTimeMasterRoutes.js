const express = require("express");
const router = express.Router();
const leadTimeMasterController = require("../Controllers/LeadTimeMasterController");

// ============================================
// Lead Time Master Routes
// ============================================

// GET Routes
router.get("/", leadTimeMasterController.getAllLeadTimes);
router.get("/active", leadTimeMasterController.getActiveLeadTimes);
router.get("/:id", leadTimeMasterController.getLeadTimeById);

// POST Routes
router.post("/", leadTimeMasterController.createLeadTime);

// PUT Routes
router.put("/:id", leadTimeMasterController.updateLeadTime);

// DELETE Routes
router.delete("/:id", leadTimeMasterController.deleteLeadTime); // Soft delete
router.delete("/:id/permanent", leadTimeMasterController.permanentDeleteLeadTime); // Hard delete

module.exports = router;


