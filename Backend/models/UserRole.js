const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const User = require("./User");

const UserRole = sequelize.define(
  "UserRole",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "user_roles",
    timestamps: false,
  }
);

// Associations
User.hasMany(UserRole, { foreignKey: "user_id", as: "roles" });
UserRole.belongsTo(User, { foreignKey: "user_id" });

module.exports = UserRole;
