# Server Configuration Fix for Auth.js v5

## Issue
Getting "There is a problem with the server configuration" error on `/api/auth/error`

## Root Cause
Auth.js v5 requires specific environment variables that may not be properly loaded in production.

## Required Environment Variables

Make sure your `.env.production` file on the server has these variables:

```env
# Required for Auth.js v5
AUTH_SECRET=your-secret-key-here
# OR (both work, but AUTH_SECRET is preferred)
NEXTAUTH_SECRET=your-secret-key-here

# Required for production
AUTH_URL=https://api.trinityoil.in
# OR
NEXTAUTH_URL=https://api.trinityoil.in

# Database
DATABASE_URL=mysql://user:password@host:3306/database

# Server
NODE_ENV=production
PORT=3001
```

## Steps to Fix on Server

1. **SSH into your server** and navigate to the app directory:
   ```bash
   cd /home/trinityoil/public_html
   ```

2. **Check your `.env.production` file**:
   ```bash
   cat .env.production | grep -E "(AUTH|NEXTAUTH)"
   ```

3. **Ensure these variables are set**:
   - `AUTH_SECRET` or `NEXTAUTH_SECRET` (required)
   - `AUTH_URL` or `NEXTAUTH_URL` (required for production)
   - `DATABASE_URL` (required)

4. **Restart PM2**:
   ```bash
   pm2 restart api.trinityoil.in
   ```

5. **Check PM2 logs** for errors:
   ```bash
   pm2 logs api.trinityoil.in --lines 50
   ```

## If Still Not Working

1. **Rebuild the application**:
   ```bash
   cd /home/trinityoil/public_html
   npm run build
   pm2 restart api.trinityoil.in
   ```

2. **Check if `.env.production` is being loaded**:
   Look for these log messages in PM2 output:
   - `📁 Loading .env.production from: ...`
   - `✅ Loaded X environment variables from .env.production`
   - `✅ DATABASE_URL: SET`

3. **Verify environment variables are passed to Next.js**:
   The `start-server.js` script now explicitly sets:
   - `AUTH_SECRET`
   - `AUTH_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`

## Quick Fix Script

Run this on your server:

```bash
cd /home/trinityoil/public_html

# Add missing variables to .env.production if needed
if ! grep -q "AUTH_SECRET" .env.production 2>/dev/null; then
  echo "AUTH_SECRET=$(grep NEXTAUTH_SECRET .env.production | cut -d'=' -f2)" >> .env.production
fi

if ! grep -q "AUTH_URL" .env.production 2>/dev/null; then
  echo "AUTH_URL=https://api.trinityoil.in" >> .env.production
fi

# Rebuild and restart
npm run build
pm2 restart api.trinityoil.in
pm2 logs api.trinityoil.in --lines 30
```

