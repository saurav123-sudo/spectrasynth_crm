const express = require("express");
const router = express.Router();
const QuotationController = require("../Controllers/QuatationController");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");

router.post("/:inquiry_number",auth,QuotationController.createQuotation);
router.get("/lastQuotationNumber",auth,QuotationController.getLastQuotationNumber);
router.get("/byNumber/:quotation_number",auth, QuotationController.getQuotationByNumber);
router.get("/",auth, QuotationController.getAllQuotations);
router.delete("/:quotation_number",auth, QuotationController.deleteQuotation);
router.put("/:quotation_number",auth,QuotationController.editQuotation);
router.get("/byInquiryNumber/:inquiry_number",auth, QuotationController.getLatestQuotationByInquiry);
router.get("/fetch/Processed",auth, QuotationController.getAllProcessQuotations);
router.put("/ReviceQutation/:quotation_number",auth, QuotationController.reviseQuotation);
// router.get("/revision/history/:quotation_number",auth,checkPermission("quotation", "read"), QuotationController.getRevisionsByQuotationNumber);
router.post("/revision/history/:quotation_number",auth, QuotationController.postReviseQuotation);
router.get("/revisiced/history/:quotation_number",auth, QuotationController.getRevisionHistory);
router.put("/:quotation_number/reminder", auth,QuotationController.setReminder)
router.get("/reminders/followup",auth, QuotationController.getFollowupReminders);
router.get("/reminders",auth, QuotationController.getReminders);
router.put("/deactivate_reminder/:quotation_number",auth, QuotationController.deactivateReminder);

router.post(
  "/:id/send-email",
  auth, 
  QuotationController.sendQuotationEmail
);


module.exports = router;