# Tài liệu Quy trình Deploy và Khắc phục sự cố Demo Boat Research

Tài liệu này ghi lại chi tiết các bước đã thực hiện để deploy ứng dụng `fisheries-analytics-demo` lên AWS EC2 và cấu hình domain `demo.boatresearch.site`.

## 1. Chuẩn bị Môi trường Máy Local (Local Environment Prep)

Trước khi deploy code lên server, chúng ta đã phát hiện và xử lý một số vấn đề về tương thích và thiếu dependencies.

### 1.1. Cập nhật `package.json` và `server.js`
*   **Vấn đề**: `package.json` định nghĩa `"type": "module"` (ES Modules), nhưng `server.js` lại sử dụng cú pháp CommonJS (`require`). Project cũng thiếu thư viện `express` trong `dependencies` (chỉ có trong dev hoặc không có).
*   **Giải pháp**:
    1.  Cài đặt express: `npm install express`.
    2.  Refactor `server.js` sang ES Modules:
        *   Thay `require('express')` bằng `import express from 'express'`.
        *   Tái tạo biến `__dirname` (không có sẵn trong ES Modules) sử dụng `import.meta.url`.

### 1.2. Build Project
*   Thực hiện build production ở local để tạo thư mục `dist`:
    ```bash
    npm run build
    ```

## 2. Deploy lên AWS EC2

Quá trình đẩy code và chạy ứng dụng trên server Ubuntu.

### 2.1. Upload Source Code
Sử dụng `scp` để đẩy các file cần thiết lên thư mục `/tmp` trước khi di chuyển vào thư mục ứng dụng (để tránh lỗi permission).
*   Files: `dist/`, `server.js`, `package.json`.
*   Destination: `/var/www/fisheries-demo/`.

### 2.2. Cài đặt Dependencies trên Server
Sau khi upload, SSH vào server và cài đặt các thư viện cần thiết để chạy production:
```bash
cd /var/www/fisheries-demo
sudo npm install --omit=dev
```

### 2.3. Quản lý Process với PM2
*   **Vấn đề**: Lệnh `pm2` không tìm thấy do biến môi trường `PATH` không nhận diện được global bin của npm/node khi chạy qua SSH non-interactive.
*   **Giải pháp**: Sử dụng `npx pm2` để chạy PM2 trực tiếp.
*   **Lệnh khởi chạy**:
    ```bash
    npx pm2 start /var/www/fisheries-demo/server.js --name fisheries-demo
    ```
*   Ứng dụng đã chạy thành công ở port `3000`.

## 3. Cấu hình Domain và Reverse Proxy (Nginx)

Host ứng dụng tại `http://demo.boatresearch.site/` (Port 80) thay vì phải gõ `:3000`.

### 3.1. Cài đặt Nginx
Cài đặt Nginx web server trên EC2:
```bash
sudo apt-get update
sudo apt-get install -y nginx
```

### 3.2. Cấu hình Reverse Proxy
Tạo file cấu hình nginx để chuyển tiếp request từ Port 80 về Port 3000.
*   **File**: `/etc/nginx/sites-available/demo`
*   **Nội dung cấu hình**:
    ```nginx
    server {
        listen 80;
        server_name demo.boatresearch.site;

        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

### 3.3. Kích hoạt Site
*   Tạo symlink sang `sites-enabled`.
*   Xóa cấu hình `default` mặc định của Nginx.
*   Reload Nginx: `sudo systemctl reload nginx`.

## 4. Trạng thái Hiện tại

*   **URL**: [http://demo.boatresearch.site/](http://demo.boatresearch.site/)
*   **Server**: AWS EC2 (Ubuntu).
*   **Process Manager**: PM2 (Name: `fisheries-demo`).
*   **Web Server**: Nginx (Reverse Proxy Port 80 -> 3000).
*   **Trạng thái**: ✅ Hoạt động ổn định (HTTP 200 OK).

---
*Documented by Antigravity on 2025-12-25.*
