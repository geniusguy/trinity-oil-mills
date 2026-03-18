#!/usr/bin/env node
/**
 * Debug script: print sale header and items (with product names) for a given invoice number.
 *
 * Usage:
 *   node scripts/debug-sale-details.js C0001/2026
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
  const invoice = process.argv[2] || 'C0001/2026';
  console.log(`Inspecting invoice: ${invoice}`);
  console.log(`Database: ${config.database} @ ${config.host}:${config.port}`);

  const conn = await mysql.createConnection(config);
  try {
    const [headerRows] = await conn.query(
      `SELECT id, invoice_number, sale_type, subtotal, gst_amount, total_amount,
              total_bottles, total_liters, total_tins, canteen_address_id
       FROM sales
       WHERE invoice_number = ? LIMIT 1`,
      [invoice]
    );
    if (!headerRows || headerRows.length === 0) {
      console.log('No sale found for that invoice.');
      return;
    }
    const sale = headerRows[0];
    console.log('\n== Sale Header ==');
    console.log(sale);

    const saleId = sale.id;
    const [countRows] = await conn.query(
      `SELECT COUNT(*) AS item_count FROM sale_items WHERE sale_id = ?`,
      [saleId]
    );
    console.log('\n== Items Count ==');
    console.log(countRows[0]);

    const [itemRows] = await conn.query(
      `SELECT si.product_id, si.quantity, p.name
       FROM sale_items si
       LEFT JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = ?`,
      [saleId]
    );
    console.log('\n== Items (with product names) ==');
    for (const r of itemRows) {
      console.log(r);
    }
  } finally {
    await conn.end();
  }
}

run().catch((e) => {
  console.error('Debug failed:', e?.message || e);
  process.exit(1);
});

