# Push only oil-shop-web to GitHub (repo root = oil-shop-web contents)

This makes the GitHub repo contain **only** the oil-shop-web folder contents at the **root** (no parent folder, no other files). The server can then clone and run `npm install` / `npm run build` from the repo root.

---

## Option A: Fresh clone and force-push (recommended)

Do this from your **PC** (Windows).

### 1. Create a temporary folder and clone the repo

```powershell
cd D:\React\TrintyOilMills
mkdir repo-oil-only
cd repo-oil-only
git clone https://github.com/geniusguy/trinity-oil-mills.git .
```

### 2. Remove everything except .git

```powershell
# Remove all files and folders except .git
Get-ChildItem -Force | Where-Object { $_.Name -ne '.git' } | Remove-Item -Recurse -Force
```

### 3. Copy oil-shop-web contents into this folder (so they become the root)

```powershell
Copy-Item -Path "..\oil-shop-web\*" -Destination "." -Recurse -Force
# Copy hidden files like .env.example if you want (optional)
# Copy-Item -Path "..\oil-shop-web\.gitignore" -Destination "." -Force
```

### 4. Remove oil-shop-web subfolder if it was copied inside itself

```powershell
# If you see an oil-shop-web folder inside, remove it
if (Test-Path "oil-shop-web") { Remove-Item -Path "oil-shop-web" -Recurse -Force }
```

### 5. Commit and force-push

```powershell
git add -A
git status
git commit -m "Repo root = oil-shop-web only"
git push origin main --force
```

### 6. On the server: clone fresh or reset and pull

**If the server folder is empty or you can re-clone:**

```bash
cd /var/www
rm -rf trinityoil-api
git clone https://github.com/geniusguy/trinity-oil-mills.git trinityoil-api
cd trinityoil-api
npm install
npm run build
# Add .env.production, then:
pm2 start start-server.js --name trinity-oil
```

**If you want to keep /var/www/trinityoil-api and just refresh:**

```bash
cd /var/www/trinityoil-api
git fetch origin main
git reset --hard origin/main
npm install
npm run build
pm2 restart trinity-oil
```

---

## Option B: From existing TrintyOilMills repo (single branch, replace history)

Run from **D:\React\TrintyOilMills** on your PC.

### 1. Create a new branch with no history (orphan)

```powershell
cd D:\React\TrintyOilMills
git checkout --orphan oil-shop-only
git rm -rf --cached . 2>$null; Remove-Item * -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item .* -Force -ErrorAction SilentlyContinue; Remove-Item .git -Recurse -Force -ErrorAction SilentlyContinue
```

That might be complex in PowerShell. **Option A is simpler.**

---

## Summary

- **Option A**: New folder → clone repo → delete all but .git → copy oil-shop-web contents into that folder → commit → force-push. Then on server: pull or re-clone; root will have package.json.
- After that, server always: `cd /var/www/trinityoil-api` (or whatever you named it) then `npm install`, `npm run build`, `pm2 restart trinity-oil`.
