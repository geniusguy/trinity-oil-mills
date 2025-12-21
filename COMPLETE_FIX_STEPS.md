# Complete Fix Steps

## Step 1: LOCAL - Push Fixed Code to Git

The code fixes need to be pushed to Git first:

```powershell
# Navigate to public_html
cd D:\React\TrintyOilMills\public_html

# Add Git to PATH (if needed)
$gitDir = "C:\Users\wemar\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd"
$env:Path = "$gitDir;$env:Path"

# Add all files (except .env files)
git add .

# Commit the fixes
git commit -m "Fix .env.production loading in production"

# Push to GitHub
git push origin main
```

## Step 2: SERVER - Pull and Deploy

After pushing, run on server:

```bash
# Navigate to directory
cd /home/trinityoil/public_html

# Pull latest code (with fixes)
git pull origin main

# Make sure .env.production exists (if not already)
nano .env.production
# Add DATABASE_URL if missing

# Rebuild application
npm run build

# Restart PM2
pm2 restart api.trinityoil.in

# Test database connection
curl http://localhost:3001/api/test-db-connection
```

## Summary

✅ **YES - Push to Git first** (the code fixes)
✅ **THEN - Pull on server** (to get the fixes)
✅ **Make sure .env.production exists** (already on server, not in Git)

The `.env.production` file stays on the server (it's in .gitignore), but the code changes need to be pushed to Git.

