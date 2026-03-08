-- =============================================================================
-- Fix stock_purchases collation to match products table (avoids "Illegal mix of
-- collations" when joining). Run inside MySQL on the server.
-- Usage: mysql -u USER -p DATABASE_NAME < stock_purchases_collation.sql
-- Or paste the block below into MySQL Workbench / phpMyAdmin.
-- =============================================================================

-- Use your database name (e.g. trinityoil_oil_shop_db_new)
-- USE your_database_name;

-- MySQL 8.x: use utf8mb4_0900_ai_ci to match default products table
ALTER TABLE stock_purchases
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- If your server is MySQL 5.7, use this instead (0900_ai_ci not available):
-- ALTER TABLE stock_purchases
--   CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
