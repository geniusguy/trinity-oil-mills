#!/usr/bin/env node
/**
 * Seed packaging components + inventory rows from SQL file.
 *
 * Usage:
 *   node scripts/seed-packaging-components.js
 *
 * Env loading:
 *   - DATABASE_URL (preferred)
 *   - or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function loadEnv() {
  try {
    const dotenv = require('dotenv');
    const projectRoot = path.join(__dirname, '..');
    const candidates = [
      path.join(projectRoot, '.env.local'),
      path.join(projectRoot, '.env'),
      path.join(projectRoot, 'env.local'),
      path.join(projectRoot, 'env.production'),
    ].filter((p) => {
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    });
    for (const p of candidates) dotenv.config({ path: p, quiet: true });
  } catch (_) {}
}

function getConfig() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '3306', 10),
      user: url.username,
      password: url.password,
      database: url.pathname.replace(/^\//, '') || 'trinityoil_oil_shop_db_new',
      multipleStatements: true,
    };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trinityoil_oil_shop_db_new',
    multipleStatements: true,
  };
}

async function run() {
  loadEnv();
  const config = getConfig();
  const sqlPath = path.join(__dirname, 'sql', 'seed_packaging_components.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Seeding packaging components...');
  console.log(`DB: ${config.database} @ ${config.host}:${config.port} user=${config.user}`);

  const conn = await mysql.createConnection(config);
  try {
    await conn.query(sql);
    const [rows] = await conn.query(
      "SELECT COUNT(*) AS cnt FROM products WHERE id LIKE 'pack_%'"
    );
    console.log('Done. packaging products count =', rows[0].cnt);
  } finally {
    await conn.end();
  }
}

run().catch((e) => {
  console.error('Seed failed:', e?.message || e);
  process.exit(1);
});

