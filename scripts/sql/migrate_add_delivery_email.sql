-- Trinity Oil Mills - Add delivery_email column to canteen_addresses
-- Use this when you want to add the Delivery Person Email ID field
-- to an existing database without dropping any tables or data.
--
-- Run from shell (replace USER, DB_NAME, and path):
--   mysql -u USER -p DB_NAME < /path/to/migrate_add_delivery_email.sql
--
-- Example:
--   mysql -u root -p trinityoil_oil_shop_db_new < oil-shop-web/scripts/sql/migrate_add_delivery_email.sql

ALTER TABLE canteen_addresses
  ADD COLUMN IF NOT EXISTS delivery_email VARCHAR(255) NULL;

