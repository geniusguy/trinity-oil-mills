const bcrypt = require('bcryptjs');
const fs = require('fs');

async function generateSQL() {
  const password = 'admin@123';
  const hash = await bcrypt.hash(password, 10);
  
  const sql = `UPDATE users SET password = '${hash}' WHERE email = 'admin@trinityoil.com';`;
  
  console.log('\n=== SQL UPDATE STATEMENT ===\n');
  console.log(sql);
  console.log('\n=== Copy and run this SQL in your MySQL client ===\n');
  
  // Also write to file
  fs.writeFileSync('update-password.sql', sql);
  console.log('✅ SQL also written to update-password.sql\n');
}

generateSQL();

