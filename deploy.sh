#!/bin/bash

# Trinity Oil Mills Deployment Script
echo "🚀 Starting deployment to Trinity Oil Mills server..."

# Server details
SERVER="root@api.trinityoil.in"
APP_DIR="/home/trinityoil/public_html/trinity-oil-mills/oil-shop-web"

# Build the application
echo "📦 Building application..."
npm run build

# Create deployment package
echo "📋 Creating deployment package..."
tar -czf trinity-oil-mills.tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  --exclude=.env.local \
  --exclude=.env.production \
  .

# Upload to server
echo "⬆️  Uploading to server..."
scp trinity-oil-mills.tar.gz $SERVER:/tmp/

# Deploy on server
echo "🔧 Deploying on server..."
ssh $SERVER << 'ENDSSH'
cd /home/trinityoil/public_html/trinity-oil-mills/oil-shop-web

# Backup current version
cp -r . ../oil-shop-web-backup-$(date +%Y%m%d-%H%M%S)

# Stop PM2
pm2 stop api.trinityoil.in

# Extract new version
cd ..
tar -xzf /tmp/trinity-oil-mills.tar.gz -C oil-shop-web/

# Install dependencies
cd oil-shop-web
npm install --production

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save

# Cleanup
rm /tmp/trinity-oil-mills.tar.gz

echo "✅ Deployment completed successfully!"
ENDSSH

# Cleanup local files
rm trinity-oil-mills.tar.gz

echo "🎉 Deployment completed!"
