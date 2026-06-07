const { GoogleGenAI } = require('@google/genai');

function getGeminiClient(userKey) {
  const apiKey = userKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('API key chưa được cấu hình. Vào Settings → dán Gemini API Key, hoặc thêm GEMINI_API_KEY vào Vercel Environment Variables.');
  }
  return new GoogleGenAI({ apiKey });
}

function jsonError(res, status, message) {
  return res.status(status).json({ error: message });
}

module.exports = { getGeminiClient, jsonError };
