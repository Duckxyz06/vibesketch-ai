import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Scene, Language } from "../types";

// ─── API Key Resolution ────────────────────────────────────────────────────
// Priority: 1) User key in localStorage  2) Build-time env var  3) Error
const getApiKey = (): string => {
  const userKey = localStorage.getItem('vibesketch_gemini_key');
  const buildKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  const key = userKey || buildKey;
  if (!key) throw new Error('NO_API_KEY');
  return key;
};

const getAI = () => new GoogleGenAI({ apiKey: getApiKey() });

// ─── Retry Logic ────────────────────────────────────────────────────────────
const withRetry = async <T>(fn: () => Promise<T>, retries = 4, delay = 4000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const status = error.status || error?.error?.code;
    const msg = error.message || '';
    const isRetryable =
      status === 429 || status === 503 ||
      msg.includes('429') || msg.includes('503') ||
      msg.toLowerCase().includes('overloaded') ||
      msg.toLowerCase().includes('unavailable');

    if (retries > 0 && isRetryable) {
      console.warn(`Gemini busy (${status}). Retry in ${delay / 1000}s... (${retries} left)`);
      await new Promise(r => setTimeout(r, delay));
      return withRetry(fn, retries - 1, delay * 1.5 + Math.random() * 1000);
    }
    throw error;
  }
};

// ─── Language Config ────────────────────────────────────────────────────────
const LANGUAGE_CONFIG: Record<Language, {
  role: string;
  formulas: string;
  scriptRules: string;
  visualText: string;
  voiceName: string;
}> = {
  Vietnamese: {
    role: "viral YouTube strategist for the Vietnamese market",
    formulas: `
    1. Extreme Transformation: [Hành động] + [Đối tượng] + [Trạng thái: LẠNH LÙNG / BẤT KHẢ CHIẾN BẠI]
    2. Cruel Truth: Tại sao bạn mãi [Thất bại/Nghèo khó] dù đã [Cố gắng]?
    3. Wake-up Call: [Làm ngay đi] nếu không muốn [Hậu quả đáng sợ].`,
    scriptRules: "Tone: Street-smart, engaging, distinctively Vietnamese perspective.",
    visualText: "Text inside image must be Vietnamese.",
    voiceName: "Kore",
  },
  English: {
    role: "viral YouTube strategist for the US/Global market",
    formulas: `
    1. Extreme Transformation: How I became [Unstoppable/Stoic] by doing [Simple Action].
    2. The Harsh Truth: Why you are still [Broke/Unhappy] despite [Hard Work].
    3. The Warning: Stop doing [Action] immediately (Here is why).`,
    scriptRules: "Tone: Punchy, idiomatic English, direct.",
    visualText: "Text inside image must be English.",
    voiceName: "Puck",
  },
  Japanese: {
    role: "viral YouTube strategist for the Japanese market",
    formulas: `
    1. [Action] shite, [Status] ni naru houhou. Use strong kanji.
    2. Nazebito wa [Fail] suru no ka?
    3. [Action] yamenasai. Zettai ni.`,
    scriptRules: "Tone: Ki-Sho-Ten-Ketsu manga-style structure, polite yet impactful.",
    visualText: "Text inside image must be Japanese (Kanji/Kana).",
    voiceName: "Kore",
  },
};

// ─── Model names (real available models) ───────────────────────────────────
const MODEL_TEXT = "gemini-2.5-flash";
const MODEL_IMAGE = "gemini-2.0-flash-preview-image-generation";
const MODEL_TTS = "gemini-2.5-flash-preview-tts";

// ─── Generate Viral Titles ──────────────────────────────────────────────────
export const generateViralTitles = async (
  topic: string,
  tone: string,
  language: Language
): Promise<string[]> => {
  const ai = getAI();
  const config = LANGUAGE_CONFIG[language];

  const prompt = `
    Act as a ${config.role}.
    Generate 5 viral YouTube titles in ${language} based on the keyword: "${topic}".
    Tone: ${tone}.
    Use one of the following formulas adapted for ${language} culture:
    ${config.formulas}
    Capitalize POWER WORDS. Return ONLY a JSON array of strings.
  `;

  try {
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      return response.text ? JSON.parse(response.text) : [];
    });
  } catch (e: any) {
    if (e.message === 'NO_API_KEY') throw e;
    console.error("Error generating titles:", e);
    return ["Lỗi tạo tiêu đề. Vui lòng thử lại."];
  }
};

// ─── Generate Script Scenes ─────────────────────────────────────────────────
export const generateScriptScenes = async (
  title: string,
  duration: string,
  language: Language
): Promise<Scene[]> => {
  const ai = getAI();
  const config = LANGUAGE_CONFIG[language];

  const prompt = `
    Act as a master storyteller for viral short videos in ${language}.
    Create a script for: "${title}".
    Target Duration: ${duration}.
    
    TONE & LANGUAGE: ${config.scriptRules}
    PACING: EXTREME DENSITY — 4-8 words max per scene voiceover.
    
    STRUCTURE:
    - Scenes 1-3: THE HOOK (Question → Twist → Bridge)
    - Body: Visual steps breaking down the concept
    - Final scene: Powerful one-liner conclusion
    
    For each scene:
    - 'voiceover': ${language} spoken text, very short (4-8 words)
    - 'visualPrompt': Simple stickman visual metaphor (in English for the artist)
    - 'keywords': Exact text to write inside the image (${config.visualText}, 1-3 words max)
    
    Return JSON array of objects.
  `;

  try {
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                voiceover: { type: Type.STRING },
                visualPrompt: { type: Type.STRING },
                keywords: { type: Type.STRING }
              },
              required: ["voiceover", "visualPrompt", "keywords"]
            }
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text).map((item: any, i: number) => ({
          id: `scene-${i}-${Date.now()}`,
          voiceover: item.voiceover,
          visualPrompt: item.visualPrompt,
          keywords: item.keywords,
        }));
      }
      return [];
    });
  } catch (e: any) {
    if (e.message === 'NO_API_KEY') throw e;
    console.error("Error generating script:", e);
    return [];
  }
};

