# Fix Git Ownership Error on Server

## Problem
`fatal: detected dubious ownership in repository`

## Solution: Add Safe Directory

Run this command on your server:

```bash
git config --global --add safe.directory /home/trinityoil/public_html
```

## Then Continue with Pull

```bash
# Now pull will work
git pull origin main
```

## Complete Commands (Copy-Paste)

```bash
# Fix ownership issue
git config --global --add safe.directory /home/trinityoil/public_html

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build
npm run build

# Restart PM2
pm2 restart api.trinityoil.in

# Test
curl http://localhost:3001/api/test-db-connection
```

## Alternative: Fix Ownership (If you have root access)

```bash
# Change ownership to trinityoil user
chown -R trinityoil:trinityoil /home/trinityoil/public_html

# Then switch to trinityoil user
su - trinityoil
cd /home/trinityoil/public_html
git pull origin main
```

