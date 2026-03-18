const express = require("express");
const router = express.Router();
const multer = require("multer");
const auth = require("../middlewares/auth");
const emailController = require("../Controllers/emailController");
const path = require("path");

// Setup multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage });


// Routes
router.get("/", auth, emailController.fetchEmails);

// Use multer middleware for routes that may include files or form-data
router.post("/Add", auth, upload.any(), emailController.addInquiry);

router.get("/fetchById/:id", auth, emailController.getEmailById);
router.get("/pending/count",auth, emailController.getPendingEmailCount);

module.exports = router;
