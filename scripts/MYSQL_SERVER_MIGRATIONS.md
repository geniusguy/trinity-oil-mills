# Run migrations on the server (MySQL only)

## Why `node scripts/...` fails with `Access denied for user 'root'@'localhost'`

The scripts read credentials from **`DATABASE_URL`** or **`.env` / `.env.local`** in the **`oil-shop-web`** folder.  
If none are loaded, they fall back to **`root`** with an **empty password** → access denied.

**Fix for Node (pick one):**

```bash
cd /var/www/trinityoil-api/oil-shop-web   # or wherever oil-shop-web lives

# Load env then run (if you have .env)
set -a && [ -f .env ] && . ./.env && set +a
node scripts/migrate-fill-sales-supply-totals.js
```

Or one line with explicit URL:

```bash
export DATABASE_URL='mysql://YOUR_USER:YOUR_PASSWORD@127.0.0.1:3306/trinityoil_oil_shop_db_new'
node scripts/migrate-fill-sales-supply-totals.js
```

---

## Option A — Pure MySQL (recommended if you can log in as a DB user)

Log in (use **your real** MySQL user and database name):

```bash
mysql -u YOUR_DB_USER -p trinityoil_oil_shop_db_new
```

Then paste and run:

### 1) Daily Notes / Task reminders table

```sql
CREATE TABLE IF NOT EXISTS daily_task_reminders (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  reminder_on DATETIME NULL,
  remarks TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_daily_task_reminders_status (status),
  INDEX idx_daily_task_reminders_reminder_on (reminder_on)
);
```

### 2) Backfill `total_tins` from `total_liters` (canteen only)

Use this **only if** `total_liters` on each row is already correct.  
Sets tin-equivalent: **15.2 L = 1 tin**.

```sql
UPDATE sales
SET total_tins = ROUND(total_liters / 15.2, 2)
WHERE sale_type = 'canteen'
  AND total_liters IS NOT NULL;
```

Preview first:

```sql
SELECT id, invoice_number, total_liters, total_tins,
       ROUND(total_liters / 15.2, 2) AS new_total_tins
FROM sales
WHERE sale_type = 'canteen' AND total_liters IS NOT NULL
LIMIT 20;
```

---

## Option B — Pipe SQL file without Node

From the server project directory (path to SQL must exist):

```bash
mysql -u YOUR_DB_USER -p trinityoil_oil_shop_db_new < scripts/migrate-daily-task-reminders.sql
mysql -u YOUR_DB_USER -p trinityoil_oil_shop_db_new < scripts/migrate-supply-tins-from-liters.sql
```

---

## If you don’t know the MySQL password

- Check **`.env`** / **`.env.production`** next to the app for `DATABASE_URL` or `DB_USER` / `DB_PASSWORD`.
- On Ubuntu, sometimes root uses **socket auth**:

```bash
sudo mysql
```

Then create a user or reset password (DB admin task).

---

## Full backfill from line items (like the JS script)

That logic matches product names in SQL poorly. Use the **Node script** with **`DATABASE_URL`** set correctly, or run Option A if `total_liters` is good.
