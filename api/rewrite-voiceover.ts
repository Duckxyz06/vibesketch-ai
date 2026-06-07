import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeminiClient, jsonError } from './_gemini';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');

  try {
    const {
      originalText,
      mode,
      language,
      minWords,
      maxWords,
      prevVoiceover,
      nextVoiceover,
      geminiKey,
    } = req.body;

    if (!originalText) return jsonError(res, 400, 'Văn bản gốc không được để trống');

    const client = getGeminiClient(geminiKey);

    const budgetText =
      minWords && maxWords ? `Độ dài từ bắt buộc: từ ${minWords} đến ${maxWords} từ.` : '';
    const contextText =
      prevVoiceover || nextVoiceover
        ? `\nBối cảnh câu trước: "${prevVoiceover || ''}"\nBối cảnh câu sau: "${nextVoiceover || ''}"`
        : '';

    const modeDesc =
      mode === 'longer'
        ? 'Viết dài thêm, cụ thể, giàu cảm xúc và hình ảnh hơn'
        : 'Truyền tải ngắn gọn, súc tích hơn, tập trung lực tác động';

    const prompt = `Hãy viết lại câu thoại video ngắn sau đây bằng ngôn ngữ ${language}.
Yêu cầu: ${modeDesc}.
${budgetText}${contextText}
Lưu ý: Không lặp lại câu gốc, không thêm lời giải thích hay ký tự bọc, chỉ trả về đúng 1 câu thoại viết lại tuyệt vời nhất.

Câu thoại gốc:
"${originalText}"`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.8 },
    });

    const rewritten = (response.text || '').replace(/^["'`\s]+|["'`\s]+$/g, '').trim();
    res.json({ rewritten: rewritten || originalText });
  } catch (error: any) {
    console.error('rewrite-voiceover error:', error);
    jsonError(res, 500, error.message || 'Lỗi viết lại giọng đọc');
  }
}
