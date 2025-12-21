const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

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

console.log('DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 'NOT FOUND');

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
    console.log('Parsed config:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password ? '***' + dbConfig.password.slice(-2) : 'NOT SET',
      database: dbConfig.database
    });
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error.message);
  }
}

// Test connection
async function testConnection() {
  if (!dbConfig) {
    console.log('❌ No database config');
    return;
  }
  
  try {
    console.log('\n🔌 Testing connection...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected successfully!');
    
    // Test query
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log('✅ Query successful! Users count:', rows[0].count);
    
    // Check admin user
    const [users] = await connection.query('SELECT email, role FROM users WHERE email = ?', ['admin@trinityoil.com']);
    if (users.length > 0) {
      console.log('✅ Admin user found:', users[0]);
    } else {
      console.log('❌ Admin user not found');
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    console.error('Error code:', error.code);
  }
}

testConnection();

