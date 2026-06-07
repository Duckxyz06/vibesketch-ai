import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeminiClient, jsonError } from './_gemini.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');

  try {
    const { topic, tone, language, geminiKey } = req.body;
    if (!topic) return jsonError(res, 400, 'Chủ đề (Topic) không được để trống');

    const client = getGeminiClient(geminiKey);
    const placeholder =
      language === 'Vietnamese' ? '[cần nguồn]' : language === 'Japanese' ? '[要出典]' : '[needs source]';

    const prompt = `Hãy viết dàn ý nghiên cứu thực tế cho chủ đề: "${topic}" bằng ngôn ngữ ${language}.
Giọng điệu (Tone): ${tone}.
Nguyên tắc quan trọng: Không bịa đặt số liệu hay dẫn chứng. Nếu có số liệu/nguồn chưa kiểm chứng hãy dùng ký tự giữ chỗ: ${placeholder} để tôi tự điền.
Cấu trúc đóng góp rõ ràng:
- Góc nhìn / Angle
- Các ý chính / Key points
- Kết luận / Takeaway
- Cần kiểm chứng / To verify (liên quan đến các ký tự ${placeholder})`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.4 },
    });

    res.json({ outline: response.text || '' });
  } catch (error: any) {
    console.error('generate-outline error:', error);
    jsonError(res, 500, error.message || 'Lỗi hệ thống khi tạo dàn ý');
  }
}
