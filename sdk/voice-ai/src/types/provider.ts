/**
 * Base Provider Interface
 * All voice AI providers must implement this interface
 */

import {
  VoiceConfig,
  TTSOptions,
  TTSResponse,
  StreamingTTSOptions,
  STTOptions,
  STTResponse,
  RealtimeVoiceOptions,
  VoiceCloneOptions,
  VoiceCloneResponse,
  ProviderCapabilities,
  CostEstimate
} from './index';

export interface VoiceProviderInterface {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  
  // Initialization
  initialize(config: VoiceConfig): Promise<void>;
  
  // Text-to-Speech
  synthesize(options: TTSOptions): Promise<TTSResponse>;
  synthesizeStreaming(options: StreamingTTSOptions): Promise<void>;
  
  // Speech-to-Text
  transcribe?(options: STTOptions): Promise<STTResponse>;
  
  // Real-time conversational voice
  connectRealtime?(options: RealtimeVoiceOptions): Promise<RealtimeConnection>;
  
  // Voice cloning (if supported)
  cloneVoice?(options: VoiceCloneOptions): Promise<VoiceCloneResponse>;
  deleteVoice?(voiceId: string): Promise<void>;
  listVoices?(): Promise<Array<{id: string; name: string; preview?: string}>>;
  
  // Cost estimation
  estimateCost(service: 'tts' | 'stt' | 'realtime', inputUnits: number): CostEstimate;
  
  // Health check
  healthCheck?(): Promise<boolean>;
  
  // Cleanup
  dispose(): Promise<void>;
}

export interface RealtimeConnection {
  sendAudio(audio: Buffer): Promise<void>;
  sendText(text: string): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  on(event: 'transcript' | 'audio' | 'error' | 'disconnect', callback: (data: unknown) => void): void;
}

export abstract class BaseVoiceProvider implements VoiceProviderInterface {
  abstract readonly name: string;
  abstract readonly capabilities: ProviderCapabilities;
  
  protected config!: VoiceConfig;
  protected initialized = false;
  
  async initialize(config: VoiceConfig): Promise<void> {
    this.config = config;
    this.initialized = true;
  }
  
  abstract synthesize(options: TTSOptions): Promise<TTSResponse>;
  abstract synthesizeStreaming(options: StreamingTTSOptions): Promise<void>;
  
  async transcribe?(options: STTOptions): Promise<STTResponse> {
    throw new Error('STT not supported by this provider');
  }
  
  async connectRealtime?(options: RealtimeVoiceOptions): Promise<RealtimeConnection> {
    throw new Error('Realtime voice not supported by this provider');
  }
  
  async cloneVoice?(options: VoiceCloneOptions): Promise<VoiceCloneResponse> {
    throw new Error('Voice cloning not supported by this provider');
  }
  
  async deleteVoice?(voiceId: string): Promise<void> {
    throw new Error('Voice cloning not supported by this provider');
  }
  
  async listVoices?(): Promise<Array<{id: string; name: string; preview?: string}>> {
    throw new Error('Voice listing not supported by this provider');
  }
  
  abstract estimateCost(service: 'tts' | 'stt' | 'realtime', inputUnits: number): CostEstimate;
  
  async healthCheck?(): Promise<boolean> {
    return this.initialized;
  }
  
  async dispose(): Promise<void> {
    this.initialized = false;
  }
  
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Provider not initialized. Call initialize() first.');
    }
  }
}
