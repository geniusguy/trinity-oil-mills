#!/usr/bin/env node
/**
 * Migration: Add delivery_email column to canteen_addresses.
 * This is for the "Receiving Person Email ID" field in the new canteen screen.
 *
 * Usage (already run for you from Cursor for local DB):
 *   node scripts/migrate-add-delivery-email.js
 *
 * It uses DATABASE_URL or DB_* env vars from oil-shop-web/.env(.local).
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
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    });
    for (const p of candidates) {
      dotenv.config({ path: p, quiet: true });
    }
  } catch {
    // dotenv optional
  }
}

function getConfig() {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port || '3306', 10),
        user: url.username,
        password: url.password,
        database: url.pathname.replace(/^\//, '') || 'trinityoil_oil_shop_db_new',
      };
    } catch (e) {
      console.error('Invalid DATABASE_URL:', e.message);
      process.exit(1);
    }
  }

  if (process.env.DB_HOST || process.env.DB_USER || process.env.DB_PASSWORD || process.env.DB_NAME) {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'trinityoil_oil_shop_db_new',
    };
  }

  console.error('No database configuration found for migrate-add-delivery-email.');
  console.error('Set DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME in oil-shop-web/.env(.local).');
  process.exit(1);
}

async function run() {
  loadEnv();
  const config = getConfig();

  console.log('Migration: add delivery_email to canteen_addresses');
  console.log(`Database: ${config.database} @ ${config.host}:${config.port}`);

  let conn;
  try {
    conn = await mysql.createConnection(config);
  } catch (e) {
    console.error('Connection failed:', e.message);
    process.exit(1);
  }

  try {
    // Use SHOW COLUMNS so it works even on MariaDB without IF NOT EXISTS support in ALTER
    const [cols] = await conn.execute('SHOW COLUMNS FROM canteen_addresses LIKE "delivery_email"');
    if (Array.isArray(cols) && cols.length > 0) {
      console.log('  Column delivery_email already exists. Nothing to do.');
      await conn.end();
      process.exit(0);
    }

    console.log('  Adding column delivery_email ...');
    await conn.execute('ALTER TABLE canteen_addresses ADD COLUMN delivery_email VARCHAR(255) NULL');
    console.log('  Column delivery_email added successfully.');
    await conn.end();
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e.message);
    try { await conn.end(); } catch (_) {}
    process.exit(1);
  }
}

run();

