/** Supplier master used across purchases/payments screens. */
export async function ensureSuppliersTable(connection: {
  execute: (sql: string) => Promise<unknown>;
}) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      supplier_type VARCHAR(120) NULL,
      contact_number VARCHAR(30) NULL,
      email VARCHAR(255) NULL,
      created_by VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_supplier_name (name)
    )
  `);
}
