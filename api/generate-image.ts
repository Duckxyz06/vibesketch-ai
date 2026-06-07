import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeminiClient, jsonError } from './_gemini.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');

  try {
    const { prompt, aspectRatio, geminiKey } = req.body;
    if (!prompt) return jsonError(res, 400, 'Mô tả hình ảnh không được để trống');

    const client = getGeminiClient(geminiKey);
    const ratio = aspectRatio || '9:16';

    // Enhance prompt for doodle style consistency
    const enhancedPrompt = `${prompt}
Style: hand-drawn doodle illustration, clean black ink outlines on cream/off-white background, simple expressive cartoon style, no photorealism, no gradients, flat colors with slight texture, storyboard feel.`;

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash-preview-image-generation',
      contents: enhancedPrompt,
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: {
          aspectRatio: ratio,
        } as any,
      },
    });

    let base64Data: string | null = null;
    let mimeType = 'image/png';

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if ((part as any).inlineData?.data) {
          base64Data = (part as any).inlineData.data;
          mimeType = (part as any).inlineData.mimeType || 'image/png';
          break;
        }
      }
    }

    if (!base64Data) {
      // Fallback: try gemini-2.5-flash-image model name variant
      throw new Error(
        'Gemini Image không trả về dữ liệu ảnh. Model gemini-2.0-flash-preview-image-generation cần được bật trong Google AI Studio. Kiểm tra lại API key và quota.'
      );
    }

    res.json({ imageUrl: `data:${mimeType};base64,${base64Data}` });
  } catch (error: any) {
    console.error('generate-image error:', error);
    jsonError(res, 500, error.message || 'Lỗi hệ thống khi vẽ hình ảnh');
  }
}
