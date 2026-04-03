/** Ensures `stock_purchase_payments` exists (installments / vendor payments per purchase). */
export async function ensureStockPurchasePaymentsTable(connection: {
  execute: (sql: string) => Promise<unknown>;
}) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS stock_purchase_payments (
      id VARCHAR(255) PRIMARY KEY,
      stock_purchase_id VARCHAR(255) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      paid_on DATE NOT NULL,
      notes TEXT NULL,
      created_by VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_spp_purchase (stock_purchase_id)
    )
  `);
}
