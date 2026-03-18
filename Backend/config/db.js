const { Sequelize } = require("sequelize");
require("dotenv").config(); // Load environment variables from .env file


const db = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    dialect: "mysql",
    logging: false, // Disable logging for cleaner output
});


const connection = async () => {
    try {
        await db.authenticate();
        console.log("Database connected successfully.");
    } catch (err) {
        console.error(" Unable to connect to the database:", err);
    }
};

// Call connection function
connection();

module.exports = db;
