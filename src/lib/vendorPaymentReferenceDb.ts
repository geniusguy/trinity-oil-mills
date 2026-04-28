/** DB tables for vendor payment reference page (separate from accounting reports). */
export async function ensureVendorPaymentReferenceTables(connection: {
  execute: (sql: string) => Promise<unknown>;
}) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS vendor_payment_reference (
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
    )
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS vendor_payment_reference_fy_balance (
      fy_start_year INT PRIMARY KEY,
      previous_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
      updated_by VARCHAR(255) NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const safeExec = async (sql: string) => {
    try {
      await connection.execute(sql);
    } catch (error: any) {
      // Ignore duplicate-column/index and unsupported alters to keep API available on mixed server states.
      const code = String(error?.code || '');
      const message = String(error?.message || '').toLowerCase();
      const ignorable =
        code === 'ER_DUP_FIELDNAME' ||
        code === 'ER_DUP_KEYNAME' ||
        code === 'ER_MULTIPLE_PRI_KEY' ||
        message.includes('duplicate column') ||
        message.includes('already exists');
      if (!ignorable) throw error;
    }
  };

  // Backfill/upgrade existing server tables from older schema versions.
  await safeExec(`ALTER TABLE vendor_payment_reference ADD COLUMN entry_type VARCHAR(40) NOT NULL DEFAULT 'purchase'`);
  await safeExec(`ALTER TABLE vendor_payment_reference ADD COLUMN product_name VARCHAR(255) NOT NULL DEFAULT ''`);
  await safeExec(`ALTER TABLE vendor_payment_reference ADD COLUMN tins_count DECIMAL(12,2) NOT NULL DEFAULT 0`);
  await safeExec(`ALTER TABLE vendor_payment_reference ADD COLUMN purchased_date DATE NULL`);
  await safeExec(`ALTER TABLE vendor_payment_reference ADD COLUMN purchased_amount DECIMAL(14,2) NOT NULL DEFAULT 0`);
  await safeExec(`ALTER TABLE vendor_payment_reference ADD COLUMN paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0`);
  await safeExec(`ALTER TABLE vendor_payment_reference ADD COLUMN payment_type VARCHAR(20) NOT NULL DEFAULT 'full'`);
  await safeExec(`ALTER TABLE vendor_payment_reference ADD COLUMN payment_events LONGTEXT NULL`);
  await safeExec(`ALTER TABLE vendor_payment_reference ADD COLUMN fy_start_year INT NOT NULL DEFAULT 2025`);
  await safeExec(`ALTER TABLE vendor_payment_reference ADD COLUMN created_by VARCHAR(255) NULL`);
  await safeExec(`ALTER TABLE vendor_payment_reference ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
  await safeExec(`ALTER TABLE vendor_payment_reference ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);

  // Ensure nullable dates for pending/outstanding rows.
  await safeExec(`ALTER TABLE vendor_payment_reference MODIFY COLUMN purchased_date DATE NULL`);
  await safeExec(`ALTER TABLE vendor_payment_reference MODIFY COLUMN payment_date DATE NULL`);
  // Force legacy enum/text variants to a plain VARCHAR so new values do not fail on mixed deployments.
  await safeExec(`ALTER TABLE vendor_payment_reference MODIFY COLUMN payment_type VARCHAR(20) NOT NULL DEFAULT 'full'`);

  await safeExec(`CREATE INDEX idx_vpr_fy ON vendor_payment_reference (fy_start_year)`);
  await safeExec(`CREATE INDEX idx_vpr_vendor ON vendor_payment_reference (vendor_name)`);
  await safeExec(`CREATE INDEX idx_vpr_product ON vendor_payment_reference (product_name)`);
  await safeExec(`CREATE INDEX idx_vpr_purchased_date ON vendor_payment_reference (purchased_date)`);
  await safeExec(`CREATE INDEX idx_vpr_payment_date ON vendor_payment_reference (payment_date)`);
}

