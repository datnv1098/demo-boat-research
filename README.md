# Fisheries Analytics Demo

Ứng dụng phân tích thủy sản với giao diện hiện đại, được xây dựng bằng React + TypeScript + Vite.

## 🚀 Features

- **Data Quality & QC**: Kiểm tra chất lượng dữ liệu
- **Standardized CPUE**: Phân tích CPUE chuẩn hóa
- **Length & Biology**: Phân tích chiều dài và sinh học
- **Gear Selectivity**: Mô hình tính lọc lựa ngư cụ
- **Hotspot Mapping**: Bản đồ điểm nóng
- **Forecast & Alerts**: Dự báo và cảnh báo
- **What-if Simulator**: Mô phỏng kịch bản quản lý
- **AI Chatbot**: Trò chuyện với AI
- **Reports & Dashboards**: Báo cáo và bảng điều khiển
- **Data Mart & API**: Kho dữ liệu và API

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Library**: Tailwind CSS, shadcn/ui, Radix UI
- **Charts**: Recharts
- **Icons**: Lucide React

## 📦 Installation

```bash
# Clone repository
git clone <your-repo-url>
cd fisheries-analytics-demo

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🌐 Deploy to EC2 with GitHub Actions

### Bước 1: Chuẩn bị EC2 Instance

1. **Tạo EC2 instance** với Ubuntu 20.04 LTS
2. **Mở ports**: 22 (SSH), 80 (HTTP), 443 (HTTPS)
3. **Tạo key pair** và download file `.pem`

### Bước 2: Setup GitHub Secrets

Vào repository GitHub > Settings > Secrets and variables > Actions, thêm các secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `EC2_HOST` | IP address của EC2 instance | `54.123.456.789` |
| `EC2_USERNAME` | Username để SSH | `ubuntu` |
| `EC2_SSH_KEY` | Nội dung file .pem private key | `-----BEGIN RSA PRIVATE KEY-----...` |
| `EC2_PORT` | SSH port (mặc định 22) | `22` |

### Bước 3: Cấu hình SSH Key

```bash
# Trên máy local, copy nội dung private key
cat your-key.pem

# Copy toàn bộ nội dung (bao gồm -----BEGIN RSA PRIVATE KEY----- và -----END RSA PRIVATE KEY-----)
# Paste vào GitHub Secret EC2_SSH_KEY
```

### Bước 4: Cấu hình Domain (Optional)

Trong file `.github/workflows/deploy.yml`, thay đổi:
```yaml
server_name your-domain.com;  # Thay bằng domain của bạn
```

Hoặc sử dụng IP:
```yaml
server_name 54.123.456.789;  # IP của EC2
```

### Bước 5: Deploy

1. **Push code lên GitHub**:
```bash
git add .
git commit -m "Add deployment workflow"
git push origin main
```

2. **GitHub Actions sẽ tự động**:
   - Build ứng dụng
   - Upload lên EC2
   - Cài đặt dependencies
   - Setup Nginx + PM2
   - Khởi động ứng dụng

3. **Kiểm tra deploy**:
   - Vào GitHub > Actions tab để xem quá trình deploy
   - Truy cập `http://your-ec2-ip` hoặc domain

### Bước 6: Setup SSL (Optional)

```bash
# SSH vào EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Cài đặt Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Tạo SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Thêm dòng: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 Local Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run lint
```

## 📁 Project Structure

```
fisheries-analytics-demo/
├── src/
│   ├── components/ui/     # UI components
│   ├── lib/              # Utilities
│   ├── App.tsx           # Main component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── .github/workflows/    # GitHub Actions
├── public/               # Static assets
└── dist/                 # Build output
```

## 🐛 Troubleshooting

### Deploy không thành công?

1. **Kiểm tra GitHub Actions logs**
2. **SSH vào EC2 kiểm tra**:
```bash
# Kiểm tra PM2 processes
sudo pm2 list

# Kiểm tra logs
sudo pm2 logs fisheries-demo

# Kiểm tra Nginx
sudo nginx -t
sudo systemctl status nginx
```

### Không truy cập được website?

1. **Kiểm tra Security Groups** EC2 có mở port 80/443
2. **Kiểm tra Nginx config**:
```bash
sudo nano /etc/nginx/sites-available/fisheries-demo
```

### App không khởi động?

```bash
# Restart services
sudo pm2 restart fisheries-demo
sudo systemctl restart nginx
```

## 📝 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

Nếu gặp vấn đề, hãy tạo issue trong repository này.
