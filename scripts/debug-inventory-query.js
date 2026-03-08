#!/usr/bin/env node
/**
 * Run: node scripts/debug-inventory-query.js
 * Uses .env / .env.local from oil-shop-web. Shows inventory rows for 55336, 68539 and all inventory.
 */
const path = require('path');
const fs = require('fs');

function loadEnv() {
  try {
    const dotenv = require('dotenv');
    const root = path.join(__dirname, '..');
    for (const f of ['.env.local', '.env']) {
      const p = path.join(root, f);
      if (fs.existsSync(p)) {
        dotenv.config({ path: p });
        break;
      }
    }
  } catch (_) {}
}

loadEnv();

const mysql = require('mysql2/promise');

function getConfig() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.replace(/^\//, '') || 'trinityoil_oil_shop_db_new',
    };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trinityoil_oil_shop_db_new',
  };
}

async function main() {
  const config = getConfig();
  console.log('Database:', config.database, '@', config.host);
  const conn = await mysql.createConnection(config);

  console.log('\n--- inventory WHERE product_id IN (55336, 68539) ---');
  const [rows1] = await conn.query(
    "SELECT id, product_id, quantity, min_stock, max_stock, location FROM inventory WHERE product_id IN ('55336','68539')"
  );
  console.log(rows1.length ? JSON.stringify(rows1, null, 2) : '(no rows)');

  console.log('\n--- inventory WHERE product_id = 55336 (numeric) ---');
  const [rows2] = await conn.query('SELECT id, product_id, quantity FROM inventory WHERE product_id = 55336');
  console.log(rows2.length ? JSON.stringify(rows2, null, 2) : '(no rows)');

  console.log('\n--- inventory WHERE product_id = ? with string 55336 ---');
  const [rows3] = await conn.query('SELECT id, product_id, quantity FROM inventory WHERE product_id = ?', ['55336']);
  console.log(rows3.length ? JSON.stringify(rows3, null, 2) : '(no rows)');

  console.log('\n--- First 5 inventory rows (all columns) ---');
  const [rows4] = await conn.query('SELECT * FROM inventory LIMIT 5');
  console.log(rows4.length ? JSON.stringify(rows4, null, 2) : '(no rows)');

  console.log('\n--- products id for 55336, 68539 ---');
  const [rows5] = await conn.query("SELECT id, name FROM products WHERE id IN ('55336','68539')");
  console.log(rows5.length ? JSON.stringify(rows5, null, 2) : '(no rows)');

  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
