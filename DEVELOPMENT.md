# Trinity Oil Mills - Development Guide

## Local Development Setup

1. **Clone and setup:**
   ```bash
   git clone <repository>
   cd oil-shop-web
   npm install
   ```

2. **Environment Variables:**
   - `.env.local` - Local development
   - `.env.production` - Production server

3. **Database:**
   - Local: MySQL on localhost:3306
   - Production: MySQL on api.trinityoil.in:3306

## Development Workflow

1. **Work locally:**
   ```bash
   npm run dev
   ```

2. **Test changes:**
   ```bash
   npm run build
   npm start
   ```

3. **Deploy to server:**
   ```bash
   npm run deploy
   ```

## Server Details

- **Server:** api.trinityoil.in
- **Port:** 3001
- **Database:** trinityoil_oil_shop_db_new
- **PM2 Process:** api.trinityoil.in

## API Endpoints

- Health: `GET /api/health`
- Products: `GET /api/products`
- Inventory: `GET /api/inventory`
- Sales: `GET /api/sales`
- Auth: `POST /api/auth/signin`

## Database Connection

All endpoints now use the shared database utility:
```typescript
import { createConnection } from '@/lib/database';
const connection = await createConnection();
```

## Fixed Issues

✅ Database connection using environment variables
✅ All API endpoints updated to use shared database utility
✅ PM2 ecosystem configuration
✅ Deployment script
✅ Environment-specific configurations
