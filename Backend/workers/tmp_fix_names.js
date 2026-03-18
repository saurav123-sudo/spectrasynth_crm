require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
        });
        const [res] = await conn.query("UPDATE product_prices SET company = REPLACE(REPLACE(company, 'www.', ''), '.com', '')");
        console.log('Rows updated:', res.affectedRows);
        conn.end();
    } catch (e) {
        console.error(e);
    }
}

run();
