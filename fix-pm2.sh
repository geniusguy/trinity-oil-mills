#!/bin/bash

# Fix PM2 Errored Status

echo "🔧 Fixing PM2 errored status..."
echo ""

# Navigate to directory
cd /home/trinityoil/public_html || cd /root/public_html

echo "Current directory: $(pwd)"
echo ""

# Delete errored process
echo "🗑️  Deleting errored process..."
pm2 delete api.trinityoil.in 2>/dev/null || echo "Process not found (OK)"
echo ""

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "⚠️  .env.production not found!"
    echo "Creating .env.production template..."
    cat > .env.production << EOF
NODE_ENV=production
NEXTAUTH_URL=https://api.trinityoil.in
NEXTAUTH_SECRET=trinity-oil-mills-super-secret-key-2024-production
PORT=3001

# Database Configuration - UPDATE WITH YOUR CREDENTIALS
DATABASE_URL=mysql://your_db_username:your_db_password@localhost:3306/trinityoil_oil_shop_db_new

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_EMAIL_FROM=noreply@trinityoil.in
EOF
    echo "✅ Created .env.production template"
    echo "⚠️  Please edit .env.production with your actual credentials:"
    echo "   nano .env.production"
    echo ""
fi

# Check if PORT is set in .env.production
if ! grep -q "PORT=3001" .env.production 2>/dev/null; then
    echo "⚠️  PORT=3001 not found in .env.production"
    echo "Adding PORT=3001..."
    echo "PORT=3001" >> .env.production
    echo "✅ Added PORT=3001"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if .next exists (build folder)
if [ ! -d ".next" ]; then
    echo "🔨 Building application..."
    npm run build
    echo ""
fi

# Start PM2
echo "🚀 Starting PM2..."
pm2 start ecosystem.config.js

echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "📋 Recent logs:"
pm2 logs api.trinityoil.in --lines 20 --nostream

echo ""
echo "✅ Done! Check the logs above for any errors."
echo ""
echo "If there are errors, check:"
echo "  1. .env.production has correct database credentials"
echo "  2. Port 3001 is not already in use"
echo "  3. Database is accessible"

