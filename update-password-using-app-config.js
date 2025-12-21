const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Load environment variables from env.local in root
const envPath = path.join(__dirname, '..', 'env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    // Skip comments and empty lines
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed) continue;
    
    // Match KEY=VALUE format (everything before first = is key, rest is value)
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
    }
  }
  console.log('✅ Loaded environment variables from env.local');
  if (process.env.DATABASE_URL) {
    const masked = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
    console.log(`📋 Found DATABASE_URL: ${masked}\n`);
  } else {
    console.log('⚠️  DATABASE_URL not found in env.local\n');
  }
}

async function updateAdminPassword() {
  let connection;
  const email = 'admin@trinityoil.com';
  const newPassword = 'admin@123';
  
  try {
    console.log('🔧 Updating admin password using app configuration...');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 New Password: ${newPassword}\n`);

    // Parse DATABASE_URL or use individual env vars (same as app does)
    let dbConfig = null;
    
    if (process.env.DATABASE_URL) {
      try {
        const url = new URL(process.env.DATABASE_URL);
        dbConfig = {
          host: url.hostname,
          port: parseInt(url.port) || 3306,
          user: url.username,
          password: url.password,
          database: url.pathname.slice(1), // Remove leading slash
        };
        console.log(`📋 Using DATABASE_URL: ${dbConfig.user}@${dbConfig.host}/${dbConfig.database}`);
      } catch (error) {
        console.log('⚠️  Could not parse DATABASE_URL:', error.message);
      }
    }
    
    if (!dbConfig) {
      // Fallback to individual environment variables
      dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'trinityoil_oil_shop_db_new',
      };
      console.log(`📋 Using fallback config: ${dbConfig.user}@${dbConfig.host}/${dbConfig.database}`);
    }
    
    // Debug: Show what we're trying to connect with
    console.log(`🔍 Connection details: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    if (dbConfig.password) {
      console.log(`🔑 Password: ${'*'.repeat(dbConfig.password.length)} (${dbConfig.password.length} chars)`);
    } else {
      console.log('⚠️  No password provided');
    }

    // Connect to database
    console.log('\n🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected successfully!\n');

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

    // Update password in database
    await connection.query('UPDATE users SET password = ?, updated_at = NOW() WHERE email = ?', [newPasswordHash, email]);
    console.log('✅ Password updated successfully in database\n');

    // Verify the new password
    const [updatedUsers] = await connection.query('SELECT password FROM users WHERE email = ?', [email]);
    const isValid = await bcrypt.compare(newPassword, updatedUsers[0].password);
    
    if (isValid) {
      console.log('✅ Password verification test passed');
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 New Password: ${newPassword}`);
      console.log('\n🎉 Password update completed successfully!');
      console.log('\nYou can now login with:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${newPassword}`);
    } else {
      console.log('❌ Password verification test failed');
    }

    await connection.end();

  } catch (error) {
    console.error('\n❌ Error updating password:', error.message);
    console.error('Full error:', error);
    
    if (connection) {
      await connection.end().catch(() => {});
    }
    process.exit(1);
  }
}

updateAdminPassword();

