const express = require("express");
const router = express.Router();

router.use("/users", require("./UserRoute"));
router.use("/inquiries", require("./inquiryRoute"));
router.use("/products", require("./ProductRoute"));
router.use("/technical", require("./TechnicalPersonRoute"));
router.use("/product_prices", require("./ProductPriceRoute"));
router.use("/quotations", require("./QuotationRoute"));
router.use("/marketing",require("./marketingRoute"));
router.use("/purchaseOrder",require("./PurchaseOrder"));
router.use("/email",require("./emailRoute"));
router.use("/poPrice",require("./poPriceRoute"));
router.use("/lead-time-master", require("../routes/leadTimeMasterRoutes"));

module.exports = router;
