#!/bin/bash

# Server Deployment Script
# Run this on your server after SSH connection

echo "🚀 Starting deployment..."
echo ""

# Navigate to public_html
cd /home/trinityoil/public_html

# Check if git repository exists
if [ ! -d ".git" ]; then
    echo "📦 Cloning repository..."
    git clone git@github.com:geniusguy/trinity-oil-mills.git .
else
    echo "📥 Pulling latest changes..."
    git pull origin main
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Building application..."
npm run build

echo ""
echo "🔄 Restarting PM2..."
pm2 restart api.trinityoil.in || pm2 start ecosystem.config.js

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "📋 Recent logs:"
pm2 logs api.trinityoil.in --lines 10 --nostream

