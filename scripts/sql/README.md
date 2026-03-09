# SQL migrations (run on server)

Run these with your MySQL client when you want to apply schema changes directly on the server.

---

## Full fresh DB: drop database, create database, create all tables

Use this when you want to **remove the database and recreate it from scratch** (e.g. to fix migration issues). **All data will be lost.**

**1. Upload the SQL file to the server**

- File: `oil-shop-web/scripts/sql/drop_create_db_and_schema.sql`
- Upload to the server (e.g. `/var/www/trinityoil-api/oil-shop-web/scripts/sql/` or any path you prefer).

**2. On the server, run (replace USER and path):**

```bash
mysql -u USER -p < /path/to/drop_create_db_and_schema.sql
```

Example:

```bash
mysql -u root -p < /var/www/trinityoil-api/oil-shop-web/scripts/sql/drop_create_db_and_schema.sql
```

**3. If your database name is different**

Edit `drop_create_db_and_schema.sql` and change `trinityoil_oil_shop_db_new` to your database name in these lines:

```sql
DROP DATABASE IF EXISTS trinityoil_oil_shop_db_new;
CREATE DATABASE trinityoil_oil_shop_db_new ...
USE trinityoil_oil_shop_db_new;
```

**4. After running**

- Ensure `.env.production` (or your app env) has `DATABASE_URL=mysql://USER:PASSWORD@host:3306/trinityoil_oil_shop_db_new`.
- Create an admin user again via the app (Register or your seed) since the DB is fresh.

---

## Tables only (database already exists): full_schema_fresh.sql

If the database already exists and you only want to **drop and recreate all tables** (no DROP DATABASE):

```bash
mysql -u USER -p trinityoil_oil_shop_db_new < /path/to/full_schema_fresh.sql
```

---

## Quick: one SQL command for server (stock_purchases)

Run this in your MySQL client (e.g. on the server or phpMyAdmin). Replace `YOUR_DATABASE_NAME` with your actual DB name (e.g. `trinityoil_oil_shop_db_new`):

```sql
USE YOUR_DATABASE_NAME;

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
```

---

## Fix collation (stock_purchases) – run on server if you get "Illegal mix of collations"

Run this **inside MySQL on the server** (after the table exists). Replace `YOUR_DATABASE_NAME` with your DB name.

**MySQL 8.x:**

```sql
USE YOUR_DATABASE_NAME;

ALTER TABLE stock_purchases
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

**MySQL 5.7** (if 0900_ai_ci is not available):

```sql
USE YOUR_DATABASE_NAME;

ALTER TABLE stock_purchases
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Or from shell: `mysql -u USER -p YOUR_DATABASE_NAME < scripts/sql/stock_purchases_collation.sql`

---

## stock_purchases.sql

Creates the `stock_purchases` table (add stock + track supplier and purchase date).

**From command line (replace user, dbname, and path):**

```bash
mysql -u YOUR_USER -p YOUR_DATABASE_NAME < scripts/sql/stock_purchases.sql
```

**Or paste this in your MySQL client (phpMyAdmin, MySQL Workbench, etc.):**

```sql
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
```

Use the same database name as in your app (e.g. `trinityoil_oil_shop_db_new` or from `DATABASE_URL`).

---

## Add Delivery Person Email ID to canteen_addresses (safe migration)

Use this when you only want to **add the new delivery email field** (`delivery_email`) to an existing database.

**From command line (replace user, dbname, and path):**

```bash
mysql -u YOUR_USER -p YOUR_DATABASE_NAME < scripts/sql/migrate_add_delivery_email.sql
```

This runs:

```sql
ALTER TABLE canteen_addresses
  ADD COLUMN IF NOT EXISTS delivery_email VARCHAR(255) NULL;
```

No data is dropped; it only adds the new column if it is missing.

---

## Seed data (initial users, products, inventory)

After creating the schema, load initial data so you can log in and use the app:

```bash
mysql -u YOUR_USER -p trinityoil_oil_shop_db_new < scripts/sql/seed_data.sql
```

Or from inside MySQL:

```sql
USE trinityoil_oil_shop_db_new;
SOURCE /path/to/seed_data.sql;
```

**Default admin login:** `admin@trinityoil.com` / `Admin@123` — change the password after first login.

The seed adds: one admin user, four sample products, inventory rows for them, and one sample canteen address. Safe to run multiple times (uses ON DUPLICATE KEY UPDATE).

---

## If Add Stock page shows 404

1. Run the app from the **oil-shop-web** folder: `cd oil-shop-web` then `npm run dev`.
2. Open: **http://localhost:3001/dashboard/admin/stock-purchases**
3. If it still 404s, delete the `.next` folder in oil-shop-web and run `npm run dev` again.
