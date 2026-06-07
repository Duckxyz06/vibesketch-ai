const { getGeminiClient, jsonError } = require('./_gemini');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');
  try {
    const { title, topic, tone, duration, language, context, geminiKey } = req.body;
    if (!title) return jsonError(res, 400, 'Tiêu đề không được để trống');

    const client = getGeminiClient(geminiKey);
    const seconds = duration?.includes('60s') ? 60 : duration?.includes('3 mins') ? 180 : 450;
    const targetScenes = seconds <= 60 ? 14 : seconds <= 180 ? 25 : 35;
    const extraContext = context ? `\nDàn ý:\n"""\n${context}\n"""` : '';

    const prompt = `Viết kịch bản hoạt hoạ phân cảnh cho video: "${title}".
Chủ đề: ${topic}. Tone: ${tone}. Ngôn ngữ: ${language}.${extraContext}
Thời lượng: ~${seconds}s. Số cảnh: ~${targetScenes}.
Mỗi cảnh: text (lời dẫn ${language}, 10-18 từ) + imagePrompt (English doodle prompt).
Trả về JSON: {"scenes":[{"text":"...","imagePrompt":"..."}]}`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `Bạn là biên kịch video doodle/stickman chuyên nghiệp bằng ${language}.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            scenes: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: { text: { type: 'STRING' }, imagePrompt: { type: 'STRING' } },
                required: ['text', 'imagePrompt']
              }
            }
          },
          required: ['scenes']
        }
      }
    });

    res.json(JSON.parse(response.text || '{"scenes":[]}'));
  } catch (e) {
    console.error(e);
    jsonError(res, 500, e.message || 'Lỗi tạo kịch bản');
  }
};
