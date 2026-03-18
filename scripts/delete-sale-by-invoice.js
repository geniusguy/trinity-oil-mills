#!/usr/bin/env node
/**
 * Delete a sale + its items by invoice number.
 *
 * Usage:
 *   node scripts/delete-sale-by-invoice.js INV-2024-002
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
  const invoice = process.argv[2];
  if (!invoice) {
    console.error('Usage: node scripts/delete-sale-by-invoice.js <INVOICE_NUMBER>');
    process.exit(1);
  }

  const config = getConfig();
  console.log(`Deleting invoice: ${invoice}`);
  console.log(`Database: ${config.database} @ ${config.host}:${config.port}`);

  const conn = await mysql.createConnection(config);
  try {
    const [rows] = await conn.query(
      `SELECT id, invoice_number, sale_type, subtotal, created_at FROM sales WHERE invoice_number = ? LIMIT 1`,
      [invoice]
    );
    if (!rows || rows.length === 0) {
      console.log('No sale found. Nothing to delete.');
      return;
    }
    const sale = rows[0];
    console.log('Found sale:', sale);

    await conn.beginTransaction();
    const saleId = sale.id;

    const [itemCountRows] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM sale_items WHERE sale_id = ?`,
      [saleId]
    );
    console.log('Items count:', itemCountRows[0]?.cnt ?? itemCountRows[0]);

    await conn.query(`DELETE FROM sale_items WHERE sale_id = ?`, [saleId]);
    await conn.query(`DELETE FROM sales WHERE id = ?`, [saleId]);

    await conn.commit();
    console.log('Deleted successfully.');
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    await conn.end();
  }
}

run().catch((e) => {
  console.error('Delete failed:', e?.message || e);
  process.exit(1);
});

