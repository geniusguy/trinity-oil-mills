# Files to Upload to Server

## Critical Files for Server Fix (Auth.js v5)

These files must be uploaded to fix the server configuration error:

### 1. **public_html/src/lib/auth.ts**
   - Updated for Auth.js v5 compatibility
   - Added `trustHost: true` for production
   - Added better error logging
   - Fixed TypeScript errors

### 2. **public_html/ecosystem.config.js**
   - Now loads `.env.production` and passes env vars to PM2
   - Explicitly sets `AUTH_SECRET`, `AUTH_URL`, `NEXTAUTH_URL` for Auth.js v5

### 3. **public_html/start-server.js**
   - Explicitly passes Auth.js v5 required environment variables
   - Sets `AUTH_SECRET`, `AUTH_URL`, `NEXTAUTH_URL` to Next.js process

### 4. **public_html/src/app/api/auth/[...nextauth]/route.ts**
   - Updated to use Auth.js v5 handlers export
   - Changed from NextAuth() wrapper to handlers export

---

## Additional Files Modified (Optional but Recommended)

### 5. **public_html/package.json**
   - Added `cross-env` for cross-platform env variable support
   - Added `uuid` and `@types/uuid` packages
   - Updated dev script to use `cross-env NODE_ENV=development`

### 6. **public_html/next.config.ts**
   - Added `allowedDevOrigins` for cross-origin requests
   - Removed invalid turbopack configuration

### 7. **public_html/src/app/icon.tsx**
   - Added `export const dynamic = 'force-dynamic'` to fix edge runtime warning

### 8. **public_html/src/app/apple-icon.tsx**
   - Added `export const dynamic = 'force-dynamic'` to fix edge runtime warning

---

## All API Route Files (Updated for Auth.js v5)

These files were updated to use `auth()` instead of `getServerSession()`:

- `public_html/src/app/api/admin/users/route.ts`
- `public_html/src/app/api/admin/create-user/route.ts`
- `public_html/src/app/api/admin/update-role/route.ts`
- `public_html/src/app/api/admin/reset-password/route.ts`
- `public_html/src/app/api/admin/canteen-addresses/route.ts`
- `public_html/src/app/api/admin/canteen-addresses/[id]/route.ts`
- `public_html/src/app/api/sales/route.ts`
- `public_html/src/app/api/sales/[id]/route.ts`
- `public_html/src/app/api/inventory/route.ts`
- `public_html/src/app/api/inventory/low-stock/route.ts`
- `public_html/src/app/api/inventory/adjustment/route.ts`
- `public_html/src/app/api/products/route.ts`
- `public_html/src/app/api/products/[id]/route.ts`
- `public_html/src/app/api/canteen-addresses/route.ts`
- `public_html/src/app/api/setup/database/route.ts`
- `public_html/src/app/api/test/stock-data/route.ts`
- `public_html/src/app/api/auth/reset-password/route.ts`
- `public_html/src/app/api/price-history/analytics/route.ts`
- `public_html/src/app/api/price-history/test/route.ts`
- `public_html/src/app/api/price-history/initialize/route.ts`
- `public_html/src/app/api/book-value/route.ts`
- `public_html/src/app/api/savings-investments/route.ts`
- `public_html/src/app/api/savings-investments/[id]/route.ts`
- `public_html/src/app/api/loans/route.ts`
- `public_html/src/app/api/loans/[id]/route.ts`
- `public_html/src/app/api/loans/payments/route.ts`
- `public_html/src/app/api/loans/[id]/payments/route.ts`
- `public_html/src/app/api/reports/gst-collection/route.ts`
- `public_html/src/app/api/reports/historical-pnl/route.ts`
- `public_html/src/app/api/price-history/raw-materials/route.ts`
- `public_html/src/app/api/price-history/products/route.ts`
- `public_html/src/app/api/expenses/route.ts`
- `public_html/src/app/api/expenses/[id]/route.ts`

---

## Minimum Required Files for Server Fix

**If you only want to fix the server error, upload these 4 files:**

1. ✅ `public_html/src/lib/auth.ts`
2. ✅ `public_html/ecosystem.config.js`
3. ✅ `public_html/start-server.js` ⚠️ **UPDATED - Now fixes .env vs .env.production issue**
4. ✅ `public_html/src/app/api/auth/[...nextauth]/route.ts`

## Additional File for Environment Fix

5. ✅ `public_html/fix-env-priority.sh` - Script to fix .env vs .env.production priority on server

---

## After Uploading Files

1. **SSH into your server:**
   ```bash
   ssh your-server
   cd /home/trinityoil/public_html
   ```

2. **Install new dependencies (if package.json was updated):**
   ```bash
   npm install
   ```

3. **Rebuild the application:**
   ```bash
   npm run build
   ```

4. **Restart PM2:**
   ```bash
   pm2 restart api.trinityoil.in
   ```

5. **Check logs:**
   ```bash
   pm2 logs api.trinityoil.in --lines 50
   ```

---

## Important: Environment Variables

Make sure your `.env.production` file on the server has:

```env
AUTH_SECRET=your-secret-key-here
# OR
NEXTAUTH_SECRET=your-secret-key-here

AUTH_URL=https://api.trinityoil.in
# OR
NEXTAUTH_URL=https://api.trinityoil.in

DATABASE_URL=mysql://user:password@host:3306/database
NODE_ENV=production
PORT=3001
```

