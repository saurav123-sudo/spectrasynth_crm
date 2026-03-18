const Product = require("../models/Product");
const sequelize = require("../config/db");

async function getProductNames() {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully.\n");

    const products = await Product.findAll({
      attributes: ["id", "product_name", "cas_number", "status"],
      order: [["product_name", "ASC"]],
    });

    if (products.length === 0) {
      console.log("No products found in the database.");
      return;
    }

    console.log(`Total Products: ${products.length}\n`);
    console.log("=".repeat(80));
    console.log("Available Product Names:");
    console.log("=".repeat(80));
    
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.product_name} (CAS: ${product.cas_number || "N/A"}, Status: ${product.status})`);
    });

    console.log("\n" + "=".repeat(80));
    console.log("\nProduct Names Only (for easy copy):");
    console.log("-".repeat(80));
    products.forEach((product) => {
      console.log(product.product_name);
    });

    await sequelize.close();
  } catch (error) {
    console.error("Error fetching products:", error);
  }
}

getProductNames();


