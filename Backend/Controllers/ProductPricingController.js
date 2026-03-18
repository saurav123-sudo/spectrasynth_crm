const express = require("express");
const Product = require("../models/Product");
const ProductPrices = require("../models/ProductPrices");
const XLSX = require("xlsx");
const PoPrice = require("../models/poPrice");
const { Op } = require("sequelize");

// ---------------- ADD / UPSERT PRICES ----------------
exports.addProductPrices = async (req, res) => {
  try {
    const { productName, companies } = req.body;

    const product = await Product.findOne({
      where: { product_name: productName },
    });

    if (!product) {
      return res.status(404).json({
        message: `Product '${productName}' does not exist.`,
      });
    }

    const results = [];

    for (const comp of companies) {
      const { company, pricing } = comp;

      for (const priceEntry of pricing) {
        let { price, currency, quantity, unit } = priceEntry;

        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice) || parsedPrice > 999999999) {
          return res.status(400).json({
            message: `Invalid or excessively large price provided: ${price}`,
          });
        }

        let ProductPrice = await ProductPrices.findOne({
          where: {
            productId: product.id,
            company,
            quantity: quantity || 0,
            unit: unit || "mg",
          },
        });

        if (ProductPrice) {
          ProductPrice.price = price;
          ProductPrice.currency = currency || "INR";
          await ProductPrice.save();

          results.push({
            company,
            price: ProductPrice.price,
            quantity: ProductPrice.quantity,
            unit: ProductPrice.unit,
            status: "updated",
          });
        } else {
          const newProductPrice = await ProductPrices.create({
            productId: product.id,
            company,
            price,
            currency: currency || "INR",
            quantity: quantity || 0,
            unit: unit || "mg",
          });

          results.push({
            company,
            price: newProductPrice.price,
            quantity: newProductPrice.quantity,
            unit: newProductPrice.unit,
            status: "created",
          });
        }
      }
    }

    res.status(201).json({
      message: "Product prices processed successfully",
      product: productName,
      results,
    });
  } catch (error) {
    console.error("Error adding product prices:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------------- GET PRODUCTS WITH PRICES ----------------
exports.getAllProductsWithPrices = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [
        {
          model: ProductPrices,
          as: "ProductPrices", // ✅ IMPORTANT
          attributes: [
            "id",
            "company",
            "price",
            "currency",
            "quantity",
            "unit",
            "createdAt",
            "updatedAt",
          ],
        },
      ],
      attributes: [
        "id",
        "product_name",
        "cas_number",
        "product_code",
        "status",
      ],
    });

    res.json({
      message: "Products with prices fetched successfully",
      data: products,
    });
  } catch (error) {
    console.error("Error fetching products with prices:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------------- GET ALL PRICES FLAT ----------------
exports.getAllProductPrices = async (req, res) => {
  try {
    const ProductPrices = await ProductPrices.findAll({
      include: [
        {
          model: Product,
          as: "Product", // ✅ IMPORTANT
          attributes: ["product_name", "cas_number", "product_code"],
        },
      ],
      attributes: [
        "id",
        "company",
        "price",
        "currency",
        "quantity",
        "unit",
        "createdAt",
        "updatedAt",
      ],
    });

    const result = ProductPrices.map((pp) => ({
      productName: pp.Product.product_name,
      cas_number: pp.Product.cas_number,
      product_code: pp.Product.product_code,
      company: pp.company,
      price: pp.price,
      currency: pp.currency,
      quantity: pp.quantity,
      unit: pp.unit,
    }));

    res.json({
      message: "All product prices fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching product prices:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------------- UPDATE PRICE ----------------
exports.updateProductPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { productName, company, price, currency, quantity, unit } = req.body;

    const ProductPrice = await ProductPrices.findByPk(id);
    if (!ProductPrice) {
      return res.status(404).json({ message: "Product price not found" });
    }

    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice > 999999999) {
        return res.status(400).json({
          message: `Invalid or excessively large price provided: ${price}`,
        });
      }
    }

    if (productName) {
      const product = await Product.findOne({
        where: { product_name: productName },
      });
      if (!product) {
        return res.status(404).json({
          message: `Product '${productName}' does not exist.`,
        });
      }
      ProductPrice.productId = product.id;
    }

    if (company) ProductPrice.company = company;
    if (price !== undefined) ProductPrice.price = price;
    if (currency) ProductPrice.currency = currency;
    if (quantity !== undefined) ProductPrice.quantity = quantity;
    if (unit) ProductPrice.unit = unit;

    await ProductPrice.save();

    res.json({
      message: "Product price updated successfully",
      data: ProductPrice,
    });
  } catch (error) {
    console.error("Error updating product price:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------------- GET BY PRICE ID ----------------
exports.getProductByPriceId = async (req, res) => {
  try {
    const { id: priceId } = req.params;

    const ProductPrice = await ProductPrices.findByPk(priceId, {
      include: [
        {
          model: Product,
          as: "Product", // ✅ IMPORTANT
          attributes: ["id", "product_name"],
        },
      ],
      attributes: ["id", "company", "price", "currency", "quantity", "unit"],
    });

    if (!ProductPrice) {
      return res.status(404).json({ message: "ProductPrice not found" });
    }

    const response = {
      id: ProductPrice.id,
      company: ProductPrice.company,
      price: ProductPrice.price,
      currency: ProductPrice.currency,
      quantity: ProductPrice.quantity,
      unit: ProductPrice.unit,
      product: {
        id: ProductPrice.Product.id,
        product_name: ProductPrice.Product.product_name,
      },
    };

    res.json({
      message: "ProductPrice fetched successfully",
      data: response,
    });
  } catch (error) {
    console.error("Error fetching product by price ID:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------------- DELETE ----------------
exports.deleteProductPrice = async (req, res) => {
  try {
    const { id } = req.params;

    const ProductPrice = await ProductPrices.findByPk(id);
    if (!ProductPrice) {
      return res.status(404).json({ message: "Product price not found" });
    }

    await ProductPrice.destroy();
    res.json({ message: "Product price deleted successfully" });
  } catch (error) {
    console.error("Error deleting product price:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------------- GET BY CAS NUMBER (fallback to product name) ----------------
exports.getProductPriceByname = async (req, res) => {
  const name = req.params.name;          // product name from URL
  const casNo = req.query.cas_no || "";  // CAS number from query param (optional)

  try {
    let productWithPrices = null;
    let matchedName = name;

    // ── Step 1: Try to find by CAS number first ──────────────────────────────
    if (casNo && casNo.trim() !== "") {
      productWithPrices = await Product.findOne({
        where: { cas_number: casNo.trim() },
        attributes: ["id", "product_name"],
        include: [
          {
            model: ProductPrices,
            as: "ProductPrices",
            attributes: ["id", "company", "price", "currency", "unit", "quantity", "updatedAt"],
          },
        ],
      });

      if (productWithPrices) {
        matchedName = productWithPrices.product_name;
      }
    }

    // ── Step 2: Fallback — find by exact product name ─────────────────────────
    if (!productWithPrices) {
      productWithPrices = await Product.findOne({
        where: { product_name: name },
        attributes: ["id", "product_name"],
        include: [
          {
            model: ProductPrices,
            as: "ProductPrices",
            attributes: ["id", "company", "price", "currency", "unit", "quantity", "updatedAt"],
          },
        ],
      });

      if (productWithPrices) {
        matchedName = productWithPrices.product_name;
      }
    }

    if (!productWithPrices) {
      return res.status(404).json({ message: "Product not found" });
    }

    // ── Step 3: Fetch latest PO Price using matched product name ──────────────
    const latestPoPrice = await PoPrice.findOne({
      where: { product_name: matchedName },
      order: [["updatedAt", "DESC"]],
      attributes: ["id", "po_price", "quantity", "quantity_unit", "updatedAt"],
    });

    const pricesArray = productWithPrices.ProductPrices.map((p) => p.toJSON());

    if (latestPoPrice) {
      pricesArray.push({
        id: latestPoPrice.id,
        company: "PO Price",
        price: latestPoPrice.po_price,
        unit: latestPoPrice.quantity_unit,
        quantity: latestPoPrice.quantity,
        updatedAt: latestPoPrice.updatedAt,
      });
    }

    res.json({
      product: {
        id: productWithPrices.id,
        name: productWithPrices.product_name,
        prices: pricesArray,
        latest_po_price: latestPoPrice || null,
        matched_by: (casNo && casNo.trim() !== "" && matchedName !== name) ? "cas_number" : "product_name",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- SEARCH ----------------
exports.searchProduct = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        message: "Please provide a search term (product name or company name).",
      });
    }

    const products = await Product.findAll({
      where: {
        product_name: {
          [Op.like]: `%${query}%`,
        },
      },
      include: [
        {
          model: ProductPrices,
          as: "ProductPrices", // ✅ IMPORTANT
          where: {
            [Op.or]: [{ company: { [Op.like]: `%${query}%` } }],
          },
          required: false,
          attributes: ["company", "price", "currency"],
        },
      ],
      order: [["product_name", "ASC"]],
    });

    if (!products || products.length === 0) {
      return res.status(404).json({
        message: "No matching products or companies found.",
      });
    }

    res.status(200).json({
      message: "Products fetched successfully.",
      data: products,
    });
  } catch (error) {
    console.error("Error searching product:", error);
    res.status(500).json({
      message: "Error searching product.",
      error: error.message,
    });
  }
};

// ---------------- IMPORT EXCEL ----------------
exports.importProductPrices = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No Excel file uploaded" });
    }

    const workbook = XLSX.readFile(req.file.path);

    // Use Sheet 2 (index 1). Fallback to Sheet 1 if not present
    const sheetName = workbook.SheetNames[1];
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
      String(v || "").replace(/\s+/g, " ").trim().toLowerCase();

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

    console.log("🧭 Company column map:", companyColumnMap);

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

    let results = [];
    let count = 0;

    const companies = ["R&D", "BLD", "TCI", "Sigma", "Ambeed"];

    for (const [rowIndex, row] of dataRows.entries()) {
      const productNameRaw = getBaseCell(row, "Name of Product");
      if (!productNameRaw || String(productNameRaw).trim() === "") continue;

      const productName = String(productNameRaw).trim();

      const Qty = getBaseCell(row, "Qty");




      // ✅ Find product by (name + stock)
      const product = await Product.findOne({
        where: {
          product_name: productName,
          // stock is STRING in your model
        },
      });

      if (!product) {
        console.warn("❌ Product not found in DB:", productName);
        continue; // or create if you want
      }

      // ✅ ALWAYS create 5 companies
      for (const company of companies) {
        const companyKey = normalize(company);
        const map = companyColumnMap[companyKey];

        if (!map) {
          console.warn(`⚠️ No columns found in Excel for company: ${company}`);
          continue;
        }

        const rawPrice = map.priceIdx !== undefined ? row[map.priceIdx] : null;
        const rawQty = map.qtyIdx !== undefined ? row[map.qtyIdx] : null;
        const rawUnit = map.unitIdx !== undefined ? row[map.unitIdx] : null;

        const hasExcelData =
          rawPrice !== null &&
          rawPrice !== undefined &&
          String(rawPrice).toLowerCase().trim() !== "na" &&
          String(rawPrice).trim() !== "";

        // Defaults
        let finalPrice = 0;
        let finalQuantity = 0;
        let finalUnit = "mg";

        if (hasExcelData) {
          finalPrice = parseNumberSafe(rawPrice);
          finalQuantity = parseNumberSafe(rawQty);
          finalUnit = normalizeUnit(rawUnit);
        }

        console.log(`   🆕 Creating price for ${company}`);

        await ProductPrices.create({
          productId: product.id,
          company,
          price: finalPrice,
          quantity: finalQuantity,
          unit: finalUnit,
        });

        results.push({
          product: `${productName}`,
          company,
          action: hasExcelData ? "created (from excel)" : "created (default)",
        });

        count++;
      }
    }

    return res.json({
      message: "Excel imported successfully",
      count,
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
