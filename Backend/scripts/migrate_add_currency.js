const mysql = require("mysql2/promise");
require("dotenv").config({ path: __dirname + "/../.env" });

async function migrate() {
    console.log("Starting migration to add 'currency' to product_prices...");
    console.log(`DB Host: ${process.env.DB_HOST}`);
    console.log(`DB User: ${process.env.DB_USER}`);
    console.log(`DB Name: ${process.env.DB_NAME}`);

    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: 3306,
        });

        console.log("Connected to database successfully.");

        // Check if column exists
        const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'product_prices' AND COLUMN_NAME = 'currency'
    `, [process.env.DB_NAME]);

        if (columns.length > 0) {
            console.log("Column 'currency' already exists in 'product_prices'. Skipping alter table.");
        } else {
            console.log("Adding 'currency' column to 'product_prices' table...");
            await connection.query(`
        ALTER TABLE product_prices
        ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'INR' AFTER price;
      `);
            console.log("Successfully added 'currency' column (default: 'INR').");
        }

        console.log("Migration finished successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        if (connection) {
            await connection.end();
            console.log("Database connection closed.");
        }
        process.exit(0);
    }
}

migrate();
