# Fix: Server Using .env Instead of .env.production

## Problem
Next.js automatically loads `.env` files, and if both `.env` and `.env.production` exist, `.env` values might override `.env.production` values, causing database connection issues.

## Solution

### Option 1: Remove or Rename .env File on Server (Recommended)

**On your server, run:**

```bash
cd /home/trinityoil/public_html

# Check if .env exists
ls -la .env

# If it exists, rename it (don't delete, keep as backup)
mv .env .env.backup

# Verify .env.production exists
ls -la .env.production

# Restart PM2
pm2 restart api.trinityoil.in
```

### Option 2: Ensure .env.production Values Take Precedence

The updated `start-server.js` now ensures that `.env.production` values take precedence. After uploading the updated file:

1. **Upload the updated `start-server.js` file**

2. **On server, restart PM2:**
   ```bash
   pm2 restart api.trinityoil.in
   pm2 logs api.trinityoil.in --lines 50
   ```

3. **Check the logs for:**
   - `📁 Loading .env.production from: ...`
   - `✅ DATABASE_URL: SET (...)` 
   - `🔍 Environment variables verification:`

### Option 3: Copy .env.production to .env (Quick Fix)

If you want to keep both files but ensure production values are used:

```bash
cd /home/trinityoil/public_html

# Backup current .env
cp .env .env.local.backup

# Copy .env.production to .env (this will override .env with production values)
cp .env.production .env

# Restart PM2
pm2 restart api.trinityoil.in
```

## Next.js Environment File Priority

Next.js loads environment files in this order (highest to lowest priority):

1. `.env.local` (overrides everything - should NOT exist on production)
2. `.env.production` (when NODE_ENV=production)
3. `.env.development` (when NODE_ENV=development)
4. `.env` (lowest priority, loaded in all environments)

**The problem:** If `.env` exists, it gets loaded and its values might override `.env.production` values.

## Recommended Setup for Production

**On your production server, you should have:**

- ✅ `.env.production` (contains production database credentials)
- ❌ `.env` (should NOT exist, or should be empty/backed up)
- ❌ `.env.local` (should NOT exist on production)

## Verification Steps

After fixing, verify the setup:

```bash
cd /home/trinityoil/public_html

# 1. Check which env files exist
ls -la .env*

# 2. Check PM2 logs for environment loading
pm2 logs api.trinityoil.in --lines 50 | grep -E "(Loading|DATABASE_URL|NODE_ENV)"

# 3. Test DB from the server (MySQL client or app health)
# Debug /test-db and /api/test-db-connection were removed for production security.
```

## Files Updated

- ✅ `start-server.js` - Now warns about `.env` file and ensures `.env.production` values take precedence
- ✅ Logs now show environment variable verification

