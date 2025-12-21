# Server Deployment Commands

## Step 1: Connect to Server via SSH

```bash
ssh trinityoil@api.trinityoil.in
# or
ssh trinityoil@your-server-ip
```

## Step 2: Navigate to public_html Directory

```bash
cd /home/trinityoil/public_html
```

## Step 3: Pull Latest Code from Git

```bash
# Pull latest changes
git pull origin main

# If repository doesn't exist yet, clone it:
# git clone git@github.com:geniusguy/trinity-oil-mills.git .
```

## Step 4: Install/Update Dependencies

```bash
# Install dependencies (if package.json changed)
npm install
```

## Step 5: Create .env.production File

```bash
# Create .env.production with your server credentials
nano .env.production
```

Add this content (update with your actual server credentials):
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

# Security
JWT_SECRET=trinity-oil-jwt-secret-2024-production
ENCRYPTION_KEY=trinity-oil-encryption-key-2024-production
```

Save: `Ctrl+X`, then `Y`, then `Enter`

## Step 6: Build the Application

```bash
npm run build
```

## Step 7: Start/Restart with PM2

```bash
# Start with PM2 (first time)
pm2 start ecosystem.config.js

# OR restart if already running
pm2 restart api.trinityoil.in

# Check status
pm2 status

# View logs
pm2 logs api.trinityoil.in
```

## Complete One-Time Setup Script

```bash
# Connect to server
ssh trinityoil@api.trinityoil.in

# Navigate to directory
cd /home/trinityoil/public_html

# Clone repository (first time only)
git clone git@github.com:geniusguy/trinity-oil-mills.git .

# Install dependencies
npm install

# Create .env.production (edit with your credentials)
nano .env.production

# Build
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## Future Updates (After Initial Setup)

```bash
# Connect to server
ssh trinityoil@api.trinityoil.in

# Navigate to directory
cd /home/trinityoil/public_html

# Pull latest code
git pull origin main

# Install new dependencies (if package.json changed)
npm install

# Rebuild
npm run build

# Restart application
pm2 restart api.trinityoil.in

# Check status
pm2 status
```

## Verify Deployment

```bash
# Check if app is running
pm2 status

# Check logs
pm2 logs api.trinityoil.in --lines 50

# Test health endpoint
curl http://localhost:3001/api/health
```

## Troubleshooting

### If git pull fails (SSH key not set up on server):
```bash
# Use HTTPS instead
git remote set-url origin https://github.com/geniusguy/trinity-oil-mills.git
git pull origin main
```

### If port 3001 is already in use:
```bash
# Find what's using the port
lsof -i :3001
# or
netstat -tulpn | grep 3001

# Kill the process if needed
kill -9 <PID>
```

### If build fails:
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### If PM2 shows errors:
```bash
# Delete and recreate
pm2 delete api.trinityoil.in
pm2 start ecosystem.config.js
```

## Important Notes

1. **First Time Setup**: Clone repository, install dependencies, create .env.production, build, start PM2
2. **Future Updates**: Just pull, install (if needed), build, restart PM2
3. **.env.production**: Never commit this file - it contains server secrets
4. **PM2**: Keeps your app running even after SSH disconnect
5. **Port 3001**: Make sure firewall allows this port if accessing directly

