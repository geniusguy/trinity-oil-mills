-- =============================================================================
-- MariaDB / MySQL 5.7: Create stock_purchases table (utf8mb4_unicode_ci works on both).
-- Run in MariaDB: SOURCE /path/to/stock_purchases_mariadb.sql;
-- Or: mysql -u USER -p trinityoil_oil_shop_db_new < stock_purchases_mariadb.sql
-- =============================================================================

USE trinityoil_oil_shop_db_new;

CREATE TABLE IF NOT EXISTS stock_purchases (
  id VARCHAR(255) PRIMARY KEY,
  product_id VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  purchase_date DATETIME NOT NULL,
  unit_price DECIMAL(10,2) NULL,
  total_amount DECIMAL(10,2) NULL,
  invoice_number VARCHAR(100) NULL,
  notes TEXT NULL,
  created_by VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_stock_purchases_product_id (product_id),
  INDEX idx_stock_purchases_supplier (supplier_name),
  INDEX idx_stock_purchases_purchase_date (purchase_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
