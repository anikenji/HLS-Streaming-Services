# 🎬 HLS Streaming Service - Node.js

Dự án Node.js clone của PHP HLS Streaming, sử dụng Next.js và SQLite để đạt tính portable cao.

## ✨ Tính năng

- 🔐 **Xác thực người dùng** - JWT tokens với secure cookies
- ⬆️ **Upload video** - Hỗ trợ chunked upload cho file lớn (tối đa 5GB)
- 🎬 **HLS Streaming** - Phát video với token bảo mật
- 📊 **Dashboard hiện đại** - Giao diện glassmorphism đẹp mắt
- 🎯 **JWPlayer** - Tích hợp player với skip intro/outro
- 🗄️ **SQLite** - Database portable, không cần cài MySQL
- 📱 **Responsive** - Hoạt động trên mọi thiết bị

## 🚀 Bắt đầu nhanh

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Khởi tạo database

```bash
npm run init-db
```

Lệnh này tạo database SQLite và tài khoản admin:
- **Username:** `admin`
- **Password:** `admin123`

> ⚠️ Hãy đổi mật khẩu sau lần đăng nhập đầu tiên!

### 3. Cấu hình FFmpeg (tùy chọn)

Chỉnh sửa file `src/lib/config.ts`:

```typescript
export const FFMPEG_PATH = 'C:/ffmpeg/bin/ffmpeg.exe';
export const FFPROBE_PATH = 'C:/ffmpeg/bin/ffprobe.exe';
```

### 4. Chạy development server

```bash
npm run dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000)

## 📁 Cấu trúc dự án

```
nodejs/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API endpoints
│   │   │   ├── auth/          # Xác thực (login, register, logout)
│   │   │   ├── videos/        # Quản lý video
│   │   │   ├── movies/        # Quản lý phim/series
│   │   │   ├── stream/        # HLS streaming
│   │   │   └── progress/      # Tiến độ encoding
│   │   ├── dashboard/         # Trang dashboard
│   │   ├── embed/[id]/        # Trang player embed
│   │   └── page.tsx           # Trang đăng nhập
│   ├── components/            # React components
│   └── lib/                   # Utilities
│       ├── db/                # SQLite + Drizzle ORM
│       ├── auth/              # Authentication helpers
│       ├── config.ts          # Cấu hình ứng dụng
│       ├── helpers.ts         # Utility functions
│       └── security.ts        # Mã hóa token
├── data/                      # SQLite database
├── uploads/                   # Video được upload
├── hls/                       # File HLS output
├── thumbnails/                # Thumbnail video
├── scripts/                   # Scripts tiện ích
│   └── init-db.ts            # Khởi tạo database
└── package.json
```

## 📡 API Endpoints

### Xác thực
| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/auth/register` | POST | Đăng ký tài khoản mới |
| `/api/auth/login` | POST | Đăng nhập |
| `/api/auth/logout` | POST | Đăng xuất |
| `/api/auth/check` | GET | Kiểm tra trạng thái đăng nhập |

### Video
| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/videos` | GET | Danh sách video |
| `/api/videos` | POST | Upload video (chunked) |
| `/api/videos/[id]` | GET | Chi tiết video |
| `/api/videos/[id]` | DELETE | Xóa video |
| `/api/videos/[id]/metadata` | PATCH | Cập nhật metadata |

### Phim/Series
| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/movies` | GET | Danh sách phim |
| `/api/movies` | POST | Tạo phim mới |
| `/api/movies/[id]` | GET | Chi tiết phim |
| `/api/movies/[id]` | PATCH | Cập nhật phim |
| `/api/movies/[id]` | DELETE | Xóa phim |
| `/api/movies/[id]/videos` | POST | Thêm video vào phim |

### Streaming
| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/stream/playlist` | GET | HLS playlist (m3u8) |
| `/api/stream/segment` | GET | HLS segments (ts) |
| `/api/progress/[videoId]` | GET | Tiến độ encoding |

## ⚙️ Scripts

```bash
# Development server (với Webpack)
npm run dev

# Build production
npm run build

# Start production server
npm start

# Khởi tạo database
npm run init-db

# Lint code
npm run lint
```

## 🔧 Biến môi trường (tùy chọn)

Tạo file `.env.local`:

```env
# Bảo mật
JWT_SECRET=your-super-secret-jwt-key
STREAM_SECRET_KEY=your-stream-encryption-key

# FFmpeg
FFMPEG_PATH=C:/ffmpeg/bin/ffmpeg.exe
FFPROBE_PATH=C:/ffmpeg/bin/ffprobe.exe

# JWPlayer
JWPLAYER_KEY=your-jwplayer-license-key
JWPLAYER_CDN=https://cdn.jwplayer.com/libraries/your-key.js

# Server
BASE_URL=http://localhost:3000
```

## 🛠️ Công nghệ sử dụng

- **[Next.js 16](https://nextjs.org/)** - React framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[SQLite](https://www.sqlite.org/)** - Database portable
- **[Drizzle ORM](https://orm.drizzle.team/)** - TypeScript ORM
- **[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)** - SQLite driver
- **[JWPlayer](https://www.jwplayer.com/)** - Video player

## 📄 License

MIT License - Sử dụng tự do cho mục đích cá nhân và thương mại.

---

**Lưu ý:** Để tính năng encoding video hoạt động, bạn cần cài đặt [FFmpeg](https://ffmpeg.org/) và cấu hình đường dẫn trong `src/lib/config.ts`.
