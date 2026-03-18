require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS, // Updated to match .env
            database: process.env.DB_NAME
        });

        console.log('🔗 Connected to database');

        // Check which columns exist in inquiry_products
        const [columns] = await conn.query(`
      SHOW COLUMNS FROM inquiry_products
    `);

        const existingColumns = columns.map(col => col.Field);
        console.log('📋 Existing columns:', existingColumns);

        const columnToAdd = {
            name: 'has_catalog_match',
            definition: "ADD COLUMN has_catalog_match TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Indicates if the product exists in the catalog (manually added or scraped)'"
        };

        if (!existingColumns.includes(columnToAdd.name)) {
            console.log(`➕ Adding column: ${columnToAdd.name}`);
            await conn.query(`ALTER TABLE inquiry_products ${columnToAdd.definition}`);
            console.log(`✅ Added: ${columnToAdd.name}`);
        } else {
            console.log(`⏭️  Skipping ${columnToAdd.name} (already exists)`);
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
