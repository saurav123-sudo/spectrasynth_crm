const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const Inquiry = require("./Inquiry");
const User = require("./User"); // ✅ Import the User model

const Quotation = sequelize.define(
  "Quotation",
  {
    quotation_number: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
    },

    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    quotation_by: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    //Foreign key linked with Inquiry
    inquiry_number: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Inquiry,
        key: "inquiry_number",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },

    // New Foreign key linked with User
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: User, 
        key: "id",   
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL", // or "CASCADE" if you want to delete quotations when user is deleted
    },
     company_name: {
  type: DataTypes.STRING,
  allowNull: true,    // allow null
  defaultValue: null, // optional, null by default
},
company_email_id: {
  type: DataTypes.STRING,
  allowNull: true,    // allow null
  defaultValue: null,
},

    quotation_pdf: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    total_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },

    gst: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 0.0,
    },

    remark: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    quotation_status: {
      type: DataTypes.ENUM(
        "Temp. Quatation",
        "finalise",
        "send_email",
        "generate_po"
      ),
      allowNull: false,
      defaultValue: "Temp. Quatation",
    },

    email_sent_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    email_sent_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    reminder_days: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },

    next_reminder_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    reminder_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    
  },

  {
    tableName: "quotations",
    timestamps: true,
  }
);

Quotation.belongsTo(Inquiry, {
  foreignKey: "inquiry_number",
  as: "inquiry",
});

Inquiry.hasMany(Quotation, {
  foreignKey: "inquiry_number",
  as: "quotations",
});

// ✅ New Association with User
Quotation.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

User.hasMany(Quotation, {
  foreignKey: "user_id",
  as: "quotations",
});

module.exports = Quotation;
