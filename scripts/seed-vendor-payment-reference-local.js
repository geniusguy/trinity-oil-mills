const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

async function main() {
  for (const p of ['.env.local', '.env', '.env.production']) {
    const f = path.resolve(process.cwd(), p);
    if (fs.existsSync(f)) {
      dotenv.config({ path: f });
      break;
    }
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL missing');
  const u = new URL(dbUrl);
  const conn = await mysql.createConnection({
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
  });

  await conn.execute(
    `CREATE TABLE IF NOT EXISTS vendor_payment_reference (
      id VARCHAR(255) PRIMARY KEY,
      entry_type VARCHAR(40) NOT NULL DEFAULT 'purchase',
      vendor_name VARCHAR(255) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      tins_count DECIMAL(12,2) NOT NULL DEFAULT 0,
      purchased_date DATE NULL,
      payment_date DATE NULL,
      purchased_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      payment_type VARCHAR(20) NOT NULL DEFAULT 'full',
      payment_events LONGTEXT NULL,
      notes VARCHAR(500) NULL,
      fy_start_year INT NOT NULL,
      created_by VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_vpr_fy (fy_start_year),
      INDEX idx_vpr_vendor (vendor_name),
      INDEX idx_vpr_product (product_name),
      INDEX idx_vpr_purchased_date (purchased_date),
      INDEX idx_vpr_payment_date (payment_date)
    )`,
  );

  await conn.execute(
    `CREATE TABLE IF NOT EXISTS vendor_payment_reference_fy_balance (
      fy_start_year INT PRIMARY KEY,
      previous_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
      updated_by VARCHAR(255) NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
  );

  const [cols] = await conn.query('SHOW COLUMNS FROM vendor_payment_reference');
  const colSet = new Set(cols.map((c) => String(c.Field || '').toLowerCase()));
  const ensureCol = async (name, ddl) => {
    if (!colSet.has(String(name).toLowerCase())) {
      await conn.execute(`ALTER TABLE vendor_payment_reference ADD COLUMN ${ddl}`);
    }
  };
  await ensureCol('entry_type', "entry_type VARCHAR(40) NOT NULL DEFAULT 'purchase' AFTER id");
  await ensureCol('product_name', "product_name VARCHAR(255) NOT NULL DEFAULT '' AFTER vendor_name");
  await ensureCol('tins_count', 'tins_count DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER product_name');
  await ensureCol('purchased_date', 'purchased_date DATE NULL AFTER tins_count');
  await ensureCol('purchased_amount', 'purchased_amount DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER payment_date');
  await ensureCol('paid_amount', 'paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER purchased_amount');
  await ensureCol('payment_type', "payment_type VARCHAR(20) NOT NULL DEFAULT 'full' AFTER paid_amount");
  await ensureCol('payment_events', 'payment_events LONGTEXT NULL AFTER payment_type');
  await ensureCol('fy_start_year', 'fy_start_year INT NOT NULL DEFAULT 2025 AFTER notes');

  const now = new Date();
  const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const d = (n) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - n).toISOString().slice(0, 10);
  const seedId = Date.now();
  const rows = [
    {
      id: `vpr-seed-${seedId}-1`,
      entry_type: 'purchase',
      vendor_name: 'Yuvaraj',
      product_name: 'TOM - Castor Oil - 200 Ml',
      tins_count: 50,
      purchased_date: d(20),
      payment_date: d(18),
      purchased_amount: 95000,
      paid_amount: 40000,
      payment_type: 'partial',
      payment_events: JSON.stringify([
        { date: d(18), amount: 25000, note: 'Initial partial payment' },
        { date: d(10), amount: 15000, note: 'Top-up payment' },
      ]),
      notes: 'Seed partial payment sample',
      fy_start_year: fy,
    },
    {
      id: `vpr-seed-${seedId}-2`,
      entry_type: 'purchase',
      vendor_name: 'Nelco',
      product_name: 'PET Bottle - 200ml',
      tins_count: 120,
      purchased_date: d(25),
      payment_date: d(25),
      purchased_amount: 56000,
      paid_amount: 56000,
      payment_type: 'full',
      payment_events: JSON.stringify([{ date: d(25), amount: 56000, note: 'Initial full payment' }]),
      notes: 'Seed full payment sample',
      fy_start_year: fy,
    },
    {
      id: `vpr-seed-${seedId}-3`,
      entry_type: 'purchase',
      vendor_name: 'Classic Labels',
      product_name: 'Front Label - 200ml',
      tins_count: 75,
      purchased_date: d(12),
      payment_date: d(1),
      purchased_amount: 18000,
      paid_amount: 0,
      payment_type: 'pending',
      payment_events: JSON.stringify([{ date: '', amount: 0, note: 'Pending payment' }]),
      notes: 'Seed pending sample',
      fy_start_year: fy,
    },
    {
      id: `vpr-seed-${seedId}-4`,
      entry_type: 'outstanding_payment',
      vendor_name: 'Yuvaraj',
      product_name: 'Outstanding payment',
      tins_count: 0,
      purchased_date: d(3),
      payment_date: d(3),
      purchased_amount: 0,
      paid_amount: 12000,
      payment_type: 'full',
      payment_events: JSON.stringify([{ date: d(3), amount: 12000, note: 'Outstanding payment adjustment' }]),
      notes: 'Seed outstanding adjustment',
      fy_start_year: fy,
    },
  ];

  for (const r of rows) {
    await conn.execute(
      `INSERT INTO vendor_payment_reference
      (id,entry_type,vendor_name,product_name,tins_count,purchased_date,payment_date,purchased_amount,paid_amount,payment_type,payment_events,notes,fy_start_year,created_by,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
      [
        r.id,
        r.entry_type,
        r.vendor_name,
        r.product_name,
        r.tins_count,
        r.purchased_date,
        r.payment_date,
        r.purchased_amount,
        r.paid_amount,
        r.payment_type,
        r.payment_events,
        r.notes,
        r.fy_start_year,
        'local-seed',
      ],
    );
  }

  await conn.execute(
    `INSERT INTO vendor_payment_reference_fy_balance (fy_start_year,previous_balance,updated_by,updated_at)
     VALUES (?,?,?,NOW())
     ON DUPLICATE KEY UPDATE previous_balance=VALUES(previous_balance),updated_by=VALUES(updated_by),updated_at=NOW()`,
    [fy, 35000, 'local-seed'],
  );

  const [c1] = await conn.query('SELECT COUNT(*) as c FROM vendor_payment_reference');
  const [c2] = await conn.query('SELECT COUNT(*) as c FROM vendor_payment_reference_fy_balance');
  console.log(JSON.stringify({ ok: true, fy, countEntries: c1[0].c, countFyBalances: c2[0].c }, null, 2));
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

