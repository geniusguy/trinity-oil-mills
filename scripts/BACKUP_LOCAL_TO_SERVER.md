# Backup local DB → .sql file → import on server (MariaDB)

## 1. Backup local DB to a .sql file (on your PC)

Make sure **DATABASE_URL** in `oil-shop-web/.env.local` or `oil-shop-web/.env` points to your **local** MySQL/MariaDB.

From the **oil-shop-web** folder:

```powershell
cd D:\React\TrintyOilMills\oil-shop-web
node dump-db.js
```

A file is created in the same folder, e.g.:

- `db-backup_trinityoil_oil_shop_db_new_20260308T120000.sql`

Rename it to something simple if you like (e.g. `local-backup.sql`) before uploading.

---

## 2. Move the .sql file to the server

From your PC (PowerShell), upload the file. Replace `USER`, `SERVER`, and paths as needed:

```powershell
scp D:\React\TrintyOilMills\oil-shop-web\db-backup_*.sql mgadminuser@your-server-ip:/var/www/trinityoil-api/
```

Or rename first, then upload:

```powershell
# After running dump-db.js, copy the latest file name from the output, then:
scp D:\React\TrintyOilMills\oil-shop-web\local-backup.sql mgadminuser@your-server-ip:/var/www/trinityoil-api/
```

---

## 3. Import on the server (MariaDB)

SSH into the server, then run:

```bash
cd /var/www/trinityoil-api
mysql -u YOUR_DB_USER -p trinityoil_oil_shop_db_new < db-backup_trinityoil_oil_shop_db_new_XXXXXXXX.sql
```

Or if you uploaded as `local-backup.sql`:

```bash
mysql -u YOUR_DB_USER -p trinityoil_oil_shop_db_new < local-backup.sql
```

Enter the MySQL password when prompted. This **replaces** the data in the server database with the data from your local backup (the dump includes table structure and data; if tables already exist, you may get duplicate key errors unless you clear tables first or use a fresh DB).

---

## 4. Fresh import (drop and recreate DB, then load backup)

If you want the server DB to be an exact copy of local (empty first, then load):

```bash
mysql -u YOUR_DB_USER -p -e "DROP DATABASE IF EXISTS trinityoil_oil_shop_db_new; CREATE DATABASE trinityoil_oil_shop_db_new CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u YOUR_DB_USER -p trinityoil_oil_shop_db_new < local-backup.sql
```

Use the same database name as in your local `DATABASE_URL` and server `.env.production`.
