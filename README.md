# VibeSketch AI 🎨

Tạo video viral phong cách stickman/doodle bằng AI — hoàn toàn miễn phí với Gemini API.

---

## 🚀 Deploy lên Vercel (Khuyến nghị)

### Bước 1 — Chuẩn bị

1. Tạo tài khoản **[Vercel](https://vercel.com)** (miễn phí)
2. Lấy **Gemini API Key** tại [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (miễn phí)
3. Cài **Vercel CLI**: `npm i -g vercel`

### Bước 2 — Push code lên GitHub

```bash
git init
git add .
git commit -m "Initial commit - VibeSketch AI"
```

Tạo repo mới trên GitHub, rồi:

```bash
git remote add origin https://github.com/YOUR_USERNAME/vibesketch-ai.git
git push -u origin main
```

### Bước 3 — Deploy lên Vercel

#### Option A: Vercel Dashboard (dễ nhất)

1. Vào [vercel.com/new](https://vercel.com/new)
2. **Import** repo GitHub vừa tạo
3. **Framework Preset**: chọn **Other** (không phải Next.js)
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. **Install Command**: `npm install`
7. Click **"Add Environment Variables"**:
   - Key: `GEMINI_API_KEY`
   - Value: dán API key Gemini của bạn
8. Click **Deploy** → chờ ~2 phút

#### Option B: Vercel CLI

```bash
# Trong thư mục dự án:
vercel login
vercel
# → Trả lời các câu hỏi, chọn "Other" framework
# → Sau đó thêm env var:
vercel env add GEMINI_API_KEY
# Nhập API key, chọn môi trường: Production, Preview, Development
vercel --prod
```

### Bước 4 — Kiểm tra sau deploy

Mở URL Vercel vừa tạo (ví dụ: `https://vibesketch-ai.vercel.app`).

Kiểm tra API hoạt động: `https://your-app.vercel.app/api/health`

Phải trả về: `{"status":"active","hasDefaultGeminiKey":true,...}`

---

## 💻 Chạy Local (Development)

```bash
# 1. Clone / giải nén dự án
cd vibesketch-ai

# 2. Cài dependencies
npm install

# 3. Tạo file .env.local
cp .env.example .env.local
# Mở .env.local và điền GEMINI_API_KEY=your_key_here

# 4. Chạy dev server
npm run dev
# → Mở http://localhost:3000
```

> **Lưu ý local**: Khi chạy `npm run dev`, Express server (`server.ts`) phục vụ cả API + frontend.
> Vercel dùng `api/*.ts` serverless functions thay thế.

---

## ⚙️ Cấu hình trong App

Sau khi mở app, vào **Settings (⚙)** để nhập:

| Field | Mô tả |
|-------|-------|
| **Gemini API Key** | Key chính cho text + image + audio |
| **Groq API Key** | (Tuỳ chọn) Cho Whisper caption sync |

> Nếu đã set `GEMINI_API_KEY` ở Vercel env, người dùng **không cần** nhập key — app dùng server key mặc định.
> Nhập key trong Settings sẽ **override** server key (user dùng key riêng của mình).

---

## 🤖 Các Model Gemini Dùng

| Chức năng | Model |
|-----------|-------|
| Tạo tiêu đề / kịch bản | `gemini-2.5-flash` |
| Vẽ hình ảnh cảnh | `gemini-2.0-flash-preview-image-generation` |
| Giọng đọc TTS | `gemini-2.5-flash-preview-tts` |

> Tất cả model trên đều có trong **free tier** Gemini API (có rate limit).

---

## 📁 Cấu trúc dự án

```
vibesketch-ai/
├── api/                        # Vercel Serverless Functions
│   ├── _gemini.ts              # Helper dùng chung
│   ├── health.ts               # GET /api/health
│   ├── generate-titles.ts      # POST /api/generate-titles
│   ├── generate-outline.ts     # POST /api/generate-outline
│   ├── generate-script.ts      # POST /api/generate-script
│   ├── generate-image.ts       # POST /api/generate-image
│   ├── generate-audio.ts       # POST /api/generate-audio
│   └── rewrite-voiceover.ts    # POST /api/rewrite-voiceover
├── src/
│   ├── App.tsx                 # React app chính
│   ├── types.ts                # TypeScript types
│   ├── data/
│   │   ├── characters.ts       # 20+ nhân vật doodle
│   │   └── topics.ts           # Gợi ý chủ đề
│   └── index.css
├── server.ts                   # Express server (chỉ dùng local dev)
├── vercel.json                 # Vercel config
├── vite.config.ts              # Vite build config
├── package.json
└── .env.example                # Template env vars
```

---

## ❓ Troubleshooting

**API trả về lỗi "API key chưa được cấu hình"**
→ Kiểm tra `GEMINI_API_KEY` đã được thêm vào Vercel Environment Variables chưa. Sau khi thêm phải **Redeploy**.

**Hình ảnh không tạo được**
→ Model `gemini-2.0-flash-preview-image-generation` cần được kích hoạt trong Google AI Studio. Vào [aistudio.google.com](https://aistudio.google.com) → thử generate image 1 lần.

**Audio không tạo được**
→ `gemini-2.5-flash-preview-tts` hiện đang preview, đôi khi rate limit. Thử lại sau vài giây.

**Build lỗi trên Vercel**
→ Đảm bảo Node.js version ≥ 20. Trong Vercel Dashboard: Settings → General → Node.js Version → chọn `20.x`.

**Functions timeout**
→ `vercel.json` đã set `maxDuration: 60` (giây). Nếu vẫn timeout, nâng lên `300` (cần Vercel Pro).
