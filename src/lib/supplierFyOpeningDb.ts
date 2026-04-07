/** Opening payable per supplier per FY (Indian FY start year). */
export async function ensureSupplierFyOpeningTable(connection: {
  execute: (sql: string) => Promise<unknown>;
}) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS supplier_fy_opening_balance (
      supplier_name VARCHAR(255) NOT NULL,
      fy_start_year INT NOT NULL,
      opening_balance_payable DECIMAL(14,2) NOT NULL DEFAULT 0,
      notes VARCHAR(500) NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (supplier_name, fy_start_year)
    )
  `);
}
