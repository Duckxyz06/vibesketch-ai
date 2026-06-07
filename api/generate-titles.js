const { getGeminiClient, jsonError } = require('./_gemini');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');
  try {
    const { topic, tone, language, context, geminiKey } = req.body;
    if (!topic) return jsonError(res, 400, 'Chủ đề (Topic) không được để trống');

    const client = getGeminiClient(geminiKey);
    const systemInstruction = `Bạn là chuyên gia viết tiêu đề viral và hấp dẫn cho mạng xã hội bằng ngôn ngữ ${language}.`;
    const extraContext = context ? `\nNgữ cảnh bổ sung:\n"""\n${context}\n"""` : '';
    const prompt = `Hãy tạo chính xác 5 tiêu đề viral cho chủ đề: "${topic}".${extraContext}
Giọng điệu (Tone): ${tone}.
Nhấn mạnh 1-2 từ khoá bằng VIẾT HOA. Tránh từ sáo rỗng.
Trả về JSON: ["Tiêu đề 1","Tiêu đề 2","Tiêu đề 3","Tiêu đề 4","Tiêu đề 5"]`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: { type: 'ARRAY', items: { type: 'STRING' } }
      }
    });

    res.json({ titles: JSON.parse(response.text || '[]') });
  } catch (e) {
    console.error(e);
    jsonError(res, 500, e.message || 'Lỗi tạo tiêu đề');
  }
};
