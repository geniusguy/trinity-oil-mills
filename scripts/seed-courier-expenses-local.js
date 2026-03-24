#!/usr/bin/env node
/**
 * Create courier_expenses table + insert sample rows for local testing.
 *
 * Usage (from oil-shop-web folder):
 *   node scripts/seed-courier-expenses-local.js
 *   node scripts/seed-courier-expenses-local.js --force   # re-insert demo rows (deletes cexp-local-demo-* first)
 *
 * Env (same as app):
 *   DATABASE_URL   or  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 *
 * Requires: at least one row in `users`. Optional: canteen_addresses for linked demo row.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DEMO_IDS = ['cexp-local-demo-1', 'cexp-local-demo-2'];

function loadEnv() {
  try {
    const dotenv = require('dotenv');
    const projectRoot = path.join(__dirname, '..');
    for (const name of ['.env.local', '.env', 'env.local', 'env.production']) {
      const p = path.join(projectRoot, name);
      if (fs.existsSync(p)) dotenv.config({ path: p, quiet: true });
    }
  } catch (_) {}
}

function getConfig() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '3306', 10),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, '').split('?')[0] || 'trinityoil_oil_shop_db_new',
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

function ymd(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function run() {
  loadEnv();
  const force = process.argv.includes('--force');
  const config = getConfig();
  const migratePath = path.join(__dirname, 'sql', 'migrate_courier_expenses.sql');
  const ddl = fs.readFileSync(migratePath, 'utf8');

  console.log('Courier expenses — local seed');
  console.log(`DB: ${config.database} @ ${config.host}:${config.port} user=${config.user}`);

  const conn = await mysql.createConnection(config);
  try {
    await conn.query(ddl);
    console.log('OK: table courier_expenses (CREATE IF NOT EXISTS).');

    // If the table already existed, CREATE IF NOT EXISTS won't add new columns.
    // Ensure GST columns exist so demo inserts work on older local DBs.
    const columnsToEnsure = [
      { name: 'gst_rate', def: 'DECIMAL(5,2) NOT NULL DEFAULT 0' },
      { name: 'gst_amount', def: 'DECIMAL(12,2) NOT NULL DEFAULT 0' },
      { name: 'cgst_amount', def: 'DECIMAL(12,2) NOT NULL DEFAULT 0' },
      { name: 'sgst_amount', def: 'DECIMAL(12,2) NOT NULL DEFAULT 0' },
      { name: 'reference_pdf_path', def: 'VARCHAR(500) NULL' },
      { name: 'reference_pdf_original_name', def: 'VARCHAR(255) NULL' },
    ];

    for (const c of columnsToEnsure) {
      // SHOW COLUMNS is simple + compatible across MySQL/MariaDB.
      const [cols] = await conn.query(`SHOW COLUMNS FROM courier_expenses LIKE ?`, [c.name]);
      const exists = Array.isArray(cols) && cols.length > 0;
      if (!exists) {
        console.log(`Altering courier_expenses: adding ${c.name}`);
        await conn.query(`ALTER TABLE courier_expenses ADD COLUMN ${c.name} ${c.def}`);
      }
    }

    const [users] = await conn.query(
      'SELECT id FROM users ORDER BY created_at ASC LIMIT 1'
    );
    const userId = users[0]?.id;
    if (!userId) {
      console.error('No users found. Create a user (login / admin) first, then re-run this script.');
      process.exit(1);
    }

    const [canteens] = await conn.query(
      'SELECT id FROM canteen_addresses WHERE is_active = 1 ORDER BY canteen_name ASC LIMIT 1'
    );
    const canteenId = canteens[0]?.id ?? null;

    const [existing] = await conn.query(
      `SELECT id FROM courier_expenses WHERE id IN (?, ?)`,
      DEMO_IDS
    );
    if (existing.length > 0 && !force) {
      console.log(
        `Demo rows already present (${existing.length}). Use --force to remove cexp-local-demo-* and re-insert.`
      );
      const [cnt] = await conn.query('SELECT COUNT(*) AS c FROM courier_expenses');
      console.log('Total courier_expenses rows:', cnt[0].c);
      return;
    }

    if (force || existing.length > 0) {
      await conn.query(`DELETE FROM courier_expenses WHERE id IN (?, ?)`, DEMO_IDS);
      console.log('Removed old demo rows (if any).');
    }

    const gstRate = 18; // standard intra-state split in your invoice example (9% + 9%)
    const row1Cost = 850.0;
    const row2Cost = 320.0;
    const row1Gst = (row1Cost * gstRate) / 100;
    const row1Cgst = Math.round((row1Gst / 2) * 100) / 100;
    const row1Sgst = Math.round((row1Gst - row1Cgst) * 100) / 100;
    const row2Gst = (row2Cost * gstRate) / 100;
    const row2Cgst = Math.round((row2Gst / 2) * 100) / 100;
    const row2Sgst = Math.round((row2Gst - row2Cgst) * 100) / 100;

    const d1 = new Date();
    d1.setDate(d1.getDate() - 7);
    const d2 = new Date();

    await conn.query(
      `INSERT INTO courier_expenses (
        id, courier_date, quantity, cost, gst_rate, gst_amount, cgst_amount, sgst_amount,
        canteen_address_id, destination_note, notes, payment_method, reference_no, user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        DEMO_IDS[0],
        ymd(d1),
        2,
        row1Cost,
        gstRate,
        row1Gst,
        row1Cgst,
        row1Sgst,
        canteenId,
        null,
        'Local seed: courier to canteen (if linked)',
        'upi',
        'TRK-77881',
        userId,
      ]
    );

    await conn.query(
      `INSERT INTO courier_expenses (
        id, courier_date, quantity, cost, gst_rate, gst_amount, cgst_amount, sgst_amount,
        canteen_address_id, destination_note, notes, payment_method, reference_no, user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        DEMO_IDS[1],
        ymd(d2),
        1,
        row2Cost,
        gstRate,
        row2Gst,
        row2Cgst,
        row2Sgst,
        null,
        'Tirupur — direct address (no canteen master)',
        'Local seed: destination note only',
        'bank_transfer',
        'AWB-99221',
        userId,
      ]
    );

    console.log('OK: inserted 2 demo rows:', DEMO_IDS.join(', '));
    if (canteenId) console.log('  Row 1 linked canteen:', canteenId);
    else console.log('  Row 1: no active canteen in DB — only row 2 style is required for “destination note”.');

    const [cnt] = await conn.query('SELECT COUNT(*) AS c FROM courier_expenses');
    console.log('Total courier_expenses rows:', cnt[0].c);
  } finally {
    await conn.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
