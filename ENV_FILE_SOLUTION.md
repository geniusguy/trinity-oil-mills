# Solution: .env vs .env.production on Server

## ❌ Don't Just Rename .env.production to .env

**Why?** The `start-server.js` script specifically looks for `.env.production` and will fail if it doesn't find it.

## ✅ Best Solution: Keep Both Files (Recommended)

### Option 1: Copy .env.production to .env (Recommended)

This ensures both the script and Next.js can find the environment variables:

```bash
cd /home/trinityoil/public_html

# Backup existing .env if it exists
if [ -f ".env" ]; then
    mv .env .env.old.backup
    echo "✅ Backed up existing .env to .env.old.backup"
fi

# Copy .env.production to .env
cp .env.production .env
echo "✅ Copied .env.production to .env"

# Verify both files exist
ls -la .env .env.production

# Restart PM2
pm2 restart api.trinityoil.in
```

**Why this works:**
- `start-server.js` finds `.env.production` ✅
- Next.js automatically loads `.env` ✅
- Both files have the same values, so no conflicts ✅

### Option 2: Remove .env and Keep Only .env.production

If you want to keep only one file:

```bash
cd /home/trinityoil/public_html

# Backup .env if it exists
if [ -f ".env" ]; then
    mv .env .env.backup
    echo "✅ Backed up .env to .env.backup"
fi

# Verify .env.production exists
ls -la .env.production

# Restart PM2
pm2 restart api.trinityoil.in
```

**Why this works:**
- `start-server.js` loads `.env.production` and sets env vars ✅
- No `.env` file to conflict ✅
- Next.js will use the env vars set by `start-server.js` ✅

### Option 3: Update start-server.js to Use .env Instead

If you prefer to use only `.env`, you would need to update `start-server.js` to look for `.env` instead of `.env.production`. But this is NOT recommended because:
- You lose the ability to have different files for dev/prod
- It's less clear which environment you're running

## 🎯 Recommended Approach

**Use Option 1** - Copy `.env.production` to `.env`:

1. This ensures compatibility with both `start-server.js` and Next.js
2. Both files will have the same values
3. No conflicts or overrides
4. Easy to maintain - just update `.env.production` and copy it

## Quick Fix Script

Run this on your server:

```bash
cd /home/trinityoil/public_html

# Backup old .env
[ -f ".env" ] && mv .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Copy .env.production to .env
cp .env.production .env

# Verify
echo "✅ Files:"
ls -la .env .env.production

# Restart
pm2 restart api.trinityoil.in

# Check logs
pm2 logs api.trinityoil.in --lines 30
```

## Verification

After applying the fix, check PM2 logs:

```bash
pm2 logs api.trinityoil.in --lines 50 | grep -E "(Loading|DATABASE_URL|NODE_ENV)"
```

You should see:
- `📁 Loading .env.production from: ...`
- `✅ DATABASE_URL: SET (...)`
- `🔍 Environment variables verification:`
- `DATABASE_URL: SET`

