const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const inquiryController = require("../Controllers/inquiryController");
const checkPermission = require("../middlewares/checkPermission");
const auth = require("../middlewares/auth");

// Multer setup for product image uploads
const imgDir = path.join(__dirname, "../uploads/inquiry-images");
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, imgDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `product_${req.params.id}_${Date.now()}${ext}`);
    },
});
const uploadProductImg = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
        cb(null, ok);
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});


router.get("/Allinquiries", auth, inquiryController.getAllInquiries);
router.get("/fetchInquiries", auth, inquiryController.getGroupedInquiries);
router.get("/getByNumber/:inquiry_number", auth, inquiryController.getInquiriesByEmailId);
router.post("/add", auth, inquiryController.addInquiry);
router.patch("/:id/status", auth, inquiryController.updateInquiryStatus);
router.put("/updateAll/:inquiry_number", auth, inquiryController.updateInquiry);
router.get("/fetchInquiries/:id", auth, inquiryController.getInquiriesByEmailId);

router.post("/addProduct/:inquiry_number", auth, inquiryController.addProductToInquiry);
router.delete("/deleteProduct/:id", auth, inquiryController.deleteProductFromInquiry);
router.post("/uploadProductImage/:id", auth, uploadProductImg.single("image"), inquiryController.uploadProductImage);

router.delete("/:inquiry_number", auth, inquiryController.deleteInquiry);
router.get("/fetch/permissions", auth, inquiryController.getInquiryPermissions);

router.get("/recent", inquiryController.getRecentInquiry);
router.get("/stagecount", auth, inquiryController.getInquiryCount);
router.get("/yearly", auth, inquiryController.getInquiriesByYear);

router.get("/getInquiryNumber", auth, inquiryController.getAllInquiriesNumber)



module.exports = router;