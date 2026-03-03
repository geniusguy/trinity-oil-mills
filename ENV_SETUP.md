# Environment Variables Setup

## Overview
This project uses different environment files for local development and production:

- **Local Development**: Uses `.env` file
- **Production Server**: Uses `.env.production` file

## How It Works

### Local Development
When you run `npm run dev`, Next.js automatically:
1. Sets `NODE_ENV=development`
2. Loads environment files in this order:
   - `.env.local` (if exists, overrides others)
   - `.env.development` (if exists)
   - `.env` ✅ **Use this for local development**

### Production Server
When you run `npm start` (or `npm run build`), Next.js:
1. Sets `NODE_ENV=production`
2. Loads environment files in this order:
   - `.env.local` (if exists, overrides others)
   - `.env.production` ✅ **Use this for production**
   - `.env` (fallback)

The `start-server.js` script also explicitly loads `.env.production` before starting the server.

## Setup Instructions

### For Local Development:
1. Create a `.env` file in the `public_html` directory
2. Add your local development environment variables:
   ```env
   NODE_ENV=development
   DATABASE_URL=mysql://user:password@localhost:3306/database_name
   NEXTAUTH_URL=http://localhost:3001
   NEXTAUTH_SECRET=your-local-secret-key
   PORT=3001
   # ... other variables
   ```

### For Production Server:
1. Create a `.env.production` file in the `public_html` directory
2. Add your production environment variables:
   ```env
   NODE_ENV=production
   DATABASE_URL=mysql://user:password@production-host:3306/database_name
   NEXTAUTH_URL=https://api.trinityoil.in
   NEXTAUTH_SECRET=your-production-secret-key
   PORT=3001
   # ... other variables
   ```

## Important Notes

⚠️ **`.env.local` overrides all other env files!**
- If `.env.local` exists, it will override both `.env` and `.env.production`
- Use `.env.local` only for local overrides that should never be committed
- For normal local development, use `.env` instead

## File Priority (when multiple files exist)

**Development:**
1. `.env.local` (highest priority)
2. `.env.development`
3. `.env` (lowest priority)

**Production:**
1. `.env.local` (highest priority)
2. `.env.production`
3. `.env` (lowest priority)

## Commands

- `npm run dev` - Runs in development mode, uses `.env`
- `npm run build` - Builds for production, uses `.env.production`
- `npm start` - Runs production server, uses `.env.production`

