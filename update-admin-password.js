const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Try to load environment variables from multiple possible locations
const envPaths = [
  path.join(__dirname, '.env.local'),
  path.join(__dirname, '..', 'env.local'),
  path.join(__dirname, '.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log(`📄 Loaded env from: ${envPath}`);
    break;
  }
}

async function updateAdminPassword() {
  let connection;
  try {
    console.log('🔧 Updating admin password...');

    // Parse DATABASE_URL if available
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
        console.log('📋 Using DATABASE_URL from environment');
      } catch (error) {
        console.log('⚠️  Could not parse DATABASE_URL');
      }
    }

    // Try different connection methods
    const connectionConfigs = [];
    
    if (dbConfig) {
      connectionConfigs.push(dbConfig);
    }
    
    // Add fallback configs
    connectionConfigs.push(
      { host: 'localhost', user: 'root' }, // No password
      { host: 'localhost', user: 'root', password: '32yO97aldFvo0idG' }, // With password from env.local
      { host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '' }
    );

    let connected = false;
    for (const config of connectionConfigs) {
      try {
        connection = await mysql.createConnection(config);
        console.log(`✅ Connected as ${config.user}${config.password ? ' (with password)' : ''}`);
        connected = true;
        break;
      } catch (error) {
        console.log(`❌ Failed to connect as ${config.user}: ${error.message}`);
        continue;
      }
    }

    if (!connected) {
      throw new Error('Could not connect to database. Please check your database credentials.');
    }

    // Use the database - try both possible database names
    try {
      await connection.query('USE trinityoil_oil_shop_db_new');
      console.log('✅ Using database: trinityoil_oil_shop_db_new');
    } catch (error) {
      await connection.query('USE oil_shop_db_new');
      console.log('✅ Using database: oil_shop_db_new');
    }

    const email = 'admin@trinityoil.com';
    const newPassword = 'admin@123';

    // Check if user exists
    const [users] = await connection.query('SELECT email, password FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      console.log(`❌ User with email ${email} not found`);
      await connection.end();
      return;
    }

    console.log(`✅ User found: ${email}`);

    // Create new password hash
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    console.log('🔐 New password hash created');

    // Update password in database
    await connection.query('UPDATE users SET password = ?, updated_at = NOW() WHERE email = ?', [newPasswordHash, email]);
    console.log('✅ Password updated successfully');

    // Verify the new password
    const [updatedUsers] = await connection.query('SELECT password FROM users WHERE email = ?', [email]);
    const isValid = await bcrypt.compare(newPassword, updatedUsers[0].password);
    
    if (isValid) {
      console.log('✅ Password verification test passed');
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 New Password: ${newPassword}`);
    } else {
      console.log('❌ Password verification test failed');
    }

    await connection.end();
    console.log('🎉 Password update completed!');

  } catch (error) {
    console.error('❌ Error updating password:', error);
    if (connection) {
      await connection.end().catch(() => {});
    }
    process.exit(1);
  }
}

updateAdminPassword();

