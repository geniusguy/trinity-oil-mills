const mysql = require('mysql2/promise');

async function createDatabase() {
  try {
    // Connect without specifying a database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    // Create the database
    await connection.execute('CREATE DATABASE IF NOT EXISTS oil_shop_db_new');
    console.log('✅ Database created successfully!');
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error creating database:', error);
  }
}

createDatabase();




