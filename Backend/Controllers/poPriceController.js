const express = require("express");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const sequelize = require("../config/db");

const PoPrice=require("../models/poPrice");

// CREATE PO PRICE
exports.createPoPrice = async (req, res) => {
  try {
    const { product_name, cas_number, quantity, quantity_unit, po_price } = req.body;

    // Validate required fields
    if (!product_name || !cas_number || quantity == null || !quantity_unit || po_price == null) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newPoPrice = await PoPrice.create({
      product_name,
      cas_number,
      quantity,
      quantity_unit,
      po_price,
    });

    res.status(201).json({
      message: "PO Price created successfully",
      data: newPoPrice,
    });
  } catch (error) {
    console.error("Error creating PO price:", error);
    res.status(500).json({
      message: "Error creating PO price",
      error: error.message,
    });
  }
};

// GET ALL PO PRICES
exports.getAllPoPrices = async (req, res) => {
  try {
    const poPrices = await PoPrice.findAll({ order: [["id", "ASC"]] });
    res.status(200).json({ message: "PO Prices fetched successfully", data: poPrices });
  } catch (error) {
    console.error("Error fetching PO prices:", error);
    res.status(500).json({ message: "Error fetching PO prices", error: error.message });
  }
};

// GET SINGLE PO PRICE
exports.getPoPrice = async (req, res) => {
  try {
    const poPrice = await PoPrice.findByPk(req.params.id);
    if (!poPrice) return res.status(404).json({ message: "PO Price not found" });
    res.status(200).json({ message: "PO Price fetched successfully", data: poPrice });
  } catch (error) {
    console.error("Error fetching PO price:", error);
    res.status(500).json({ message: "Error fetching PO price", error: error.message });
  }
};

// UPDATE PO PRICE
exports.updatePoPrice = async (req, res) => {
  try {
    console.log("Received Body:", req.body);
    console.log("Params:", req.params);

    const poPrice = await PoPrice.findByPk(req.params.id);
    if (!poPrice)
      return res.status(404).json({ message: "PO Price not found" });

    const updateData = {
      product_name: req.body.product_name ?? poPrice.product_name,
      cas_number: req.body.cas_number ?? poPrice.cas_number,
      quantity: req.body.quantity ?? poPrice.quantity,
      quantity_unit: req.body.quantity_unit ?? poPrice.quantity_unit,
      po_price: req.body.po_price ?? poPrice.po_price,
    };

    console.log("Updating with:", updateData);

    await poPrice.update(updateData);

    res.status(200).json({
      message: "PO Price updated successfully",
      data: poPrice,
    });
  } catch (error) {
    console.error("Error updating PO price:", error);
    res.status(500).json({
      message: "Error updating PO price",
      error: error.message,
    });
  }
};


// DELETE PO PRICE
exports.deletePoPrice = async (req, res) => {
  try {
    const poPrice = await PoPrice.findByPk(req.params.id);
    if (!poPrice) return res.status(404).json({ message: "PO Price not found" });

    await poPrice.destroy();
    res.status(200).json({ message: "PO Price deleted successfully" });
  } catch (error) {
    console.error("Error deleting PO price:", error);
    res.status(500).json({ message: "Error deleting PO price", error: error.message });
  }
};

// BULK UPLOAD PO PRICES (upsert)
exports.bulkUpload = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { rows } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: "No rows provided" });
    }

    const batch_id = uuidv4();
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const { product_name, cas_number, quantity, quantity_unit, po_price } = row;

      // Skip invalid rows
      if (!product_name || quantity == null || !quantity_unit || po_price == null) {
        skipped++;
        continue;
      }

      // Sanitize: strip newlines and truncate to 255 chars
      const cleanName = product_name.replace(/[\r\n]+/g, " ").trim().substring(0, 255);
      const casVal = (!cas_number || cas_number === "NA" || cas_number === "N/A") ? "" : cas_number.trim();

      try {
        const [result] = await sequelize.query(
          `INSERT INTO po_prices (product_name, cas_number, quantity, quantity_unit, po_price, createdAt, updatedAt)
           VALUES (:product_name, :cas_number, :quantity, :quantity_unit, :po_price, NOW(), NOW())
           ON DUPLICATE KEY UPDATE po_price = VALUES(po_price), updatedAt = NOW()`,
          {
            replacements: {
              product_name: cleanName,
              cas_number: casVal,
              quantity: parseFloat(quantity),
              quantity_unit,
              po_price: parseFloat(po_price),
            },
            transaction: t,
          }
        );

        // MySQL: affectedRows=1 means inserted, affectedRows=2 means updated
        const affected = result?.affectedRows ?? result;
        if (affected === 2) {
          updated++;
        } else {
          inserted++;
        }
      } catch (rowErr) {
        console.warn("Skipping row due to error:", cleanName, rowErr.message);
        skipped++;
      }
    }

    await t.commit();

    res.status(200).json({
      message: "Bulk upload completed",
      inserted,
      updated,
      skipped,
      batch_id,
    });
  } catch (error) {
    await t.rollback();
    console.error("Error in bulk upload:", error);
    res.status(500).json({ message: "Bulk upload failed", error: error.message });
  }
};
