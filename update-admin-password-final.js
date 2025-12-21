const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function updateAdminPassword() {
  let connection;
  const email = 'admin@trinityoil.com';
  const newPassword = 'admin@123';
  
  try {
    console.log('🔧 Updating admin password...');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 New Password: ${newPassword}\n`);

    // Generate password hash first
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    console.log('🔐 Generated password hash\n');

    // Try connection methods - modify these with your actual database credentials
    const connectionMethods = [
      // Method 1: No password
      async () => {
        const conn = await mysql.createConnection({
          host: 'localhost',
          user: 'root'
        });
        await conn.query('USE trinityoil_oil_shop_db_new');
        return conn;
      },
      // Method 2: With password from env.local
      async () => {
        const conn = await mysql.createConnection({
          host: 'localhost',
          user: 'root',
          password: '32yO97aldFvo0idG'
        });
        await conn.query('USE trinityoil_oil_shop_db_new');
        return conn;
      },
      // Method 3: Alternative database name
      async () => {
        const conn = await mysql.createConnection({
          host: 'localhost',
          user: 'root'
        });
        await conn.query('USE oil_shop_db_new');
        return conn;
      },
    ];

    // Try each connection method
    for (let i = 0; i < connectionMethods.length; i++) {
      try {
        console.log(`Trying connection method ${i + 1}...`);
        connection = await connectionMethods[i]();
        console.log(`✅ Connected successfully!\n`);
        break;
      } catch (error) {
        console.log(`❌ Method ${i + 1} failed: ${error.message}\n`);
        if (i === connectionMethods.length - 1) {
          throw new Error('All connection methods failed');
        }
      }
    }

    // Check if user exists
    const [users] = await connection.query('SELECT email, password FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      console.log(`❌ User with email ${email} not found`);
      await connection.end();
      return;
    }

    console.log(`✅ User found: ${email}`);

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
    } else {
      console.log('❌ Password verification test failed');
    }

    await connection.end();

  } catch (error) {
    console.error('\n❌ Error updating password:', error.message);
    console.log('\n=== MANUAL UPDATE REQUIRED ===');
    console.log('If automatic update failed, you can run this SQL statement manually:');
    console.log('\nFirst, generate the hash by running: node update-password-sql.js');
    console.log('Then execute the SQL UPDATE statement in your MySQL client.\n');
    
    // Generate hash for manual use
    const hash = await bcrypt.hash(newPassword, 10);
    console.log('SQL Statement:');
    console.log(`UPDATE users SET password = '${hash}' WHERE email = '${email}';`);
    console.log('\nOr use this prepared statement:');
    console.log(`UPDATE users SET password = ?, updated_at = NOW() WHERE email = ?;`);
    console.log(`With values: ['${hash}', '${email}']\n`);
    
    if (connection) {
      await connection.end().catch(() => {});
    }
    process.exit(1);
  }
}

updateAdminPassword();

