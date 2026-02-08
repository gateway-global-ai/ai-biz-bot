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

/** Conversation view: Chat (text), PTT (walkie-talkie), Realtime (VAD streaming). Shared history across all. */
export type ChatInterfaceMode = 'chat' | 'ptt' | 'realtime';

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

// --- Types from Standardized Chat Interface ---

export interface NearbyPlace {
  name: string;
  type: string;
  summary: string;
  location: string;
  rating: number;
  imageUrl?: string;
}

export interface Review {
  author_name: string;
  rating: number;
  relative_time_description: string;
  text: string;
  profile_photo_url: string;
  time: number;
}

export interface BusinessData {
  name: string;
  tagline: string;
  description: string;
  address: string;
  rating: number;
  reviewCount: number;
  mapLink: string;
  hours: string[];
  reviews: Review[];
  insights: string[];
  images: string[];
  nearbyRestaurants: NearbyPlace[];
  nearbyActivities: NearbyPlace[];
  rawPlaceData: any;
}

export interface AgentConfig {
  name: string;
  role: string;
  discProfile: string;
  basePrompt: string;
}

export interface BotConfig {
  botId: string;
  botConfigId: string;
  agentProfile: AgentConfig;
}

export enum ViewState {
  LANDING = 'LANDING',
  LOADING = 'LOADING',
  GENERATED = 'GENERATED',
  ERROR = 'ERROR'
}

// SDK Specific Types
export type ChatMode = 'customer' | 'owner' | 'developer';
export type ChatLayoutMode = 'floating' | 'fixed' | 'fullscreen';
export type AdminAuthStatus = 'idle' | 'awaiting_otp' | 'authenticated';

export interface SdkTheme {
  primaryColor: string;
  fontFamily: string;
  borderRadius: string;
}

export interface CrmContact {
  id: string;
  name: string;
  email: string;
  status: 'Lead' | 'Customer' | 'VIP';
  lastContact: string;
}

export interface Task {
  id: string;
  title: string;
  due: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface CallLog {
  id: string;
  caller: string;
  duration: string;
  timestamp: string;
  status: 'Missed' | 'Completed' | 'Voicemail';
  sentiment: 'Positive' | 'Neutral' | 'Negative';
}

// Workspace & Onboarding Types
export type WorkspaceStep = 'plans' | 'payment' | 'account' | 'oauth' | 'dashboard';

export interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface ConsultingTask {
  id: string;
  title: string;
  description: string;
  cost: number;
  status: 'recommended' | 'in_progress' | 'completed';
}
