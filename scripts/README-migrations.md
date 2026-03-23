# Database migrations

## Canteen billing columns

Adds `billing_contact_person`, `billing_email`, `billing_mobile` to `canteen_addresses`.

### Server – one file, one command

**File:** `run-migrate.sh` (in **repo root**, e.g. `trinityoil-api/run-migrate.sh`)

Uses **`oil-shop-web/.env.production`** for DB. Ensure that file exists and has `DATABASE_URL` (or `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`).

**Command (from repo root):**

```bash
cd /var/www/trinityoil-api && bash run-migrate.sh
```

Safe to run multiple times.

---

## Courier expenses (`courier_expenses`)

**DDL only:** `scripts/sql/migrate_courier_expenses.sql`

**Table + 2 demo rows (needs ≥1 user in `users`):**

- **Node (uses `.env.local` / `.env`):** from `oil-shop-web` folder:

  ```bash
  npm run db:seed-courier-local
  ```

  Re-seed demo rows: `npm run db:seed-courier-local -- --force`

- **MySQL CLI:**

  ```bash
  mysql -u USER -p YOUR_DATABASE < oil-shop-web/scripts/sql/seed_courier_expenses_local.sql
  ```
