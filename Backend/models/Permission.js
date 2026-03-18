const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const User = require("./User.js"); // Assuming you already have User model

const Permission = sequelize.define(
  "Permission",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
      onDelete: "CASCADE",
    },

    module_name: {
      type: DataTypes.ENUM(
        "inquiry",
        "technical_person",
        "marketing_person",
        "product",
        "company_price",
        "quotation",
        "users",
        "purchase_order",
        "permission",
        "reminder_history",
        "reminder_followup",
      ),
      allowNull: false,
    },

    can_create: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    can_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    can_update: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    can_delete: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "permissions",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["user_id", "module_name"],
      },
    ],
  },
);

Permission.belongsTo(User, { foreignKey: "user_id", as: "user" });

module.exports = Permission;
