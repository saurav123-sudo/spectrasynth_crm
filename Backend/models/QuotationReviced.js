const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const QuotationProduct = require("./QuotationProduct");

const QuotationReviced = sequelize.define(
  "QuotationReviced",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    quotation_number: { type: DataTypes.STRING, allowNull: false },
    revision_number: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: true },
    changes: { type: DataTypes.JSON, allowNull: false }, // All changes for this revision
    changed_by: { type: DataTypes.STRING, allowNull: false },
    changed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    pdf_path: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "quotation_reviced",
    timestamps: false,
  }
);

QuotationReviced.belongsTo(QuotationProduct, { foreignKey: "product_id", onDelete: "CASCADE" });

module.exports = QuotationReviced;
