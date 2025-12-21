// Update Admin Password on Server
// Run this on your server: node update-password-server.js

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Load .env.production
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.production');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
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
    return true;
  }
  return false;
}

async function updatePassword() {
  try {
    console.log('🔧 Updating admin password on server...\n');

    // Load environment variables
    if (!loadEnvFile()) {
      console.log('❌ .env.production not found!');
      console.log('Please create .env.production with DATABASE_URL\n');
      process.exit(1);
    }

    const email = 'admin@trinityoil.com';
    const newPassword = 'admin@123';

    console.log(`📧 Email: ${email}`);
    console.log(`🔑 New Password: ${newPassword}\n`);

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
        console.log(`📋 Using DATABASE_URL: ${dbConfig.user}@${dbConfig.host}/${dbConfig.database}`);
      } catch (error) {
        console.log('⚠️  Could not parse DATABASE_URL');
      }
    }

    if (!dbConfig) {
      dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'trinityoil_oil_shop_db_new',
      };
      console.log(`📋 Using fallback config: ${dbConfig.user}@${dbConfig.host}/${dbConfig.database}`);
    }

    console.log('\n🔌 Connecting to database...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected!\n');

    // Check if user exists
    const [users] = await connection.query('SELECT email, password FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      console.log(`❌ User with email ${email} not found`);
      await connection.end();
      return;
    }

    console.log(`✅ User found: ${email}`);

    // Generate new password hash
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    console.log('🔐 Generated password hash');

    // Update password
    await connection.query('UPDATE users SET password = ?, updated_at = NOW() WHERE email = ?', [newPasswordHash, email]);
    console.log('✅ Password updated in database\n');

    // Verify
    const [updatedUsers] = await connection.query('SELECT password FROM users WHERE email = ?', [email]);
    const isValid = await bcrypt.compare(newPassword, updatedUsers[0].password);
    
    if (isValid) {
      console.log('✅ Password verification test PASSED');
      console.log('\n🎉 SUCCESS! Password has been updated.');
      console.log('\n📧 Login credentials:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${newPassword}\n`);
    } else {
      console.log('❌ Password verification test FAILED');
    }

    await connection.end();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Database connection failed.');
      console.error('Check your DATABASE_URL in .env.production\n');
    }
    process.exit(1);
  }
}

updatePassword();

