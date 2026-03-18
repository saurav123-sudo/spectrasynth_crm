const express = require("express");
const router = express.Router();
const ProductController = require("../Controllers/ProductPricingController");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");
const excelUpload = require("../middlewares/uploadExel");
router.post(
  "/import-prices",
  excelUpload.single("file"),
  ProductController.importProductPrices
);

router.post("/",auth, ProductController.addProductPrices);
router.get("/",auth, ProductController.getAllProductsWithPrices);
// router.get("/:id/prices", ProductController.getProductPriceById);
router.get("/get/:id", ProductController.getProductByPriceId);
router.get("/getProductPrices",auth, ProductController.getAllProductPrices);
router.get("/search", ProductController.searchProduct);
router.put("/:id",auth, ProductController.updateProductPrice);
router.delete("/:id",auth, ProductController.deleteProductPrice);
router.get("/:name", ProductController.getProductPriceByname);


module.exports = router;