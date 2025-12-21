# Update Admin Password on Server

## Problem
App is running but login shows "invalid email and password"

## Solution: Update Password on Server Database

### Option 1: Use the Script (Easiest)

```bash
# On your server
cd /home/trinityoil/public_html

# Run the password update script
node update-password-server.js
```

This will:
- Read DATABASE_URL from .env.production
- Connect to server database
- Update admin password to `admin@123`
- Verify the update worked

### Option 2: Generate SQL and Run Manually

```bash
# On server, generate password hash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('admin@123', 10).then(h => console.log(h))"
```

Then run SQL:
```sql
UPDATE users SET password = '<generated_hash>' WHERE email = 'admin@trinityoil.com';
```

### Option 3: Direct SQL Update

If you have MySQL access:

```bash
# Connect to MySQL
mysql -u your_db_user -p trinityoil_oil_shop_db_new

# Generate hash first (in Node.js)
node -e "require('bcryptjs').hash('admin@123', 10).then(console.log)"
# Copy the hash output

# Then in MySQL:
UPDATE users SET password = '<paste_hash_here>' WHERE email = 'admin@trinityoil.com';
```

## Verify Password Update

After updating, test login:
- Email: `admin@trinityoil.com`
- Password: `admin@123`

## Troubleshooting

### If script fails - check .env.production:
```bash
# Check DATABASE_URL exists
cat .env.production | grep DATABASE_URL

# Edit if needed
nano .env.production
```

### If database connection fails:
- Verify DATABASE_URL in .env.production is correct
- Check MySQL is running: `systemctl status mysql`
- Test connection: `mysql -u username -p database_name`

### If user not found:
```sql
-- Check if user exists
SELECT * FROM users WHERE email = 'admin@trinityoil.com';

-- If not, create admin user
INSERT INTO users (id, email, password, name, role, created_at, updated_at) 
VALUES ('admin-001', 'admin@trinityoil.com', '<hashed_password>', 'Admin User', 'admin', NOW(), NOW());
```

