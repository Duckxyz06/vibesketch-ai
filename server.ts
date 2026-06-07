import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  // Helper to initialize Gemini Client with a given key (user override first, then env default)
  const getGeminiClient = (userKey?: string) => {
    const apiKey = userKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('API key is missing. Please configure a key in the secrets panel or Settings.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  };

  // API Route: Check keys status
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'active',
      hasDefaultGeminiKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // API Route: Generate Titles
  app.post('/api/generate-titles', async (req, res) => {
    try {
      const { topic, tone, language, context, geminiKey } = req.body;
      if (!topic) {
        return res.status(400).json({ error: 'Chủ đề (Topic) không được để trống' });
      }

      const client = getGeminiClient(geminiKey);
      const systemInstruction = `Bạn là chuyên gia viết tiêu đề viral và hấp dẫn cho mạng xã hội bằng ngôn ngữ ${language}.`;
      
      const extraContext = context ? `\nNgữ cảnh bổ sung từ người dùng:\n"""\n${context}\n"""` : '';
      const prompt = `Hãy tạo chính xác 5 tiêu đề viral cho chủ đề: "${topic}".${extraContext}
Giọng điệu (Tone): ${tone}.
Hãy nhấn mạnh 1-2 từ khoá quan trọng bằng cách VIẾT HOA (không viết hoa mọi từ). Tránh các từ câu view sáo rỗng.
Trả về dữ liệu dưới định dạng JSON duy nhất khớp với cấu trúc mảng chuỗi sau:
["Tiêu đề 1", "Tiêu đề 2", "Tiêu đề 3", "Tiêu đề 4", "Tiêu đề 5"]`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            items: { type: 'STRING' }
          }
        }
      });

      const text = response.text || '[]';
      res.json({ titles: JSON.parse(text) });
    } catch (error: any) {
      console.error('generate-titles error:', error);
      res.status(500).json({ error: error.message || 'Lỗi hệ thống khi tạo tiêu đề' });
    }
  });

  // API Route: Generate Outline (Research)
  app.post('/api/generate-outline', async (req, res) => {
    try {
      const { topic, tone, language, geminiKey } = req.body;
      if (!topic) {
        return res.status(400).json({ error: 'Chủ đề (Topic) không được để trống' });
      }

      const client = getGeminiClient(geminiKey);
      const placeholder = language === 'Vietnamese' ? '[cần nguồn]' : language === 'Japanese' ? '[要出典]' : '[needs source]';
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
        config: {
          temperature: 0.4
        }
      });

      res.json({ outline: response.text || '' });
    } catch (error: any) {
      console.error('generate-outline error:', error);
      res.status(500).json({ error: error.message || 'Lỗi hệ thống khi tạo dàn ý' });
    }
  });

  // API Route: Generate Script
  app.post('/api/generate-script', async (req, res) => {
    try {
      const { title, topic, tone, duration, language, context, geminiKey } = req.body;
      if (!title) {
        return res.status(400).json({ error: 'Tiêu đề không được để trống' });
      }

      const client = getGeminiClient(geminiKey);
      
      const seconds = duration.includes('60s') ? 60 : duration.includes('3 mins') ? 180 : 450;
      const targetScenes = seconds <= 60 ? 14 : seconds <= 180 ? 25 : 35;
      
      const systemInstruction = `Bạn là biên kịch video hoạt hoạ/stickman và doodle chuyện nghiệp bằng ${language}.`;
      const extraContext = context ? `\nDưới đây là dàn ý nghiên cứu & bối cảnh để viết kịch bản (Yêu cầu bám sát các ý này để viết):\n"""\n${context}\n"""` : '';
      
      const prompt = `Viết kịch bản hoạt hoạ phân cảnh chi tiết cho tiêu đề video: "${title}".
Chủ đề gốc: ${topic}. Giọng điệu: ${tone}. Ngôn ngữ kịch bản: ${language}.${extraContext}
Tổng thời lượng mục tiêu: khoảng ${seconds} giây.
Số phân cảnh thích hợp: khoảng ${targetScenes} phân cảnh.
Mỗi phân cảnh cần:
- 'text': Lời dẫn/voiceover tương ứng (bằng ${language}), gọn gàng, súc tích (10-18 từ mỗi phân cảnh).
- 'imagePrompt': Mô tả chi tiết cảnh vẽ doodle bằng tiếng Anh để làm prompt cho AI vẽ tranh.

Hãy trả về định dạng JSON khớp hoàn toàn với cấu trúc sau:
{
  "scenes": [
    {
      "text": "Lời dẫn bằng ${language} cho phân cảnh 1...",
      "imagePrompt": "Detailed English image prompt describing stickman in clean vector art style..."
    }
  ]
}`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              scenes: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    text: { type: 'STRING' },
                    imagePrompt: { type: 'STRING' }
                  },
                  required: ['text', 'imagePrompt']
                }
              }
            },
            required: ['scenes']
          }
        }
      });

      const text = response.text || '{"scenes":[]}';
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error('generate-script error:', error);
      res.status(500).json({ error: error.message || 'Lỗi hệ thống khi tạo kịch bản' });
    }
  });

  // API Route: Generate Scene Image
  app.post('/api/generate-image', async (req, res) => {
    try {
      const { prompt, aspectRatio, geminiKey } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Mô tả hình ảnh không được bọc trống' });
      }

      const client = getGeminiClient(geminiKey);
      const ratio = aspectRatio || '9:16';

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: prompt,
        config: {
          imageConfig: {
            aspectRatio: ratio,
            imageSize: '1K'
          }
        }
      });

      // Find the image bytes in the parts
      let base64Data: string | null = null;
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            base64Data = part.inlineData.data;
            break;
          }
        }
      }

      if (!base64Data) {
        throw new Error('Mô hình Gemini-Image không trả về dữ liệu ảnh phù hợp.');
      }

      res.json({ imageUrl: `data:image/png;base64,${base64Data}` });
    } catch (error: any) {
      console.error('generate-image error:', error);
      res.status(500).json({ error: error.message || 'Lỗi hệ thống khi vẽ hình ảnh' });
    }
  });

  // API Route: Generate Audio TTS (Gemini)
  app.post('/api/generate-audio', async (req, res) => {
    try {
      const { text, voiceName, styleInstruction, geminiKey } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Văn bản đọc không được để trống' });
      }

      const client = getGeminiClient(geminiKey);
      const voice = voiceName || 'Kore';
      
      const prompt = styleInstruction 
        ? `${styleInstruction}\n\n${text}`
        : text;

      const response = await client.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: prompt,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice
              }
            }
          }
        }
      });

      let base64Audio: string | null = null;
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            base64Audio = part.inlineData.data;
            break;
          }
        }
      }

      if (!base64Audio) {
        throw new Error('Gemini TTS không trả về file âm thanh.');
      }

      res.json({ audioBase64: base64Audio });
    } catch (error: any) {
      console.error('generate-audio error:', error);
      res.status(500).json({ error: error.message || 'Lỗi hệ thống khi tạo giọng đọc' });
    }
  });

  // API Route: Rewrite voiceover line (makes it longer or shorter)
  app.post('/api/rewrite-voiceover', async (req, res) => {
    try {
      const { originalText, mode, language, minWords, maxWords, prevVoiceover, nextVoiceover, geminiKey } = req.body;
      if (!originalText) {
        return res.status(400).json({ error: 'Văn bản gốc không được để trống' });
      }

      const client = getGeminiClient(geminiKey);
      
      const budgetText = minWords && maxWords ? `Độ dài từ bắt buộc: từ ${minWords} đến ${maxWords} từ.` : '';
      const contextText = (prevVoiceover || nextVoiceover) ? `\nBối cảnh câu trước: "${prevVoiceover || ''}"\nBối cảnh câu sau: "${nextVoiceover || ''}"` : '';

      const prompt = `Hãy viết lại câu thoại video ngắn sau đây bằng ngôn ngữ ${language}.
Yêu cầu: ${mode === 'longer' ? 'Viết dài thêm, cụ thể, giàu cảm xúc và hình ảnh hơn' : 'Truyền tải ngắn gọn, súc tích hơn, tập trung lực tác động'}.
${budgetText}${contextText}
Lưu ý: Không lặp lại câu gốc, không thêm lời giải thích hay ký tự bọc, chỉ trả về đúng 1 câu thoại viết lại tuyệt vời nhất.

Câu thoại gốc:
"${originalText}"`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.8
        }
      });

      const rewritten = (response.text || '').replace(/^["'`\s]+|["'`\s]+$/g, '').trim();
      res.json({ rewritten: rewritten || originalText });
    } catch (error: any) {
      console.error('rewrite-voiceover error:', error);
      res.status(500).json({ error: error.message || 'Lỗi viết lại giọng đọc' });
    }
  });

  // Serve static UI assets and handle dev/prod pipelines
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
