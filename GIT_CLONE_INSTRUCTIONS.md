# Git Clone Instructions for Server

## If Git Clone Works Successfully

After running:
```bash
git clone git@github.com:geniusguy/trinity-oil-mills.git .
```

You should see files being downloaded. Then continue with:

```bash
# 1. Install dependencies
npm install

# 2. Create .env.production file
nano .env.production
# Add your server credentials, save with Ctrl+X, Y, Enter

# 3. Build application
npm run build

# 4. Start with PM2
pm2 start ecosystem.config.js

# 5. Check status
pm2 status
```

## If Git Clone Fails - Use HTTPS Instead

If you get "Permission denied (publickey)" error, use HTTPS:

```bash
# Remove the failed attempt (if any)
rm -rf .git

# Clone using HTTPS (no SSH key needed)
git clone https://github.com/geniusguy/trinity-oil-mills.git .

# Then continue with npm install, build, etc.
```

## If Directory Already Has Files

If `/home/trinityoil/public_html` already has files:

### Option 1: Clone to a new directory first
```bash
cd /home/trinityoil
git clone git@github.com:geniusguy/trinity-oil-mills.git public_html_new
cd public_html_new
# Then move files or rename directories as needed
```

### Option 2: Initialize git in existing directory
```bash
cd /home/trinityoil/public_html
git init
git remote add origin git@github.com:geniusguy/trinity-oil-mills.git
git pull origin main --allow-unrelated-histories
```

### Option 3: Backup and replace
```bash
cd /home/trinityoil
mv public_html public_html_backup
git clone git@github.com:geniusguy/trinity-oil-mills.git public_html
```

## Complete Step-by-Step

```bash
# Step 1: Navigate to directory
cd /home/trinityoil/public_html

# Step 2: Clone (or use HTTPS if SSH fails)
git clone git@github.com:geniusguy/trinity-oil-mills.git .
# OR if SSH fails:
# git clone https://github.com/geniusguy/trinity-oil-mills.git .

# Step 3: Verify files are there
ls -la

# Step 4: Install dependencies
npm install

# Step 5: Create .env.production
nano .env.production
# Paste your server credentials, save

# Step 6: Build
npm run build

# Step 7: Start PM2
pm2 start ecosystem.config.js

# Step 8: Verify
pm2 status
pm2 logs api.trinityoil.in
```

