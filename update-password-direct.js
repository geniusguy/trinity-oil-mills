// This script uses the app's database connection to update the password
// It works even when the Next.js server is not running

const path = require('path');
const fs = require('fs');

// Load environment variables - ONLY from root env.local (local credentials)
// Do NOT load from .env.production (server credentials)
function loadEnvFile(filePath, source) {
  if (fs.existsSync(filePath)) {
    const envContent = fs.readFileSync(filePath, 'utf8');
    const lines = envContent.split('\n');
    let loaded = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip comments and empty lines
      if (trimmed.startsWith('#') || !trimmed) continue;
      
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
        loaded++;
      }
    }
    console.log(`✅ Loaded ${loaded} variables from ${source}`);
    return true;
  }
  return false;
}

// ONLY load from root env.local file (local development credentials)
// Do NOT use .env.production or .env.local in oil-shop-web
const rootEnvPath = path.join(__dirname, '..', 'env.local');
if (loadEnvFile(rootEnvPath, 'root env.local (local credentials)')) {
  console.log('');
} else {
  console.log('⚠️  env.local file not found in root directory.');
  console.log('⚠️  Make sure you have env.local with DATABASE_URL in the project root.\n');
}

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function updatePassword() {
  let connection;
  const email = 'admin@trinityoil.com';
  const newPassword = 'admin@123';
  
  try {
    console.log('🔧 Updating admin password...');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 New Password: ${newPassword}\n`);

    // Parse DATABASE_URL (same logic as app's database.ts)
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
        console.log(`🔑 Password: ${dbConfig.password ? '***' + dbConfig.password.slice(-4) : 'NOT SET'}`);
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
      console.log(`🔑 Password: ${dbConfig.password ? '***' + dbConfig.password.slice(-4) : 'NOT SET'}`);
    }

    console.log('\n🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
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
      console.error('\n💡 Database connection failed. Possible issues:');
      console.error('   1. Wrong database credentials');
      console.error('   2. MySQL server not running');
      console.error('   3. User does not have access from this host');
      console.error('\n📝 You can also update the password manually using SQL:');
      console.error('   Run: node update-password-sql.js');
      console.error('   Then execute the generated SQL in your MySQL client.\n');
    }
    if (connection) {
      await connection.end().catch(() => {});
    }
    process.exit(1);
  }
}

updatePassword();

