# 🚀 Hướng Dẫn Deployment

## Tổng Quan

Dự án này sử dụng GitHub Actions để tự động deploy lên EC2. Workflow đã được tối ưu hóa để xử lý các vấn đề thường gặp.

## ✅ Cải Tiến Trong Workflow Mới

1. **Error Handling**: `set -e` để dừng ngay khi có lỗi
2. **Backup**: Tự động backup version cũ trước khi deploy
3. **Idempotent**: Có thể chạy nhiều lần mà không gây lỗi
4. **PM2 Management**: Quản lý process tốt hơn với ecosystem.config.js
5. **Nginx Auto-Config**: Tự động cấu hình reverse proxy
6. **Manual Trigger**: Có thể trigger deployment thủ công

## 📋 Yêu Cầu GitHub Secrets

Đảm bảo các secrets sau đã được thêm vào GitHub repo (Settings → Secrets and variables → Actions):

| Secret Name | Mô Tả | Ví Dụ |
|-------------|-------|-------|
| `EC2_HOST` | IP hoặc domain của EC2 | `52.123.45.67` hoặc `example.com` |
| `EC2_USERNAME` | SSH username | `ubuntu` (Ubuntu) hoặc `ec2-user` (Amazon Linux) |
| `EC2_SSH_KEY` | Private SSH key | Nội dung file .pem |
| `EC2_PORT` | SSH port (optional) | `22` (mặc định) |

## 🔧 Cách Lấy SSH Key

```bash
# Trên máy tính local, xem nội dung private key
cat ~/.ssh/your-key.pem

# Copy toàn bộ nội dung (bao gồm -----BEGIN... và -----END...)
# Paste vào GitHub Secret EC2_SSH_KEY
```

## 🚀 Cách Deploy

### Tự Động (Khuyến nghị)

1. **Push lên branch main/master**:
   ```bash
   git add .
   git commit -m "Update deployment"
   git push origin main
   ```

2. **Trigger thủ công** (nếu cần):
   - Vào GitHub repo → Actions tab
   - Chọn workflow "Deploy to EC2"
   - Click "Run workflow" → "Run workflow"

### Kiểm Tra Deployment

1. Vào **Actions tab** trên GitHub
2. Xem workflow đang chạy
3. Click vào workflow để xem chi tiết logs
4. Nếu thành công, truy cập: `http://[EC2_HOST]`

## 🔍 Troubleshooting

### Lỗi: SSH Connection Failed

**Nguyên nhân**: SSH key hoặc host không đúng

**Giải pháp**:
```bash
# Test SSH connection từ local
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_EC2_HOST

# Nếu thành công, kiểm tra lại GitHub Secrets
# Đảm bảo EC2_SSH_KEY có đúng format:
# -----BEGIN RSA PRIVATE KEY-----
# ...
# -----END RSA PRIVATE KEY-----
```

### Lỗi: Permission Denied

**Nguyên nhân**: User không có quyền sudo

**Giải pháp**:
```bash
# SSH vào EC2 và kiểm tra
sudo whoami  # Should return 'root'

# Nếu bị lỗi, thêm user vào sudoers
sudo usermod -aG sudo ubuntu
```

### Lỗi: Port 3000 Already in Use

**Nguyên nhân**: Application cũ vẫn đang chạy

**Giải pháp**:
```bash
# SSH vào EC2
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_EC2_HOST

# Kiểm tra và kill process
pm2 delete fisheries-demo
# hoặc
sudo lsof -ti:3000 | xargs kill -9
```

### Lỗi: Nginx Configuration Failed

**Nguyên nhân**: Nginx config có lỗi syntax

**Giải pháp**:
```bash
# SSH vào EC2 và test config
sudo nginx -t

# Xem logs chi tiết
sudo tail -f /var/log/nginx/error.log
```

### Lỗi: Build Failed

**Nguyên nhân**: Dependencies hoặc code có lỗi

**Giải pháp**:
1. Kiểm tra logs trong GitHub Actions
2. Test build trên local:
   ```bash
   npm ci
   npm run build
   ```
3. Fix lỗi và push lại

## 📊 Kiểm Tra Trạng Thái Sau Deploy

```bash
# SSH vào EC2
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_EC2_HOST

# Kiểm tra PM2 status
pm2 status

# Xem logs application
pm2 logs fisheries-demo

# Kiểm tra Nginx status
sudo systemctl status nginx

# Test application
curl http://localhost:3000
```

## 🔄 Rollback Deployment

Nếu deployment mới có vấn đề:

```bash
# SSH vào EC2
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_EC2_HOST

cd /var/www/fisheries-demo

# Restore backup
sudo rm -rf dist
sudo mv dist.backup dist

# Restart application
pm2 restart fisheries-demo
```

## 🎯 Deploy Thủ Công (Backup Plan)

Nếu GitHub Actions không hoạt động, bạn có thể deploy thủ công:

```bash
# 1. Build trên local
npm run build

# 2. Tạo deployment package
zip -r deploy.zip dist/

# 3. Upload lên EC2
scp -i ~/.ssh/your-key.pem deploy.zip ubuntu@YOUR_EC2_HOST:/tmp/

# 4. SSH và deploy
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_EC2_HOST
cd /var/www/fisheries-demo
sudo unzip -o /tmp/deploy.zip
pm2 restart fisheries-demo
```

## 📱 Truy Cập Application

Sau khi deploy thành công:

- **HTTP**: `http://[EC2_HOST]`
- **Port**: 80 (Nginx reverse proxy → 3000)

## 🔐 Setup HTTPS (Optional)

Để setup HTTPS với Let's Encrypt:

```bash
# SSH vào EC2
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_EC2_HOST

# Install Certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Cập nhật server_name trong Nginx config
sudo nano /etc/nginx/sites-available/fisheries-demo
# Thay server_name _; bằng server_name your-domain.com;

# Lấy SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra GitHub Actions logs
2. SSH vào EC2 và xem PM2 logs: `pm2 logs fisheries-demo`
3. Kiểm tra Nginx logs: `sudo tail -f /var/log/nginx/error.log`
4. Xem deployment logs chi tiết trong workflow
