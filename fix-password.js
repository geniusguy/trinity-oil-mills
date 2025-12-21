const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function fixPassword() {
  try {
    console.log('🔧 Fixing password...');

    // Connect to the database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root'
    });

    // Use the database
    await connection.query('USE oil_shop_db_new');

    // Check current password hash
    const [users] = await connection.query('SELECT email, password FROM users WHERE email = ?', ['admin@trinityoil.com']);
    console.log('Current password hash:', users[0].password);

    // Test password verification
    const isValid = await bcrypt.compare('admin123', users[0].password);
    console.log('Password verification test:', isValid);

    // Create new password hash
    const newPasswordHash = await bcrypt.hash('admin123', 10);
    console.log('New password hash:', newPasswordHash);

    // Update password in database
    await connection.query('UPDATE users SET password = ? WHERE email = ?', [newPasswordHash, 'admin@trinityoil.com']);
    console.log('✅ Password updated');

    // Test new password
    const [updatedUsers] = await connection.query('SELECT password FROM users WHERE email = ?', ['admin@trinityoil.com']);
    const newIsValid = await bcrypt.compare('admin123', updatedUsers[0].password);
    console.log('New password verification test:', newIsValid);

    await connection.end();

  } catch (error) {
    console.error('❌ Error fixing password:', error);
  }
}

fixPassword();
