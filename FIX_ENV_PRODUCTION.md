# Fix .env.production Not Loading

## Problem
- `DATABASE_URL` shows "NOT SET" in production
- Build shows: `[dotenv@17.2.2] injecting env (0) from .env.local`
- API routes not reading `.env.production`

## Solution

### 1. Make sure `.env.production` exists on server

```bash
cd /home/trinityoil/public_html
ls -la .env.production
```

If it doesn't exist, create it:
```bash
nano .env.production
```

Add:
```env
NODE_ENV=production
NEXTAUTH_URL=https://api.trinityoil.in
NEXTAUTH_SECRET=trinity-oil-mills-super-secret-key-2024-production
PORT=3001

# Database Configuration - UPDATE WITH YOUR SERVER CREDENTIALS
DATABASE_URL=mysql://your_db_username:your_db_password@localhost:3306/trinityoil_oil_shop_db_new

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_EMAIL_FROM=noreply@trinityoil.in
```

### 2. Code Changes (Already Fixed ✅)

The code has been updated to:
- Remove explicit `.env.local` loading in production
- Let Next.js automatically load `.env.production` when `NODE_ENV=production`

### 3. Restart PM2

After ensuring `.env.production` exists:

```bash
cd /home/trinityoil/public_html

# Pull latest code (with fixes)
git pull origin main

# Rebuild
npm run build

# Restart PM2
pm2 restart api.trinityoil.in

# Check logs
pm2 logs api.trinityoil.in --lines 50
```

### 4. Verify Environment Variables

Test the API:
```bash
curl http://localhost:3001/api/test-db-connection
```

Should show:
```json
{
  "success": true,
  "env": {
    "DATABASE_URL": "mysql://root:****@localhost:3306/...",
    "NODE_ENV": "production"
  }
}
```

## How Next.js Loads Environment Variables

Next.js automatically loads environment files in this order:
1. `.env.production.local` (highest priority, never committed)
2. `.env.production` (production only)
3. `.env.local` (local overrides, never committed)
4. `.env` (default, all environments)

When `NODE_ENV=production`, Next.js loads `.env.production` automatically.

## PM2 Configuration

`ecosystem.config.js` is configured to:
- Set `NODE_ENV=production`
- Load `.env.production` via `env_file: '.env.production'`

Make sure PM2 is reading the file:
```bash
pm2 show api.trinityoil.in
# Check "env" section
```

