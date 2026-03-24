-- Courier expenses (CRUD + reporting). Run on server/local DB after backup.
-- MariaDB / MySQL 8+

CREATE TABLE IF NOT EXISTS courier_expenses (
  id VARCHAR(255) PRIMARY KEY,
  courier_date DATE NOT NULL,
  quantity DECIMAL(12, 2) NOT NULL DEFAULT 0,
  cost DECIMAL(12, 2) NOT NULL,
  gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  gst_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  cgst_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  sgst_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  canteen_address_id VARCHAR(255) NULL,
  destination_note TEXT NULL,
  notes TEXT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
  reference_no VARCHAR(100) NULL,
  reference_pdf_path VARCHAR(500) NULL,
  reference_pdf_original_name VARCHAR(255) NULL,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_courier_expenses_date (courier_date),
  INDEX idx_courier_expenses_canteen (canteen_address_id)
);
