/**
 * Google Gemini Live API Voice Provider
 * Supports bidirectional audio streaming with native audio models
 */

import { GoogleGenAI, Type } from '@google/genai';
import {
  VoiceConfig,
  TTSOptions,
  TTSResponse,
  StreamingTTSOptions,
  RealtimeVoiceOptions,
  CostEstimate,
  AudioFormat
} from '../types';
import { BaseVoiceProvider, RealtimeConnection } from '../types/provider';
import { CostCalculator } from '../utils/cost-calculator';

export class GeminiVoiceProvider extends BaseVoiceProvider {
  readonly name = 'gemini';
  readonly capabilities = {
    tts: true,
    stt: true,
    realtime: true,
    voiceCloning: false,
    streaming: true,
    emotions: true,
    wordTimestamps: false,
    speakerDiarization: false,
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ja', 'zh', 'ko', 'ar', 'hi', 'pl', 'ru', 'tr', 'vi', 'th']
  };

  private client!: GoogleGenAI;
  private model = 'gemini-2.5-flash-native-audio-preview';

  async initialize(config: VoiceConfig): Promise<void> {
    await super.initialize(config);
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
    if (config.model) {
      this.model = config.model;
    }
  }

  async synthesize(options: TTSOptions): Promise<TTSResponse> {
    this.ensureInitialized();

    // Gemini uses the Live API for TTS via text-to-audio generation
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: options.text,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: options.voice || 'Puck'
            }
          }
        }
      }
    });

    // Extract audio from response
    const audioData = this.extractAudioFromResponse(response);
    const duration = this.estimateDuration(options.text);

    return {
      audio: audioData,
      duration,
      format: options.format || 'pcm',
      sampleRate: options.sampleRate || 24000,
      charactersUsed: options.text.length,
      cost: this.estimateCost('tts', options.text.length).estimatedCost
    };
  }

  async synthesizeStreaming(options: StreamingTTSOptions): Promise<void> {
    this.ensureInitialized();

    try {
      // Use Live API for streaming
      const connection = await this.connectRealtime({
        systemPrompt: 'You are a text-to-speech assistant. Simply read the following text aloud without any additional commentary:',
        voice: options.voice,
        onAudioChunk: options.onAudioChunk,
        onError: options.onError,
        onConnect: async () => {
          // Send text to be spoken
          await connection.sendText(options.text);
        }
      });

      // Wait for completion (simplified - would need proper completion detection)
      setTimeout(async () => {
        await connection.disconnect();
        options.onComplete?.();
      }, this.estimateDuration(options.text) * 1000 + 2000);

    } catch (error) {
      options.onError?.(error as Error);
    }
  }

  async connectRealtime(options: RealtimeVoiceOptions): Promise<RealtimeConnection> {
    this.ensureInitialized();

    return new GeminiRealtimeConnection(this.client, this.model, options);
  }

  estimateCost(service: 'tts' | 'stt' | 'realtime', inputUnits: number): CostEstimate {
    if (service === 'realtime') {
      return CostCalculator.calculateRealtimeCost(this.name, inputUnits / 2, inputUnits / 2);
    }
    return CostCalculator.calculateTTSCost(this.name, inputUnits);
  }

  private extractAudioFromResponse(response: any): Buffer {
    // Extract audio data from Gemini response
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/')) {
          return Buffer.from(part.inlineData.data, 'base64');
        }
      }
    }
    throw new Error('No audio data in response');
  }

  private estimateDuration(text: string): number {
    const words = text.length / 5;
    return (words / 150) * 60;
  }

  async dispose(): Promise<void> {
    await super.dispose();
  }
}

/**
 * Gemini Live API WebSocket Connection
 * Bidirectional streaming for real-time conversations
 */
class GeminiRealtimeConnection implements RealtimeConnection {
  private session: any;
  private connected = false;
  private eventHandlers: Map<string, ((data: unknown) => void)[]> = new Map();
  private audioQueue: Buffer[] = [];
  private processingAudio = false;

  constructor(
    private client: GoogleGenAI,
    private model: string,
    private options: RealtimeVoiceOptions
  ) {}

  async connect(): Promise<void> {
    const config = {
      responseModalities: ['AUDIO', 'TEXT'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: this.options.voice || 'Puck'
          }
        }
      },
      systemInstruction: this.options.systemPrompt 
        ? { parts: [{ text: this.options.systemPrompt }] }
        : undefined,
      tools: this.options.tools?.map(t => ({
        functionDeclarations: [{
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }]
      }))
    };

    this.session = await this.client.aio.live.connect({
      model: this.model,
      config
    });

    this.connected = true;
    this.options.onConnect?.();

    // Start receiving responses
    this.startReceiving();
  }

  private async startReceiving(): Promise<void> {
    try {
      for await (const response of this.session.receive()) {
        this.handleResponse(response);
      }
    } catch (error) {
      if (this.connected) {
        this.options.onError?.(error as Error);
      }
    } finally {
      this.connected = false;
      this.options.onDisconnect?.();
    }
  }

  private handleResponse(response: any): void {
    // Handle text transcript
    if (response.text) {
      this.options.onAgentTranscript?.(response.text);
      this.emit('transcript', { speaker: 'agent', text: response.text, isFinal: false });
    }

    // Handle audio data
    if (response.data) {
      const audioChunk = Buffer.from(response.data, 'base64');
      this.audioQueue.push(audioChunk);
      this.options.onAudioChunk?.(audioChunk);
      this.emit('audio', audioChunk);
    }

    // Handle turn completion
    if (response.serverContent?.turnComplete) {
      this.emit('transcript', { speaker: 'agent', text: '', isFinal: true });
    }

    // Handle tool calls
    if (response.toolCall) {
      this.handleToolCall(response.toolCall);
    }
  }

  private async handleToolCall(toolCall: any): Promise<void> {
    for (const call of toolCall.functionCalls || []) {
      const tool = this.options.tools?.find(t => t.name === call.name);
      if (tool) {
        try {
          const result = await tool.handler(call.args || {});
          await this.sendToolResponse(call.id, result);
        } catch (error) {
          await this.sendToolResponse(call.id, { error: (error as Error).message });
        }
      }
    }
  }

  private async sendToolResponse(toolId: string, result: unknown): Promise<void> {
    await this.session.send({
      toolResponse: {
        functionResponses: [{
          id: toolId,
          response: result
        }]
      }
    });
  }

  async sendAudio(audio: Buffer): Promise<void> {
    if (!this.connected) {
      throw new Error('Session not connected');
    }

    await this.session.send({
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'audio/pcm',
          data: audio.toString('base64')
        }]
      }
    });
  }

  async sendText(text: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Session not connected');
    }

    await this.session.send({
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{ text }]
        }],
        turnComplete: true
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.session) {
      await this.session.close();
    }
    this.connected = false;
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

  private emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }
}
