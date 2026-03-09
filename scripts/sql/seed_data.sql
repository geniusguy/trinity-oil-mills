-- Trinity Oil Mills - Seed data for MariaDB
-- Run after schema is created. Usage: mysql -u USER -p DATABASE_NAME < seed_data.sql
-- Default admin login: admin@trinityoil.com / Admin@123 (change after first login)

USE trinityoil_oil_shop_db_new;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ========== USERS ==========
-- Admin user: admin@trinityoil.com, password: Admin@123
INSERT INTO users (id, email, password, name, role, created_at, updated_at) VALUES
('admin-1', 'admin@trinityoil.com', '$2b$10$1O4iS0mKQIbaoVqiukiL0eESN0vXQO9dLZkZcQ4mvXOzTtHDJXPGO', 'Admin', 'admin', NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- ========== PRODUCTS (sample oils) ==========
INSERT INTO products (id, name, category, type, description, base_price, retail_price, gst_rate, gst_included, unit, is_active, created_at, updated_at) VALUES
('prod-groundnut-1', 'Groundnut Oil', 'produced', 'ground_nut', 'Premium groundnut oil', 200.00, 210.00, 5.00, 0, 'liters', 1, NOW(), NOW()),
('prod-gingelly-1', 'Gingelly Oil', 'produced', 'gingelly', 'Sesame gingelly oil', 250.00, 262.50, 5.00, 0, 'liters', 1, NOW(), NOW()),
('prod-coconut-1', 'Coconut Oil', 'produced', 'coconut', 'Pure coconut oil', 180.00, 189.00, 5.00, 0, 'liters', 1, NOW(), NOW()),
('prod-castor-200ml', 'Castor Oil 200ml', 'produced', 'castor', 'Castor oil 200ml bottle', 45.00, 47.25, 5.00, 0, 'pieces', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- ========== INVENTORY (initial stock for products) ==========
INSERT INTO inventory (id, product_id, quantity, min_stock, max_stock, location, created_at, updated_at) VALUES
('inv-1', 'prod-groundnut-1', 100, 10, 1000, 'main_store', NOW(), NOW()),
('inv-2', 'prod-gingelly-1', 80, 10, 1000, 'main_store', NOW(), NOW()),
('inv-3', 'prod-coconut-1', 60, 10, 1000, 'main_store', NOW(), NOW()),
('inv-4', 'prod-castor-200ml', 50, 10, 500, 'main_store', NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- ========== ONE SAMPLE CANTEEN ADDRESS (optional) ==========
INSERT INTO canteen_addresses (id, canteen_name, address, city, state, pincode, contact_person, mobile_number, gst_number, is_active, created_at, updated_at) VALUES
('canteen-1', 'Sample Canteen', 'Sample Address', 'Chennai', 'Tamil Nadu', '600001', 'Contact Person', '9876543210', '33AAAGT0316F1ZT', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

SET FOREIGN_KEY_CHECKS = 1;

-- Default admin: admin@trinityoil.com / Admin@123
-- Change password after first login from the app.
