/** Vendor payables opening balance at 1 Apr for a given Indian FY (per `fy_start_year`). */
export async function ensureStockPurchaseFyOpeningTable(connection: {
  execute: (sql: string) => Promise<unknown>;
}) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS stock_purchase_fy_opening (
      fy_start_year INT NOT NULL PRIMARY KEY,
      opening_balance_payable DECIMAL(14,2) NOT NULL DEFAULT 0,
      notes VARCHAR(500) NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}
