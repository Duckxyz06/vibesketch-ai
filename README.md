# VibeSketch AI 🎨

Tạo video viral phong cách stickman/doodle bằng AI — dùng Gemini API (miễn phí).

---

## 🚀 Deploy lên Vercel qua GitHub Actions

Cách này tự động deploy mỗi khi bạn push code lên GitHub — không cần làm tay.

---

### BƯỚC 1 — Lấy Gemini API Key

1. Vào **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)**
2. Click **"Create API key"** → copy key (dạng `AIza...`)

---

### BƯỚC 2 — Tạo project trên Vercel

1. Vào **[vercel.com](https://vercel.com)** → đăng nhập / đăng ký (miễn phí)
2. Click **"Add New Project"** → chọn **"Continue with GitHub"**
3. Kéo xuống, chọn **"Import Third-Party Git Repository"** hoặc tạo project trống:
   - Vào **Settings → Tokens**
   - Click **"Create Token"** → đặt tên `github-actions` → copy token

> **Lưu lại 3 thứ sau** (cần cho bước 4):
> - `VERCEL_TOKEN` — token vừa tạo
> - `VERCEL_ORG_ID` — vào Vercel → Settings → General → **Team ID** (hoặc User ID)
> - `VERCEL_PROJECT_ID` — tạo project trong Vercel → Settings → **Project ID**

**Cách lấy nhanh ORG_ID và PROJECT_ID:**
```bash
npm i -g vercel
vercel login
vercel link   # chạy trong thư mục dự án, nó tự tạo file .vercel/project.json
cat .vercel/project.json
# → {"orgId":"xxx","projectId":"yyy"}
```

---

### BƯỚC 3 — Thêm GEMINI_API_KEY vào Vercel

1. Vào project trên Vercel → **Settings → Environment Variables**
2. Thêm:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: key Gemini của bạn (`AIza...`)
   - **Environments**: ✅ Production ✅ Preview ✅ Development
3. Click **Save**

---

### BƯỚC 4 — Thêm Secrets vào GitHub

1. Tạo repo GitHub mới tại **[github.com/new](https://github.com/new)**
2. Vào repo → **Settings → Secrets and variables → Actions**
3. Click **"New repository secret"**, thêm lần lượt 3 secrets:

| Secret Name | Giá trị |
|-------------|---------|
| `VERCEL_TOKEN` | Token lấy từ Vercel Settings → Tokens |
| `VERCEL_ORG_ID` | Team/User ID từ Vercel Settings → General |
| `VERCEL_PROJECT_ID` | Project ID từ Vercel Project → Settings |

---

### BƯỚC 5 — Push code & Deploy tự động

```bash
# Trong thư mục dự án này:
git init
git add .
git commit -m "feat: VibeSketch AI initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

GitHub Actions sẽ tự động chạy → build → deploy lên Vercel.

Theo dõi tiến trình tại: **GitHub repo → tab "Actions"**

Sau ~2 phút, app live tại: `https://YOUR_PROJECT.vercel.app`

---

### Kiểm tra sau deploy

```
https://your-app.vercel.app/api/health
```
Phải trả về: `{"status":"active","hasDefaultGeminiKey":true}`

---

## 🔄 Workflow tự động

```
Bạn push code lên GitHub (branch main)
        ↓
GitHub Actions chạy (.github/workflows/deploy.yml)
        ↓
  1. Checkout code
  2. Setup Node.js 20
  3. npm ci (install deps)
  4. Type check
  5. npm run build (Vite build)
  6. Deploy lên Vercel --prod
        ↓
App live trên Vercel ✅
```

**Pull Request** → tự động tạo **Preview URL** để test trước khi merge.

---

## 💻 Chạy Local

```bash
# 1. Cài dependencies
npm install

# 2. Tạo .env.local
cp .env.example .env.local
# Điền: GEMINI_API_KEY=your_key_here

# 3. Chạy
npm run dev
# → http://localhost:3000
```

---

## ⚙️ Cấu hình trong App

Vào **Settings (⚙)** trong app để nhập:

| Field | Mô tả |
|-------|-------|
| **Gemini API Key** | Dùng key riêng (override server key) |
| **Groq API Key** | (Tuỳ chọn) Cho Whisper caption sync chính xác hơn |

---

## 📁 Cấu trúc dự án

```
vibesketch-ai/
├── .github/
│   └── workflows/
│       └── deploy.yml          ← GitHub Actions pipeline
├── api/                        ← Vercel Serverless Functions
│   ├── _gemini.ts              ← Gemini client helper
│   ├── health.ts
│   ├── generate-titles.ts
│   ├── generate-outline.ts
│   ├── generate-script.ts
│   ├── generate-image.ts
│   ├── generate-audio.ts
│   └── rewrite-voiceover.ts
├── src/
│   ├── App.tsx                 ← React app chính (1500+ dòng)
│   ├── types.ts
│   └── data/
│       ├── characters.ts       ← 20+ nhân vật doodle
│       └── topics.ts
├── server.ts                   ← Express (chỉ dùng local dev)
├── vercel.json                 ← Vercel config + rewrites
├── vite.config.ts
└── package.json
```

---

## ❓ Troubleshooting

**GitHub Actions thất bại ở bước Deploy**
→ Kiểm tra lại 3 secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` đã đúng chưa.

**`hasDefaultGeminiKey: false` sau deploy**
→ Chưa thêm `GEMINI_API_KEY` vào Vercel Environment Variables. Thêm xong phải **Redeploy**.

**Hình ảnh không tạo được**
→ Model `gemini-2.0-flash-preview-image-generation` cần kích hoạt. Vào [aistudio.google.com](https://aistudio.google.com) thử generate 1 ảnh là unlock.

**Build lỗi `Cannot find module '@vercel/node'`**
→ Chạy `npm install` lại. Package đã có trong `package.json`.

**Functions timeout (>10s)**
→ Vercel free tier giới hạn 10s. `vercel.json` đã set `maxDuration: 60` nhưng cần **Vercel Pro** để vượt 10s. Nâng cấp hoặc dùng Gemini Flash (nhanh hơn).
