const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const Quotation = require("./Quotation.js");

const PurchaseOrder = sequelize.define(
  "PurchaseOrder",
  {
    po_number: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
    },

    quotation_number: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Quotation,
        key: "quotation_number",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    po_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    po_status: {
      type: DataTypes.ENUM("active", "confirm", "cancel"),
      allowNull: false,
      defaultValue: "active",
    },

    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    CompanyName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "purchase_orders",
    timestamps: true,
  }
);

// ✅ Association
PurchaseOrder.belongsTo(Quotation, {
  foreignKey: "quotation_number",
  as: "quotation",
});

Quotation.hasOne(PurchaseOrder, {
  foreignKey: "quotation_number",
  as: "purchase_order",
});

module.exports = PurchaseOrder;
