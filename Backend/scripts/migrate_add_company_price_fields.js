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

    // Check which columns exist
    const [columns] = await conn.query(`
      SHOW COLUMNS FROM inquiry_products
    `);
    
    const existingColumns = columns.map(col => col.Field);
    console.log('📋 Existing columns:', existingColumns);

    // Add missing columns
    const columnsToAdd = [
      {
        name: 'selected_company',
        definition: "ADD COLUMN selected_company VARCHAR(255) NULL COMMENT 'Selected company for this product'"
      },
      {
        name: 'selected_company_price',
        definition: "ADD COLUMN selected_company_price FLOAT NULL COMMENT 'Price from selected company'"
      },
      {
        name: 'selected_price_quantity',
        definition: "ADD COLUMN selected_price_quantity INT NULL COMMENT 'Quantity tier for selected price'"
      },
      {
        name: 'selected_price_unit',
        definition: "ADD COLUMN selected_price_unit ENUM('mg', 'gm', 'ml', 'kg', 'mt', 'ltr') NULL COMMENT 'Unit for selected price'"
      },
      {
        name: 'price_source',
        definition: "ADD COLUMN price_source VARCHAR(255) NULL COMMENT 'Source of price (company_name or po_price)'"
      }
    ];

    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        console.log(`➕ Adding column: ${column.name}`);
        await conn.query(`ALTER TABLE inquiry_products ${column.definition}`);
        console.log(`✅ Added: ${column.name}`);
      } else {
        console.log(`⏭️  Skipping ${column.name} (already exists)`);
      }
    }

    console.log('✅ Migration completed successfully');

  } catch (err) {
    console.error('❌ Migration error:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

runMigration();


