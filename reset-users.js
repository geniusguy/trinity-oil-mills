const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function resetUsers() {
  try {
    console.log('🔄 Resetting all users...');

    // Connect to the database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root'
    });

    // Use the database
    await connection.query('USE oil_shop_db_new');

    // Delete all existing users
    await connection.query('DELETE FROM users');
    console.log('✅ Deleted all existing users');

    // Create fresh password hash
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log('🔐 New password hash:', hashedPassword);

    // Insert fresh users
    const users = [
      {
        id: 'admin-001',
        email: 'admin@trinityoil.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin'
      },
      {
        id: 'accountant-001',
        email: 'accountant@trinityoil.com',
        password: hashedPassword,
        name: 'Accountant User',
        role: 'accountant'
      },
      {
        id: 'retail-001',
        email: 'staff@trinityoil.com',
        password: hashedPassword,
        name: 'Retail Staff',
        role: 'retail_staff'
      }
    ];

    for (const user of users) {
      await connection.query(
        'INSERT INTO users (id, email, password, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [user.id, user.email, user.password, user.name, user.role]
      );
      console.log(`✅ User created: ${user.email}`);
    }

    // Verify password for admin user
    const [adminUser] = await connection.query('SELECT password FROM users WHERE email = ?', ['admin@trinityoil.com']);
    const isValidPassword = await bcrypt.compare('admin123', adminUser[0].password);
    console.log('🔍 Password verification test:', isValidPassword);

    await connection.end();
    console.log('🎉 All users reset successfully!');

  } catch (error) {
    console.error('❌ Error resetting users:', error);
  }
}

resetUsers();
