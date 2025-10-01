# 🔧 Sửa Lỗi SSH Timeout - Security Group Configuration

## 🚨 Vấn Đề

Lỗi: `dial tcp ***:***: i/o timeout`

**Nguyên nhân**: GitHub Actions không thể kết nối SSH đến EC2 instance vì Security Group chặn traffic.

## ✅ Giải Pháp: Cấu Hình Security Group

### Bước 1: Truy Cập AWS Console

1. Đăng nhập vào [AWS Console](https://console.aws.amazon.com/)
2. Chọn region đang chạy EC2 instance của bạn (góc trên bên phải)
3. Vào **EC2 Dashboard**

### Bước 2: Tìm Security Group

1. Trong menu bên trái, chọn **Instances**
2. Click vào EC2 instance của bạn
3. Tab **Security** → Click vào **Security group** name (ví dụ: `launch-wizard-1`)

### Bước 3: Thêm Inbound Rules

Click vào tab **Inbound rules** → **Edit inbound rules** → **Add rule**

#### Cấu hình SSH Access cho GitHub Actions:

| Type | Protocol | Port Range | Source | Description |
|------|----------|------------|--------|-------------|
| SSH | TCP | 22 | `0.0.0.0/0` | Allow SSH from GitHub Actions |
| HTTP | TCP | 80 | `0.0.0.0/0` | Allow HTTP traffic |
| Custom TCP | TCP | 3000 | `0.0.0.0/0` | Allow Node.js app (optional) |

**⚠️ Lưu ý bảo mật**:
- `0.0.0.0/0` cho phép kết nối từ mọi IP (cần thiết cho GitHub Actions)
- Sau khi test thành công, bạn có thể giới hạn IP ranges của GitHub Actions

### Bước 4: Kiểm Tra Network ACL (nếu cần)

1. Trong menu bên trái EC2, chọn **Network ACLs**
2. Tìm ACL gắn với subnet của EC2 instance
3. Kiểm tra **Inbound rules** và **Outbound rules**
4. Đảm bảo có rules cho phép SSH (port 22)

## 🔍 Cách Test SSH Connection

### Test từ máy local:

```bash
# Thay thế với thông tin của bạn
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_EC2_IP

# Nếu thành công, bạn sẽ thấy:
# Welcome to Ubuntu...
```

### Test với timeout command:

```bash
# Test với timeout 10 giây
timeout 10 ssh -i ~/.ssh/your-key.pem -o ConnectTimeout=5 ubuntu@YOUR_EC2_IP echo "Success"

# Nếu timeout, kiểm tra lại Security Group
```

## 🎯 GitHub Actions IP Ranges (Optional - Bảo mật cao hơn)

Nếu muốn giới hạn SSH access chỉ cho GitHub Actions:

1. Tải danh sách IP của GitHub: https://api.github.com/meta
2. Tìm mục `actions` trong JSON response
3. Thêm từng IP range vào Security Group

**Ví dụ IP ranges** (có thể thay đổi):
```
13.64.0.0/16
13.65.0.0/16
13.66.0.0/16
...
```

## 🛠️ Troubleshooting

### Lỗi: Connection refused

**Nguyên nhân**: SSH service không chạy trên EC2

**Giải pháp**:
```bash
# SSH vào EC2 qua AWS Console (Session Manager)
sudo systemctl status sshd
sudo systemctl start sshd
sudo systemctl enable sshd
```

### Lỗi: Permission denied (publickey)

**Nguyên nhân**: SSH key không đúng

**Giải pháp**:
1. Kiểm tra lại GitHub Secret `EC2_SSH_KEY`
2. Đảm bảo copy đúng private key (bao gồm `-----BEGIN...` và `-----END...`)
3. Key phải match với key pair đã gắn vào EC2 instance

### Lỗi: Host key verification failed

**Nguyên nhân**: Host key mismatch

**Giải pháp**: Thêm vào workflow:
```yaml
- name: Deploy to EC2
  uses: appleboy/ssh-action@master
  with:
    host: ${{ secrets.EC2_HOST }}
    username: ${{ secrets.EC2_USERNAME }}
    key: ${{ secrets.EC2_SSH_KEY }}
    port: 22
    script_stop: false  # Thêm dòng này
    script: |
      ...
```

## ✅ Checklist Hoàn Thành

Sau khi cấu hình Security Group, kiểm tra:

- [ ] SSH port 22 đã được mở trong Security Group
- [ ] HTTP port 80 đã được mở
- [ ] Test SSH từ local thành công
- [ ] GitHub Secrets đã được cấu hình đúng:
  - [ ] EC2_HOST (IP public của EC2)
  - [ ] EC2_USERNAME (ubuntu hoặc ec2-user)
  - [ ] EC2_SSH_KEY (private key đầy đủ)
  - [ ] EC2_PORT (22)
- [ ] Push code lên GitHub và trigger workflow
- [ ] Workflow chạy thành công không có timeout

## 🚀 Sau Khi Fix

1. **Commit và push changes**:
   ```bash
   git add .github/workflows/deploy.yml
   git commit -m "Fix SSH timeout with improved security group config"
   git push origin main
   ```

2. **Trigger workflow**:
   - Vào GitHub repo → Actions tab
   - Click "Deploy to EC2" workflow
   - Click "Run workflow"

3. **Xem logs**:
   - Workflow sẽ chạy step "Test SSH Connection" trước
   - Nếu thành công, tiếp tục deployment
   - Nếu vẫn timeout, kiểm tra lại Security Group

## 📞 Hỗ Trợ Thêm

Nếu vẫn gặp vấn đề:

1. **Kiểm tra VPC và Subnet**:
   - EC2 instance phải ở public subnet
   - Route table có route đến Internet Gateway

2. **Kiểm tra Instance State**:
   - Instance đang chạy (running state)
   - Public IP đã được gán

3. **Kiểm tra AWS Systems Manager**:
   - Có thể dùng Session Manager để SSH vào EC2
   - Không cần mở port 22 nếu dùng Session Manager

4. **Alternative: Sử dụng Elastic IP**:
   - Gán Elastic IP cho EC2 để có IP cố định
   - Update `EC2_HOST` secret với Elastic IP

## 🔐 Best Practices Bảo Mật

Sau khi deployment hoạt động:

1. **Giới hạn SSH access**:
   - Thay `0.0.0.0/0` bằng IP specific
   - Sử dụng VPN hoặc Bastion Host

2. **Enable CloudWatch Logs**:
   - Monitor SSH login attempts
   - Alert khi có suspicious activity

3. **Rotate SSH Keys định kỳ**:
   - Tạo key pair mới
   - Update GitHub Secrets
   - Xóa key cũ

4. **Enable MFA cho AWS Console**:
   - Bảo vệ tài khoản AWS
   - Ngăn chặn unauthorized access
