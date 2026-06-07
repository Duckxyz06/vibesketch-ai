const { getGeminiClient, jsonError } = require('./_gemini');

const VOICE_MAP = {
  male:   { normal: 'Charon', professional: 'Fenrir', inspirational: 'Kore', storytelling: 'Orus' },
  female: { normal: 'Aoede',  professional: 'Leda',   inspirational: 'Zephyr', storytelling: 'Puck' }
};

const STYLE_INSTRUCTIONS = {
  normal: '',
  professional: 'Read in a clear, calm, professional tone. Steady pace.',
  inspirational: 'Read with energy and passion like a motivational speaker. Warm, engaging, varied intonation.',
  storytelling: 'Read like a storyteller — paced, immersive, with dramatic pauses.'
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');
  try {
    const { text, voiceName, styleInstruction, geminiTtsGender, geminiTtsStyle, geminiKey } = req.body;
    if (!text) return jsonError(res, 400, 'Văn bản không được để trống');

    const client = getGeminiClient(geminiKey);
    const gender = geminiTtsGender || 'male';
    const style = geminiTtsStyle || 'inspirational';
    const voice = voiceName || VOICE_MAP[gender]?.[style] || 'Kore';
    const instruction = styleInstruction || STYLE_INSTRUCTIONS[style] || '';
    const promptText = instruction ? `${instruction}\n\n${text}` : text;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: promptText,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
        }
      }
    });

    let base64Audio = null;
    let mimeType = 'audio/wav';
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          base64Audio = part.inlineData.data;
          mimeType = part.inlineData.mimeType || 'audio/wav';
          break;
        }
      }
    }

    if (!base64Audio) throw new Error('Gemini TTS không trả về audio. Kiểm tra API key.');
    res.json({ audioBase64: base64Audio, mimeType, voiceUsed: voice });
  } catch (e) {
    console.error(e);
    jsonError(res, 500, e.message || 'Lỗi tạo giọng đọc');
  }
};
