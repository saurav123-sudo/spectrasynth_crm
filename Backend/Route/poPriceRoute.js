const express = require("express");
const router = express.Router();
const PoPriceController = require("../Controllers/poPriceController");
const auth = require("../middlewares/auth");

router.post("/", auth, PoPriceController.createPoPrice);
router.post("/bulk-upload", auth, PoPriceController.bulkUpload);
router.get("/", auth, PoPriceController.getAllPoPrices);
router.get("/:id", auth, PoPriceController.getPoPrice);
router.put("/:id", auth, PoPriceController.updatePoPrice);
router.delete("/:id", auth, PoPriceController.deletePoPrice);

module.exports = router;
