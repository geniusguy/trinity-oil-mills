-- Backfill total_tins from total_liters for canteen sales (15.2 L = 1 tin usable).
-- Run ONLY if total_liters is already correct on each row.
-- Usage: mysql -u USER -p DATABASE < scripts/migrate-supply-tins-from-liters.sql

-- Preview (optional):
-- SELECT id, invoice_number, total_liters, total_tins,
--        ROUND(total_liters / 15.2, 2) AS new_total_tins
-- FROM sales
-- WHERE sale_type = 'canteen' AND total_liters IS NOT NULL
-- LIMIT 50;

UPDATE sales
SET total_tins = ROUND(total_liters / 15.2, 2)
WHERE sale_type = 'canteen'
  AND total_liters IS NOT NULL;
