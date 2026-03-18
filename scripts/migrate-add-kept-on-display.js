#!/usr/bin/env node
/**
 * Migration: Add kept_on_display column to sales.
 * Default: 0 (No)
 */

const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

function loadEnv() {
  try {
    const dotenv = require('dotenv');
    const projectRoot = path.join(__dirname, '..');
    const candidates = [
      path.join(projectRoot, '.env.local'),
      path.join(projectRoot, '.env'),
    ].filter((p) => {
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
  console.log('Migration: add sales.kept_on_display');
  console.log(`Database: ${config.database} @ ${config.host}:${config.port}`);

  const conn = await mysql.createConnection(config);
  try {
    const [cols] = await conn.execute('SHOW COLUMNS FROM sales LIKE "kept_on_display"');
    if (Array.isArray(cols) && cols.length > 0) {
      console.log('  Column kept_on_display already exists. Nothing to do.');
      return;
    }
    await conn.execute('ALTER TABLE sales ADD COLUMN kept_on_display TINYINT(1) NOT NULL DEFAULT 0');
    console.log('  Column kept_on_display added successfully.');
  } finally {
    await conn.end();
  }
}

run().catch((e) => {
  console.error('Migration failed:', e?.message || e);
  process.exit(1);
});

