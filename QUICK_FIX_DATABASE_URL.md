# Quick Fix: Add DATABASE_URL to .env.production

## Problem
Your `.env.production` file is missing `DATABASE_URL`, which is required for database connection.

## Quick Solution

### Option 1: Use the Script (Easiest)

```bash
cd /home/trinityoil/public_html
chmod +x add-database-url.sh
./add-database-url.sh
```

The script will ask you for:
- Database host (default: localhost)
- Database port (default: 3306)
- Database username
- Database password
- Database name (default: trinityoil_oil_shop_db_new)

### Option 2: Manual Edit

1. **Edit .env.production:**
   ```bash
   nano /home/trinityoil/public_html/.env.production
   ```

2. **Add this line (replace with your actual database credentials):**
   ```env
   DATABASE_URL=mysql://username:password@host:3306/database_name
   ```

3. **Example:**
   ```env
   DATABASE_URL=mysql://root:yourpassword@localhost:3306/trinityoil_oil_shop_db_new
   ```

4. **Save and exit** (Ctrl+X, then Y, then Enter)

5. **Restart PM2:**
   ```bash
   pm2 restart api.trinityoil.in
   pm2 logs api.trinityoil.in --lines 30
   ```

### Option 3: Quick Add via Command Line

```bash
cd /home/trinityoil/public_html

# Add DATABASE_URL (replace with your actual values)
echo "" >> .env.production
echo "DATABASE_URL=mysql://username:password@host:3306/database_name" >> .env.production

# Verify it was added
tail -3 .env.production

# Restart
pm2 restart api.trinityoil.in
```

## Verify It's Working

After adding DATABASE_URL, check the logs:

```bash
pm2 logs api.trinityoil.in --lines 50 | grep -E "(DATABASE_URL|Loading|SET)"
```

You should see:
- `✅ Found DATABASE_URL at line X`
- `✅ DATABASE_URL: SET (mysql://...)`

## Common Database URL Formats

**Local MySQL:**
```
DATABASE_URL=mysql://root:password@localhost:3306/database_name
```

**Remote MySQL:**
```
DATABASE_URL=mysql://username:password@192.168.1.100:3306/database_name
```

**With special characters in password:**
If your password has special characters, URL encode them:
- `@` becomes `%40`
- `#` becomes `%23`
- `%` becomes `%25`
- etc.

Example:
```
DATABASE_URL=mysql://user:p%40ssw%23rd@localhost:3306/dbname
```

## After Adding DATABASE_URL

1. Restart PM2: `pm2 restart api.trinityoil.in`
2. Check logs: `pm2 logs api.trinityoil.in --lines 30`
3. Verify: Look for `✅ DATABASE_URL: SET` in the logs

