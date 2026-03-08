#!/usr/bin/env node
/**
 * Migration: Create stock_purchases table (add stock + track from whom purchased).
 * Run from oil-shop-web: npm run migrate:stock-purchases
 * Or: MIGRATE_ENV_PATH=./.env.production node scripts/migrate-stock-purchases.js
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
  console.error('  MIGRATE_ENV_PATH=/path/to/.env node scripts/migrate-stock-purchases.js');
  process.exit(1);
}

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS stock_purchases (
  id VARCHAR(255) PRIMARY KEY,
  product_id VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  purchase_date DATETIME NOT NULL,
  unit_price DECIMAL(10,2) NULL,
  total_amount DECIMAL(10,2) NULL,
  invoice_number VARCHAR(100) NULL,
  notes TEXT NULL,
  created_by VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
`.trim();

async function run() {
  loadEnv();
  const config = getConfig();
  console.log('Migration: stock_purchases table');
  console.log('Database:', config.database, '@', config.host + ':' + config.port);

  let conn;
  try {
    conn = await mysql.createConnection(config);
  } catch (e) {
    console.error('Connection failed:', e.message);
    process.exit(1);
  }

  try {
    await conn.execute(CREATE_TABLE_SQL);
    console.log('  Table stock_purchases created (or already exists).');
    // Optional indexes
    const indexes = [
      'CREATE INDEX idx_stock_purchases_product_id ON stock_purchases(product_id)',
      'CREATE INDEX idx_stock_purchases_supplier ON stock_purchases(supplier_name)',
      'CREATE INDEX idx_stock_purchases_purchase_date ON stock_purchases(purchase_date)',
    ];
    for (const sql of indexes) {
      try {
        await conn.execute(sql);
        console.log('  Index created.');
      } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME' || e.message?.includes('Duplicate key')) {
          console.log('  Index already exists, skip.');
        } else {
          console.warn('  Index warning:', e.message);
        }
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
