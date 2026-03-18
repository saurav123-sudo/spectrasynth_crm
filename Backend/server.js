const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();


const Routes = require("./Route/Routes");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.get("/api/image/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "uploads", filename);

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Image error:", err);
      res.status(404).send("Image not found");
    }
  });
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


if (!fs.existsSync(path.join(__dirname, "uploads"))) {
  fs.mkdirSync(path.join(__dirname, "uploads"));
}

require("./Crone/emailCrone");

const { startWorker } = require("./workers/ai-automation-worker");
startWorker();

app.get("/api/pdf/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "uploads", "quotations", filename);

  res.setHeader("Content-Type", "application/pdf");
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Error sending PDF:", err);
      res.status(404).send("PDF not found");
    }
  });
});

app.use("/api", Routes);

app.use(cors({
  origin: "http://localhost:5173"
}));


const PORT = 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