// ─── Generate Doodle Image ──────────────────────────────────────────────────
export const generateDoodleImage = async (
  visualPrompt: string,
  textToRender: string,
  aspectRatio: '16:9' | '9:16',
  language: Language
): Promise<string | undefined> => {
  const ai = getAI();

  const fullPrompt = `
    Create a clean, minimalist digital illustration in the style of "Better Than Yesterday" or "Casually Explained" YouTube channels.
    
    SUBJECT: A classic STICK FIGURE representing: ${visualPrompt}.
    TEXT: Write "${textToRender}" clearly in the image. Font: Hand-written, bold black.
    
    STYLE RULES:
    1. CHARACTER: Classic stickman — perfect circle head, simple stick limbs.
    2. EXPRESSION: Clear facial expression (eyes and mouth only).
    3. LINES: Clean, smooth black lines. NOT messy. NO pencil texture.
    4. COLOR: BLACK lines only.
    5. BACKGROUND: Solid OFF-WHITE / BEIGE (#FDF6E3). Flat color.
    
    The text "${textToRender}" must be legible. Language: ${language}.
    Format: ${aspectRatio === '9:16' ? 'Vertical Portrait (9:16)' : 'Horizontal Landscape (16:9)'}.
    Center the stickman. Keep it simple and uncluttered.
  `;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: fullPrompt,
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
        imageConfig: { aspectRatio } as any,
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if ((part as any).inlineData?.data) {
          return `data:image/png;base64,${(part as any).inlineData.data}`;
        }
      }
    }
    return undefined;
  });
};

// ─── Generate Thumbnail ─────────────────────────────────────────────────────
export const generateThumbnailImage = async (
  title: string,
  visualMetaphor: string = "",
  aspectRatio: '16:9' | '9:16'
): Promise<string | undefined> => {
  const ai = getAI();

  const prompt = `
    YouTube Thumbnail for: "${title}".
    Visual: A funny, highly expressive STICK FIGURE engaging with: ${visualMetaphor || 'the concept of the title'}.
    
    STYLE:
    1. Classic stickman — perfect circle head, simple limbs.
    2. Highly expressive face (shocked, thinking, determined).
    3. Clean smooth black lines. NOT messy.
    4. Background: Solid OFF-WHITE / BEIGE (#FDF6E3).
    
    No text in the image. Minimalist, high contrast (Black on Beige).
    Format: ${aspectRatio === '9:16' ? 'Vertical Portrait (9:16)' : 'Horizontal Landscape (16:9)'}.
  `;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: prompt,
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
        imageConfig: { aspectRatio } as any,
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if ((part as any).inlineData?.data) {
          return `data:image/png;base64,${(part as any).inlineData.data}`;
        }
      }
    }
    return undefined;
  });
};

// ─── Rewrite Script ─────────────────────────────────────────────────────────
export const rewriteScript = async (
  currentScript: string,
  mode: 'longer' | 'shorter',
  language: Language
): Promise<string> => {
  const ai = getAI();
  const config = LANGUAGE_CONFIG[language];

  const prompt = `
    You are a professional video script editor for the ${language} market.
    Rewrite the following script to be ${mode === 'longer'
      ? 'slightly more detailed and emotional (~20% longer)'
      : 'more concise and punchy (~20% shorter)'}.
    
    Rules:
    1. Keep the same meaning and core message.
    2. Maintain tone: ${config.scriptRules}
    3. Return ONLY the rewritten text, no explanations.
    
    Original:
    "${currentScript}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt
    });
    return response.text || currentScript;
  } catch (e) {
    console.error("Rewrite error:", e);
    return currentScript;
  }
};

// ─── WAV Header Helper ──────────────────────────────────────────────────────
const createWavHeader = (dataLength: number, sampleRate = 24000) => {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false);     // "RIFF"
  view.setUint32(4, 36 + dataLength, true); // ChunkSize
  view.setUint32(8, 0x57415645, false);     // "WAVE"
  view.setUint32(12, 0x666d7420, false);    // "fmt "
  view.setUint32(16, 16, true);             // Subchunk1Size
  view.setUint16(20, 1, true);              // AudioFormat (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  view.setUint32(36, 0x64617461, false);    // "data"
  view.setUint32(40, dataLength, true);

  return buffer;
};

// ─── Generate Speech (TTS) ──────────────────────────────────────────────────
export const generateSpeech = async (
  text: string,
  language: Language
): Promise<Blob | null> => {
  const ai = getAI();
  const config = LANGUAGE_CONFIG[language];

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TTS,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: config.voiceName }
          }
        }
      } as any,
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) throw new Error("No audio data returned");

    const binaryString = window.atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const wavHeader = createWavHeader(bytes.length, 24000);
    return new Blob([wavHeader, bytes], { type: 'audio/wav' });
  } catch (e) {
    console.error("TTS Error:", e);
    return null;
  }
};
