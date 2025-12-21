const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const { eq } = require('drizzle-orm/mysql-core');

// Import schema
const { users } = require('./src/db/schema.ts');

async function testDrizzle() {
  try {
    console.log('🔍 Testing Drizzle connection...');

    const connection = mysql.createPool({
      host: 'localhost',
      user: 'root',
      database: 'oil_shop_db_new'
    });

    const db = drizzle(connection, { schema: { users }, mode: 'default' });

    // Test query
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@trinityoil.com'))
      .limit(1);

    console.log('Drizzle query result:', user);

    await connection.end();

  } catch (error) {
    console.error('❌ Drizzle test error:', error);
  }
}

testDrizzle();
