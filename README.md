# 🏛️ Temoney (Finance Management) — Hệ thống Quản lý Tài chính Cá nhân & Nhóm tích hợp AI

![Java](https://img.shields.io/badge/Backend-Spring_Boot_4_(Java_17)-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/Frontend-ReactJS_19_+_Vite_+_TailwindCSS-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Python](https://img.shields.io/badge/AI_Service-Python_FastAPI_+_Gemini-3776AB?style=for-the-badge&logo=python&logoColor=white)
![MySQL](https://img.shields.io/badge/Database-MySQL_8-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

## 📖 Giới thiệu dự án

**Temoney (Finance Management)** là ứng dụng web quản lý tài chính cá nhân và chi tiêu nhóm thông minh, kết hợp triết lý phân bổ tài chính **6 Chiếc Lọ (6 JARS)** và **50/30/20** với **Microservice Trí tuệ nhân tạo (AI)**.

Hệ thống giúp người dùng:
- Ghi chép thu/chi cá nhân nhanh chóng (thủ công, **quét hóa đơn OCR bằng ảnh**, hoặc **nhập liệu bằng giọng nói/câu nói tự nhiên**).
- Lập kế hoạch và đánh giá ngân sách ngay theo **ngày / tháng / năm**.
- Quản lý **chi tiêu nhóm minh bạch**: kết bạn & mời nhóm bằng **mã QR cá nhân**, chia tiền linh hoạt (chia đều / chia số tiền cụ thể), **chỉnh sửa/xoá khoản chi khi đang thảo luận**, và **bình luận góp ý theo từng hóa đơn**.
- Nhận tư vấn từ **AI Cố vấn Tài chính & Tích sản (Hybrid Math + LLM)** dựa trên số liệu ví thực tế.

---

## ✨ Tính năng chính

### 1. Quản lý Tài chính Cá nhân
- **Dashboard & Đa ví (`Account`):** Quản lý nhiều nguồn tiền (tiền mặt, ngân hàng, ví điện tử), tự động đồng bộ số dư theo từng giao dịch (`@Transactional`).
- **Ngân sách 6 Chiếc Lọ & Đánh giá Ngày/Tháng/Năm (`Budget` & `Analytics`):** Phân bổ tự động theo 6 lọ (55% Thiết yếu, 10% Tiết kiệm dài hạn, 10% Tự do tài chính, 10% Giáo dục, 10% Hưởng thụ, 5% Cho đi), chia định mức theo ngày để nhận cảnh báo AI ngay lập tức.
- **Xuất báo cáo:** Hỗ trợ xuất lịch sử giao dịch và báo cáo ra **Excel (`.xlsx`)** và **PDF**.

### 2. Quản lý Chi tiêu Nhóm & Kết nối QR
- **Mã QR định danh (`AURA_USER:<userCode>`):** Mỗi tài khoản có mã 6 chữ số duy nhất; hỗ trợ tạo QR kèm avatar (mức sửa lỗi `H`) và quét QR bằng camera/ảnh để kết bạn hoặc thêm thành viên nhóm.
- **Chia tiền & Thảo luận hóa đơn:** Tạo/sửa/xoá khoản chi tiêu nhóm (`EQUAL` / `EXACT`), tự động tính công nợ *"Ai nợ ai"*, gắn thẻ góp ý nhanh và bình luận theo từng khoản chi.
- **Đồng bộ hồ sơ & Avatar 2 chiều:** Cập nhật ảnh đại diện ở cá nhân tự động hiển thị đồng bộ sang giao diện nhóm, danh sách thành viên và khung thảo luận.

### 3. AI Microservice (`ocr-service` — Python FastAPI)
- **Quét hóa đơn OCR (`/api/v1/scan-receipt`):** Nén tối ưu ảnh bằng `Pillow`, cache theo SHA-256 và trích xuất JSON chuẩn bằng Gemini Vision.
- **Bóc tách câu nói giao dịch (`/api/v1/parse-text`):** Kết hợp Gemini AI và **Rule Engine NLP (Regex tiếng Việt)** làm fallback (< 5ms) khi mất mạng/hết quota.
- **Chatbot Cố vấn Tài chính (`/api/v1/chat-advisor`):** Kiến trúc **Hybrid (Toán tài chính định lượng + LLM đa nguồn Groq / Gemini / Gemma / Ollama)** hỗ trợ cả câu hỏi tính toán mục tiêu/lãi kép DCA lẫn câu hỏi tư vấn tự do.

### 4. Bảo mật & Quản trị
- **Xác thực đa phương thức:** Đăng nhập JWT (`BCrypt`), **Google OAuth2**, đăng ký và **Quên mật khẩu có xác thực OTP qua Gmail** (hiệu lực 5 phút, tối đa 5 lần thử).
- **Trang Quản trị (`Admin`):** Thống kê hệ thống, quản lý người dùng, nhật ký đăng nhập (`LoginHistory`), thông báo hệ thống và xử lý phiếu hỗ trợ (`SupportTicket`).

---

## 📂 Cấu trúc Project

```text
Finance_Management/
├── pom.xml                                  # Cấu hình Maven & dependencies Spring Boot (Java 17)
├── Dockerfile                               # Đóng gói container triển khai Backend Spring Boot
├── README.md                                # Tài liệu hướng dẫn dự án
├── src/
│   ├── main/
│   │   ├── java/com/example/demo/
│   │   │   ├── Config/                      # Cấu hình Spring Security, CORS, AppConfig
│   │   │   ├── controller/                  # REST API (Auth, Account, Transaction, Budget, Group, Friend, Receipt, Admin...)
│   │   │   ├── dto/                         # Request/Response DTO & Validation
│   │   │   ├── model/                       # JPA Entities (User, Account, Transaction, Budget, AppGroup, GroupTransaction...)
│   │   │   ├── Repository/                  # Spring Data JPA Repositories
│   │   │   ├── security/                    # JwtTokenProvider, JwtAuthenticationFilter
│   │   │   └── service/                     # Nghiệp vụ (AuthService, OtpService, EmailService, GoogleAuthService, TransactionService...)
│   │   └── resources/
│   │       └── application.properties       # Cấu hình DB, JWT, SMTP Mail, Google OAuth2, OCR URL
│   └── test/java/com/example/demo/
│       ├── controller/GroupControllerTest.java     # Unit Test JUnit 5 cho Sửa/Xoá/Bình luận nhóm
│       └── service/
│           ├── OtpServiceTest.java                 # Unit Test JUnit 5 cho tạo/xác thực/giới hạn OTP
│           └── TransactionServiceTest.java         # Unit Test JUnit 5 cho đồng bộ số dư ví & ngân sách
├── my-finance-app/                          # Frontend ReactJS (Vite + Tailwind CSS)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── vercel.json                          # Cấu hình SPA rewrite khi deploy lên Vercel
│   ├── public/                              # Logo, favicon, ảnh demo
│   └── src/
│       ├── App.jsx                          # Định tuyến các trang Personal, Group, Auth, Admin
│       ├── components/
│       │   ├── personal/                    # Chatbot AI, OCR Modal, Voice/Text Modal, UserProfileModal...
│       │   ├── group/                       # GroupSidebar, MyQRCodeModal, ScanQRModal, TransactionCommentModal, EditGroupTransactionModal
│       │   └── landing/                     # Trang giới thiệu
│       ├── context/                         # LanguageContext (đa ngôn ngữ VI/EN)
│       ├── pages/
│       │   ├── auth/                        # Login, Register (OTP + Google OAuth2), ForgotPassword
│       │   ├── personal/                    # Dashboard, Activity, AddTransaction, Budgets, Analytics
│       │   ├── group/                       # GroupDashboard, GroupActivity, GroupAddTransaction, GroupAnalytics
│       │   └── admin/                       # Trang quản trị hệ thống
│       ├── services/                        # api.js (Axios + JWT interceptor), exportService.js (Excel/PDF)
│       └── utils/                           # formatters.js
└── ocr-service/                             # AI Microservice (Python FastAPI)
    ├── main.py                              # FastAPI endpoints (cổng 8001)
    ├── ocr_engine.py                        # Quét hóa đơn Gemini Vision + Rule Engine NLP tiếng Việt
    ├── financial_advisor.py                 # Chatbot Cố vấn Tài chính Hybrid (Math + Groq/Gemini/Ollama)
    ├── schemas.py                           # Pydantic schemas
    ├── data/vn_financial_knowledge.json     # Dữ liệu tham chiếu chi phí & kênh tích sản Việt Nam
    ├── test_ocr_service.py                  # Script kiểm thử tự động OCR Engine
    ├── requirements.txt                     # Danh sách thư viện Python
    └── .env.example                         # File mẫu biến môi trường API Key
```

---

## 🛠️ Yêu cầu môi trường (Prerequisites)

- **Java JDK 17+** và **Maven 3.8+**
- **MySQL Server 8.x**
- **Node.js 18+** và **npm**
- **Python 3.10+**

---

## 🚀 Hướng dẫn cài đặt & chạy cục bộ (Local Development)

### Bước 1: Clone mã nguồn
```bash
git clone https://github.com/thophamxt-bit/Finance-Management.git
cd Finance-Management
```

### Bước 2: Cấu hình Cơ sở dữ liệu MySQL & Backend (Spring Boot — cổng `8080`)
1. Khởi động MySQL Server (Spring Boot đã bật `createDatabaseIfNotExist=true` nên database `finance_managent` sẽ tự động được tạo).
2. Cấu hình các biến môi trường (hoặc chỉnh trực tiếp trong `src/main/resources/application.properties`):
   ```properties
   SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/finance_managent?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
   SPRING_DATASOURCE_USERNAME=root
   SPRING_DATASOURCE_PASSWORD=your_mysql_password
   JWT_SECRET=your_jwt_secret_key_at_least_32_characters
   MAIL_USERNAME=your_gmail@gmail.com
   MAIL_PASSWORD=your_gmail_app_password
   GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
   OCR_SERVICE_URL=http://localhost:8001
   ```
3. Chạy Backend:
   ```bash
   mvn spring-boot:run
   ```
   > Hoặc mở dự án bằng **IntelliJ IDEA** và chạy lớp main của Spring Boot.

### Bước 3: Cài đặt & chạy AI Microservice (`ocr-service` — cổng `8001`)
```bash
cd ocr-service
python -m venv venv

# Kích hoạt môi trường ảo:
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS / Linux:
# source venv/bin/activate

pip install -r requirements.txt
```
Tạo file `.env` từ `.env.example` và điền `GEMINI_API_KEY` (lấy miễn phí tại Google AI Studio):
```bash
copy .env.example .env
```
Khởi chạy FastAPI server:
```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```
Kiểm tra trạng thái tại: `http://localhost:8001/health`

### Bước 4: Cài đặt & chạy Frontend (`my-finance-app` — cổng `5173`)
Mở terminal mới từ thư mục gốc:
```bash
cd my-finance-app
npm install
npm run dev
```
Truy cập ứng dụng tại: **http://localhost:5173**

*(Nếu dùng Google OAuth2 trên local, hãy thêm `http://localhost:5173` vào mục **Authorized JavaScript origins** trong Google Cloud Console).*

---

## 🧪 Chạy kiểm thử (Testing)

### 1. Chạy Unit Test Backend (14 test case JUnit 5 + Mockito)
```bash
mvn test -Dtest="OtpServiceTest,TransactionServiceTest,GroupControllerTest"
```

### 2. Kiểm thử AI OCR Service
```bash
cd ocr-service
python test_ocr_service.py
```

### 3. Kiểm tra Build Frontend
```bash
cd my-finance-app
npm run build
```

---

## ☁️ Hướng dẫn triển khai (Deployment)

### 1. Triển khai Backend bằng Docker (Render / Railway / Clever Cloud / VPS)
Dự án đã có sẵn `Dockerfile` đa tầng (Maven build + Eclipse Temurin JRE 17):
```bash
docker build -t temoney-backend .
docker run -p 8080:8080 \
  -e SPRING_DATASOURCE_URL="jdbc:mysql://<host>:3306/finance_managent?useSSL=true" \
  -e SPRING_DATASOURCE_USERNAME="<user>" \
  -e SPRING_DATASOURCE_PASSWORD="<password>" \
  -e JWT_SECRET="<strong-secret>" \
  -e MAIL_USERNAME="<gmail>" \
  -e MAIL_PASSWORD="<app-password>" \
  -e GOOGLE_CLIENT_ID="<google-client-id>" \
  -e OCR_SERVICE_URL="https://<your-ocr-service-url>" \
  temoney-backend
```

### 2. Triển khai AI Microservice (`ocr-service`)
- Deploy thư mục `ocr-service/` lên **Render / Railway / VPS** với lệnh start:
  ```bash
  uvicorn main:app --host 0.0.0.0 --port $PORT
  ```
- Thiết lập biến môi trường `GEMINI_API_KEY` (và tùy chọn `GROQ_API_KEY`).

### 3. Triển khai Frontend lên Vercel
- Import repository vào **Vercel**, chọn **Root Directory** là `my-finance-app`.
- Framework Preset: **Vite** (`npm run build`, Output Directory: `dist`).
- Thêm biến môi trường `VITE_API_URL=https://<your-backend-url>`.
- File `my-finance-app/vercel.json` đã cấu hình sẵn SPA rewrite cho React Router.
