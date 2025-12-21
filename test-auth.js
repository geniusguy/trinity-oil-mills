const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function testAuth() {
  try {
    console.log('🧪 Testing authentication flow...');

    // Connect to the database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'oil_shop_db_new'
    });

    console.log('✅ Database connected');

    const [users] = await connection.query(
      'SELECT id, email, password, name, role FROM users WHERE email = ? LIMIT 1',
      ['admin@trinityoil.com']
    );

    console.log('📊 Users found:', users.length);

    if (users.length === 0) {
      console.log('❌ No user found');
      return;
    }

    const user = users[0];
    console.log('👤 User found:', user.email, user.role);
    
    const isValidPassword = await bcrypt.compare('admin123', user.password);
    console.log('🔐 Password valid:', isValidPassword);

    if (isValidPassword) {
      console.log('✅ Authentication would succeed');
      console.log('User object:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } else {
      console.log('❌ Authentication would fail');
    }

    await connection.end();

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testAuth();
