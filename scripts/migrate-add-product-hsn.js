#!/usr/bin/env node
/**
 * Migration: Add hsn_code column to products (per-product GST HSN on invoices).
 *
 * Usage:
 *   node scripts/migrate-add-product-hsn.js
 */

const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

function loadEnv() {
  try {
    const dotenv = require('dotenv');
    const projectRoot = path.join(__dirname, '..');
    for (const p of [path.join(projectRoot, '.env.local'), path.join(projectRoot, '.env')]) {
      if (fs.existsSync(p)) dotenv.config({ path: p, quiet: true });
    }
  } catch {
    // dotenv optional
  }
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

async function main() {
  loadEnv();
  const cfg = getConfig();
  const conn = await mysql.createConnection(cfg);
  try {
    const [cols] = await conn.execute('SHOW COLUMNS FROM products LIKE "hsn_code"');
    if (Array.isArray(cols) && cols.length > 0) {
      console.log('OK: products.hsn_code already exists');
      return;
    }
    await conn.execute('ALTER TABLE products ADD COLUMN hsn_code VARCHAR(20) NULL');
    console.log('OK: products.hsn_code column added');
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
