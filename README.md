# Clinic Management System - Phòng khám tư nhân

Hệ thống quản lý phòng khám tư nhân với React frontend và Node.js backend.

## Về hệ thống

Đây là hệ thống quản lý cho **phòng khám tư nhân**
## Hướng dẫn cài đặt

### Bước 1: Clone repository

```bash
git clone https://github.com/MaHieu02/ProjectClinic.git
cd ProjectClinic
```

### Bước 2: Cài đặt MongoDB

#### Windows:
1. Tải và cài đặt MongoDB Community Server từ: https://www.mongodb.com/try/download/community
2. Tải và cài đặt Node.jS tại: https://nodejs.org/fr/download
### Bước 3: Cấu hình Backend

1. Di chuyển vào thư mục backend:
```bash
cd backend
```

2. Cài đặt dependencies:
```bash
npm install
```

### Bước 4: Cấu hình Frontend

1. Di chuyển vào thư mục frontend:
```bash
cd ../frontend
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Kiểm tra file `src/utils/api.js` để đảm bảo API_URL trỏ đúng:
```javascript
const API_URL = 'http://localhost:5000/api';
```

### Bước 5: Chạy ứng dụng

#### Chạy Backend (Terminal 1):
```bash
cd backend
npm run dev
```
Backend sẽ chạy tại: `http://localhost:5000`

#### Chạy Frontend (Terminal 2):
```bash
cd frontend
npm run dev
```
Frontend sẽ chạy tại: `http://localhost:5174`

### Bước 6: Truy cập ứng dụng

Mở trình duyệt và truy cập: `http://localhost:5174`

## 🔐 Tài khoản mặc định

### Admin (Quản trị viên):
- Username: `admin`
- Password: `123456`

### Doctor (Bác sĩ):
- Cần được admin tạo tài khoản

### Receptionist (Lễ tân):
- Cần được admin tạo tài khoản

### Patient (Bệnh nhân):
- Có thể tự đăng ký tại trang Register
- Hoặc được receptionist/admin tạo tài khoản

## 🛠️ Tech Stack

**Frontend:**
- React
- Vite
- TailwindCSS
- shadcn/ui components

**Backend:**
- Node.js
- Express.js
- MongoDB + Mongoose
- bcryptj
- CORS
- JWT Authentication
