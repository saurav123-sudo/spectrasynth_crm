const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");

const PoPrice = sequelize.define(
  "PoPrice",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

  
    product_name: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Unknown",
    },

    cas_number: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "N/A",
    },

    quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: "Quantity ordered",
    },

    quantity_unit: {
      type: DataTypes.ENUM("mg", "gm", "ml", "kg", "ltr", "mcg"),
      allowNull: false,
      defaultValue: "mg",
    },

    po_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      comment: "Price per unit",
    },
  },
  {
    tableName: "po_prices",
    timestamps: true,
  }
);


module.exports = PoPrice;
