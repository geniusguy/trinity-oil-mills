# You're Already on the Server!

## Your Current Situation
- You're logged in as **root** user
- You're in `/root/public_html` or similar directory
- You DON'T need to SSH again!

## Important: Run as trinityoil User (Recommended)

PM2 should run as the `trinityoil` user, not root. Here's what to do:

### Option 1: Switch to trinityoil User (Recommended)

```bash
# Switch to trinityoil user
su - trinityoil

# Navigate to public_html
cd /home/trinityoil/public_html

# Now run deployment commands as trinityoil user
```

### Option 2: Run as Root (If trinityoil user doesn't exist)

```bash
# You're already root, just navigate to correct directory
cd /home/trinityoil/public_html
# or if that doesn't exist:
cd /root/public_html
```

## First Time Setup Commands

```bash
# 1. Navigate to public_html (as trinityoil user)
cd /home/trinityoil/public_html

# 2. Clone repository (if first time)
git clone git@github.com:geniusguy/trinity-oil-mills.git .

# OR if already cloned, just pull:
git pull origin main

# 3. Install dependencies
npm install

# 4. Create .env.production
nano .env.production
# Add your server database credentials
# Save: Ctrl+X, Y, Enter

# 5. Build
npm run build

# 6. Start PM2
pm2 start ecosystem.config.js

# 7. Check status
pm2 status
```

## Future Updates

```bash
# Navigate to directory
cd /home/trinityoil/public_html

# Pull latest code
git pull origin main

# Install dependencies (if package.json changed)
npm install

# Rebuild
npm run build

# Restart PM2
pm2 restart api.trinityoil.in

# Check status
pm2 status
```

## Troubleshooting

### If git clone fails (SSH key not set up):
```bash
# Use HTTPS instead
git clone https://github.com/geniusguy/trinity-oil-mills.git .
```

### If trinityoil user doesn't exist:
```bash
# Create the user
useradd -m -s /bin/bash trinityoil

# Set password
passwd trinityoil

# Switch to user
su - trinityoil
```

### Check current directory:
```bash
pwd
```

### Check current user:
```bash
whoami
```

