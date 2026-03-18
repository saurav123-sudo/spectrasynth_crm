const Product = require("../models/Product");
const ProductPrices = require("../models/ProductPrices");
const XLSX = require("xlsx");
const sequelize = require("../config/db");
const { Op } = require("sequelize");


exports.createProduct = async (req, res) => {
  try {
    const { product_name, cas_number, hsn_code, stock, stock_unit, status } = req.body;

    if (!product_name) {
      return res.status(400).json({ message: "Product name is required" });
    }

    const existingProduct = await Product.findOne({ where: { product_name } });
    if (existingProduct) {
      return res.status(400).json({ message: "Product already exists" });
    }
    const product = await Product.create({
      product_name,
      cas_number: cas_number || "N/A",
      product_code: hsn_code || "N/A",
      stock: stock || null,
      stock_unit: stock_unit || null,
      status: status || "active",
    });

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Create Product Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const { q, searchBy } = req.query;

    if (!q || q.trim().length < 1) {
      return res.json([]);
    }

    const searchTerm = q.trim();
    const qDigits = searchTerm.replace(/\D/g, ""); // digits only for CAS matching
    const searchCasOnly = searchBy === "cas_number";

    let whereClause;

    if (searchCasOnly) {
      // Search ONLY by CAS number when user typed in CAS field
      const casConditions = [
        {
          cas_number: {
            [Op.and]: [
              { [Op.ne]: "N/A" },
              { [Op.ne]: null },
              { [Op.like]: `%${searchTerm}%` },
            ],
          },
        },
      ];
      if (qDigits.length >= 2) {
        casConditions.push(
          sequelize.where(
            sequelize.fn(
              "REPLACE",
              sequelize.fn("REPLACE", sequelize.col("cas_number"), "-", ""),
              " ",
              ""
            ),
            { [Op.like]: `%${qDigits}%` }
          )
        );
      }
      whereClause = { [Op.or]: casConditions };
    } else {
      // Search by product name (and optionally CAS)
      const orConditions = [
        { product_name: { [Op.like]: `%${searchTerm}%` } },
        {
          cas_number: {
            [Op.and]: [
              { [Op.ne]: "N/A" },
              { [Op.ne]: null },
              { [Op.like]: `%${searchTerm}%` },
            ],
          },
        },
      ];
      if (qDigits.length >= 2) {
        orConditions.push(
          sequelize.where(
            sequelize.fn(
              "REPLACE",
              sequelize.fn("REPLACE", sequelize.col("cas_number"), "-", ""),
              " ",
              ""
            ),
            { [Op.like]: `%${qDigits}%` }
          )
        );
      }
      whereClause = { [Op.or]: orConditions };
    }

    const products = await Product.findAll({
      where: whereClause,
      attributes: ["id", "product_name", "cas_number"],
      limit: 10,
      order: [["product_name", "ASC"]],
      raw: true, // 👈 VERY IMPORTANT
    });
    console.log("🔎 Search Results:", products); // ✅ Debug

    // 👇 Ensure CAS never null
    // const formatted = products.map((p) => ({
    //   ...p,
    //   cas_number: p.cas_number && p.cas_number !== "NA"
    //     ? p.cas_number
    //     : "N/A",
    // }));

    res.json(products);
  } catch (err) {
    console.error("Search products error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, cas_number, hsn_code, stock, stock_unit, status } = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Update fields - use provided values or keep existing
    if (product_name !== undefined) product.product_name = product_name;
    if (cas_number !== undefined) product.cas_number = cas_number;
    if (hsn_code !== undefined) product.product_code = hsn_code;
    if (stock !== undefined) product.stock = stock || null;
    if (stock_unit !== undefined) product.stock_unit = stock_unit || null;
    if (status !== undefined) product.status = status;

    await product.save();

    res.status(200).json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    await product.destroy();

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      message: "Products fetched successfully",
      data: products,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getProductsByName = async (req, res) => {
  try {
    const { name } = req.params;

    // Find product(s) matching the name (case-insensitive)
    const product = await Product.findOne({
       where: {
        product_name: {
          [Op.eq]: name
        }
      },
      attributes: ["id", "product_name", "cas_number"],
      raw: true
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.importProducts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No Excel file uploaded" });
    }

    const workbook = XLSX.readFile(req.file.path);

    
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    console.log("📄 Using sheet:", sheetName);

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: null,
    });

    if (!rows || rows.length < 3) {
      return res
        .status(400)
        .json({ message: "Excel sheet does not have enough rows" });
    }

    const groupHeaderRow = rows[0];
    const headerRow = rows[1];
    const dataRows = rows.slice(2);

    const normalize = (v) =>
      String(v || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    // -------- Build company -> column index map --------
    const companyColumnMap = {};
    let currentCompany = null;

    for (let i = 0; i < headerRow.length; i++) {
      const group = normalize(groupHeaderRow[i]);
      const col = normalize(headerRow[i]);

      if (group) {
        currentCompany = group;
        if (!companyColumnMap[currentCompany]) {
          companyColumnMap[currentCompany] = {};
        }
      }

      if (!currentCompany) continue;

      if (col === "price") companyColumnMap[currentCompany].priceIdx = i;
      else if (col === "qty" || col === "quantity")
        companyColumnMap[currentCompany].qtyIdx = i;
      else if (col === "unit") companyColumnMap[currentCompany].unitIdx = i;
    }

    // console.log("🧭 Company column map:", companyColumnMap);

    // -------- Base headers --------
    const baseHeaderMap = {};
    headerRow.forEach((h, i) => {
      const key = normalize(h);
      if (key) baseHeaderMap[key] = i;
    });

    const getBaseCell = (row, header) => {
      const idx = baseHeaderMap[normalize(header)];
      if (idx === undefined) return null;
      return row[idx];
    };

    const parseNumberSafe = (v) => {
      if (v === null || v === undefined || v === "") return 0;
      if (typeof v === "number" && Number.isFinite(v)) return v;
      const cleaned = String(v).replace(/[^0-9.]/g, "");
      const num = Number(cleaned);
      return Number.isFinite(num) ? num : 0;
    };

    const normalizeUnit = (u) => {
      if (u === null || u === undefined || String(u).trim() === "") return "mg";
      const unit = String(u).toLowerCase().trim();
      if (unit === "g") return "gm";
      if (["mg", "gm", "ml", "kg", "ltr"].includes(unit)) return unit;
      return "mg";
    };

    const normalizedHeaders = headerRow.map((h) => normalize(h));

    // Find ALL columns named "qty"
    const qtyIndexes = normalizedHeaders
      .map((h, i) => (h === "qty" || h === "quantity" ? i : -1))
      .filter((i) => i !== -1);

    // Take the FIRST one (base Qty)
    const baseQtyIdx = qtyIndexes.length > 0 ? qtyIndexes[0] : null;

    const companies = [];
    const seen = new Set();

    for (const cell of groupHeaderRow) {
      const name = String(cell || "").trim();
      if (!name) continue;

      const key = normalize(name);
      if (!seen.has(key)) {
        seen.add(key);
        companies.push(name);
      }
    }

    let createdProducts = 0;
    let createdPrices = 0;
    const results = [];

    for (const [rowIndex, row] of dataRows.entries()) {
      const productNameRaw = getBaseCell(row, "Name of Product");
      if (!productNameRaw || String(productNameRaw).trim() === "") continue;

      const product_name = String(productNameRaw).trim();
      const cas_number = String(getBaseCell(row, "CAS NO") || "N/A").trim();
      const product_code = String(getBaseCell(row, "HSN Code") || "N/A").trim();
      const hsnIdx = baseHeaderMap[normalize("HSN Code")];
      const stock =
        baseQtyIdx !== null &&
        row[baseQtyIdx] !== undefined &&
        row[baseQtyIdx] !== null
          ? String(row[baseQtyIdx]).trim()
          : "";

      const rawStatus = String(
        getBaseCell(row, "Stock status") || "",
      ).toLowerCase();
      const status =
        rawStatus.includes("ready stock") || rawStatus.includes("in")
          ? "active"
          : "inactive";

      // ✅ ALWAYS CREATE PRODUCT
      const product = await Product.create({
        product_name,
        cas_number,
        product_code,
        stock,
        status,
      });

      createdProducts++;

      // ✅ ALWAYS CREATE 5 PRICES
      for (const company of companies) {
        const companyKey = normalize(company);
        const map = companyColumnMap[companyKey];

        let finalPrice = 0;
        let finalQuantity = 0;
        let finalUnit = "mg";

        if (map) {
          const rawPrice =
            map.priceIdx !== undefined ? row[map.priceIdx] : null;
          const rawQty = map.qtyIdx !== undefined ? row[map.qtyIdx] : null;
          const rawUnit = map.unitIdx !== undefined ? row[map.unitIdx] : null;

          const hasExcelData =
            rawPrice !== null &&
            rawPrice !== undefined &&
            String(rawPrice).toLowerCase().trim() !== "na" &&
            String(rawPrice).trim() !== "";

          if (hasExcelData) {
            finalPrice = parseNumberSafe(rawPrice);
            finalQuantity = parseNumberSafe(rawQty);
            finalUnit = normalizeUnit(rawUnit);
          }
        }

        await ProductPrices.create({
          productId: product.id,
          company,
          price: finalPrice,
          quantity: finalQuantity,
          unit: finalUnit,
        });

        createdPrices++;
      }

      results.push({ product: product_name, action: "created with 5 prices" });
    }

    return res.json({
      message: "Excel imported successfully",
      createdProducts,
      createdPrices,
      results,
    });
  } catch (error) {
    console.error("❌ Excel import error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
exports.getProductByCas = async (req, res) => {
  try {
    const { cas } = req.query;

    if (!cas) {
      return res.status(400).json({ message: "CAS number required" });
    }

    const product = await Product.findOne({
      where: { cas_number: cas },
      include: [
        {
          model: ProductPrices,
          attributes: ["id", "company", "price", "quantity", "unit"],
        },
      ],
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json({
      product_name: product.product_name,
      cas_number: product.cas_number,
      prices: product.ProductPrices || [],
    });

  } catch (error) {
    console.error("CAS search error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Import Stock from Excel
exports.importStock = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No Excel file uploaded" });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    console.log("📄 Using sheet for stock import:", sheetName);

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: null,
    });

    if (!rows || rows.length < 2) {
      return res.status(400).json({ message: "Excel sheet does not have enough rows" });
    }

    // Find header row (row 0)
    const headerRow = rows[0];
    const normalize = (v) => String(v || "").replace(/\s+/g, " ").trim().toLowerCase();

    // Build column index map from headers
    const colMap = {};
    headerRow.forEach((h, i) => {
      const key = normalize(h);
      if (key.includes("final goods") || key.includes("product") || key.includes("name")) colMap.nameIdx = i;
      else if (key.includes("cas")) colMap.casIdx = i;
      else if (key === "gm" || key === "g") colMap.gmIdx = i;
      else if (key === "mg") colMap.mgIdx = i;
      else if (key === "ml") colMap.mlIdx = i;
      else if (key === "ltr" || key === "liter" || key === "litre") colMap.ltrIdx = i;
      else if (key === "kg") colMap.kgIdx = i;
    });

    if (colMap.nameIdx === undefined) {
      return res.status(400).json({ message: "Could not find product name column (FINAL GOODS) in the Excel header" });
    }

    console.log("🧭 Stock column map:", colMap);

    const dataRows = rows.slice(1);
    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    // Unit columns in order of priority
    const unitColumns = [
      { key: "gmIdx", unit: "gm" },
      { key: "mgIdx", unit: "mg" },
      { key: "mlIdx", unit: "ml" },
      { key: "ltrIdx", unit: "ltr" },
      { key: "kgIdx", unit: "kg" },
    ];

    for (const row of dataRows) {
      const productNameRaw = row[colMap.nameIdx];
      if (!productNameRaw || String(productNameRaw).trim() === "") {
        skipped++;
        continue;
      }

      const productName = String(productNameRaw).trim();

      // Determine stock value and unit from the unit columns
      let stockValue = null;
      let stockUnit = null;

      for (const { key, unit } of unitColumns) {
        if (colMap[key] !== undefined) {
          const cellValue = row[colMap[key]];
          if (cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== "") {
            stockValue = String(cellValue).trim();
            stockUnit = unit;
            break; // Take the first non-empty unit column
          }
        }
      }

      if (stockValue === null) {
        stockValue = "0";
        stockUnit = "mg";
      }

      // Find product by name first, then fallback to CAS number
      let product = await Product.findOne({
        where: { product_name: productName },
      });

      if (!product && colMap.casIdx !== undefined) {
        const casNumber = row[colMap.casIdx];
        if (casNumber && String(casNumber).trim() !== "" && String(casNumber).trim().toUpperCase() !== "NA") {
          product = await Product.findOne({
            where: { cas_number: String(casNumber).trim() },
          });
        }
      }

      if (!product) {
        console.warn("❌ Product not found for stock update:", productName);
        notFound++;
        continue;
      }

      // Update stock
      product.stock = stockValue;
      product.stock_unit = stockUnit;
      await product.save();
      updated++;
    }

    return res.json({
      message: "Stock import completed",
      updated,
      skipped,
      notFound,
      total: dataRows.length,
    });
  } catch (error) {
    console.error("❌ Stock import error:", error);
    return res.status(500).json({
      message: "Stock import failed",
      error: error.message,
    });
  }
};