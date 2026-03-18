#!/usr/bin/env node
/**
 * Backfill total_bottles, total_liters, total_tins for canteen sales.
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

function parsePackSizeLiters(name) {
  const n = (name || '').toLowerCase();
  const mlMatch = n.match(/(\d+)\s*ml/);
  if (mlMatch) {
    const ml = Number(mlMatch[1]);
    if (Number.isFinite(ml) && ml > 0) return ml / 1000;
  }
  const lMatch = n.match(/(\d+(?:\.\d+)?)\s*(l|liter|litre)\b/);
  if (lMatch) {
    const l = Number(lMatch[1]);
    if (Number.isFinite(l) && l > 0) return l;
  }
  return null;
}

function isTinSize(liters) {
  return liters !== null && liters >= 5;
}

function isBottleSize(liters) {
  return liters !== null && liters > 0 && liters < 5;
}

async function run() {
  loadEnv();
  const config = getConfig();
  console.log('Backfill supply totals for canteen sales');
  console.log(`Database: ${config.database} @ ${config.host}:${config.port}`);

  const conn = await mysql.createConnection(config);
  try {
    const [salesRows] = await conn.query(
      `SELECT id FROM sales WHERE sale_type = 'canteen'`
    );
    console.log(`Found ${salesRows.length} canteen sales`);

    for (const row of salesRows) {
      const saleId = row.id;
      const [items] = await conn.query(
        `SELECT si.quantity, p.name
         FROM sale_items si
         LEFT JOIN products p ON p.id = si.product_id
         WHERE si.sale_id = ?`,
        [saleId]
      );

      let totalLiters = 0;
      let totalBottles = 0;
      let totalTins = 0;

      for (const it of items) {
        const qty = Number(it.quantity) || 0;
        const litersPer = parsePackSizeLiters(it.name || '');
        if (litersPer !== null) {
          totalLiters += qty * litersPer;
          if (isBottleSize(litersPer)) totalBottles += qty;
          if (isTinSize(litersPer)) totalTins += qty; // legacy per-pack tins (not used strongly; main is liters/16)
        }
      }

      // Re-derive tins from liters: 16L = 1 tin
      const tinsFromLiters = totalLiters / 16;

      await conn.query(
        `UPDATE sales
         SET total_bottles = ?, total_liters = ?, total_tins = ?
         WHERE id = ?`,
        [
          Number(totalBottles.toFixed(2)),
          Number(totalLiters.toFixed(2)),
          Number(tinsFromLiters.toFixed(2)),
          saleId,
        ]
      );
    }
    console.log('Backfill completed.');
  } finally {
    await conn.end();
  }
}

run().catch((e) => {
  console.error('Migration failed:', e?.message || e);
  process.exit(1);
});

