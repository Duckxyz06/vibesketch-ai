import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, History, Settings2, Save, FileUp, Play, Square, Download, 
  RotateCcw, Sparkles, HelpCircle, FileAudio, FileVideo, Layers,
  Trash2, ShieldCheck, Cpu, HardDrive, Check, KeySquare, ChevronRight, Edit3, Type, Eye, Video
} from 'lucide-react';
import { 
  Language, Tone, Duration, AspectRatio, ProjectConfig, Scene, 
  Title, CaptionStyle, Settings, WhisperWord, WhisperTiming, ProjectState 
} from './types';
import { DOODLE_CHARS, getCharacterSvg } from './data/characters';
import { TOPIC_CATEGORIES } from './data/topics';
import JSZip from 'jszip';

const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  mode: 'word_chunks',
  chunkWords: 4,
  position: 'bottom',
  sizePx: 36,
  textColor: 'yellow',
  highlight: 'red',
  background: true
};

const DEFAULT_SETTINGS: Settings = {
  imageProvider: 'gemini',
  audioProvider: 'gemini',
  coachioApiKey: '',
  geminiApiKey: '',
  groqApiKey: '',
  coachioTtsVoice: 'kPzsL2i3teMYv0FxEYQ6',
  geminiTtsStyle: 'inspirational',
  geminiTtsGender: 'male',
  captionStyle: DEFAULT_CAPTION_STYLE,
  transition: 'fade',
  transitionDuration: 0.25
};

const INITIAL_CONFIG: ProjectConfig = {
  topic: '',
  context: '',
  tone: 'Stoic',
  duration: 'Short (60s)',
  aspectRatio: '9:16',
  language: 'Vietnamese',
  characters: ['default-stickman']
};

