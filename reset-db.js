const mysql = require('mysql2/promise');

async function resetDatabase() {
  try {
    // Connect to the database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root'
    });

    // Use the database
    await connection.query('USE oil_shop_db_new');

    // Get all table names
    const [tables] = await connection.query('SHOW TABLES');
    
    if (tables.length > 0) {
      console.log('🗑️ Dropping existing tables...');
      
      // Disable foreign key checks
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      
      // Drop all tables
      for (const table of tables) {
        const tableName = Object.values(table)[0];
        console.log(`   Dropping table: ${tableName}`);
        await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
      }
      
      // Re-enable foreign key checks
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      
      console.log('✅ All tables dropped successfully!');
    } else {
      console.log('ℹ️ No tables found to drop.');
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error resetting database:', error);
  }
}

resetDatabase();
