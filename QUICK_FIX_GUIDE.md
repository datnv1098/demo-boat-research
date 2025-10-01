# ⚡ Quick Fix Guide - SSH Timeout Error

## 🔴 Lỗi Hiện Tại
```
dial tcp ***:***: i/o timeout
```

## ✅ 3 Bước Fix Nhanh

### 1️⃣ Fix Security Group trên AWS (BẮT BUỘC)

**Vào AWS Console:**
1. EC2 Dashboard → Instances → Click vào instance của bạn
2. Tab **Security** → Click vào **Security group name**
3. **Edit inbound rules** → **Add rule**

**Thêm rules sau:**

| Type | Port | Source | Description |
|------|------|--------|-------------|
| SSH | 22 | 0.0.0.0/0 | GitHub Actions SSH |
| HTTP | 80 | 0.0.0.0/0 | Web traffic |

4. Click **Save rules**

### 2️⃣ Test SSH Connection

Từ máy local:
```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

Nếu kết nối thành công → Sang bước 3

### 3️⃣ Commit & Push Code

```bash
git add .
git commit -m "Fix SSH timeout and improve deployment"
git push origin main
```

## 🚀 Trigger Deployment

**Cách 1: Tự động** (khi push code)
- Workflow sẽ tự động chạy khi push lên branch main

**Cách 2: Thủ công**
1. Vào GitHub repo → **Actions** tab
2. Click workflow **"Deploy to EC2"**
3. Click **"Run workflow"** → **"Run workflow"**

## 📊 Kiểm Tra Kết Quả

**Trong GitHub Actions:**
1. Xem workflow đang chạy
2. Kiểm tra step "Test SSH Connection" - phải SUCCESS ✅
3. Nếu step này fail → Kiểm tra lại Security Group
4. Nếu SUCCESS → Deployment sẽ tiếp tục tự động

**Sau khi deploy xong:**
- Truy cập: `http://[EC2_IP]`
- Ứng dụng sẽ hiển thị

## 🔍 Nếu Vẫn Gặp Lỗi

### Lỗi: Connection timeout
→ **Xem file:** `SECURITY_GROUP_FIX.md` (hướng dẫn chi tiết)

### Lỗi: Permission denied
→ Kiểm tra GitHub Secrets:
- `EC2_SSH_KEY` phải có format đúng (bao gồm `-----BEGIN...` và `-----END...`)

### Lỗi: Build failed
→ Test build local:
```bash
npm ci
npm run build
```

## 📞 Quick Support

**Security Group Issues:**
```bash
# Test từ local
ssh -v -i your-key.pem ubuntu@YOUR_EC2_IP

# Xem logs chi tiết để debug
```

**GitHub Secrets Check:**
- EC2_HOST: IP public (VD: 52.123.45.67)
- EC2_USERNAME: ubuntu (hoặc ec2-user)
- EC2_SSH_KEY: Toàn bộ nội dung file .pem
- EC2_PORT: 22

## 🎯 Expected Result

Sau khi hoàn thành:
- ✅ GitHub Actions workflow chạy thành công
- ✅ Application deploy lên EC2
- ✅ Truy cập được qua: http://[EC2_IP]
- ✅ Nginx reverse proxy hoạt động
- ✅ PM2 quản lý process

## 📚 Tài Liệu Chi Tiết

- `SECURITY_GROUP_FIX.md` - Fix SSH timeout chi tiết
- `DEPLOYMENT.md` - Hướng dẫn deployment đầy đủ
- `.github/workflows/deploy.yml` - Workflow configuration

---

**Lưu ý:** Sau khi Security Group được cấu hình đúng, mọi deployment tiếp theo sẽ tự động và không cần fix lại.
