const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");

const LeadTimeMaster = sequelize.define(
  "LeadTimeMaster",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    lead_time: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: "Lead time text (e.g., '1 week', '2-3 week', '8 week')",
    },
    created_by: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "User who created this entry",
    },
    updated_by: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "User who last updated this entry",
    },
  },
  {
    tableName: "lead_time_master",
    timestamps: true,
  }
);

module.exports = LeadTimeMaster;


