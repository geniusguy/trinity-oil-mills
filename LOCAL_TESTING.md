# Local Testing Guide

## Setup for Local Testing

### 1. Create `.env` file for local development

Create a `.env` file in `public_html/` directory with your local database credentials:

```env
# Local Development Environment Variables
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=trinity-oil-mills-super-secret-key-2024-development
PORT=3001

# Database Configuration (use your local MySQL)
DATABASE_URL=mysql://root:your_local_password@localhost:3306/trinityoil_oil_shop_db_new

# Email Configuration (optional for local)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_EMAIL_FROM=noreply@trinityoil.in
```

### 2. Install Dependencies

```bash
cd public_html
npm install
```

### 3. Test Database Connection

```bash
# Test if DATABASE_URL is loaded correctly
node test-db-connection-simple.js

# Should show:
# ✅ Connection established!
# ✅ Test query successful
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

### 5. Test API Endpoints

**Test environment variables:**
```
http://localhost:3001/api/test-env
```

**Test database connection:**
```
http://localhost:3001/api/test-db-connection
```

**Test sales API:**
```
http://localhost:3001/api/sales
```

### 6. Test Pages

- Login: `http://localhost:3001/login`
- Dashboard: `http://localhost:3001/dashboard`
- Sales: `http://localhost:3001/dashboard/admin/sales`
- Retail Sales: `http://localhost:3001/dashboard/admin/sales/retail`
- Canteen Sales: `http://localhost:3001/dashboard/admin/sales/canteen`
- Canteen Addresses: `http://localhost:3001/dashboard/admin/canteen-addresses`

## Troubleshooting

### If DATABASE_URL is not found:
1. Check `.env` file exists in `public_html/` directory
2. Verify DATABASE_URL format: `mysql://user:password@host:port/database`
3. Check database is running: `mysql -u root -p`

### If pages show "Internal server error":
1. Check browser console (F12) for errors
2. Check terminal where `npm run dev` is running
3. Look for `[DB]` logs in the terminal
4. Test `/api/test-env` endpoint to see what Next.js sees

### If authentication fails:
1. Check `NEXTAUTH_SECRET` is set in `.env`
2. Check `NEXTAUTH_URL` matches your local URL
3. Clear browser cookies and try again

## Differences: Local vs Production

- **Local**: Uses `.env` file, `NODE_ENV=development`
- **Production**: Uses `.env.production` file, `NODE_ENV=production`
- **Local**: Next.js automatically loads `.env` file
- **Production**: `start-server.js` loads `.env.production` and passes to Next.js

