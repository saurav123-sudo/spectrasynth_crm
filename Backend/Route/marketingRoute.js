const express = require("express");
const router = express.Router();
const MarketingController = require("../Controllers/MarketingController");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");

router.get("/fetchProcessedInquiries",auth,MarketingController.getProcessedInquiries);
module.exports = router;
