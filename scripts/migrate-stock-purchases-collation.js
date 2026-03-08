#!/usr/bin/env node
/**
 * Migration: Fix stock_purchases table collation to match products (utf8mb4_0900_ai_ci).
 * Fixes "Illegal mix of collations" when joining with products.
 * Run: npm run migrate:stock-purchases-collation
 * Or: MIGRATE_ENV_PATH=./.env.production node scripts/migrate-stock-purchases-collation.js
 */
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

function loadEnv() {
  try {
    const dotenv = require('dotenv');
    const projectRoot = path.join(__dirname, '..');
    const customPath = process.env.MIGRATE_ENV_PATH;
    const paths = customPath
      ? [customPath]
      : [
          path.join(projectRoot, '.env.local'),
          path.join(projectRoot, '.env'),
        ].filter((p) => fs.existsSync(p));
    paths.forEach((p) => dotenv.config({ path: p, quiet: true }));
  } catch (e) {
    // dotenv optional
  }
}

function getConfig() {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.replace(/^\//, '') || 'trinityoil_oil_shop_db_new',
      };
    } catch (e) {
      console.error('Invalid DATABASE_URL:', e.message);
      process.exit(1);
    }
  }
  if (
    process.env.DB_HOST ||
    process.env.DB_USER ||
    process.env.DB_PASSWORD ||
    process.env.DB_NAME
  ) {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'trinityoil_oil_shop_db_new',
    };
  }
  const projectRoot = path.join(__dirname, '..');
  console.error('No database config found.');
  console.error('Set DATABASE_URL or DB_* in .env / .env.local, or:');
  console.error('  MIGRATE_ENV_PATH=/path/to/.env node scripts/migrate-stock-purchases-collation.js');
  process.exit(1);
}

async function run() {
  loadEnv();
  const config = getConfig();
  console.log('Migration: stock_purchases collation (match products)');
  console.log('Database:', config.database, '@', config.host + ':' + config.port);

  let conn;
  try {
    conn = await mysql.createConnection(config);
  } catch (e) {
    console.error('Connection failed:', e.message);
    process.exit(1);
  }

  try {
    // MySQL 8: utf8mb4_0900_ai_ci matches default products table
    try {
      await conn.execute(
        'ALTER TABLE stock_purchases CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci'
      );
      console.log('  Table stock_purchases converted to utf8mb4_0900_ai_ci.');
    } catch (e) {
      if (e.code === 'ER_UNKNOWN_COLLATION' || e.message?.includes('0900_ai_ci')) {
        // MySQL 5.7: use unicode_ci
        await conn.execute(
          'ALTER TABLE stock_purchases CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
        );
        console.log('  Table stock_purchases converted to utf8mb4_unicode_ci (MySQL 5.7).');
      } else {
        throw e;
      }
    }
    console.log('Migration completed successfully.');
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

run();
