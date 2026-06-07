import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({
    status: 'active',
    hasDefaultGeminiKey: !!process.env.GEMINI_API_KEY,
    runtime: 'vercel-serverless',
  });
}
