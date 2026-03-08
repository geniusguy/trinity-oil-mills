# SQL migrations (run on server)

Run these with your MySQL client when you want to apply schema changes directly on the server.

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

## If Add Stock page shows 404

1. Run the app from the **oil-shop-web** folder: `cd oil-shop-web` then `npm run dev`.
2. Open: **http://localhost:3001/dashboard/admin/stock-purchases**
3. If it still 404s, delete the `.next` folder in oil-shop-web and run `npm run dev` again.
