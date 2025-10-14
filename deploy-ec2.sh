#!/bin/bash
set -e

echo "Starting deployment..."

# Setup directories
cd /var/www/fisheries-demo 2>/dev/null || sudo mkdir -p /var/www/fisheries-demo
cd /var/www/fisheries-demo

# Backup old version
sudo mv dist dist.backup 2>/dev/null || true

# Extract new version
sudo unzip -o /tmp/deploy.zip
sudo mv package-prod.json package.json

# Install Node.js if needed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install dependencies
echo "Installing dependencies..."
sudo npm install --production

# Install PM2 if needed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Set permissions
sudo chown -R $USER:$USER /var/www/fisheries-demo
sudo chmod -R 755 /var/www/fisheries-demo

# Restart application
echo "Restarting application..."
pm2 delete fisheries-demo 2>/dev/null || true
pm2 start server.js --name fisheries-demo
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

# Install Nginx if needed
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
fi

# Configure Nginx
echo "Configuring Nginx..."
sudo mv /tmp/nginx-config /etc/nginx/sites-available/fisheries-demo
sudo ln -sf /etc/nginx/sites-available/fisheries-demo /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl enable nginx

# Cleanup
sudo rm -f /tmp/deploy.zip

echo ""
echo "========================================="
echo "  DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "========================================="
echo ""
pm2 status
