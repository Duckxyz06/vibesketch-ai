module.exports = function handler(req, res) {
  res.json({
    status: 'active',
    hasDefaultGeminiKey: !!process.env.GEMINI_API_KEY,
    runtime: 'vercel-serverless',
  });
};
