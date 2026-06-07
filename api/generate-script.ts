import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeminiClient, jsonError } from './_gemini.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');

  try {
    const { title, topic, tone, duration, language, context, geminiKey } = req.body;
    if (!title) return jsonError(res, 400, 'Tiêu đề không được để trống');

    const client = getGeminiClient(geminiKey);

    const seconds = duration?.includes('60s') ? 60 : duration?.includes('3 mins') ? 180 : 450;
    const targetScenes = seconds <= 60 ? 14 : seconds <= 180 ? 25 : 35;

    const systemInstruction = `Bạn là biên kịch video hoạt hoạ/stickman và doodle chuyên nghiệp bằng ${language}.`;
    const extraContext = context
      ? `\nDưới đây là dàn ý nghiên cứu & bối cảnh để viết kịch bản (Yêu cầu bám sát các ý này để viết):\n"""\n${context}\n"""`
      : '';

    const prompt = `Viết kịch bản hoạt hoạ phân cảnh chi tiết cho tiêu đề video: "${title}".
Chủ đề gốc: ${topic}. Giọng điệu: ${tone}. Ngôn ngữ kịch bản: ${language}.${extraContext}
Tổng thời lượng mục tiêu: khoảng ${seconds} giây.
Số phân cảnh thích hợp: khoảng ${targetScenes} phân cảnh.
Mỗi phân cảnh cần:
- 'text': Lời dẫn/voiceover tương ứng (bằng ${language}), gọn gàng, súc tích (10-18 từ mỗi phân cảnh).
- 'imagePrompt': Mô tả chi tiết cảnh vẽ doodle bằng tiếng Anh để làm prompt cho AI vẽ tranh.

Hãy trả về định dạng JSON khớp hoàn toàn với cấu trúc sau:
{
  "scenes": [
    {
      "text": "Lời dẫn bằng ${language} cho phân cảnh 1...",
      "imagePrompt": "Detailed English image prompt describing stickman in clean vector art style..."
    }
  ]
}`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            scenes: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  text: { type: 'STRING' },
                  imagePrompt: { type: 'STRING' },
                },
                required: ['text', 'imagePrompt'],
              },
            },
          },
          required: ['scenes'],
        } as any,
      },
    });

    const text = response.text || '{"scenes":[]}';
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('generate-script error:', error);
    jsonError(res, 500, error.message || 'Lỗi hệ thống khi tạo kịch bản');
  }
}
