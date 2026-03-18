const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const Inquiry = require("./Inquiry.js");

const InquiryProduct = sequelize.define(
  "InquiryProduct",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    inquiry_number: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: "inquiries",
        key: "inquiry_number",
      },
      onDelete: "CASCADE",
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

    product_code: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "N/A",
    },

    quantity_required: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    quantity_unit: {
      type: DataTypes.ENUM("mg", "gm", "ml", "kg", "mt", "ltr"),
      allowNull: false,
      defaultValue: "mg",
    },

    package_size: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    image_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Company price mapping fields
    selected_company: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Selected company for this product",
    },

    selected_company_price: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "Price from selected company",
    },

    selected_price_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Quantity tier for selected price",
    },

    selected_price_unit: {
      type: DataTypes.ENUM("mg", "gm", "ml", "kg", "mt", "ltr"), // ✅ Added "mt"
      allowNull: true,
      comment: "Unit for selected price",
    },

    price_source: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Source of price (company_name or 'po_price')",
    },
    has_catalog_match: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Indicates if the product exists in the catalog (manually added or scraped)",
    },
  },
  {
    tableName: "inquiry_products",
    timestamps: true,
  }
);

Inquiry.hasMany(InquiryProduct, {
  foreignKey: "inquiry_number",
  as: "products",
  onDelete: "CASCADE",
});

InquiryProduct.belongsTo(Inquiry, {
  foreignKey: "inquiry_number",
  as: "inquiry",
});

module.exports = InquiryProduct;
