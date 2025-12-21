# PM2 Start Commands - Fix Errored Status

## Current Status
Your PM2 process shows "errored" status. Here's how to fix it:

## Step 1: Delete the Errored Process

```bash
# Delete the errored process
pm2 delete api.trinityoil.in

# Or delete all processes
pm2 delete all
```

## Step 2: Navigate to Directory

```bash
cd /home/trinityoil/public_html
```

## Step 3: Check Prerequisites

```bash
# Make sure .env.production exists
ls -la .env.production

# If it doesn't exist, create it:
nano .env.production
# Add your server credentials including PORT=3001
```

## Step 4: Start with PM2

```bash
# Start using ecosystem.config.js
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs to see if it started correctly
pm2 logs api.trinityoil.in --lines 50
```

## Step 5: Save PM2 Configuration

```bash
# Save the process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# (Follow the command it outputs)
```

## Complete Fix Commands (Copy-Paste)

```bash
# Navigate to directory
cd /home/trinityoil/public_html

# Delete errored process
pm2 delete api.trinityoil.in

# Make sure .env.production exists and has PORT=3001
cat .env.production | grep PORT

# Start fresh
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs api.trinityoil.in --lines 30

# Save configuration
pm2 save
```

## Troubleshooting Errors

### If logs show port already in use:
```bash
# Find what's using port 3001
lsof -i :3001
# or
netstat -tulpn | grep 3001

# Kill the process
kill -9 <PID>

# Then restart PM2
pm2 restart api.trinityoil.in
```

### If logs show database connection error:
```bash
# Check .env.production has correct DATABASE_URL
cat .env.production | grep DATABASE_URL

# Edit if needed
nano .env.production
```

### If logs show build errors:
```bash
# Rebuild the application
npm run build

# Then restart PM2
pm2 restart api.trinityoil.in
```

### If logs show module not found:
```bash
# Reinstall dependencies
npm install

# Rebuild
npm run build

# Restart PM2
pm2 restart api.trinityoil.in
```

## Verify It's Running

```bash
# Check PM2 status (should show "online")
pm2 status

# Check logs (should show "Ready" and port 3001)
pm2 logs api.trinityoil.in --lines 20

# Test the application
curl http://localhost:3001/api/health
```

## Common PM2 Commands

```bash
pm2 status              # Show all processes
pm2 logs api.trinityoil.in    # View logs
pm2 restart api.trinityoil.in # Restart
pm2 stop api.trinityoil.in    # Stop
pm2 delete api.trinityoil.in  # Delete
pm2 monit              # Monitor in real-time
```

