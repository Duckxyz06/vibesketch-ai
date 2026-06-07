import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeminiClient, jsonError } from './_gemini.js';

// Map voice gender + style to Gemini TTS voice names
const VOICE_MAP: Record<string, Record<string, string>> = {
  male: {
    normal: 'Charon',
    professional: 'Fenrir',
    inspirational: 'Kore',
    storytelling: 'Orus',
  },
  female: {
    normal: 'Aoede',
    professional: 'Leda',
    inspirational: 'Zephyr',
    storytelling: 'Puck',
  },
};

const STYLE_INSTRUCTIONS: Record<string, string> = {
  normal: '',
  professional: 'Read in a clear, calm, and professional tone. Steady pace, authoritative.',
  inspirational:
    'Read with energy and passion, like a motivational speaker. Warm, engaging, varied intonation. Build momentum.',
  storytelling:
    'Read like a storyteller — paced, immersive, with dramatic pauses. Draw the listener in.',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');

  try {
    const { text, voiceName, styleInstruction, geminiTtsGender, geminiTtsStyle, geminiKey } = req.body;
    if (!text) return jsonError(res, 400, 'Văn bản đọc không được để trống');

    const client = getGeminiClient(geminiKey);

    // Resolve voice name: explicit > gender+style map > default
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
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice,
            },
          },
        },
      } as any,
    });

    let base64Audio: string | null = null;
    let mimeType = 'audio/wav';

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if ((part as any).inlineData?.data) {
          base64Audio = (part as any).inlineData.data;
          mimeType = (part as any).inlineData.mimeType || 'audio/wav';
          break;
        }
      }
    }

    if (!base64Audio) {
      throw new Error(
        'Gemini TTS không trả về file âm thanh. Kiểm tra model gemini-2.5-flash-preview-tts và API key của bạn.'
      );
    }

    res.json({ audioBase64: base64Audio, mimeType, voiceUsed: voice });
  } catch (error: any) {
    console.error('generate-audio error:', error);
    jsonError(res, 500, error.message || 'Lỗi hệ thống khi tạo giọng đọc');
  }
}
