const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const QuotationProduct = require("./QuotationProduct");

const QuotationRevision = sequelize.define(
  "QuotationRevision",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    field_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    old_value: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    new_value: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    changed_by: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    changed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "quotation_revisions",
    timestamps: false,
  }
);

// Associations
QuotationRevision.belongsTo(QuotationProduct, { foreignKey: "product_id",  onDelete: "CASCADE" });

module.exports = QuotationRevision;
