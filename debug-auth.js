const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function debugAuth() {
  try {
    console.log('🔍 Debugging authentication...');

    // Connect to the database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root'
    });

    // Use the database
    await connection.query('USE oil_shop_db_new');

    // Check if users table exists and has data
    const [tables] = await connection.query('SHOW TABLES LIKE "users"');
    console.log('Users table exists:', tables.length > 0);

    if (tables.length > 0) {
      // Check users in database
      const [users] = await connection.query('SELECT id, email, name, role FROM users');
      console.log('Users in database:', users);

      // Test password verification for admin user
      const [adminUser] = await connection.query('SELECT password FROM users WHERE email = ?', ['admin@trinityoil.com']);
      
      if (adminUser.length > 0) {
        console.log('Admin user found');
        const isValidPassword = await bcrypt.compare('admin123', adminUser[0].password);
        console.log('Password verification for admin123:', isValidPassword);
      } else {
        console.log('Admin user NOT found');
      }
    }

    await connection.end();

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugAuth();
