#!/bin/bash

# Complete Clone and Deploy Script
# Run this on your server

echo "🚀 Starting deployment..."
echo ""

# Navigate to public_html
cd /home/trinityoil/public_html || cd /root/public_html

echo "Current directory: $(pwd)"
echo ""

# Check if directory is empty or has files
if [ "$(ls -A . 2>/dev/null)" ]; then
    echo "⚠️  Directory is not empty"
    echo "Options:"
    echo "1. Backup existing files"
    echo "2. Clone to new directory"
    read -p "Choose option (1 or 2): " choice
    
    if [ "$choice" == "1" ]; then
        cd ..
        mv public_html public_html_backup_$(date +%Y%m%d_%H%M%S)
        mkdir public_html
        cd public_html
    elif [ "$choice" == "2" ]; then
        cd ..
        git clone git@github.com:geniusguy/trinity-oil-mills.git public_html_new || \
        git clone https://github.com/geniusguy/trinity-oil-mills.git public_html_new
        echo "Cloned to public_html_new directory"
        exit 0
    fi
fi

# Try SSH clone first, fallback to HTTPS
echo "📦 Cloning repository..."
if git clone git@github.com:geniusguy/trinity-oil-mills.git . 2>/dev/null; then
    echo "✅ Cloned using SSH"
else
    echo "⚠️  SSH failed, trying HTTPS..."
    git clone https://github.com/geniusguy/trinity-oil-mills.git .
    echo "✅ Cloned using HTTPS"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Building application..."
npm run build

echo ""
echo "🔄 Starting PM2..."
pm2 start ecosystem.config.js || pm2 restart api.trinityoil.in

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "📋 Next steps:"
echo "1. Create .env.production file: nano .env.production"
echo "2. Add your server database credentials"
echo "3. Restart PM2: pm2 restart api.trinityoil.in"

