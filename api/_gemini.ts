import { GoogleGenAI } from '@google/genai';

export function getGeminiClient(userKey?: string): GoogleGenAI {
  const apiKey = userKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'API key chưa được cấu hình. Vào Settings → dán Gemini API Key, hoặc thêm GEMINI_API_KEY vào Vercel Environment Variables.'
    );
  }
  return new GoogleGenAI({ apiKey });
}

export function jsonError(res: any, status: number, message: string) {
  return res.status(status).json({ error: message });
}
