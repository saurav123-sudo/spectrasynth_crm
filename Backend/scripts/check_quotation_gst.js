require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkQuotationGST() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('🔗 Connected to database\n');

    // Get recent quotations
    const [quotations] = await conn.query(`
      SELECT 
        quotation_number,
        total_price,
        gst,
        ROUND((gst / total_price) * 100, 2) as gst_percentage,
        date,
        quotation_status
      FROM quotations 
      ORDER BY createdAt DESC 
      LIMIT 10
    `);

    console.log('📊 Recent Quotations GST Analysis:\n');
    console.log('='.repeat(100));
    
    quotations.forEach((q, index) => {
      const expectedGST = (q.total_price * 0.18).toFixed(2);
      const isCorrect = Math.abs(q.gst - expectedGST) < 0.01;
      
      console.log(`\n${index + 1}. Quotation: ${q.quotation_number}`);
      console.log(`   Date: ${q.date}`);
      console.log(`   Total Price: ₹${q.total_price}`);
      console.log(`   Stored GST: ₹${q.gst}`);
      console.log(`   Expected GST (18%): ₹${expectedGST}`);
      console.log(`   Actual GST %: ${q.gst_percentage}%`);
      console.log(`   Status: ${isCorrect ? '✅ Correct' : '❌ Incorrect'}`);
    });

    console.log('\n' + '='.repeat(100));

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

checkQuotationGST();


