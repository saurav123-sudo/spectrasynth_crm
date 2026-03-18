const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const EmailAttachment = sequelize.define(
  "EmailAttachment",
  {
    
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email_body_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mime_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    storage_path: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_inline: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "email_attachments",
    timestamps: true,
  },
);

// Ensure table exists even if global sync script is not run
EmailAttachment.sync();

module.exports = EmailAttachment;

