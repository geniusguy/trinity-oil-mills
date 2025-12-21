const bcrypt = require('bcryptjs');

// Generate the password hash for 'admin@123'
async function generatePasswordHash() {
  const password = 'admin@123';
  const hash = await bcrypt.hash(password, 10);
  console.log('\n=== SQL UPDATE STATEMENT ===\n');
  console.log(`UPDATE users SET password = '${hash}' WHERE email = 'admin@trinityoil.com';\n`);
  console.log('=== Copy and run this SQL in your MySQL client ===\n');
}

generatePasswordHash();

