const sequelize = require("../config/db");


const User = require("./User");
const Inquiry = require("./Inquiry");
const Permission = require("./Permission");
const Product= require("./Product");
const ProductPrices = require("./ProductPrices");
const UserRole=require("./UserRole");
const Quotation = require("./Quotation");
const QuotationProduct = require("./QuotationProduct");
const InquiryProduct = require("./InquiryProduct");
const QuotationRevision =require("./QuotationRevision")
const QuotationReviced =require("./QuotationReviced")
const PurchaseOrder=require("./PurchaseOrder")
const EmailBody = require("./EmailBody");
const PoPrice=require("./poPrice")
async function init() {
  try {
    await sequelize.sync(); 
    console.log("✅ All models synced successfully");
    process.exit();
  } catch (error) {
    console.error("❌ Error syncing models:", error);
    process.exit(1);
  }
}

init();

module.exports = { sequelize,PoPrice};
// module.exports = { sequelize, User, UserRole, Inquiry, Permission, Product, ProductPrices,Quotation, QuotationProduct,InquiryProduct,QuotationRevision,PurchaseOrder,QuotationReviced,EmailBody,PoPrice};
