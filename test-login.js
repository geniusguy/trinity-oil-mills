const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Load env.local
const rootEnvPath = path.join(__dirname, '..', 'env.local');
if (fs.existsSync(rootEnvPath)) {
  const envContent = fs.readFileSync(rootEnvPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed) continue;
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex > 0) {
      const key = trimmed.substring(0, equalIndex).trim();
      let value = trimmed.substring(equalIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

// Parse DATABASE_URL
let dbConfig = null;
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    dbConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
    };
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error.message);
  }
}

async function testLogin() {
  try {
    console.log('🧪 Testing login flow (same as app does)...\n');
    
    const connection = await mysql.createConnection(dbConfig);
    
    const email = 'admin@trinityoil.com';
    const password = 'admin@123';
    
    // Same query as the app uses
    const [users] = await connection.query(
      'SELECT id, email, password, name, role FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    
    if (users.length === 0) {
      console.log('❌ User not found');
      await connection.end();
      return;
    }
    
    const user = users[0];
    console.log('✅ User found:', user.email);
    console.log('   Name:', user.name);
    console.log('   Role:', user.role);
    
    // Same password check as the app uses
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    console.log('\n🔐 Testing password:', password);
    console.log('✅ Password valid:', isValidPassword ? 'YES' : 'NO');
    
    if (isValidPassword) {
      console.log('\n✅ Login would succeed!');
      console.log('User object:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } else {
      console.log('\n❌ Login would fail - password mismatch');
      console.log('\n💡 The password in database does not match "admin@123"');
      console.log('   Let me update it again...\n');
      
      const newHash = await bcrypt.hash(password, 10);
      await connection.query('UPDATE users SET password = ?, updated_at = NOW() WHERE email = ?', [newHash, email]);
      console.log('✅ Password updated again');
      
      // Test again
      const [updatedUsers] = await connection.query('SELECT password FROM users WHERE email = ?', [email]);
      const newIsValid = await bcrypt.compare(password, updatedUsers[0].password);
      console.log('✅ New password test:', newIsValid ? 'PASSED' : 'FAILED');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLogin();

