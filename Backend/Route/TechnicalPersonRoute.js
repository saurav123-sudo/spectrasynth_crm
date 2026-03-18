const express = require("express");
const router = express.Router();
const TechniqnicalController = require("../Controllers/TechniqnicalController");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");

router.get("/fetchInquiries",auth,TechniqnicalController.getProcessedInquiries);
router.post(
  "/createQuotation/:inquiry_number",
  auth,
  
  TechniqnicalController.createQuotation
);
router.put("/updateStatus/:inquiry_number",auth, TechniqnicalController.updateInquiryStatus);
module.exports = router;
