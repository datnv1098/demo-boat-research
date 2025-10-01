# ========================================
# DEPLOY SCRIPT - FISHERIES DEMO
# ========================================

# Configuration
$EC2_KEY = "C:\Users\xdatg\Documents\EC2PEM.pem"
$EC2_USER = "ubuntu"
$EC2_HOST = "18.143.123.61"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYING FISHERIES DEMO TO EC2" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra EC2_HOST
if ($EC2_HOST -eq "YOUR_EC2_IP_HERE") {
    Write-Host "❌ ERROR: Bạn cần cập nhật EC2_HOST trong script!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Mở file deploy-now.ps1 và thay đổi dòng:" -ForegroundColor Yellow
    Write-Host '  $EC2_HOST = "YOUR_EC2_IP_HERE"' -ForegroundColor Yellow
    Write-Host "thành:" -ForegroundColor Yellow
    Write-Host '  $EC2_HOST = "52.123.45.67"  # IP thực tế của EC2' -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Test SSH connection
Write-Host "🔍 Testing SSH connection..." -ForegroundColor Yellow
$testConnection = ssh -i $EC2_KEY -o ConnectTimeout=5 -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_HOST} "echo 'Connection OK'" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Cannot connect to EC2!" -ForegroundColor Red
    Write-Host "Error: $testConnection" -ForegroundColor Red
    Write-Host ""
    Write-Host "Kiểm tra:" -ForegroundColor Yellow
    Write-Host "  1. EC2_HOST đúng chưa?" -ForegroundColor Yellow
    Write-Host "  2. Security Group đã mở port 22?" -ForegroundColor Yellow
    Write-Host "  3. EC2 instance đang chạy?" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host "✅ SSH connection successful!" -ForegroundColor Green
Write-Host ""

# Build application
Write-Host "📦 Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build completed!" -ForegroundColor Green
Write-Host ""

# Create server.js
Write-Host "📝 Creating server files..." -ForegroundColor Yellow
@"
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log('Server running on port ' + port);
});
"@ | Out-File -FilePath server.js -Encoding utf8

# Create package-prod.json
@"
{
  "name": "fisheries-demo",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
"@ | Out-File -FilePath package-prod.json -Encoding utf8

Write-Host "✅ Server files created!" -ForegroundColor Green
Write-Host ""

# Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
if (Test-Path deploy.zip) {
    Remove-Item deploy.zip -Force
}
Compress-Archive -Path dist\,server.js,package-prod.json -DestinationPath deploy.zip -Force
Write-Host "✅ Package created!" -ForegroundColor Green
Write-Host ""

# Upload to EC2
Write-Host "📤 Uploading to EC2..." -ForegroundColor Yellow
scp -i $EC2_KEY -o StrictHostKeyChecking=no deploy.zip ${EC2_USER}@${EC2_HOST}:/tmp/
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Upload completed!" -ForegroundColor Green
Write-Host ""

# Deploy on EC2
Write-Host "🚀 Deploying on EC2..." -ForegroundColor Yellow
$deployScript = @'
set -e

echo "Setting up directories..."
sudo mkdir -p /var/www/fisheries-demo
cd /var/www/fisheries-demo

echo "Backing up old version..."
sudo mv dist dist.backup 2>/dev/null || true

echo "Extracting new version..."
sudo unzip -o /tmp/deploy.zip
sudo mv package-prod.json package.json

echo "Installing Node.js if needed..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Installing dependencies..."
sudo npm install --production

echo "Installing PM2 if needed..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

echo "Setting permissions..."
sudo chown -R $USER:$USER /var/www/fisheries-demo
sudo chmod -R 755 /var/www/fisheries-demo

echo "Restarting application..."
pm2 delete fisheries-demo 2>/dev/null || true
pm2 start server.js --name fisheries-demo
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

echo "Installing Nginx if needed..."
if ! command -v nginx &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y nginx
fi

echo "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/fisheries-demo > /dev/null << 'NGINX_EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
NGINX_EOF

sudo ln -sf /etc/nginx/sites-available/fisheries-demo /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl enable nginx

echo "Cleaning up..."
sudo rm -f /tmp/deploy.zip

echo ""
echo "========================================="
echo "  DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "========================================="
echo ""
pm2 status
'@

ssh -i $EC2_KEY -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_HOST} $deployScript

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Application URL: http://${EC2_HOST}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 Check status:" -ForegroundColor Yellow
    Write-Host "  ssh -i $EC2_KEY ${EC2_USER}@${EC2_HOST}" -ForegroundColor Gray
    Write-Host "  pm2 status" -ForegroundColor Gray
    Write-Host "  pm2 logs fisheries-demo" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

# Cleanup local files
Write-Host "🧹 Cleaning up local files..." -ForegroundColor Yellow
Remove-Item server.js -Force -ErrorAction SilentlyContinue
Remove-Item package-prod.json -Force -ErrorAction SilentlyContinue
Remove-Item deploy.zip -Force -ErrorAction SilentlyContinue
Write-Host "✅ Cleanup completed!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ALL DONE! 🎉" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
