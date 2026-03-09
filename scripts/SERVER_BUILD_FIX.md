# Fix server npm run build (13 errors)

If the server build fails with:
- `> 2 seconds` parse error in `admin/performance/page.tsx`
- `SecurityEventType` / `SecuritySeverity` not found in `@/config/security`
- `orderStatusHistory` / `productionBatches` / `qualityControl` / `productionMaterials` not found in `@/db/schema`

do one of the following.

---

## Option 1: Run fix script on the server

From the **app root** (the folder that contains `src/` and `package.json`):

```bash
cd /var/www/trinityoil-api
# If your app is inside oil-shop-web subfolder, use:
# cd /var/www/trinityoil-api/oil-shop-web
bash scripts/fix-server-build.sh
```

This fixes the performance page JSX. If you still get security/schema errors, use Option 2.

---

## Option 2: Copy fixed files from your PC to the server

On your PC, the fixed files are in `oil-shop-web/src/`. Copy these to the server (same paths under the app root):

1. **src/config/security.ts** – must export `SecurityEventType` and `SecuritySeverity`
2. **src/db/schema.ts** – must export `orderStatusHistory`, `productionBatches`, `productionMaterials`, `qualityControl`
3. **src/app/admin/performance/page.tsx** – the line with `> 2 seconds` must be `{'>'} 2 seconds`

Example with SCP (from your PC, adjust paths and user/host):

```bash
scp oil-shop-web/src/config/security.ts user@server:/var/www/trinityoil-api/src/config/
scp oil-shop-web/src/db/schema.ts user@server:/var/www/trinityoil-api/src/db/
scp oil-shop-web/src/app/admin/performance/page.tsx user@server:/var/www/trinityoil-api/src/app/admin/performance/
```

Then on the server:

```bash
cd /var/www/trinityoil-api
npm run build
pm2 restart trinity-oil
```

---

## Option 3: One-line fix for performance page only (on server)

If you only have the `> 2 seconds` error, run on the server:

```bash
cd /var/www/trinityoil-api
sed -i "s/> 2 seconds/{'>'} 2 seconds/g" src/app/admin/performance/page.tsx
```

(Use `sed -i.bak` if your sed requires a backup suffix.)

---

## Option 4: Ensure git has the fixes and pull on the server

1. On your PC, commit and push the latest `oil-shop-web` (including the fixes) to the repo the server uses (e.g. geniusguy/trinity-oil-mills).
2. On the server:
   ```bash
   cd /var/www/trinityoil-api
   git pull origin main
   npm run build
   pm2 restart trinity-oil
   ```

If the server repo layout is “app at root” (e.g. geniusguy/trinity-oil-mills with `src/` at root), push the **contents** of `oil-shop-web` into that repo’s root so that `src/config/security.ts`, `src/db/schema.ts`, and `src/app/admin/performance/page.tsx` are the fixed versions.
