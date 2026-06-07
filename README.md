# VibeSketch AI 🎨

Tạo video viral stickman/doodle bằng Gemini AI — thuần frontend, không cần backend.

## Kiến trúc

```
Browser → Gemini API trực tiếp
```
- Không có server, không có backend
- API key lưu ở localStorage của người dùng
- Hoặc inject qua biến môi trường lúc build (Vercel)

## Deploy Vercel qua GitHub Actions

### 1. Lấy Gemini API Key
→ [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 2. Tạo Vercel Project & lấy IDs
```bash
npm i -g vercel
vercel login
vercel link          # tạo .vercel/project.json
cat .vercel/project.json   # lấy orgId + projectId
```
Lấy token: Vercel Dashboard → Settings → Tokens → Create

### 3. Thêm GitHub Secrets
Repo → Settings → Secrets → Actions → New secret:

| Secret | Giá trị |
|--------|---------|
| `GEMINI_API_KEY` | AIza... (Gemini key) |
| `VERCEL_TOKEN` | Token từ Vercel |
| `VERCEL_ORG_ID` | orgId từ .vercel/project.json |
| `VERCEL_PROJECT_ID` | projectId từ .vercel/project.json |

### 4. Push & Deploy tự động
```powershell
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/YOUR/REPO.git
git push -u origin main
```

GitHub Actions → build → deploy tự động.

## Chạy local

```bash
npm install
cp .env.example .env.local
# Điền GEMINI_API_KEY=AIza... vào .env.local
npm run dev
# → http://localhost:3000
```

## Lưu ý về API Key

**Khi deploy lên Vercel với `GEMINI_API_KEY`:**
- Key được embed vào JavaScript bundle lúc build
- Ai có bundle JS đều đọc được key
- Chỉ dùng cho app cá nhân/nội bộ, không public rộng rãi

**Để bảo mật hơn:** Người dùng tự nhập key của họ qua màn hình "Nhập Gemini API Key" trong app — key chỉ nằm ở localStorage của họ.

## Models dùng

| Tính năng | Model |
|-----------|-------|
| Tiêu đề + kịch bản | `gemini-2.5-flash` |
| Vẽ hình ảnh | `gemini-2.0-flash-preview-image-generation` |
| Giọng đọc TTS | `gemini-2.5-flash-preview-tts` |
