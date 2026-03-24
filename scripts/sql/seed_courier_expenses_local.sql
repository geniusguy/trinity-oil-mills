-- Local / server: create table + two demo rows (needs ≥1 user).
-- Run: mysql -u USER -p DATABASE < scripts/sql/seed_courier_expenses_local.sql
-- Or use: node scripts/seed-courier-expenses-local.js

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
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_courier_expenses_date (courier_date),
  INDEX idx_courier_expenses_canteen (canteen_address_id)
);

-- Idempotent re-run: remove old demo keys then insert
DELETE FROM courier_expenses WHERE id IN ('cexp-local-demo-1', 'cexp-local-demo-2');

INSERT INTO courier_expenses (
  id, courier_date, quantity, cost, gst_rate, gst_amount, cgst_amount, sgst_amount, canteen_address_id, destination_note, notes,
  payment_method, reference_no, user_id
)
SELECT
  'cexp-local-demo-1',
  DATE_SUB(CURDATE(), INTERVAL 7 DAY),
  2.00,
  850.00,
  18.00,
  ROUND(850.00 * 18.00 / 100, 2),
  ROUND((ROUND(850.00 * 18.00 / 100, 2) / 2), 2),
  ROUND((ROUND(850.00 * 18.00 / 100, 2) - (ROUND(850.00 * 18.00 / 100, 2) / 2)), 2),
  (SELECT id FROM canteen_addresses WHERE is_active = 1 ORDER BY canteen_name ASC LIMIT 1),
  NULL,
  'SQL seed: courier to canteen',
  'upi',
  'TRK-77881',
  (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
FROM DUAL
WHERE EXISTS (SELECT 1 FROM users LIMIT 1);

INSERT INTO courier_expenses (
  id, courier_date, quantity, cost, gst_rate, gst_amount, cgst_amount, sgst_amount, canteen_address_id, destination_note, notes,
  payment_method, reference_no, user_id
)
SELECT
  'cexp-local-demo-2',
  CURDATE(),
  1.00,
  320.00,
  18.00,
  ROUND(320.00 * 18.00 / 100, 2),
  ROUND((ROUND(320.00 * 18.00 / 100, 2) / 2), 2),
  ROUND((ROUND(320.00 * 18.00 / 100, 2) - (ROUND(320.00 * 18.00 / 100, 2) / 2)), 2),
  NULL,
  'Tirupur — direct address (no canteen master)',
  'SQL seed: destination note only',
  'bank_transfer',
  'AWB-99221',
  (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
FROM DUAL
WHERE EXISTS (SELECT 1 FROM users LIMIT 1);

SELECT id, courier_date, quantity, cost, canteen_address_id, destination_note
FROM courier_expenses
ORDER BY courier_date DESC;
