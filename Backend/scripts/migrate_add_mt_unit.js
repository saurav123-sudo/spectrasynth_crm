require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('🔗 Connected to database');

    // Run migration
    await conn.query(`
      ALTER TABLE inquiry_products 
      MODIFY COLUMN selected_price_unit ENUM('mg', 'gm', 'ml', 'kg', 'mt', 'ltr') 
      COMMENT 'Unit for selected price'
    `);

    console.log('✅ Migration successful: Added "mt" to selected_price_unit ENUM');

  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

runMigration();


