/**
 * One-time / ad-hoc: print inventory tin-equivalent tally (same rules as admin inventory page).
 * Uses DATABASE_URL or DB_* from .env / .env.local
 *
 * Usage (from oil-shop-web):
 *   npx tsx scripts/inventory-tin-tally.ts
 *   npx tsx scripts/inventory-tin-tally.ts --csv
 */
/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { tinEquivalentForCanteenLine, CANTEEN_LITERS_PER_TIN } from '../src/lib/canteenSupply';

function loadEnv() {
  const root = path.join(__dirname, '..');
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (fs.existsSync(p)) {
      require('dotenv').config({ path: p });
    }
  }
}

function getConfig() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '3306', 10),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, '').split('?')[0],
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

const CASTOR_VARIANTS = new Set(['55336', '68539', 'castor-200ml']);

async function main() {
  loadEnv();
  const csv = process.argv.includes('--csv');
  const conn = await mysql.createConnection(getConfig());

  const [rows]: any = await conn.query(
    `SELECT i.id, i.product_id as productId, p.name as productName, p.unit as unit,
            p.category as category, i.quantity, i.location
     FROM inventory i
     JOIN products p ON p.id = i.product_id
     ORDER BY p.name ASC`,
  );

  await conn.end();

  type Row = {
    id: string;
    productId: string;
    productName: string;
    unit: string;
    category: string | null;
    quantity: number;
    location: string;
  };

  const list = rows as Row[];

  // Merge Castor 200ml variants (match API display)
  const merged: Row[] = [];
  const castorByLoc = new Map<string, Row>();

  for (const r of list) {
    const pid = String(r.productId ?? '').trim();
    if (!CASTOR_VARIANTS.has(pid)) {
      merged.push({ ...r, quantity: Number(r.quantity) || 0 });
      continue;
    }
    const loc = String(r.location ?? '').trim();
    const k = `castor|${loc}`;
    const ex = castorByLoc.get(k);
    const qty = Number(r.quantity) || 0;
    if (!ex) {
      const row: Row = {
        ...r,
        productId: 'castor-200ml',
        productName: 'TOM - Castor Oil - 200 ML',
        quantity: qty,
      };
      castorByLoc.set(k, row);
    } else {
      ex.quantity += qty;
    }
  }
  merged.push(...castorByLoc.values());

  let totalTins = 0;
  let unknown = 0;

  const lines: string[] = [];
  if (csv) {
    lines.push(['productId', 'productName', 'quantity', 'tinsEquiv', 'location', 'category'].join(','));
  }

  for (const r of merged.sort((a, b) => a.productName.localeCompare(b.productName))) {
    const tins = tinEquivalentForCanteenLine(
      Number(r.quantity),
      r.productName,
      String(r.unit ?? ''),
      r.productId,
    );
    if (tins == null) unknown++;
    else totalTins += tins;

    if (csv) {
      const te = tins == null ? '' : String(Number(tins.toFixed(6)));
      lines.push(
        [r.productId, `"${(r.productName || '').replace(/"/g, '""')}"`, r.quantity, te, r.location || '', r.category || ''].join(
          ',',
        ),
      );
    } else {
      const te = tins == null ? '—' : tins.toFixed(4);
      console.log(`${r.productName.slice(0, 40).padEnd(42)} qty=${String(r.quantity).padStart(8)}  tins=${te}`);
    }
  }

  console.log('');
  console.log(`—`.repeat(60));
  console.log(`Basis: ${CANTEEN_LITERS_PER_TIN} L per tin (same as canteen invoice totals)`);
  console.log(`Total tin equivalent: ${totalTins.toFixed(4)}`);
  console.log(`Rows with unknown pack size (no ml/L in name+unit): ${unknown}`);
  if (csv) {
    console.log('\n--- CSV ---\n');
    console.log(lines.join('\n'));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
