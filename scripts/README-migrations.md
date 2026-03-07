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
