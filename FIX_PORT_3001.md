# Fix Port 3001 on Server

## Problem
App is starting on port 3000 instead of 3001

## Solution

### On Server - Update .env.production

Make sure your `.env.production` file has:

```env
PORT=3001
NODE_ENV=production
NEXTAUTH_URL=https://api.trinityoil.in
```

### Update package.json start script (Already Done ✅)

The `start` script is now:
```json
"start": "next start -p 3001"
```

### Restart PM2

After updating, restart PM2:

```bash
# On server
cd /home/trinityoil/public_html

# Pull latest changes (if you updated package.json)
git pull origin main

# Restart PM2
pm2 restart api.trinityoil.in

# Check what port it's using
pm2 logs api.trinityoil.in | grep -i port
```

### Verify Port

```bash
# Check if port 3001 is in use
lsof -i :3001
# or
netstat -tulpn | grep 3001

# Check PM2 status
pm2 status

# Check logs
pm2 logs api.trinityoil.in
```

## Quick Fix Commands (Run on Server)

```bash
cd /home/trinityoil/public_html

# Update .env.production
nano .env.production
# Make sure PORT=3001 is set

# Pull latest code (if package.json was updated)
git pull origin main

# Restart PM2
pm2 restart api.trinityoil.in

# Verify
pm2 logs api.trinityoil.in --lines 20
```

## If Still Using Port 3000

Check:
1. `.env.production` has `PORT=3001`
2. `ecosystem.config.js` has `PORT: 3001` in env
3. `package.json` start script has `-p 3001`
4. PM2 is restarted after changes

