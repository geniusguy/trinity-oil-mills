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

async function verifyPassword() {
  try {
    console.log('🔍 Verifying admin password in database...\n');
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Get the current password hash
    const [users] = await connection.query('SELECT email, password FROM users WHERE email = ?', ['admin@trinityoil.com']);
    
    if (users.length === 0) {
      console.log('❌ Admin user not found');
      await connection.end();
      return;
    }
    
    const user = users[0];
    console.log('✅ Admin user found');
    console.log('📧 Email:', user.email);
    console.log('🔐 Password hash (first 20 chars):', user.password.substring(0, 20) + '...\n');
    
    // Test with the new password
    const testPassword = 'admin@123';
    const isValid = await bcrypt.compare(testPassword, user.password);
    
    console.log('🧪 Testing password: admin@123');
    console.log('✅ Password match:', isValid ? 'YES' : 'NO');
    
    if (!isValid) {
      console.log('\n⚠️  Password does not match! Let me update it again...\n');
      
      // Update password again
      const newPasswordHash = await bcrypt.hash(testPassword, 10);
      await connection.query('UPDATE users SET password = ?, updated_at = NOW() WHERE email = ?', [newPasswordHash, user.email]);
      console.log('✅ Password updated again');
      
      // Verify again
      const [updatedUsers] = await connection.query('SELECT password FROM users WHERE email = ?', [user.email]);
      const newIsValid = await bcrypt.compare(testPassword, updatedUsers[0].password);
      console.log('✅ New password verification:', newIsValid ? 'PASSED' : 'FAILED');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyPassword();

