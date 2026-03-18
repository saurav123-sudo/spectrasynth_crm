const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");

const EmailBody = sequelize.define(
  "EmailBody",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    message_id: {
      type: DataTypes.STRING(998), // RFC 2822 max length
      allowNull: true,
      unique: true,
      comment: "RFC Message-ID header — used to prevent duplicate ingestion",
    },

    sender_email: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Email address of the sender",
    },

    subject: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "No Subject",
      comment: "Subject of the email",
    },

    body: {
      type: DataTypes.TEXT("long"), // store long HTML or plain text
      allowNull: false,
      comment: "Full decoded email content (HTML or plain text)",
    },

    format: {
      type: DataTypes.ENUM("html", "plain"),
      allowNull: false,
      defaultValue: "plain",
      comment: "Email format type",
    },

    received_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: "Date and time when the email was received",
    },
    inquiry_created: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether this email has been converted into an Inquiry",
    },
    classification: {
      type: DataTypes.ENUM("none", "inquiry", "spam", "processing"),
      defaultValue: "none",
      comment: "AI classification: none | inquiry | spam | processing",
    },
  },
  {
    tableName: "email_bodies",
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

module.exports = EmailBody;
