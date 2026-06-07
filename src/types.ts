export type Language = 'Vietnamese' | 'English' | 'Japanese';

export type Tone = 'Stoic' | 'Motivational' | 'Dark Philosophy' | 'Humorous';

export type Duration = 'Short (60s)' | 'Medium (3 mins)' | 'Long (5-10 mins)';

export type AspectRatio = '16:9' | '9:16';

export interface ProjectConfig {
  topic: string;
  context: string;
  tone: Tone;
  duration: Duration;
  aspectRatio: AspectRatio;
  language: Language;
  characters: string[];
}

export interface CharacterInfo {
  id: string;
  index: number;
  styleHint: string;
  personalityHint: string;
  labels: Record<Language, string>;
  thumbUrl?: string; // We will render inline SVGs
  refUrl?: string;
}

export interface Scene {
  id: string;
  voiceover: string;
  visualPrompt: string;
  keywords: string;
  imageUrl?: string | null;
  isGeneratingImage?: boolean;
  error?: string;
  voiceoverVariants?: string[];
}

export interface Title {
  id: string;
  text: string;
  selected: boolean;
}

export interface CaptionStyle {
  mode: 'word_chunks' | 'single_word' | 'karaoke' | 'full';
  chunkWords: number;
  position: 'top' | 'middle' | 'bottom';
  sizePx: number;
  textColor: 'white' | 'yellow';
  highlight: 'yellow' | 'red' | 'cyan' | 'green';
  background: boolean;
}

export interface Settings {
  imageProvider: string;
  audioProvider: string;
  coachioApiKey: string;
  geminiApiKey: string;
  groqApiKey: string;
  coachioTtsVoice: string;
  geminiTtsStyle: string;
  geminiTtsGender: 'male' | 'female';
  captionStyle: CaptionStyle;
  transition: 'fade' | 'ken_burns' | 'cut';
  transitionDuration: number;
}

export interface WhisperWord {
  text: string;
  start: number;
  end: number;
}

export interface WhisperTiming {
  sceneId: string;
  start: number;
  end: number;
  source: 'estimate' | 'whisper';
}

export interface ProjectState {
  id: string;
  timestamp: string;
  topic: string;
  selectedTitle: string;
  thumbnailUrl?: string;
  fullScript: string;
  step: number;
  lastGeneratedTopic?: string;
  lastGeneratedTitleId?: string;
  config: ProjectConfig;
  titles: Title[];
  scenes: Scene[];
}
