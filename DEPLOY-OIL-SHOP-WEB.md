# Deploy oil-shop-web only – step-by-step

Push **only** the `oil-shop-web` folder to Git, then on the server remove old files, pull, and run.

---

## Part 1: On your PC (push only oil-shop-web to Git)

Open PowerShell or terminal. Run these from the **repo root** (the folder that contains `oil-shop-web`), e.g. `D:\React\TrintyOilMills`.

### Step 1.1 – Go to repo root

```powershell
cd D:\React\TrintyOilMills
```

### Step 1.2 – Stage only the oil-shop-web folder

```powershell
git add oil-shop-web/
```

### Step 1.3 – Commit

```powershell
git commit -m "Update oil-shop-web - full sync"
```

If you see *"nothing to commit, working tree clean"*, there are no new changes under `oil-shop-web/`; you can skip to Part 2 (server).

### Step 1.4 – Push to GitHub

```powershell
git push origin main
```

Use your **GitHub Personal Access Token** as password if prompted (not your GitHub account password).  
If your branch is `master` instead of `main`, use:

```powershell
git push origin master
```

---

## Part 2: On the server (remove old files, pull, run)

SSH into your server, then run these steps. Replace `/path/to/oil-shop-web` with the **real path** where the app lives (e.g. `/home/trinityoil/public_html/oil-shop-web` or `/var/www/trinity-oil-mills/oil-shop-web`).

### Step 2.1 – SSH into the server

```bash
ssh your-user@your-server-ip
```

### Step 2.2 – Go to the parent folder of oil-shop-web

If your app is at `/home/trinityoil/public_html/oil-shop-web`, go to the parent:

```bash
cd /home/trinityoil/public_html
```

If your app is inside a repo that has more than oil-shop-web (e.g. `TrintyOilMills/oil-shop-web`):

```bash
cd /path/to/TrintyOilMills
```

### Step 2.3 – Remove the old oil-shop-web folder (keeps .env safe)

**Option A – Remove everything inside oil-shop-web except .env files (recommended)**

```bash
cd oil-shop-web
# List and remove everything except .env.production and .env.local
find . -mindepth 1 -maxdepth 1 ! -name '.env.production' ! -name '.env.local' ! -name '.env' -exec rm -rf {} +
cd ..
```

**Option B – Full delete and re-clone (use only if the whole project is just oil-shop-web)**

If the server repo is **only** oil-shop-web (no parent repo):

```bash
# Backup .env.production first!
cp oil-shop-web/.env.production ~/env.production.backup

rm -rf oil-shop-web
git clone https://github.com/MarketGaruda/trinity-oil-mills.git
cd trinity-oil-mills
# Restore env
cp ~/env.production.backup oil-shop-web/.env.production
cd oil-shop-web
```

Then continue from Step 2.5 below.

### Step 2.4 – Pull latest from Git (if you use a single repo that contains oil-shop-web)

If you have the full repo (e.g. TrintyOilMills) on the server:

```bash
git pull origin main
```

Or for `master`:

```bash
git pull origin master
```

### Step 2.5 – Go into oil-shop-web

```bash
cd oil-shop-web
```

### Step 2.6 – Install dependencies

```bash
npm install
```

### Step 2.7 – Build the app

```bash
npm run build
```

### Step 2.8 – Restart the app with PM2

If you already use PM2:

```bash
pm2 restart trinity-oil
```

Or if the app name is different, list and restart:

```bash
pm2 list
pm2 restart <app-name>
```

If you don’t use PM2 yet, start the app:

```bash
pm2 start start-server.js --name trinity-oil
```

Or run in foreground (for testing only):

```bash
npm start
```

### Step 2.9 – Check it’s running

```bash
pm2 status
pm2 logs trinity-oil --lines 30
```

Open your site in the browser (e.g. `https://yoursite.com`) and check the canteen-addresses page.

---

## Quick reference – server only (copy-paste)

Replace `BRANCH` with `main` or `master`. Replace `/path/to/parent` with the folder that **contains** `oil-shop-web`.

```bash
cd /path/to/parent
git pull origin BRANCH
cd oil-shop-web
npm install
npm run build
pm2 restart trinity-oil
```

---

## If .env.production was deleted

If you removed the whole folder and lost `.env.production`, create it again in `oil-shop-web/` with at least:

- `DATABASE_URL=mysql://user:password@host:3306/database_name`
- `AUTH_SECRET=your-secret`
- `NEXTAUTH_URL=https://your-domain.com`
- SMTP vars if you use email (e.g. backup, reset password)

Then run `npm run build` and `pm2 restart trinity-oil` again.
