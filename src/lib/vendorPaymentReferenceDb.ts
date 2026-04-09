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
}

