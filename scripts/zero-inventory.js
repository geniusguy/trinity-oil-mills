/**
 * Set all inventory quantities to 0 (local or any DB pointed to by .env.local / DATABASE_URL).
 * Usage: npm run db:zero-inventory
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function loadEnv() {
  const root = path.join(__dirname, '..');
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (fs.existsSync(p)) {
      require('dotenv').config({ path: p });
    }
  }
}

function getConfig() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '3306', 10),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, '').split('?')[0],
    };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trinityoil_oil_shop_db_new',
  };
}

async function main() {
  loadEnv();
  const config = getConfig();
  console.log('[zero-inventory] Database:', config.database, '@', config.host);

  const conn = await mysql.createConnection(config);
  try {
    const [res] = await conn.execute(
      'UPDATE inventory SET quantity = 0, updated_at = NOW()',
    );
    const affected = res && typeof res.affectedRows === 'number' ? res.affectedRows : 0;
    console.log('[zero-inventory] OK — rows updated:', affected);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('[zero-inventory] Failed:', e.message || e);
  process.exit(1);
});
