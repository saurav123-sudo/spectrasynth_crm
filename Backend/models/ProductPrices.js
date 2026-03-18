const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Product = require("./Product");

const ProductPrices = sequelize.define(
  "ProductPrices",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Product,
        key: "id",
      },
    },
    company: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "INR",
    },
    quantity: {

      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    unit: {
      type: DataTypes.ENUM("mg", "gm", "ml", "kg", "ltr"),
      allowNull: false,
      defaultValue: "mg",
    },
  },
  {
    tableName: "product_prices",
    timestamps: true,
  }
);

// ✅ Associations (KEEP THESE NAMES EXACT)
Product.hasMany(ProductPrices, {
  foreignKey: "productId",
  as: "ProductPrices",
});

ProductPrices.belongsTo(Product, {
  foreignKey: "productId",
  as: "Product",
});

module.exports = ProductPrices;
