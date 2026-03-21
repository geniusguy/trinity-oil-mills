-- One-time backfill for packaging inventory based on EXISTING sales (sale_items).
-- Assumes packaging items exist with these product_ids:
--   pack_pet_bottle_200ml, pack_pet_bottle_500ml, pack_pet_bottle_1l, pack_pet_bottle_5l
--   pack_carton_box, pack_packing_tape
--
-- IMPORTANT:
-- 1) Take a DB backup first.
-- 2) Review the PREVIEW queries before running UPDATEs.
-- 3) This script only handles PET + carton + tape. Caps/labels depend on your naming setup.

START TRANSACTION;

-- ---------------------------
-- PREVIEW: bottle usage by size
-- ---------------------------
SELECT
  SUM(CASE WHEN LOWER(p.name) REGEXP '(^|[^0-9])200\\s*ml' THEN si.quantity ELSE 0 END) AS qty_200ml,
  SUM(CASE WHEN LOWER(p.name) REGEXP '(^|[^0-9])500\\s*ml' THEN si.quantity ELSE 0 END) AS qty_500ml,
  SUM(CASE WHEN LOWER(p.name) REGEXP '(^|[^0-9])1\\s*(l|liter|litre)\\b' THEN si.quantity ELSE 0 END) AS qty_1l,
  SUM(CASE WHEN LOWER(p.name) REGEXP '(^|[^0-9])5\\s*(l|liter|litre)\\b' THEN si.quantity ELSE 0 END) AS qty_5l
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
JOIN products p ON p.id = si.product_id
WHERE LOWER(p.name) LIKE '%oil%';

-- ---------------------------
-- APPLY: PET bottle deduction from historical sales
-- ---------------------------
UPDATE inventory i
JOIN (
  SELECT 'pack_pet_bottle_200ml' AS product_id, COALESCE(SUM(si.quantity), 0) AS used_qty
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  JOIN products p ON p.id = si.product_id
  WHERE LOWER(p.name) LIKE '%oil%'
    AND LOWER(p.name) REGEXP '(^|[^0-9])200\\s*ml'
  UNION ALL
  SELECT 'pack_pet_bottle_500ml', COALESCE(SUM(si.quantity), 0)
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  JOIN products p ON p.id = si.product_id
  WHERE LOWER(p.name) LIKE '%oil%'
    AND LOWER(p.name) REGEXP '(^|[^0-9])500\\s*ml'
  UNION ALL
  SELECT 'pack_pet_bottle_1l', COALESCE(SUM(si.quantity), 0)
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  JOIN products p ON p.id = si.product_id
  WHERE LOWER(p.name) LIKE '%oil%'
    AND LOWER(p.name) REGEXP '(^|[^0-9])1\\s*(l|liter|litre)\\b'
  UNION ALL
  SELECT 'pack_pet_bottle_5l', COALESCE(SUM(si.quantity), 0)
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  JOIN products p ON p.id = si.product_id
  WHERE LOWER(p.name) LIKE '%oil%'
    AND LOWER(p.name) REGEXP '(^|[^0-9])5\\s*(l|liter|litre)\\b'
) u ON u.product_id = i.product_id
SET i.quantity = GREATEST(0, i.quantity - u.used_qty),
    i.updated_at = NOW();

-- ---------------------------
-- APPLY: canteen carton deduction (1 per canteen sale)
-- ---------------------------
UPDATE inventory i
JOIN (
  SELECT 'pack_carton_box' AS product_id, COUNT(*) AS used_qty
  FROM sales
  WHERE sale_type = 'canteen'
) c ON c.product_id = i.product_id
SET i.quantity = GREATEST(0, i.quantity - c.used_qty),
    i.updated_at = NOW();

-- ---------------------------
-- APPLY: canteen packing tape (1 every 4 canteen sales)
-- ---------------------------
UPDATE inventory i
JOIN (
  SELECT 'pack_packing_tape' AS product_id, FLOOR(COUNT(*) / 4) AS used_qty
  FROM sales
  WHERE sale_type = 'canteen'
) t ON t.product_id = i.product_id
SET i.quantity = GREATEST(0, i.quantity - t.used_qty),
    i.updated_at = NOW();

-- ---------------------------
-- POST-CHECK
-- ---------------------------
SELECT i.product_id, p.name, i.quantity
FROM inventory i
LEFT JOIN products p ON p.id = i.product_id
WHERE i.product_id IN (
  'pack_pet_bottle_200ml',
  'pack_pet_bottle_500ml',
  'pack_pet_bottle_1l',
  'pack_pet_bottle_5l',
  'pack_carton_box',
  'pack_packing_tape'
)
ORDER BY i.product_id;

COMMIT;

