# 🚀 Deploy Thủ Công - Alternative Solution

## ⚠️ Khi Nào Dùng Cách Này?

Sử dụng khi:
- GitHub Actions không thể kết nối SSH (timeout)
- Security Group không thể mở ngay (chờ admin approval)
- Cần deploy nhanh không chờ được

## 📋 Yêu Cầu

- SSH key (.pem file) của EC2
- EC2 public IP
- Node.js & npm đã cài trên máy local

## 🎯 Cách 1: Deploy Trực Tiếp (Nhanh Nhất)

### Bước 1: Build Application

```bash
# Từ thư mục project
npm install
npm run build
```

### Bước 2: Tạo Server Files

Tạo file `server.js` trong thư mục project:

```javascript
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

Tạo file `package-prod.json`:

```json
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
```

### Bước 3: Package Files

```bash
# Windows (PowerShell)
Compress-Archive -Path dist\,server.js,package-prod.json -DestinationPath deploy.zip -Force

# Linux/Mac
zip -r deploy.zip dist/ server.js package-prod.json
```

### Bước 4: Upload to EC2

```bash
# Thay YOUR_KEY.pem và YOUR_EC2_IP bằng thông tin thực tế
scp -i YOUR_KEY.pem deploy.zip ubuntu@YOUR_EC2_IP:/tmp/
```

### Bước 5: Deploy on EC2

```bash
# SSH vào EC2
ssh -i YOUR_KEY.pem ubuntu@YOUR_EC2_IP

# Run deployment script
sudo mkdir -p /var/www/fisheries-demo
cd /var/www/fisheries-demo

# Backup old version
sudo mv dist dist.backup 2>/dev/null || true

# Extract new version
sudo unzip -o /tmp/deploy.zip
sudo mv package-prod.json package.json

# Install dependencies
sudo npm install --production

# Install PM2 if not exists
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Start/Restart application
pm2 delete fisheries-demo 2>/dev/null || true
pm2 start server.js --name fisheries-demo
pm2 save
pm2 startup
```

### Bước 6: Setup Nginx (nếu chưa có)

```bash
# Cài Nginx
sudo apt-get update
sudo apt-get install -y nginx

# Tạo config
sudo tee /etc/nginx/sites-available/fisheries-demo > /dev/null << 'EOF'
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
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/fisheries-demo /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl enable nginx
```

## 🎯 Cách 2: One-Command Deploy Script

Tạo file `manual-deploy.sh`:

```bash
#!/bin/bash

# Configuration
EC2_KEY="YOUR_KEY.pem"
EC2_USER="ubuntu"
EC2_HOST="YOUR_EC2_IP"

echo "=== Building Application ==="
npm run build

echo "=== Creating Deployment Package ==="
cat > server.js << 'EOF'
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
EOF

cat > package-prod.json << 'EOF'
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
EOF

zip -r deploy.zip dist/ server.js package-prod.json

echo "=== Uploading to EC2 ==="
scp -i $EC2_KEY deploy.zip $EC2_USER@$EC2_HOST:/tmp/

echo "=== Deploying on EC2 ==="
ssh -i $EC2_KEY $EC2_USER@$EC2_HOST << 'ENDSSH'
set -e

sudo mkdir -p /var/www/fisheries-demo
cd /var/www/fisheries-demo

sudo mv dist dist.backup 2>/dev/null || true
sudo unzip -o /tmp/deploy.zip
sudo mv package-prod.json package.json

sudo npm install --production

if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

pm2 delete fisheries-demo 2>/dev/null || true
pm2 start server.js --name fisheries-demo
pm2 save

echo "Deployment completed!"
pm2 status
ENDSSH

echo "=== Done! ==="
echo "Application is running at: http://$EC2_HOST"
```

Chạy script:

```bash
# Cấp quyền thực thi
chmod +x manual-deploy.sh

# Cập nhật EC2_KEY và EC2_HOST trong script
nano manual-deploy.sh

# Chạy deploy
./manual-deploy.sh
```

## 🎯 Cách 3: Deploy với PowerShell (Windows)

Tạo file `manual-deploy.ps1`:

```powershell
# Configuration
$EC2_KEY = "YOUR_KEY.pem"
$EC2_USER = "ubuntu"
$EC2_HOST = "YOUR_EC2_IP"

Write-Host "=== Building Application ===" -ForegroundColor Green
npm run build

Write-Host "=== Creating Server Files ===" -ForegroundColor Green
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

Write-Host "=== Creating Package ===" -ForegroundColor Green
Compress-Archive -Path dist\,server.js,package-prod.json -DestinationPath deploy.zip -Force

Write-Host "=== Uploading to EC2 ===" -ForegroundColor Green
scp -i $EC2_KEY deploy.zip ${EC2_USER}@${EC2_HOST}:/tmp/

Write-Host "=== Deploying on EC2 ===" -ForegroundColor Green
ssh -i $EC2_KEY ${EC2_USER}@${EC2_HOST} @"
cd /var/www/fisheries-demo
sudo unzip -o /tmp/deploy.zip
sudo mv package-prod.json package.json
sudo npm install --production
pm2 delete fisheries-demo 2>/dev/null || true
pm2 start server.js --name fisheries-demo
pm2 save
"@

Write-Host "=== Deployment Complete! ===" -ForegroundColor Green
Write-Host "Application running at: http://$EC2_HOST" -ForegroundColor Cyan
```

Chạy script:

```powershell
# Cập nhật EC2_KEY và EC2_HOST
notepad manual-deploy.ps1

# Chạy deploy
.\manual-deploy.ps1
```

## ✅ Kiểm Tra Sau Deploy

```bash
# SSH vào EC2
ssh -i YOUR_KEY.pem ubuntu@YOUR_EC2_IP

# Kiểm tra PM2
pm2 status

# Xem logs
pm2 logs fisheries-demo

# Kiểm tra Nginx
sudo systemctl status nginx

# Test application
curl http://localhost:3000
```

## 🔄 Update Sau Này

Khi cần update code:

```bash
# Build mới
npm run build

# Upload và deploy lại
scp -i YOUR_KEY.pem deploy.zip ubuntu@YOUR_EC2_IP:/tmp/
ssh -i YOUR_KEY.pem ubuntu@YOUR_EC2_IP
cd /var/www/fisheries-demo
sudo unzip -o /tmp/deploy.zip
pm2 restart fisheries-demo
```

## 📞 Troubleshooting

### Lỗi: Permission denied (scp)

```bash
# Kiểm tra quyền của key file
chmod 400 YOUR_KEY.pem
```

### Lỗi: Connection refused

```bash
# Kiểm tra Security Group - cần mở port 22 cho IP của bạn
# Hoặc dùng AWS Session Manager thay SSH
```

### Lỗi: Port 3000 in use

```bash
# SSH vào EC2
pm2 delete all
# hoặc
sudo lsof -ti:3000 | xargs kill -9
```

## 🎯 Sau Khi Deploy Thành Công

Truy cập: `http://YOUR_EC2_IP`

Ứng dụng sẽ chạy trên:
- Port 3000: Node.js application
- Port 80: Nginx reverse proxy

---

**Lưu ý:** Đây là giải pháp tạm thời. Nên fix Security Group để sử dụng GitHub Actions cho deployment tự động.
