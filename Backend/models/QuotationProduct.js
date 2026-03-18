const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const Quotation = require("./Quotation");

const QuotationProduct = sequelize.define(
  "QuotationProduct",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    quotation_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    product_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cas_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    hsn_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    quantity_unit: {            // <-- Added this field
      type: DataTypes.STRING,
      allowNull: true,
    },
    lead_time: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "quotation_products",
    timestamps: true,
  }
);

// Relationship with Quotation remains the same
Quotation.hasMany(QuotationProduct, {
  foreignKey: "quotation_number",
  sourceKey: "quotation_number",
  as: "quotation_products",
});

QuotationProduct.belongsTo(Quotation, {
  foreignKey: "quotation_number",
  targetKey: "quotation_number",
  as: "quotation",
});

module.exports = QuotationProduct;
