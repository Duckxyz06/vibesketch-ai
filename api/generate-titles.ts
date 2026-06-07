import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeminiClient, jsonError } from './_gemini';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');

  try {
    const { topic, tone, language, context, geminiKey } = req.body;
    if (!topic) return jsonError(res, 400, 'Chủ đề (Topic) không được để trống');

    const client = getGeminiClient(geminiKey);
    const systemInstruction = `Bạn là chuyên gia viết tiêu đề viral và hấp dẫn cho mạng xã hội bằng ngôn ngữ ${language}.`;
    const extraContext = context
      ? `\nNgữ cảnh bổ sung từ người dùng:\n"""\n${context}\n"""`
      : '';

    const prompt = `Hãy tạo chính xác 5 tiêu đề viral cho chủ đề: "${topic}".${extraContext}
Giọng điệu (Tone): ${tone}.
Hãy nhấn mạnh 1-2 từ khoá quan trọng bằng cách VIẾT HOA (không viết hoa mọi từ). Tránh các từ câu view sáo rỗng.
Trả về dữ liệu dưới định dạng JSON duy nhất khớp với cấu trúc mảng chuỗi sau:
["Tiêu đề 1", "Tiêu đề 2", "Tiêu đề 3", "Tiêu đề 4", "Tiêu đề 5"]`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: { type: 'STRING' },
        } as any,
      },
    });

    const text = response.text || '[]';
    res.json({ titles: JSON.parse(text) });
  } catch (error: any) {
    console.error('generate-titles error:', error);
    jsonError(res, 500, error.message || 'Lỗi hệ thống khi tạo tiêu đề');
  }
}
