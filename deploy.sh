#!/bin/bash

# Script deploy manual cho Fisheries Analytics Demo
# Sử dụng: ./deploy.sh

echo "🚀 Starting deployment process..."

# Kiểm tra biến môi trường
if [ -z "$EC2_HOST" ] || [ -z "$EC2_USER" ] || [ -z "$EC2_KEY" ]; then
    echo "❌ Missing environment variables!"
    echo "Please set: EC2_HOST, EC2_USER, EC2_KEY"
    echo "Example:"
    echo "export EC2_HOST=54.123.456.789"
    echo "export EC2_USER=ubuntu"
    echo "export EC2_KEY=/path/to/your-key.pem"
    exit 1
fi

# Build ứng dụng
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Tạo package deployment
echo "📋 Creating deployment package..."
tar -czf deploy.tar.gz dist/ package.json package-lock.json

# Upload lên server
echo "📤 Uploading to server..."
scp -i "$EC2_KEY" deploy.tar.gz "$EC2_USER@$EC2_HOST":/tmp/

# Deploy trên server
echo "🔧 Deploying on server..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << 'EOF'
    # Tạo thư mục app
    sudo mkdir -p /var/www/fisheries-demo
    cd /var/www/fisheries-demo
    
    # Backup bản cũ
    sudo mkdir -p backup
    sudo mv dist backup/ 2>/dev/null || true
    
    # Giải nén bản mới
    sudo tar -xzf /tmp/deploy.tar.gz
    sudo chown -R www-data:www-data /var/www/fisheries-demo
    sudo chmod -R 755 /var/www/fisheries-demo
    
    # Tạo server.js nếu chưa có
    if [ ! -f server.js ]; then
        sudo tee server.js > /dev/null <<EOJS
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// Handle React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});
EOJS
    fi
    
    # Cài đặt dependencies
    sudo npm install express 2>/dev/null || echo "Express already installed"
    
    # Restart PM2
    sudo pm2 delete fisheries-demo 2>/dev/null || true
    sudo pm2 start server.js --name fisheries-demo
    sudo pm2 save
    
    echo "✅ Deployment completed!"
EOF

# Cleanup
rm -f deploy.tar.gz

echo "🎉 Deployment finished successfully!"
echo "🌐 Visit: http://$EC2_HOST"
