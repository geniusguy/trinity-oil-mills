#!/usr/bin/env node
/**
 * Migration: Add billing person, email, mobile columns to canteen_addresses.
 * Run locally: npm run migrate:canteen-billing  (or node scripts/migrate-canteen-billing.js)
 * Run on server: same, after setting DATABASE_URL or DB_* env vars.
 */
const path = require('path');
const mysql = require('mysql2/promise');

// Load .env only from oil-shop-web (script's package root) so parent repo .env doesn't override
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
        ].filter((p) => {
          try {
            return require('fs').existsSync(p);
          } catch {
            return false;
          }
        });
    for (const p of paths) {
      dotenv.config({ path: p, quiet: true });
    }
  } catch (e) {
    // dotenv optional if env already set
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
  console.error('Set DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME in:');
  console.error('  ' + path.join(projectRoot, '.env') + '  or  ' + path.join(projectRoot, '.env.local'));
  console.error('Or run with:  MIGRATE_ENV_PATH=/path/to/.env node scripts/migrate-canteen-billing.js');
  process.exit(1);
}

const COLUMNS = [
  { name: 'billing_contact_person', def: 'VARCHAR(255) NULL' },
  { name: 'billing_email', def: 'VARCHAR(255) NULL' },
  { name: 'billing_mobile', def: 'VARCHAR(20) NULL' },
  { name: 'delivery_email', def: 'VARCHAR(255) NULL' },
];

async function run() {
  loadEnv();
  const config = getConfig();
  console.log('Migration: canteen_addresses billing columns');
  console.log('Database:', config.database, '@', config.host + ':' + config.port);

  let conn;
  try {
    conn = await mysql.createConnection(config);
  } catch (e) {
    console.error('Connection failed:', e.message);
    process.exit(1);
  }

  try {
    for (const col of COLUMNS) {
      try {
        await conn.execute(
          `ALTER TABLE canteen_addresses ADD COLUMN \`${col.name}\` ${col.def}`
        );
        console.log('  Added column:', col.name);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME' || e.message?.includes('Duplicate column')) {
          console.log('  Column already exists:', col.name);
        } else {
          throw e;
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
