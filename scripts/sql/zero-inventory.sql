-- Set all stock quantities to zero (run against your local DB in MySQL client / Workbench)
-- Database: same as DATABASE_URL / trinityoil_oil_shop_db_new

UPDATE inventory
SET quantity = 0,
    updated_at = NOW();
