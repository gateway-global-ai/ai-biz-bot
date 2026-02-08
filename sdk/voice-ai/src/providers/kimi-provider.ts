/**
 * KIMI / Moonshot AI Voice Provider
 * Note: As of early 2026, KIMI doesn't have native TTS/STT APIs
 * This provider implements a hybrid approach using KIMI for LLM + external TTS
 */

import axios from 'axios';
import {
  VoiceConfig,
  TTSOptions,
  TTSResponse,
  StreamingTTSOptions,
  STTOptions,
  STTResponse,
  RealtimeVoiceOptions,
  CostEstimate
} from '../types';
import { BaseVoiceProvider, RealtimeConnection } from '../types/provider';
import { CostCalculator } from '../utils/cost-calculator';

export interface KimiConfig extends VoiceConfig {
  ttsProvider?: 'openai' | 'elevenlabs' | 'deepgram' | 'fish-audio';
  sttProvider?: 'openai' | 'deepgram' | 'assemblyai';
}

export class KimiVoiceProvider extends BaseVoiceProvider {
  readonly name = 'kimi';
  readonly capabilities = {
    tts: false, // Uses external TTS provider
    stt: false, // Uses external STT provider
    realtime: true, // Can be built with hybrid approach
    voiceCloning: false,
    streaming: true,
    emotions: true,
    wordTimestamps: false,
    speakerDiarization: false,
    languages: ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'pt', 'ru', 'ar']
  };

  private apiEndpoint = 'https://api.moonshot.cn/v1';
  private ttsProvider?: any;
  private sttProvider?: any;

  async initialize(config: KimiConfig): Promise<void> {
    await super.initialize(config);
    
    if (config.apiEndpoint) {
      this.apiEndpoint = config.apiEndpoint;
    }

    // Note: In production, you'd initialize the hybrid TTS/STT providers here
    // based on the config.ttsProvider and config.sttProvider settings
  }

  /**
   * KIMI doesn't have native TTS, but we can provide a hybrid solution
   * that uses KIMI for text generation + external TTS
   */
  async synthesize(options: TTSOptions): Promise<TTSResponse> {
    throw new Error(
      'KIMI does not have native TTS. Use a hybrid approach with KIMI for LLM + external TTS provider. ' +
      'See examples/hybrid-kimi-tts.ts for implementation.'
    );
  }

  async synthesizeStreaming(options: StreamingTTSOptions): Promise<void> {
    throw new Error(
      'KIMI does not have native streaming TTS. Use a hybrid approach. ' +
      'See examples/hybrid-kimi-tts.ts for implementation.'
    );
  }

  async transcribe(options: STTOptions): Promise<STTResponse> {
    throw new Error(
      'KIMI does not have native STT. Use a hybrid approach with external STT provider. ' +
      'See examples/hybrid-kimi-stt.ts for implementation.'
    );
  }

  /**
   * Connect to KIMI for real-time text generation
   * Note: For full voice, combine with external TTS/STT
   */
  async connectRealtime(options: RealtimeVoiceOptions): Promise<RealtimeConnection> {
    this.ensureInitialized();
    return new KimiRealtimeConnection(this.config.apiKey, this.apiEndpoint, options);
  }

  /**
   * Generate text response using KIMI
   */
  async generateText(messages: Array<{role: string; content: string}>): Promise<string> {
    this.ensureInitialized();

    const response = await axios.post(
      `${this.apiEndpoint}/chat/completions`,
      {
        model: this.config.model || 'kimi-k2-0905',
        messages,
        stream: false,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0]?.message?.content || '';
  }

  /**
   * Generate streaming text response using KIMI
   */
  async generateTextStreaming(
    messages: Array<{role: string; content: string}>,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    this.ensureInitialized();

    const response = await axios.post(
      `${this.apiEndpoint}/chat/completions`,
      {
        model: this.config.model || 'kimi-k2-0905',
        messages,
        stream: true,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    );

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              resolve();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      });

      response.data.on('error', reject);
      response.data.on('end', resolve);
    });
  }

  estimateCost(service: 'tts' | 'stt' | 'realtime', inputUnits: number): CostEstimate {
    // KIMI uses token-based pricing
    // For TTS/STT, we estimate based on hybrid approach
    return CostCalculator.calculateTTSCost(this.name, inputUnits);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.apiEndpoint}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  async dispose(): Promise<void> {
    await super.dispose();
  }
}

/**
 * KIMI Realtime Connection (Text-only, for hybrid voice solutions)
 */
class KimiRealtimeConnection implements RealtimeConnection {
  private connected = false;
  private eventHandlers: Map<string, ((data: unknown) => void)[]> = new Map();
  private messageQueue: string[] = [];

  constructor(
    private apiKey: string,
    private apiEndpoint: string,
    private options: RealtimeVoiceOptions
  ) {}

  async sendAudio(audio: Buffer): Promise<void> {
    // KIMI doesn't support direct audio input
    // In a hybrid setup, audio would go through STT first
    throw new Error(
      'KIMI does not support direct audio input. ' +
      'Use a hybrid approach: STT -> KIMI LLM -> TTS'
    );
  }

  async sendText(text: string): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    // Send to KIMI and get streaming response
    const messages = [
      { role: 'system', content: this.options.systemPrompt || 'You are a helpful assistant.' },
      { role: 'user', content: text }
    ];

    try {
      const response = await axios.post(
        `${this.apiEndpoint}/chat/completions`,
        {
          model: 'kimi-k2-0905',
          messages,
          stream: true
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'stream'
        }
      );

      let fullResponse = '';

      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              this.options.onAgentTranscript?.(fullResponse);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                this.options.onAgentTranscript?.(content);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });

    } catch (error) {
      this.options.onError?.(error as Error);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.options.onDisconnect?.();
  }

  isConnected(): boolean {
    return this.connected;
  }

  on(event: 'transcript' | 'audio' | 'error' | 'disconnect', callback: (data: unknown) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }

  private async connect(): Promise<void> {
    // Verify API key is valid
    try {
      await axios.get(`${this.apiEndpoint}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      this.connected = true;
      this.options.onConnect?.();
    } catch (error) {
      throw new Error(`Failed to connect to KIMI: ${(error as Error).message}`);
    }
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }
}
