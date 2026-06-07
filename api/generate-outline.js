const { getGeminiClient, jsonError } = require('./_gemini');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');
  try {
    const { topic, tone, language, geminiKey } = req.body;
    if (!topic) return jsonError(res, 400, 'Chủ đề không được để trống');

    const client = getGeminiClient(geminiKey);
    const placeholder = language === 'Vietnamese' ? '[cần nguồn]' : language === 'Japanese' ? '[要出典]' : '[needs source]';
    const prompt = `Viết dàn ý nghiên cứu thực tế cho chủ đề: "${topic}" bằng ${language}.
Tone: ${tone}. Không bịa số liệu — dùng "${placeholder}" cho thông tin chưa kiểm chứng.
Cấu trúc: Góc nhìn · Ý chính · Kết luận · Cần kiểm chứng`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.4 }
    });

    res.json({ outline: response.text || '' });
  } catch (e) {
    console.error(e);
    jsonError(res, 500, e.message || 'Lỗi tạo dàn ý');
  }
};
