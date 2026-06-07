const { getGeminiClient, jsonError } = require('./_gemini');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');
  try {
    const { prompt, aspectRatio, geminiKey } = req.body;
    if (!prompt) return jsonError(res, 400, 'Mô tả hình ảnh không được để trống');

    const client = getGeminiClient(geminiKey);
    const enhancedPrompt = `${prompt}
Style: hand-drawn doodle illustration, clean black ink outlines on cream background, simple expressive cartoon, no photorealism, flat colors.`;

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash-preview-image-generation',
      contents: enhancedPrompt,
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: { aspectRatio: aspectRatio || '9:16' }
      }
    });

    let base64Data = null;
    let mimeType = 'image/png';
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          base64Data = part.inlineData.data;
          mimeType = part.inlineData.mimeType || 'image/png';
          break;
        }
      }
    }

    if (!base64Data) throw new Error('Gemini Image không trả về ảnh. Kiểm tra API key và quota.');
    res.json({ imageUrl: `data:${mimeType};base64,${base64Data}` });
  } catch (e) {
    console.error(e);
    jsonError(res, 500, e.message || 'Lỗi tạo hình ảnh');
  }
};
