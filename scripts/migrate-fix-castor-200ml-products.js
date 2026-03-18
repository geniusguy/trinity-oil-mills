#!/usr/bin/env node
/**
 * Ensure Castor 200ml product rows exist (55336, 68539) with a name containing "200ml".
 *
 * Usage:
 *   node scripts/migrate-fix-castor-200ml-products.js
 */

const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

function loadEnv() {
  try {
    const dotenv = require('dotenv');
    const projectRoot = path.join(__dirname, '..');
    const candidates = [path.join(projectRoot, '.env.local'), path.join(projectRoot, '.env')].filter((p) => {
      try { return fs.existsSync(p); } catch { return false; }
    });
    for (const p of candidates) dotenv.config({ path: p, quiet: true });
  } catch {}
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

async function run() {
  loadEnv();
  const config = getConfig();
  console.log('Migration: upsert Castor 200ml products (55336, 68539)');
  console.log(`Database: ${config.database} @ ${config.host}:${config.port}`);

  const conn = await mysql.createConnection(config);
  try {
    // Check existing
    const [existing] = await conn.query(
      `SELECT id, name, unit FROM products WHERE id IN ('55336','68539')`
    );
    console.log('Before:', existing);

    // Upsert rows (keep it minimal but valid for your schema)
    await conn.query(
      `
      INSERT INTO products (id, name, category, type, base_price, retail_price, gst_rate, unit, is_active, created_at, updated_at)
      VALUES
        ('55336', 'TOM-Castor Oil - 200ml', 'produced', 'castor', 80.00, 80.00, 5.00, '200ml', 1, NOW(), NOW()),
        ('68539', 'TOM-Castor Oil - 200ml', 'produced', 'castor', 76.19, 80.00, 5.00, '200ml', 1, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        unit = VALUES(unit),
        updated_at = NOW()
      `
    );

    const [after] = await conn.query(
      `SELECT id, name, unit, base_price, retail_price, gst_rate FROM products WHERE id IN ('55336','68539')`
    );
    console.log('After:', after);
  } finally {
    await conn.end();
  }
}

run().catch((e) => {
  console.error('Migration failed:', e?.message || e);
  process.exit(1);
});