export default function App() {
  // App views: 'create' | 'history' | 'settings' | 'setup'
  const [view, setView] = useState<'create' | 'history' | 'settings'>('create');
  const [step, setStep] = useState<number>(1);
  
  // App states
  const [session, setSession] = useState<string | null>(null);
  const [config, setConfig] = useState<ProjectConfig>(INITIAL_CONFIG);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<ProjectState[]>([]);
  
  const [titles, setTitles] = useState<Title[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [outline, setOutline] = useState<string>('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState<boolean>(false);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState<boolean>(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState<boolean>(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState<boolean>(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'error' | 'success'>('info');

  // Custom visual prompts overrides & custom titles
  const [customTitleText, setCustomTitleText] = useState<string>('');
  
  // Modals status
  const [charModalOpen, setCharModalOpen] = useState<boolean>(false);
  const [promptModalOpen, setPromptModalOpen] = useState<boolean>(false);
  const [editingSceneIdx, setEditingSceneIdx] = useState<number | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [topicModalOpen, setTopicModalOpen] = useState<boolean>(false);

  // Audio & video rendering
  const [fullScript, setFullScript] = useState<string>('');
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [timings, setTimings] = useState<WhisperTiming[]>([]);
  const [whisperWords, setWhisperWords] = useState<WhisperWord[]>([]);
  
  // Realtime playback & video render progress
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRenderingVideo, setIsRenderingVideo] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [systemLogs, setSystemLogs] = useState<string[]>(['VibeSketch RenderCore Initialized.', 'GPU Interface: WebGL 2.0 active.']);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const playAnimationRef = useRef<number | null>(null);

  // load persistent states on mount
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem('vibesketch_settings');
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
      const storedHistory = localStorage.getItem('vibesketch_history');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
      const storedActive = localStorage.getItem('vibesketch_active_project');
      if (storedActive) {
        setSession(storedActive);
      }
    } catch (e) {
      log('Error reading localStorage configurations.', 'error');
    }
  }, []);

  // Save Settings helper
  const saveSettings = (newSet: Settings) => {
    setSettings(newSet);
    try {
      localStorage.setItem('vibesketch_settings', JSON.stringify(newSet));
    } catch (e) {
      log('Storage failure writing preferences.', 'error');
    }
  };

  // Log debugger
  const log = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setSystemLogs(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 39)]);
    if (type === 'error') console.error(msg);
    else console.log(msg);
  };

  // Toast notifications helper
  const showToast = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    log(msg, type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Track project changes and save state locally
  useEffect(() => {
    if (!config.topic && L.length === 0 && scenes.length === 0) return;
    const saveTimer = setTimeout(() => {
      const activeId = session || `project-${Date.now()}`;
      if (!session) {
        setSession(activeId);
        localStorage.setItem('vibesketch_active_project', activeId);
      }
      
      const payload: ProjectState = {
        id: activeId,
        timestamp: new Date().toISOString(),
        topic: config.topic,
        selectedTitle: selectedTitle || '',
        thumbnailUrl: thumbnailUrl || undefined,
        fullScript,
        step,
        config,
        titles,
        scenes
      };

      setHistory(prev => {
        const index = prev.findIndex(item => item.id === activeId);
        let updated;
        if (index > -1) {
          updated = [...prev];
          updated[index] = payload;
        } else {
          updated = [payload, ...prev];
        }
        try {
          localStorage.setItem('vibesketch_history', JSON.stringify(updated.slice(0, 30)));
        } catch (e) {
          log('Storage limit warning. Clearing old histories.', 'error');
        }
        return updated;
      });
    }, 1000);

    return () => clearTimeout(saveTimer);
  }, [config, titles, selectedTitle, scenes, thumbnailUrl, fullScript, step]);

  // Synchronize fullScript with the text of all scenes to ensure edits and manually entered text are always up to date
  useEffect(() => {
    if (scenes && scenes.length > 0) {
      const computedScript = scenes.map(s => s.voiceover || '').join(' ').trim();
      if (computedScript !== fullScript) {
        setFullScript(computedScript);
      }
    } else {
      if (fullScript !== '') {
        setFullScript('');
      }
    }
  }, [scenes, fullScript]);

  const triggerReset = () => {
    if (confirm('Khởi tạo lại toàn bộ dự án hiện tại?')) {
      setSession(null);
      localStorage.removeItem('vibesketch_active_project');
      setConfig(INITIAL_CONFIG);
      setTitles([]);
      setSelectedTitle(null);
      setOutline('');
      setScenes([]);
      setThumbnailUrl(null);
      setFullScript('');
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      setAudioBase64(null);
      setTimings([]);
      setWhisperWords([]);
      setCurrentTime(0);
      setIsPlaying(false);
      if (renderedVideoUrl) URL.revokeObjectURL(renderedVideoUrl);
      setRenderedVideoUrl(null);
      setStep(1);
      showToast('Đã làm trống không gian làm việc.', 'info');
    }
  };

  const loadProject = (projId: string) => {
    const proj = history.find(p => p.id === projId);
    if (proj) {
      setSession(proj.id);
      localStorage.setItem('vibesketch_active_project', proj.id);
      setConfig(proj.config);
      setTitles(proj.titles);
      setSelectedTitle(proj.selectedTitle);
      setScenes(proj.scenes);
      setThumbnailUrl(proj.thumbnailUrl || null);
      setFullScript(proj.fullScript);
      setStep(proj.step);
      setView('create');
      showToast(`Đã mở dự án: ${proj.selectedTitle || proj.topic}`, 'success');
    }
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Xoá bản lưu này vĩnh viễn khỏi thiết bị?')) {
      setHistory(prev => {
        const next = prev.filter(p => p.id !== id);
        try {
          localStorage.setItem('vibesketch_history', JSON.stringify(next));
        } catch (err) {}
        return next;
      });
      if (session === id) {
        setSession(null);
        localStorage.removeItem('vibesketch_active_project');
      }
      showToast('Đã xoá bản lưu dự án.', 'info');
    }
  };

  // Project backup: Export JSON
  const exportProject = () => {
    const activeTitle = selectedTitle || config.topic || 'Du_An_Vibe';
    const filename = `${activeTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_storyboard.json`;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      app: "VibeSketchAI",
      version: "4.2",
      state: {
        config,
        selectedTitle,
        titles,
        scenes,
        outline,
        fullScript,
        step,
        thumbnailUrl
      }
    }, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href",     dataStr     );
    dlAnchorElem.setAttribute("download", filename);
    dlAnchorElem.click();
    showToast('Đã xuất tập tin lưu dự án thành công!', 'success');
  };

  // Project restore: Import JSON
  const importProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files.length > 0) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.app === "VibeSketchAI" && parsed.state) {
            const s = parsed.state;
            setConfig(s.config);
            setTitles(s.titles || []);
            setSelectedTitle(s.selectedTitle || null);
            setScenes(s.scenes || []);
            setOutline(s.outline || '');
            setFullScript(s.fullScript || '');
            setThumbnailUrl(s.thumbnailUrl || null);
            setStep(s.step || 1);
            setSession(`proj-${Date.now()}`);
            showToast('Khôi phục dữ liệu kịch bản & hình ảnh thành công!', 'success');
          } else {
            showToast('Tập tin cấu hình không hợp lệ hoặc sai cấu trúc.', 'error');
          }
        } catch (err) {
          showToast('Lỗi parse JSON. Vui lòng kiểm tra lại file.', 'error');
        }
      };
    }
  };

  // AI request helpers
  const handleQuery = async (endpoint: string, bodyPayload: any) => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...bodyPayload,
        geminiKey: settings.geminiApiKey
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Yêu cầu thất bại với status code ${res.status}`);
    }
    return res.json();
  };

  // STEP 1: Generate Titles
  const generateTitles = async () => {
    if (!config.topic.trim()) {
      showToast('Vui lòng điền chủ đề để bắt đầu!', 'error');
      return;
    }
    setIsGeneratingTitles(true);
    showToast('Đang quét xu hướng và tạo 5 tiêu đề viral bằng Gemini...', 'info');

    try {
      const res = await handleQuery('/api/generate-titles', {
        topic: config.topic,
        tone: config.tone,
        language: config.language,
        context: config.context
      });
      if (res.titles && res.titles.length > 0) {
        setTitles(res.titles.map((t: string, i: number) => ({
          id: `title-${i}`,
          text: t,
          selected: i === 0
        })));
        setSelectedTitle(res.titles[0]);
        setStep(2);
        showToast('Đã tạo thành công 5 tuỳ chọn tiêu đề viral!', 'success');
      } else {
        throw new Error('Mô hình không trả về mảng tiêu đề hợp lệ.');
      }
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi kết nối hệ thống tạo tiêu đề.', 'error');
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  // STEP 1.5: Factual Outline Research
  const generateOutline = async () => {
    if (!config.topic.trim()) {
      showToast('Cần nhập chủ đề trước khi nghiên cứu!', 'error');
      return;
    }
    setIsGeneratingOutline(true);
    showToast('AI đang phân tích & xây dựng dàn ý trung thực bảo vệ bản quyền...', 'info');
    try {
      const res = await handleQuery('/api/generate-outline', {
        topic: config.topic,
        tone: config.tone,
        language: config.language
      });
      setOutline(res.outline);
      setConfig(prev => ({ ...prev, context: res.outline }));
      showToast('Đã gộp dàn ý nghiên cứu vào ngữ cảnh thành công!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Không thể tạo dàn ý.', 'error');
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  // STEP 2: Select Title & Generate Script
  const generateScript = async () => {
    if (!selectedTitle) {
      showToast('Vui lòng chọn hoặc điền 1 tiêu đề phù hợp.', 'error');
      return;
    }
    setIsGeneratingScript(true);
    showToast('Đang viết kịch bản phân cảnh chi tiết (Storyboard)...', 'info');

    try {
      const res = await handleQuery('/api/generate-script', {
        title: selectedTitle,
        topic: config.topic,
        tone: config.tone,
        duration: config.duration,
        language: config.language,
        context: config.context
      });
      if (res.scenes && res.scenes.length > 0) {
        const parsedScenes: Scene[] = res.scenes.map((s: any, i: number) => ({
          id: `scene-${i}-${Date.now()}`,
          voiceover: s.text || s.voiceover,
          visualPrompt: s.imagePrompt || s.visualPrompt,
          keywords: s.keywords || s.text || s.voiceover
        }));
        setScenes(parsedScenes);
        setFullScript(parsedScenes.map(s => s.voiceover).join(' '));
        setStep(3);
        showToast(`Đã xuất dàn cảnh gồm ${parsedScenes.length} phân đoạn!`, 'success');
      } else {
        throw new Error('Dữ liệu kịch bản trả về rỗng.');
      }
    } catch (e: any) {
      showToast(e.message || 'Lỗi xây dựng kịch bản.', 'error');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // STEP 3: Generate All Images (Storyboard Draw)
  const generateStoryboardImages = async () => {
    setStep(4);
    setIsGeneratingImages(true);
    showToast('Khởi động động cơ vẽ tranh VibeSketch. Tiền tiến trình...', 'info');

    const updatedScenes = [...scenes];
    let failureCount = 0;

    for (let i = 0; i < updatedScenes.length; i++) {
      const activeScene = updatedScenes[i];
      if (activeScene.imageUrl) continue; // Skip already drawn

      updatedScenes[i] = { ...activeScene, isGeneratingImage: true, error: undefined };
      setScenes([...updatedScenes]);

      try {
        const fullPrompt = `Whiteboard minimalist line art, hand drawn marker outline, flat off-white background (#FDF6E3). Scene: ${activeScene.visualPrompt}. Theme contains ${config.characters.map(c => c).join(' and ')}. High contrast cartoon concept sketch.`;
        const res = await handleQuery('/api/generate-image', {
          prompt: fullPrompt,
          aspectRatio: config.aspectRatio
        });
        updatedScenes[i] = {
          ...activeScene,
          imageUrl: res.imageUrl,
          isGeneratingImage: false
        };
      } catch (err: any) {
        failureCount++;
        updatedScenes[i] = {
          ...activeScene,
          isGeneratingImage: false,
          error: err.message || 'Lỗi kết nối bộ vẽ'
        };
      }
      setScenes([...updatedScenes]);
    }

    setIsGeneratingImages(false);
    if (failureCount > 0) {
      showToast(`Hoàn tất vẽ. Gặp lỗi vẽ tranh tại ${failureCount} phân đoạn.`, 'error');
    } else {
      showToast('Tất cả phân cảnh đã được phác hoạ thành công!', 'success');
    }
  };

  // STEP 4: Regenerate Single Scene Image
  const drawSingleImage = async (idx: number, optPrompt?: string) => {
    const targetScene = scenes[idx];
    const updated = [...scenes];
    updated[idx] = { ...targetScene, isGeneratingImage: true, error: undefined };
    setScenes(updated);

    try {
      const promptToUse = optPrompt || targetScene.visualPrompt;
      const fullPrompt = `Whiteboard minimalist line art, hand drawn marker outline, flat off-white background (#FDF6E3). Scene: ${promptToUse}. Theme contains ${config.characters.map(c => c).join(' and ')}. High contrast cartoon concept sketch.`;
      const res = await handleQuery('/api/generate-image', {
        prompt: fullPrompt,
        aspectRatio: config.aspectRatio
      });
      updated[idx] = {
        ...targetScene,
        imageUrl: res.imageUrl,
        visualPrompt: promptToUse,
        isGeneratingImage: false
      };
      setScenes(updated);
      showToast(`Đã vẽ lại Cảnh ${idx + 1}!`, 'success');
    } catch (err: any) {
      updated[idx] = {
        ...targetScene,
        isGeneratingImage: false,
        error: err.message || 'Không thể tải ảnh'
      };
      setScenes(updated);
      showToast('Lỗi khi vẽ lại ảnh.', 'error');
    }
  };

  // STEP 5: Generate Cover / Thumbnail
  const generateThumbnail = async (optPrompt?: string) => {
    setIsGeneratingThumbnail(true);
    setThumbnailUrl(null);
    showToast('Thiết kế Bìa thumbnail tỉ lệ click chuột (CTR) cao...', 'info');

    try {
      const promptToUse = optPrompt || `High-CTR YouTube vector thumbnail. Bold graphic layout, marker handwritten text: "${selectedTitle || config.topic}". Red arrow, hand-drawn circle highlights, emotional stickman character background #FDF6E3.`;
      const res = await handleQuery('/api/generate-image', {
        prompt: promptToUse,
        aspectRatio: config.aspectRatio
      });
      setThumbnailUrl(res.imageUrl);
      showToast('Đã tải bìa Thumbnail thành công!', 'success');
    } catch (err: any) {
      showToast('Không thể tạo Thumbnail.', 'error');
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  // STEP 6: Generate TTS Voiceover
  const startTtsSynthesis = async () => {
    let scriptToUse = fullScript.trim();
    if (!scriptToUse && scenes.length > 0) {
      scriptToUse = scenes.map(s => s.voiceover || '').join(' ').trim();
      if (scriptToUse) {
        setFullScript(scriptToUse);
      }
    }
    if (!scriptToUse) {
      showToast('Kịch bản trống không thể tạo giọng!', 'error');
      return;
    }
    setIsGeneratingAudio(true);
    showToast('Đang tổng hợp giọng nói AI (Gemini TTS)...', 'info');

    try {
      const res = await handleQuery('/api/generate-audio', {
        text: scriptToUse,
        voiceName: config.language === 'English' ? 'Puck' : config.language === 'Japanese' ? 'Kore' : 'Charon',
        styleInstruction: settings.geminiTtsStyle ? `Read clearly with style: ${settings.geminiTtsStyle}` : undefined
      });
      if (res.audioBase64) {
        setAudioBase64(res.audioBase64);
        const binaryStr = atob(res.audioBase64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes], { type: 'audio/mp3' });
        const audUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(audUrl);
        showToast('Tổng hợp hoàn tất! Bản thu âm sẵn sàng.', 'success');

        // Estimate timeline timings based on average speech rate
        applySimpleTimelineTimings(audioBlob);
      }
    } catch (e: any) {
      showToast(e.message || 'Gặp sự cố khi tổng hợp TTS.', 'error');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Create simple duration timings based on words
  const applySimpleTimelineTimings = (blob: Blob) => {
    const audioNode = new Audio();
    audioNode.src = URL.createObjectURL(blob);
    audioNode.onloadedmetadata = () => {
      const duration = audioNode.duration;
      setAudioDuration(duration);
      
      const totalWords = fullScript.split(/\s+/).filter(Boolean).length;
      let elapsed = 0;

      const calculatedTimings: WhisperTiming[] = scenes.map((scene, idx) => {
        const wordsInScene = scene.voiceover.split(/\s+/).filter(Boolean).length;
        const percent = totalWords > 0 ? wordsInScene / totalWords : 1 / scenes.length;
        const sceneDuration = duration * percent;
        
        const start = elapsed;
        const end = Math.min(duration, elapsed + sceneDuration);
        elapsed = end;

        return {
          sceneId: scene.id,
          start,
          end,
          source: 'estimate'
        };
      });

      setTimings(calculatedTimings);
      log(`Calculated timeline for ${calculatedTimings.length} scenes. Duration: ${duration.toFixed(2)}s`, 'info');
    };
  };

  // Voiceover re-write (Longer/Shorter)
  const adjustVoiceoverLength = async (idx: number, mode: 'longer' | 'shorter') => {
    const targetScene = scenes[idx];
    setIsGeneratingScript(true);
    showToast(`Đang biến đổi lời dẫn Cảnh ${idx + 1} (${mode})...`, 'info');

    try {
      const res = await handleQuery('/api/rewrite-voiceover', {
        originalText: targetScene.voiceover,
        mode,
        language: config.language
      });
      const updated = [...scenes];
      const origText = targetScene.voiceover;
      updated[idx] = {
        ...targetScene,
        voiceover: res.rewritten,
        voiceoverVariants: [origText, ...(targetScene.voiceoverVariants || [])].slice(0, 5)
      };
      setScenes(updated);
      setFullScript(updated.map(s => s.voiceover).join(' '));
      showToast(`Đã viết lại Cảnh ${idx + 1} thành công!`, 'success');
    } catch (e: any) {
      showToast('Lỗi viết lại giọng thoại.', 'error');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // STEP 7: WEBM Video Exporter (The Web-Native Alternative!)
  const exportWebmVideo = async () => {
    if (!audioUrl) {
      showToast('Cần có file âm thanh giọng thoại để xuất video.', 'error');
      return;
    }
    setIsRenderingVideo(true);
    setRenderProgress(0);
    setRenderedVideoUrl(null);
    showToast('Đang kết tải phần cứng, khởi động Canvas Recorder...', 'info');

    try {
      const { w, h } = config.aspectRatio === '16:9' ? { w: 1280, h: 720 } : { w: 720, h: 1280 };
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Không thể khởi tạo môi trường Canvas 2D.');

      const fps = 30;
      const totalDuration = audioDuration || 15;
      
      // Load all scenes images in memory first
      const imageObjects = await Promise.all(scenes.map(s => {
        return new Promise<HTMLImageElement | null>((resolve) => {
          if (!s.imageUrl) return resolve(null);
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = s.imageUrl;
        });
      }));

      // Setup audio context recording stream
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioResponse = await fetch(audioUrl);
      const audioData = await audioResponse.arrayBuffer();
      const decodedBuffer = await audioContext.decodeAudioData(audioData);
      
      const audioNode = audioContext.createBufferSource();
      audioNode.buffer = decodedBuffer;
      const audioDest = audioContext.createMediaStreamDestination();
      audioNode.connect(audioDest);
      audioNode.connect(audioContext.destination);

      // Capture canvas stream
      const canvasStream = canvas.captureStream(fps);
      const mixedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioDest.stream.getAudioTracks()
      ]);

      const recorder = new MediaRecorder(mixedStream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: 'video/webm' });
        const videoBlobUrl = URL.createObjectURL(finalBlob);
        setRenderedVideoUrl(videoBlobUrl);
        setIsRenderingVideo(false);
        showToast('Xuất video WebM hoàn tất! Sẵn sàng tải xuống.', 'success');
      };

      // Start play
      recorder.start();
      audioNode.start(0);

      // Render loops
      let framesCount = Math.ceil(totalDuration * fps);
      let currentFrame = 0;

      const renderInterval = setInterval(() => {
        if (currentFrame >= framesCount) {
          clearInterval(renderInterval);
          audioNode.stop();
          recorder.stop();
          return;
        }

        const playTime = currentFrame / fps;
        setRenderProgress(Number((currentFrame / framesCount).toFixed(2)));

        // Draw active scene background & image
        const activeTiming = timings.find(t => playTime >= t.start && playTime < t.end) || timings[0];
        const activeSceneIdx = scenes.findIndex(s => s.id === (activeTiming?.sceneId || ''));
        const imgObj = imageObjects[activeSceneIdx !== -1 ? activeSceneIdx : 0];

        ctx.fillStyle = '#EFEBD8'; // Vintage Paper Color
        ctx.fillRect(0, 0, w, h);

        if (imgObj) {
          ctx.drawImage(imgObj, 0, 0, w, h);
        }

        // Draw subtitles on bottom
        const caption = scenes[activeSceneIdx !== -1 ? activeSceneIdx : 0]?.voiceover || '';
        ctx.font = `bold ${settings.captionStyle.sizePx * (w / 1280)}px "Sora"`;
        ctx.textAlign = 'center';
        ctx.fillStyle = settings.captionStyle.textColor === 'yellow' ? '#f59e0b' : '#ffffff';
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 4;
        
        const subPosition = settings.captionStyle.position === 'top' ? h * 0.15 : settings.captionStyle.position === 'middle' ? h * 0.5 : h * 0.85;
        ctx.strokeText(caption, w / 2, subPosition);
        ctx.fillText(caption, w / 2, subPosition);

        currentFrame++;
      }, 1000 / fps);

    } catch (e: any) {
      setIsRenderingVideo(false);
      showToast(e.message || 'Gặp sự cố khi kết vẽ Mp4.', 'error');
    }
  };

  const L = titles;
  const U = scenes;
  const Te = ""; // Dummy string substitute
  const K = ""; // Dummy string substitute
  const ne = ""; // Dummy string substitute
  
  return (
    <div className="flex flex-col h-screen w-full bg-[#0F172A] text-[#E2E8F0] overflow-hidden font-sans select-none">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed top-16 right-6 z-[100] px-4 py-3 rounded-lg shadow-2xl border flex items-center gap-2 border-slate-700 backdrop-blur-md animate-fade-in ${
          toastType === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 
          toastType === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
        }`}>
          <span className="text-lg">⚡</span>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Panel */}
      <header className="h-14 border-b border-slate-800 bg-[#1E293B] flex items-center justify-between px-6 shrink-0 z-40 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">R</div>
          <h1 className="text-lg font-semibold tracking-wider flex items-center gap-2">
            VibeSketch AI <span className="text-slate-500 font-normal text-xs italic">v4.2.1-stable</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
            <input type="file" ref={fileInputRef} onChange={importProject} accept=".json" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="btn-icon btn-secondary hover:bg-slate-700 transition">
              <FileUp size={14} className="text-slate-400" />
              <span>Mở Project (JSON)</span>
            </button>
            <button onClick={exportProject} className="btn-icon btn-secondary ml-1 hover:bg-slate-700 transition">
              <Save size={14} className="text-slate-400" />
              <span>Lưu Project (JSON)</span>
            </button>
          </div>
          <div className="h-8 w-[1px] bg-slate-700 mx-2"></div>
          <button onClick={triggerReset} className="btn-icon btn-secondary text-red-400 border-red-500/10 hover:bg-red-500/10 transition">
            <RotateCcw size={14} />
            <span>Khởi Tạo Lại</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Hierarchy Panel */}
        <aside className="w-64 bg-slate-900/40 border border-slate-800 rounded-lg flex flex-col p-4 shrink-0 shadow-lg select-none">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
            <Layers size={12} />
            <span>DANH SÁCH BƯỚC</span>
          </h3>
          <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
            {[
              { num: 1, label: 'Chủ Đề & Bối Cảnh' },
              { num: 2, label: 'Lựa Chọn Tiêu Đề' },
              { num: 3, label: 'Kịch Bản Phân Cảnh' },
              { num: 4, label: 'Biên Tập Hình Ảnh' },
              { num: 5, label: 'Thiết Kế Thumbnail' },
              { num: 6, label: 'Tổng Hợp Giọng Đọc' },
              { num: 7, label: 'Ghép Trình Chiếu' }
            ].map((st) => (
              <button 
                key={st.num}
                onClick={() => setStep(st.num)}
                className={`w-full flex items-center justify-between p-2.5 rounded text-left transition select-none ${
                  step === st.num 
                    ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300' 
                    : 'border border-transparent hover:bg-slate-800/40 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-21 min-w-0">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === st.num ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>{st.num}</span>
                  <span className="text-sm truncate ml-1">{st.label}</span>
                </div>
                {step > st.num && <Check size={12} className="text-emerald-500 shrink-0" />}
              </button>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-4 mt-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
              <Cpu size={12} />
              <span>ĐỘNG CƠ VẼ TRANH</span>
            </h3>
            <div className="text-sm text-green-400 flex items-center gap-2 font-medium">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> 
              <span>VibeSketch Core v2</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 lines-clamp-2">
              Chân thực hóa doodle nét phấn tay tự nhiên trên nền bảng sần.
            </p>
          </div>
        </aside>

        {/* Center Viewport Portal */}
        <section className="flex-1 bg-slate-900/40 border border-slate-800 rounded-lg relative overflow-hidden flex flex-col shadow-lg viewport-grid p-4">
          <div className="absolute top-4 left-4 bg-slate-990 bg-slate-950/80 backdrop-blur border border-slate-800 rounded px-3 py-1 text-xs text-slate-400 font-mono z-10 select-none">
            BẢN ĐỒ PHÁC THẢO • RAYTRACED RENDER
          </div>
          
          <div className="flex-1 overflow-y-auto mt-8 px-4 flex flex-col justify-start">
            
            {/* STEP 1 WORKSPACE */}
            {step === 1 && (
              <div className="space-y-6 max-w-xl mx-auto w-full py-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold tracking-wider text-slate-300">Khung Ngôn Ngữ</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Vietnamese', 'English', 'Japanese'].map(lang => (
                      <button 
                        key={lang}
                        onClick={() => setConfig(prev => ({ ...prev, language: lang as Language }))}
                        className={`p-3 rounded border text-sm font-semibold transition ${
                          config.language === lang 
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg' 
                            : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {lang === 'Vietnamese' ? '🇻🇳 Tiếng Việt' : lang === 'English' ? '🇺🇸 English' : '🇯🇵 日本語'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold tracking-wider text-slate-300">Từ Khóa Chủ Đề</label>
                    <div className="flex gap-1">
                      <button onClick={() => setTopicModalOpen(true)} className="px-2.5 py-1 text-xs bg-slate-800 rounded text-slate-300 border border-slate-700 hover:border-slate-500 transition">
                        ✨ Gợi Ý Có Sẵn
                      </button>
                    </div>
                  </div>
                  <input 
                    type="text" 
                    value={config.topic} 
                    onChange={(e) => setConfig(prev => ({ ...prev, topic: e.target.value }))}
                    placeholder="Mô tả ý tưởng chính ngắn gọn..." 
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold tracking-wider text-slate-300">Ngữ Cảnh & Dẫn Chứng Nghiên Cứu</label>
                    <button 
                      onClick={generateOutline}
                      disabled={isGeneratingOutline}
                      className="px-2.5 py-1 text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded hover:bg-amber-500/20 transition flex items-center gap-1"
                    >
                      {isGeneratingOutline ? 'Đang phân tích...' : '✨ Gemini Nghiên Cứu Dàn Ý'}
                    </button>
                  </div>
                  <textarea 
                    value={config.context} 
                    onChange={(e) => setConfig(prev => ({ ...prev, context: e.target.value }))}
                    placeholder="Dán dữ liệu nguồn hay gạch đầu dòng ý bạn muốn kể tại đây..." 
                    rows={4} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-600 resize-none"
                  />
                  <p className="text-[10px] text-slate-500 italic">Dàn ý khoa học trung thực tránh tối đa bịa đặt số liệu (Hallucination).</p>
                </div>

                <button 
                  onClick={generateTitles}
                  disabled={isGeneratingTitles || !config.topic.trim()}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 active:scale-98 disabled:opacity-40 rounded-lg text-white font-bold tracking-wider transition shadow-lg shadow-blue-500/10"
                >
                  {isGeneratingTitles ? 'ĐANG TẠO TIÊU ĐỀ...' : 'TIẾP TỤC TẠO TIÊU ĐỀ'}
                </button>
              </div>
            )}

            {/* STEP 2 WORKSPACE */}
            {step === 2 && (
              <div className="space-y-4 max-w-xl mx-auto w-full py-4">
                <h3 className="text-base font-semibold text-slate-200">Gợi Ý Tiêu Đề Hook Thu Hút</h3>
                <div className="space-y-2">
                  {titles.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTitles(prev => prev.map(item => ({ ...item, selected: item.id === t.id })));
                        setSelectedTitle(t.text);
                      }}
                      className={`w-full p-4 rounded-lg border text-left transition text-sm font-semibold flex items-center justify-between ${
                        t.selected 
                          ? 'bg-blue-500/10 border-blue-500 text-blue-300' 
                          : 'bg-slate-950/20 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>{t.text}</span>
                      {t.selected && <Check size={14} />}
                    </button>
                  ))}
                  <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg">
                    <label className="text-xs text-slate-500 block mb-1">Tự Viết Tiêu Đề Riêng</label>
                    <input 
                      type="text" 
                      value={customTitleText} 
                      onChange={(e) => {
                        setCustomTitleText(e.target.value);
                        setSelectedTitle(e.target.value);
                      }}
                      placeholder="Nhập tiêu đề custom..."
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-300"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} className="px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-semibold transition text-sm">Quay lại</button>
                  <button 
                    onClick={generateScript}
                    disabled={isGeneratingScript || !selectedTitle}
                    className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 rounded-lg text-white font-bold tracking-wider transition text-sm"
                  >
                    {isGeneratingScript ? 'ĐANG BIÊN SOẠN KỊCH BẢN...' : 'VIẾT KỊCH BẢN PHÂN CẢNH'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 WORKSPACE */}
            {step === 3 && (
              <div className="space-y-4 w-full py-4 flex flex-col h-full">
                <div className="flex items-center justify-between shrink-0">
                  <h3 className="text-base font-semibold text-slate-200">Kịch Bản Phân Đột Phá Lời Thoại</h3>
                  <span className="text-xs text-slate-500">{scenes.length} phân cảnh được cấu trúc</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 max-h-[52vh] pr-2">
                  {scenes.map((sc, idx) => (
                    <div key={sc.id} className="p-4 bg-slate-950/20 border border-slate-800 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">Thoại Cảnh {idx + 1}</div>
                        <textarea 
                          value={sc.voiceover} 
                          onChange={(e) => {
                            const updated = [...scenes];
                            updated[idx].voiceover = e.target.value;
                            setScenes(updated);
                          }}
                          rows={2}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 resize-none"
                        />
                      </div>
                      <div>
                        <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1">Mô Tả Nét Vẽ (VibeSketch prompt)</div>
                        <textarea 
                          value={sc.visualPrompt} 
                          onChange={(e) => {
                            const updated = [...scenes];
                            updated[idx].visualPrompt = e.target.value;
                            setScenes(updated);
                          }}
                          rows={2}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2 shrink-0">
                  <button onClick={() => setStep(2)} className="px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-semibold transition text-sm">Quay lại</button>
                  <button 
                    onClick={generateStoryboardImages}
                    disabled={isGeneratingImages || scenes.length === 0}
                    className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 rounded-lg text-white font-bold tracking-wider transition text-sm"
                  >
                    PHÁC THẢO TOÀN BỘ LOGIC HÌNH ẢNH
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4 WORKSPACE */}
            {step === 4 && (
              <div className="space-y-4 w-full py-4 flex flex-col h-full">
                <div className="flex justify-between items-center shrink-0">
                  <h3 className="text-base font-semibold text-slate-200">Biên Tập & Chỉnh Sửa Storyboard</h3>
                  <button 
                    onClick={generateStoryboardImages}
                    className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs rounded hover:bg-blue-500/20 transition"
                  >
                    Vẽ Lại Toàn Bộ Các Cảnh Trống
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 max-h-[52vh] pr-2">
                  <div className={`grid gap-4 ${config.aspectRatio === '16:9' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {scenes.map((sc, idx) => (
                      <div key={sc.id} className="bg-slate-950/20 border border-slate-800 rounded-lg p-3 flex flex-col">
                        <div className={`relative bg-[#F9F7F0] border border-slate-800 overflow-hidden flex items-center justify-center rounded-md ${
                          config.aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'
                        }`}>
                          {sc.isGeneratingImage ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#F9F7F0] text-slate-900 font-hand text-lg">
                              <span className="animate-spin rounded-full h-5 w-5 border-2 border-slate-900 border-t-transparent"></span>
                              <span>Đang vẽ...</span>
                            </div>
                          ) : sc.imageUrl ? (
                            <img src={sc.imageUrl} className="w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 font-sans text-xs">
                              <span>Ảnh trống</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-2 space-y-1 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between text-[9px] text-slate-500 font-bold mb-1">
                              <span>CẢNH {idx + 1}</span>
                              <span className="text-blue-400 truncate max-w-[120px]">Keyword: {sc.keywords || '—'}</span>
                            </div>
                            <p className="text-xs text-slate-300 line-clamp-3">{sc.voiceover}</p>
                          </div>

                          <div className="flex gap-1.5 pt-2">
                            <button 
                              onClick={() => drawSingleImage(idx)}
                              className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded border border-slate-700"
                            >
                              ↺ Bản vẽ mới
                            </button>
                            <button 
                              onClick={() => {
                                setEditingSceneIdx(idx);
                                setCustomPrompt(sc.visualPrompt);
                                setPromptModalOpen(true);
                              }}
                              className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded border border-slate-700"
                            >
                              ✏ Prompt
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-2 shrink-0">
                  <button onClick={() => setStep(3)} className="px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-semibold transition text-sm">Quay lại</button>
                  <button onClick={() => { setStep(5); generateThumbnail(); }} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-bold transition text-sm">
                    TIẾP TỤC THIẾT KẾ THUMBNAIL
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5 WORKSPACE */}
            {step === 5 && (
              <div className="space-y-4 max-w-xl mx-auto w-full py-4 flex flex-col h-full items-center justify-center">
                <h3 className="text-base font-semibold text-slate-200">Ảnh Bìa Thu Hút Lượt Click (High CTR)</h3>
                
                <div className={`relative bg-[#F9F7F0] border-4 border-slate-800 overflow-hidden flex items-center justify-center rounded-xl shadow-2xl ${
                  config.aspectRatio === '16:9' ? 'w-[420px] aspect-video' : 'w-[270px] aspect-[9/16]'
                }`}>
                  {isGeneratingThumbnail ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-900 font-hand text-xl bg-[#F9F7F0]">
                      <span className="animate-spin rounded-full h-8 w-8 border-4 border-slate-900 border-t-transparent"></span>
                      <span>Đang thiết kế bìa...</span>
                    </div>
                  ) : thumbnailUrl ? (
                    <img src={thumbnailUrl} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-400 font-hand text-lg">[ Chưa có bìa ]</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => generateThumbnail()} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700 text-xs font-semibold select-none shadow">
                    ↺ Vẽ lại bìa
                  </button>
                  <button 
                    onClick={() => {
                      setEditingSceneIdx(-1); // -1 means thumbnail
                      setCustomPrompt(selectedTitle ? `Doodle style thumbnail for "${selectedTitle}".` : '');
                      setPromptModalOpen(true);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700 text-xs font-semibold select-none shadow"
                  >
                    ✏ Tự viết Prompt
                  </button>
                  {thumbnailUrl && (
                    <a href={thumbnailUrl} download="thumbnail.png" className="px-4 py-2 bg-[#D1FAE5] text-[#065F46] hover:bg-emerald-100 rounded-lg text-xs font-semibold shadow select-none flex items-center gap-1">
                      <Download size={12} />
                      Tải ảnh bìa
                    </a>
                  )}
                </div>

                <div className="flex gap-2 w-full pt-4 shrink-0">
                  <button onClick={() => setStep(4)} className="px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-semibold transition text-sm">Quay lại</button>
                  <button onClick={() => setStep(6)} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-bold transition text-sm">
                    TIẾP TỤC TẠO GIỌNG ĐỌC AI
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6 WORKSPACE */}
            {step === 6 && (
              <div className="space-y-4 max-w-xl mx-auto w-full py-4 flex flex-col h-full justify-center">
                <h3 className="text-base font-semibold text-slate-200">Giao Diện Tổng Hợp Lời Thoại AI</h3>

                <div className="p-4 bg-slate-950/20 border border-slate-800 rounded-lg space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-2">Giọng đọc ưu tiên</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setConfig(prev => ({ ...prev, tone: 'Motivational' }))}
                        className={`p-3 rounded border text-sm font-semibold transition ${
                          config.tone === 'Motivational' 
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg' 
                            : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        👩 Giọng nữ (Kore)
                      </button>
                      <button 
                        onClick={() => setConfig(prev => ({ ...prev, tone: 'Stoic' }))}
                        className={`p-3 rounded border text-sm font-semibold transition ${
                          config.tone === 'Stoic' 
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg' 
                            : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        👨 Giọng nam (Charon)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white/5 border border-slate-800 rounded-lg flex flex-col items-center justify-center py-6 gap-3">
                  {isGeneratingAudio ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></span>
                      <span className="text-sm text-slate-300">Đang tạo âm thanh thoại...</span>
                    </div>
                  ) : audioUrl ? (
                    <div className="w-full space-y-2">
                      <audio src={audioUrl} controls className="w-full h-10" />
                      <div className="text-center text-[10px] text-slate-500">Giọng nói tổng hợp có độ dài {audioDuration.toFixed(1)} giây.</div>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 py-2">Chưa thu âm giọng thoại. Click tạo ngay.</div>
                  )}
                  
                  <button 
                    onClick={startTtsSynthesis} 
                    disabled={isGeneratingAudio}
                    className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 rounded text-sm text-white font-bold select-none transition"
                  >
                    🎙 Tạo Giọng Đọc
                  </button>
                </div>

                <div className="flex gap-2 pt-4 shrink-0">
                  <button onClick={() => setStep(5)} className="px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-semibold transition text-sm">Quay lại</button>
                  <button onClick={() => setStep(7)} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-bold transition text-sm">
                    TIẾP TỤC DỰNG VIDEO THÀNH PHẨM
                  </button>
                </div>
              </div>
            )}

            {/* STEP 7 WORKSPACE */}
            {step === 7 && (
              <div className="space-y-4 max-w-xl mx-auto w-full py-4 flex flex-col h-full justify-center">
                <div className="flex justify-between items-center shrink-0">
                  <h3 className="text-base font-semibold text-slate-200">Trình Xem Trước & Kết Xuất</h3>
                  <button onClick={() => setSettings(prev => ({ ...prev, captionStyle: { ...prev.captionStyle, mode: prev.captionStyle.mode === 'karaoke' ? 'word_chunks' : 'karaoke' }}))} className="text-xs text-blue-400 underline">Cấu hình karaoke</button>
                </div>

                {/* Subtitle / Caption Settings Toolbar */}
                <div className="p-3 bg-slate-950/20 border border-slate-800 rounded-lg grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">MÀU CHỮ</label>
                    <select 
                      value={settings.captionStyle.textColor}
                      onChange={(e) => setSettings(prev => ({ ...prev, captionStyle: { ...prev.captionStyle, textColor: e.target.value as 'white' | 'yellow' }}))}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-slate-300"
                    >
                      <option value="white">Trắng</option>
                      <option value="yellow">Vàng</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">KIỂU CAPTION</label>
                    <select 
                      value={settings.captionStyle.mode}
                      onChange={(e) => setSettings(prev => ({ ...prev, captionStyle: { ...prev.captionStyle, mode: e.target.value as any }}))}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-slate-300"
                    >
                      <option value="word_chunks">Cụm từ</option>
                      <option value="single_word">Một từ</option>
                      <option value="full">Cả câu</option>
                    </select>
                  </div>
                </div>

                {/* Web-Native render progress */}
                {isRenderingVideo ? (
                  <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Đang trích xuất & ghép luồng âm thanh...</span>
                      <span>{Math.round(renderProgress * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-100" style={{ width: `${renderProgress * 100}%` }}></div>
                    </div>
                  </div>
                ) : renderedVideoUrl ? (
                  <div className="space-y-2 bg-slate-950/40 p-4 border border-blue-500/20 rounded-lg">
                    <video src={renderedVideoUrl} controls className={`mx-auto rounded bg-black ${
                      config.aspectRatio === '16:9' ? 'w-[420px] aspect-video' : 'w-[240px] aspect-[9/16]'
                    }`} />
                    <div className="flex justify-center pt-2">
                      <a href={renderedVideoUrl} download="story_video.webm" className="btn-icon btn-primary flex items-center gap-1 shadow">
                        <Download size={14} />
                        Tải video thành phẩm (.webm)
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-500 text-xs py-4">Video chưa được render. Nhấn nút bên dưới để render bằng Canvas Recorder.</div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 shrink-0">
                  <button 
                    onClick={exportWebmVideo} 
                    disabled={isRenderingVideo || !audioUrl}
                    className="py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 rounded-lg text-white font-bold text-sm shadow-lg shadow-blue-500/10"
                  >
                    🎬 Render Video WebM
                  </button>
                  <button 
                    onClick={async () => {
                      const zip = new JSZip();
                      zip.file('metadata.json', JSON.stringify(config, null, 2));
                      zip.file('script.txt', fullScript);
                      
                      // Add images if base64
                      scenes.forEach((s, i) => {
                        if (s.imageUrl && s.imageUrl.startsWith('data:')) {
                          const base64Bytes = s.imageUrl.split(',')[1];
                          zip.file(`scene_${String(i+1).padStart(2, '0')}.png`, base64Bytes, { base64: true });
                        }
                      });

                      if (thumbnailUrl && thumbnailUrl.startsWith('data:')) {
                        const base64Bytes = thumbnailUrl.split(',')[1];
                        zip.file('thumbnail.png', base64Bytes, { base64: true });
                      }

                      const zipBlob = await zip.generateAsync({ type: 'blob' });
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(zipBlob);
                      a.download = `${config.topic.replace(/[^a-z0-9]/gi, '_') || 'vibesketch'}_assets.zip`;
                      a.click();
                      showToast('Tải ZIP dự án thành công!', 'success');
                    }}
                    className="py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-bold text-sm border border-slate-700"
                  >
                    📦 Tải ZIP Toàn Bộ Assets
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Timeline Viewport Slider */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 z-10 select-none">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <button 
                key={i} 
                onClick={() => setStep(i)}
                className={`w-10 h-1.5 rounded transition ${
                  step === i ? 'bg-blue-500' : 'bg-slate-700 hover:bg-slate-500'
                }`} 
              />
            ))}
          </div>
        </section>

        {/* Right Properties Panel */}
        <aside className="w-72 bg-slate-900/40 border border-slate-800 rounded-lg p-4 shrink-0 overflow-y-auto shadow-lg select-none">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
            <Settings2 size={12} />
            <span>THUỘC TÍNH CHI TIẾT</span>
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">Tỉ lệ khung hình</label>
              <select 
                value={config.aspectRatio} 
                onChange={(e) => setConfig(prev => ({ ...prev, aspectRatio: e.target.value as AspectRatio }))}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-300"
              >
                <option value="9:16">Dọc (9:16) - Shorts/TikTok</option>
                <option value="16:9">Ngang (16:09) - YouTube</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">Thể loại kịch bản</label>
              <select 
                value={config.tone} 
                onChange={(e) => setConfig(prev => ({ ...prev, tone: e.target.value as Tone }))}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-300"
              >
                <option value="Stoic">Stoic (Khắc kỷ)</option>
                <option value="Motivational">Motivational (Lời khuyên)</option>
                <option value="Dark Philosophy">Triết học sâu sắc</option>
                <option value="Humorous">Humorous (Hài hước)</option>
              </select>
            </div>

            <div className="p-3 bg-slate-900/50 border border-slate-800 rounded space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Đại Diện Nét</span>
                <span className="text-slate-300 max-w-[140px] truncate">{config.characters.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tổng Số Cảnh</span>
                <span className="text-slate-300">{scenes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tổng Số Chữ</span>
                <span className="text-slate-300">{fullScript.split(/\s+/).filter(Boolean).length} từ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Công Nghệ Render</span>
                <span className="text-blue-400">Web Recorder</span>
              </div>
            </div>

            {/* General API Key Management Area */}
            <div className="card p-3 bg-slate-950/40 border border-slate-800/80 space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">KÍCH HOẠT API KEYS</div>
              <div className="space-y-1.5">
                <div className="text-[9px] uppercase text-slate-400">Gemini/OpenRouter key</div>
                <input 
                  type="password" 
                  value={settings.geminiApiKey} 
                  onChange={(e) => saveSettings({ ...settings, geminiApiKey: e.target.value })}
                  placeholder="AIzaSy... / sk-or-..." 
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-800 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-1.5">
              <History size={12} />
              <span>BẢN GHI DỰ ÁN</span>
            </h3>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {history.slice(0, 5).map(p => (
                <div 
                  key={p.id} 
                  onClick={() => loadProject(p.id)}
                  className={`flex justify-between items-center text-xs p-2 rounded group cursor-pointer border ${
                    session === p.id 
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' 
                      : 'border-transparent hover:bg-slate-800/50 text-slate-400'
                  }`}
                >
                  <span className="truncate max-w-[140px]">{p.selectedTitle || p.topic || 'Dự án'}</span>
                  <button 
                    onClick={(e) => deleteProject(p.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Footer Status Panel */}
      <footer className="h-10 bg-[#1E293B] border-t border-slate-800 flex items-center px-6 shrink-0 text-[11px] text-slate-500 gap-6 select-none shadow">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span> 
            <span>Engine: Web Graphics API (SAB bypass)</span>
          </span>
          <span>FPS: 60.0</span>
          <span>CPU: 4%</span>
          <span>GPU: 18%</span>
        </div>
        <div className="ml-auto text-slate-500 italic">
          Khắc phục lỗi render video không cần SharedArrayBuffer bằng Web Recorder. Chức năng Backup/Restore đã kích hoạt.
        </div>
      </footer>

      {/* Suggest suggest list modal */}
      {topicModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-200">Gợi Ý Chủ Đề Nổi Bật</h3>
              <button onClick={() => setTopicModalOpen(false)} className="text-slate-400 hover:text-white transition">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {TOPIC_CATEGORIES.map(category => (
                <div key={category.id} className="space-y-2">
                  <h4 className="text-sm font-bold text-blue-400 flex items-center gap-1.5">
                    <span>{category.emoji}</span>
                    <span>{category.labels[config.language] || category.labels.Vietnamese}</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {category.topics[config.language]?.map((topic, tIdx) => (
                      <button 
                        key={tIdx}
                        onClick={() => {
                          setConfig(prev => ({ ...prev, topic }));
                          setTopicModalOpen(false);
                          showToast(`Đã chọn chủ đề: "${topic}"`, 'success');
                        }}
                        className="p-2.5 bg-slate-950/40 border border-slate-800 hover:border-slate-600 rounded text-left text-xs text-slate-300 transition"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Prompt/Doodle edit Modal */}
      {promptModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-200">Hiệu Chỉnh Mô Tả Hình Ảnh</h3>
              <button onClick={() => setPromptModalOpen(false)} className="text-slate-400 hover:text-white transition">✕</button>
            </div>
            <div className="py-4 space-y-3">
              <label className="text-xs text-slate-400 block font-semibold">Prompt mô tả chi tiết bằng tiếng Anh</label>
              <textarea 
                value={customPrompt} 
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={4}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-xs text-slate-200 outline-none"
              />
              <p className="text-[10px] text-slate-500">Mô tả sắc nét các hành động giúp AI hiểu được và vẽ các mô hình doodle chuẩn xác.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => setPromptModalOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs font-semibold text-slate-300 border border-slate-700">Đóng</button>
              <button 
                onClick={() => {
                  setPromptModalOpen(false);
                  if (editingSceneIdx === -1) {
                    generateThumbnail(customPrompt);
                  } else if (editingSceneIdx !== null) {
                    drawSingleImage(editingSceneIdx, customPrompt);
                  }
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded text-xs font-semibold text-white shadow-lg shadow-blue-500/20"
              >
                Vẽ lại ảnh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
