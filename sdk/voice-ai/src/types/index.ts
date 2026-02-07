/**
 * Voice AI Unified SDK - Type Definitions
 * Comprehensive types for TTS and conversational voice AI providers
 */

export type VoiceProvider = 
  | 'openai' 
  | 'gemini' 
  | 'kimi' 
  | 'elevenlabs' 
  | 'deepgram' 
  | 'cartesia' 
  | 'inworld'
  | 'hume'
  | 'replicate'
  | 'fish-audio'
  | 'assemblyai';

export type AudioFormat = 'pcm' | 'mp3' | 'wav' | 'ogg' | 'opus' | 'aac';
export type StreamingProtocol = 'websocket' | 'sse' | 'http-stream';

export interface VoiceConfig {
  provider: VoiceProvider;
  apiKey: string;
  apiEndpoint?: string;
  model?: string;
  voice?: string;
  language?: string;
  sampleRate?: number;
  audioFormat?: AudioFormat;
  streaming?: boolean;
  streamingProtocol?: StreamingProtocol;
}

export interface TTSOptions {
  text: string;
  voice?: string;
  model?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  language?: string;
  emotion?: string;
  format?: AudioFormat;
  sampleRate?: number;
}

export interface TTSResponse {
  audio: Buffer | ReadableStream;
  duration?: number;
  format: AudioFormat;
  sampleRate: number;
  charactersUsed?: number;
  cost?: number;
}

export interface StreamingTTSOptions extends TTSOptions {
  onAudioChunk?: (chunk: Buffer) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export interface STTOptions {
  audio: Buffer | ReadableStream;
  language?: string;
  model?: string;
  enablePunctuation?: boolean;
  enableSpeakerDiarization?: boolean;
  numSpeakers?: number;
  wordTimestamps?: boolean;
}

export interface STTResponse {
  text: string;
  confidence?: number;
  words?: WordTimestamp[];
  speakers?: SpeakerSegment[];
  duration?: number;
  cost?: number;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface SpeakerSegment {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

export interface RealtimeVoiceOptions {
  systemPrompt?: string;
  voice?: string;
  onUserTranscript?: (text: string) => void;
  onAgentTranscript?: (text: string) => void;
  onAudioChunk?: (chunk: Buffer) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  tools?: ToolDefinition[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

export interface VoiceCloneOptions {
  name: string;
  audioSamples: Buffer[];
  description?: string;
  labels?: Record<string, string>;
}

export interface VoiceCloneResponse {
  voiceId: string;
  name: string;
  previewUrl?: string;
}

export interface ProviderCapabilities {
  tts: boolean;
  stt: boolean;
  realtime: boolean;
  voiceCloning: boolean;
  streaming: boolean;
  emotions: boolean;
  wordTimestamps: boolean;
  speakerDiarization: boolean;
  languages: string[];
}

export interface CostEstimate {
  provider: VoiceProvider;
  service: 'tts' | 'stt' | 'realtime';
  inputUnits: number;
  estimatedCost: number;
  currency: string;
  details: Record<string, number>;
}

export interface ProviderPricing {
  provider: VoiceProvider;
  tts?: {
    perCharacter?: number;
    perMinute?: number;
    models: Record<string, number>;
  };
  stt?: {
    perMinute?: number;
    perHour?: number;
    models: Record<string, number>;
  };
  realtime?: {
    audioInputPerMinute?: number;
    audioOutputPerMinute?: number;
    textInputPer1MTokens?: number;
    textOutputPer1MTokens?: number;
  };
  voiceCloning?: {
    perClone?: number;
    freeTiers?: number;
  };
}

// Twilio-specific types
export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  webhookUrl?: string;
}

export interface TwilioVoiceOptions {
  twilioConfig: TwilioConfig;
  voiceProvider: VoiceConfig;
  greeting?: string;
  systemPrompt?: string;
  enableRecording?: boolean;
  enableTranscription?: boolean;
  maxDuration?: number;
}

export interface ConversationContext {
  callSid: string;
  from: string;
  to: string;
  messages: Array<{role: 'user' | 'assistant'; content: string}>;
  metadata: Record<string, unknown>;
}

// WebSocket message types for real-time communication
export interface WebSocketMessage {
  type: 'audio_input' | 'audio_output' | 'transcript' | 'error' | 'ping' | 'pong' | 'config';
  payload: unknown;
  timestamp: number;
}

export interface AudioInputMessage extends WebSocketMessage {
  type: 'audio_input';
  payload: {
    audio: string; // base64 encoded
    sampleRate: number;
    format: AudioFormat;
  };
}

export interface AudioOutputMessage extends WebSocketMessage {
  type: 'audio_output';
  payload: {
    audio: string; // base64 encoded
    sampleRate: number;
    format: AudioFormat;
    isFinal: boolean;
  };
}

export interface TranscriptMessage extends WebSocketMessage {
  type: 'transcript';
  payload: {
    text: string;
    isFinal: boolean;
    speaker: 'user' | 'agent';
  };
}
