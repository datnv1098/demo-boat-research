# PowerShell script to manually upload Thai Fisheries app to EC2
# Usage: .\upload-to-ec2.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$KeyPath,
    [string]$Host = "52.221.183.228",
    [string]$User = "ubuntu"
)

Write-Host "🚀 Uploading Thai Fisheries Analytics to EC2..." -ForegroundColor Green

# Upload zip file
Write-Host "📤 Uploading application files..." -ForegroundColor Yellow
scp -i $KeyPath thai-fisheries-app.zip $User@${Host}:/tmp/

# Deploy via SSH
Write-Host "⚙️ Configuring nginx and deploying app..." -ForegroundColor Yellow
ssh -i $KeyPath $User@$Host @"
    # Create web directory
    sudo mkdir -p /var/www/thai-fisheries
    
    # Extract application
    cd /var/www/thai-fisheries
    sudo unzip -o /tmp/thai-fisheries-app.zip
    sudo chown -R www-data:www-data /var/www/thai-fisheries
    
    # Configure nginx
    sudo tee /etc/nginx/sites-available/thai-fisheries > /dev/null <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    root /var/www/thai-fisheries;
    index index.html;
    
    server_name _;
    
    location / {
        try_files \\\$uri \\\$uri/ /index.html;
    }
}
EOF
    
    # Enable site
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo ln -sf /etc/nginx/sites-available/thai-fisheries /etc/nginx/sites-enabled/
    
    # Test and reload nginx
    sudo nginx -t
    sudo systemctl reload nginx
    
    echo "✅ Thai Fisheries Analytics deployed successfully!"
"@

Write-Host "🎉 Deployment completed!" -ForegroundColor Green
Write-Host "🌐 Visit: http://$Host" -ForegroundColor Cyan
