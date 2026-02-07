export enum VoiceName {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}

export type VoiceTechnology = 'Gemini' | 'Chirp 3 HD' | 'Neural2' | 'WaveNet';

export interface VoiceDetail {
  id: string;
  label: string;
  gender: 'Male' | 'Female';
  description: string;
  technology: VoiceTechnology;
  recommendedFor?: string;
}

export enum Language {
  English = 'English',
  Spanish = 'Spanish',
  French = 'French',
  German = 'German',
  Hindi = 'Hindi',
  Russian = 'Russian',
  Portuguese = 'Portuguese',
  Japanese = 'Japanese'
}

export type VisualizerType = 'bars' | 'wave' | 'orb';

export interface LogEntry {
  timestamp: string;
  type: 'info' | 'error' | 'message' | 'tool';
  message: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface AudioConfig {
  voice: string;
  prebuiltVoiceConfig: {
    voiceName: string;
  };
}