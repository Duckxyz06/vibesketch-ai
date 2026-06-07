const { getGeminiClient, jsonError } = require('./_gemini');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');
  try {
    const { originalText, mode, language, minWords, maxWords, prevVoiceover, nextVoiceover, geminiKey } = req.body;
    if (!originalText) return jsonError(res, 400, 'Văn bản gốc không được để trống');

    const client = getGeminiClient(geminiKey);
    const modeDesc = mode === 'longer'
      ? 'Viết dài thêm, cụ thể, giàu cảm xúc'
      : 'Ngắn gọn, súc tích, tập trung lực tác động';
    const budget = (minWords && maxWords) ? `Độ dài: ${minWords}-${maxWords} từ.` : '';
    const ctx = (prevVoiceover || nextVoiceover)
      ? `\nCâu trước: "${prevVoiceover || ''}"\nCâu sau: "${nextVoiceover || ''}"` : '';

    const prompt = `Viết lại câu thoại video ngắn bằng ${language}.
Yêu cầu: ${modeDesc}. ${budget}${ctx}
Chỉ trả về 1 câu thoại, không giải thích.

Câu gốc: "${originalText}"`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.8 }
    });

    const rewritten = (response.text || '').replace(/^["'`\s]+|["'`\s]+$/g, '').trim();
    res.json({ rewritten: rewritten || originalText });
  } catch (e) {
    console.error(e);
    jsonError(res, 500, e.message || 'Lỗi viết lại');
  }
};
