import React, { useState } from 'react';
import { Button } from './Button';

interface ApiKeyGateProps {
  onKeySet: () => void;
}

export const ApiKeyGate: React.FC<ApiKeyGateProps> = ({ onKeySet }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);

  const handleSave = async () => {
    const trimmed = key.trim();
    if (!trimmed.startsWith('AIza')) {
      setError('Key Gemini bắt đầu bằng "AIza...". Kiểm tra lại.');
      return;
    }
    setTesting(true);
    setError('');
    try {
      // Quick test call
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${trimmed}`
      );
      if (!res.ok) throw new Error('Invalid key');
      localStorage.setItem('vibesketch_gemini_key', trimmed);
      onKeySet();
    } catch {
      setError('Key không hợp lệ hoặc không có kết nối. Thử lại.');
    }
    setTesting(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 animate-fade-in">
      <div className="text-center space-y-3">
        <div className="text-6xl">🔑</div>
        <h2 className="font-hand text-4xl font-bold text-ink">Nhập Gemini API Key</h2>
        <p className="font-sans text-gray-500 max-w-md">
          App dùng Gemini API trực tiếp từ trình duyệt của bạn.
          Key được lưu ở localStorage, không gửi đến server nào.
        </p>
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-blue-500 hover:underline font-sans"
        >
          → Lấy key miễn phí tại aistudio.google.com/apikey
        </a>
      </div>

      <div className="w-full max-w-md space-y-3">
        <input
          type="password"
          value={key}
          onChange={e => { setKey(e.target.value); setError(''); }}
          placeholder="AIza..."
          className="w-full bg-paper border-2 border-gray-300 focus:border-ink rounded-lg p-4 font-sans text-base outline-none transition-colors"
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />
        {error && <p className="text-red-500 text-sm font-sans">{error}</p>}
        <Button onClick={handleSave} isLoading={testing} className="w-full">
          {testing ? 'Đang kiểm tra...' : 'Lưu & Bắt đầu'}
        </Button>
      </div>

      <p className="text-xs text-gray-400 font-sans max-w-sm text-center">
        Nếu đã deploy lên Vercel với biến môi trường <code className="bg-gray-100 px-1 rounded">GEMINI_API_KEY</code>, bỏ qua bước này — app sẽ tự dùng key server.
      </p>
    </div>
  );
};
