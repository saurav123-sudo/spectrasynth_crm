const express = require("express");
const router = express.Router();
const ProductController = require("../Controllers/ProductController");
const auth = require("../middlewares/auth");
const checkPermission = require("../middlewares/checkPermission");
const excelUpload = require("../middlewares/uploadExel");
router.post(
  "/import",
  auth,
  excelUpload.single("file"),
  ProductController.importProducts
);
router.post(
  "/import-stock",
  auth,
  excelUpload.single("file"),
  ProductController.importStock
);

router.post("/", auth, ProductController.createProduct);
router.put("/:id", auth, ProductController.updateProduct);
router.delete("/:id", auth, ProductController.deleteProduct);

// 🔥 Put specific routes FIRST
router.get("/search", auth, ProductController.searchProducts);
router.get("/search-by-cas", auth, ProductController.getProductByCas);
router.get("/", auth, ProductController.getAllProducts);
router.get("/:name", auth, ProductController.getProductsByName);

module.exports = router;
