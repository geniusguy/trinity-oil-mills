USE trinityoil_oil_shop_db_new;
START TRANSACTION;

INSERT INTO products
(id, name, category, type, description, base_price, retail_price, gst_rate, gst_included, unit, barcode, is_active, created_at, updated_at)
VALUES
('pack_pet_bottle_200ml', 'PET Bottle - 200ml', 'Purchased', 'Bottle', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_pet_bottle_500ml', 'PET Bottle - 500ml', 'Purchased', 'Bottle', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_pet_bottle_1l',    'PET Bottle - 1L',    'Purchased', 'Bottle', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_pet_bottle_5l',    'PET Bottle - 5L',    'Purchased', 'Bottle', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),

('pack_inner_cap_200ml', 'Inner Cap - 200ml', 'Purchased', 'Inner Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_inner_cap_500ml', 'Inner Cap - 500ml', 'Purchased', 'Inner Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_inner_cap_1l',    'Inner Cap - 1L',    'Purchased', 'Inner Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_inner_cap_5l',    'Inner Cap - 5L',    'Purchased', 'Inner Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),

('pack_flip_top_cap_200ml_green',  'Flip Top Cap - 200ml - Green',  'Purchased', 'Flip Top Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_flip_top_cap_200ml_yellow', 'Flip Top Cap - 200ml - Yellow', 'Purchased', 'Flip Top Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_flip_top_cap_200ml_white',  'Flip Top Cap - 200ml - White',  'Purchased', 'Flip Top Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_flip_top_cap_200ml_red',    'Flip Top Cap - 200ml - Red',    'Purchased', 'Flip Top Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),

('pack_flip_top_cap_500ml_green',  'Flip Top Cap - 500ml - Green',  'Purchased', 'Flip Top Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_flip_top_cap_500ml_yellow', 'Flip Top Cap - 500ml - Yellow', 'Purchased', 'Flip Top Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_flip_top_cap_500ml_white',  'Flip Top Cap - 500ml - White',  'Purchased', 'Flip Top Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_flip_top_cap_500ml_red',    'Flip Top Cap - 500ml - Red',    'Purchased', 'Flip Top Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),

('pack_flip_top_cap_1l_green',  'Flip Top Cap - 1L - Green',  'Purchased', 'Flip Top Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_flip_top_cap_1l_yellow', 'Flip Top Cap - 1L - Yellow', 'Purchased', 'Flip Top Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_flip_top_cap_1l_white',  'Flip Top Cap - 1L - White',  'Purchased', 'Flip Top Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_flip_top_cap_1l_red',    'Flip Top Cap - 1L - Red',    'Purchased', 'Flip Top Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),

('pack_flip_top_cap_5l_green',  'Flip Top Cap - 5L - Green',  'Purchased', 'Flip Top Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_flip_top_cap_5l_yellow', 'Flip Top Cap - 5L - Yellow', 'Purchased', 'Flip Top Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_flip_top_cap_5l_white',  'Flip Top Cap - 5L - White',  'Purchased', 'Flip Top Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_flip_top_cap_5l_red',    'Flip Top Cap - 5L - Red',    'Purchased', 'Flip Top Cap', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),

('pack_front_label_200ml', 'Front Label - 200ml', 'Purchased', 'Label', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_front_label_500ml', 'Front Label - 500ml', 'Purchased', 'Label', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_front_label_1l',    'Front Label - 1L',    'Purchased', 'Label', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_front_label_5l',    'Front Label - 5L',    'Purchased', 'Label', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),

('pack_back_label_200ml', 'Back Label - 200ml', 'Purchased', 'Label', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_back_label_500ml', 'Back Label - 500ml', 'Purchased', 'Label', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_back_label_1l',    'Back Label - 1L',    'Purchased', 'Label', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW()),
('pack_back_label_5l',    'Back Label - 5L',    'Purchased', 'Label', 'Packaging component', 0.00, 0.00, 18.00, 0, 'pcs', NULL, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  category = VALUES(category),
  type = VALUES(type),
  unit = VALUES(unit),
  gst_rate = VALUES(gst_rate),
  is_active = VALUES(is_active),
  updated_at = NOW();

INSERT INTO inventory
(id, product_id, quantity, min_stock, max_stock, location, cost_price, created_at, updated_at)
SELECT
  CONCAT('inv-', p.id),
  p.id,
  0.00,
  100.00,
  50000.00,
  'main_store',
  0.00,
  NOW(),
  NOW()
FROM products p
WHERE p.id LIKE 'pack_%'
  AND NOT EXISTS (
    SELECT 1 FROM inventory i WHERE i.product_id = p.id
  );

COMMIT;

SELECT id, name, type, unit, is_active
FROM products
WHERE id LIKE 'pack_%'
ORDER BY id;

SELECT product_id, quantity, min_stock, max_stock
FROM inventory
WHERE product_id LIKE 'pack_%'
ORDER BY product_id;
