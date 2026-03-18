const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");

const Inquiry = sequelize.define(
  "Inquiry",
  {
    inquiry_number: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
    },

    customer_name: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Unknown",
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email_body_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "FK to email_bodies.id — links inquiry to its source email",
    },

    // Updated ENUM - added finalize_quotation
    current_stage: {
      type: DataTypes.ENUM(
        "inquiry_received",
        "technical_review",
        "management_review",
        "purchase_order",
        "finalize_quotation"   // ✅ NEW STAGE
      ),
      defaultValue: "inquiry_received",
    },

    // Status fields for each stage
    inquiry_status: {
      type: DataTypes.ENUM("pending", "forwarded"),
      defaultValue: "pending",
    },
    technical_status: {
      type: DataTypes.ENUM("pending", "forwarded"),
      defaultValue: "pending",
    },
    management_status: {
      type: DataTypes.ENUM("pending", "forwarded"),
      defaultValue: "pending",
    },
    purchase_order_status: {
      type: DataTypes.ENUM("pending", "forwarded"),
      defaultValue: "pending",
    },

    // NEW STATUS FIELD for finalize_quotation
    finalize_quotation_status: {
      type: DataTypes.ENUM("pending", "forwarded"),
      defaultValue: "pending",
    },

    // Update date fields
    inquiry_update_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    technical_update_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    management_update_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    po_update_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // NEW update date for finalize quotation
    finalize_quotation_update_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Handled by fields
    inquiry_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    technical_quotation_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    marketing_quotation_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    po_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // NEW: handled by name for finalize quotation
    finalize_quotation_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    additional_email_content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "inquiries",
    timestamps: true,
  }
);

module.exports = Inquiry;
