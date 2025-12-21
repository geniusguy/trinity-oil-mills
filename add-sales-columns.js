const mysql = require('mysql2/promise');

async function addSalesColumns() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '32yO97aldFvo0idG',
      database: 'trinityoil_oil_shop_db_new'
    });

    console.log('Adding missing columns to sales table...');
    
    // Add po_number column if it doesn't exist
    try {
      await connection.execute('ALTER TABLE sales ADD COLUMN po_number VARCHAR(255) NULL');
      console.log('✅ Added po_number column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('✅ po_number column already exists');
      } else {
        console.log('❌ Error adding po_number:', error.message);
      }
    }

    // Add po_date column if it doesn't exist
    try {
      await connection.execute('ALTER TABLE sales ADD COLUMN po_date DATE NULL');
      console.log('✅ Added po_date column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('✅ po_date column already exists');
      } else {
        console.log('❌ Error adding po_date:', error.message);
      }
    }

    // Add mode_of_sales column if it doesn't exist
    try {
      await connection.execute('ALTER TABLE sales ADD COLUMN mode_of_sales VARCHAR(255) NULL');
      console.log('✅ Added mode_of_sales column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('✅ mode_of_sales column already exists');
      } else {
        console.log('❌ Error adding mode_of_sales:', error.message);
      }
    }

    // Check final structure
    const [columns] = await connection.execute('SHOW COLUMNS FROM sales');
    console.log('\nFinal sales table columns:');
    columns.forEach(col => {
      if (['po_number', 'po_date', 'mode_of_sales'].includes(col.Field)) {
        console.log(`✅ ${col.Field} (${col.Type})`);
      }
    });

    await connection.end();
    console.log('\n🎉 Sales table updated successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addSalesColumns();

