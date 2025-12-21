# Test Database Connection

## How to Test Database Connection

### Option 1: Visit Test Page (Easiest)

1. **Open your browser and go to:**
   ```
   http://localhost:3001/test-db
   ```
   Or on production:
   ```
   https://api.trinityoil.in/test-db
   ```

2. **Click "Test Database Connection" button**

3. **View the results:**
   - ✅ Green = Connection successful
   - ❌ Red = Connection failed
   - Shows database info, user count, password test results

### Option 2: Use API Endpoint Directly

**In browser or curl:**
```bash
# Local
curl http://localhost:3001/api/test-db-connection

# Production
curl https://api.trinityoil.in/api/test-db-connection
```

**Or visit in browser:**
```
http://localhost:3001/api/test-db-connection
```

### Option 3: Test from Server Terminal

```bash
# On server
cd /home/trinityoil/public_html

# Test API endpoint
curl http://localhost:3001/api/test-db-connection

# Or with formatting
curl http://localhost:3001/api/test-db-connection | python -m json.tool
```

## What the Test Shows

- ✅ **Connection Status** - Whether database connection works
- 📊 **Users Count** - Total users in database
- 👤 **Admin User** - Whether admin@trinityoil.com exists
- 🔐 **Password Test** - Whether password "admin@123" matches
- 🔧 **Environment** - Shows DATABASE_URL (masked) and NODE_ENV
- ⚙️ **Config** - Database connection details

## Troubleshooting

### If connection fails:
1. Check `.env.production` has correct `DATABASE_URL`
2. Verify MySQL is running: `systemctl status mysql`
3. Test MySQL connection: `mysql -u username -p database_name`

### If password test fails:
Run the password update script:
```bash
node update-password-server.js
```

### If page shows 404:
Make sure you've pulled latest code:
```bash
git pull origin main
npm run build
pm2 restart api.trinityoil.in
```

