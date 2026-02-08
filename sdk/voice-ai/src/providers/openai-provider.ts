/**
 * OpenAI Voice Provider
 * Supports TTS, STT (Whisper), and Realtime API
 */

import OpenAI from 'openai';
import { Readable } from 'stream';
import {
  VoiceConfig,
  TTSOptions,
  TTSResponse,
  StreamingTTSOptions,
  STTOptions,
  STTResponse,
  RealtimeVoiceOptions,
  CostEstimate,
  AudioFormat
} from '../types';
import { BaseVoiceProvider, RealtimeConnection } from '../types/provider';
import { CostCalculator } from '../utils/cost-calculator';

export class OpenAIVoiceProvider extends BaseVoiceProvider {
  readonly name = 'openai';
  readonly capabilities = {
    tts: true,
    stt: true,
    realtime: true,
    voiceCloning: false,
    streaming: true,
    emotions: false,
    wordTimestamps: false,
    speakerDiarization: false,
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ja', 'zh', 'ko', 'ar', 'hi', 'pl', 'ru', 'tr']
  };

  private client!: OpenAI;
  private realtimeWs?: WebSocket;

  async initialize(config: VoiceConfig): Promise<void> {
    await super.initialize(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiEndpoint
    });
  }

  async synthesize(options: TTSOptions): Promise<TTSResponse> {
    this.ensureInitialized();

    const model = options.model || 'tts-1';
    const voice = options.voice || 'alloy';
    const format = this.mapAudioFormat(options.format || 'mp3');

    const mp3 = await this.client.audio.speech.create({
      model,
      voice: voice as any,
      input: options.text,
      response_format: format as any,
      speed: options.speed || 1.0,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    const duration = this.estimateDuration(options.text);

    return {
      audio: buffer,
      duration,
      format: options.format || 'mp3',
      sampleRate: options.sampleRate || 24000,
      charactersUsed: options.text.length,
      cost: this.estimateCost('tts', options.text.length).estimatedCost
    };
  }

  async synthesizeStreaming(options: StreamingTTSOptions): Promise<void> {
    this.ensureInitialized();

    const model = options.model || 'tts-1';
    const voice = options.voice || 'alloy';

    try {
      const response = await this.client.audio.speech.create({
        model,
        voice: voice as any,
        input: options.text,
        response_format: 'pcm',
        speed: options.speed || 1.0,
      });

      // OpenAI doesn't support true streaming TTS yet, so we simulate it
      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Split into chunks for simulated streaming
      const chunkSize = 4096;
      for (let i = 0; i < buffer.length; i += chunkSize) {
        const chunk = buffer.slice(i, i + chunkSize);
        options.onAudioChunk?.(chunk);
      }

      options.onComplete?.();
    } catch (error) {
      options.onError?.(error as Error);
    }
  }

  async transcribe(options: STTOptions): Promise<STTResponse> {
    this.ensureInitialized();

    const audioBuffer = options.audio instanceof Buffer 
      ? options.audio 
      : await this.streamToBuffer(options.audio as ReadableStream);

    const file = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });

    const transcription = await this.client.audio.transcriptions.create({
      file,
      model: options.model || 'whisper-1',
      language: options.language,
      prompt: options.enablePunctuation ? 'Please include punctuation.' : undefined,
      response_format: 'verbose_json',
      timestamp_granularities: options.wordTimestamps ? ['word'] : undefined
    });

    // Parse verbose_json response
    const result = transcription as any;
    
    return {
      text: result.text || '',
      confidence: result.confidence,
      words: result.words?.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence
      })),
      duration: result.duration,
      cost: this.estimateCost('stt', (result.duration || 0) / 60).estimatedCost
    };
  }

  async connectRealtime(options: RealtimeVoiceOptions): Promise<RealtimeConnection> {
    this.ensureInitialized();

    const model = this.config.model || 'gpt-4o-realtime-preview-2024-12-17';
    
    // OpenAI Realtime API uses WebSocket
    const wsUrl = `wss://api.openai.com/v1/realtime?model=${model}`;
    
    return new OpenAIRealtimeConnection(wsUrl, this.config.apiKey, options);
  }

  estimateCost(service: 'tts' | 'stt' | 'realtime', inputUnits: number): CostEstimate {
    return CostCalculator.calculateTTSCost(this.name, inputUnits);
  }

  private mapAudioFormat(format: AudioFormat): string {
    const formatMap: Record<AudioFormat, string> = {
      'mp3': 'mp3',
      'wav': 'wav',
      'ogg': 'ogg',
      'opus': 'opus',
      'aac': 'aac',
      'pcm': 'pcm'
    };
    return formatMap[format] || 'mp3';
  }

  private estimateDuration(text: string): number {
    // Average speaking rate: ~150 words per minute, ~5 characters per word
    const words = text.length / 5;
    return (words / 150) * 60;
  }

  private async streamToBuffer(stream: ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    const reader = stream.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
    
    return Buffer.concat(chunks);
  }

  async dispose(): Promise<void> {
    if (this.realtimeWs) {
      this.realtimeWs.close();
    }
    await super.dispose();
  }
}

/**
 * OpenAI Realtime API WebSocket Connection
 */
class OpenAIRealtimeConnection implements RealtimeConnection {
  private ws: WebSocket;
  private connected = false;
  private eventHandlers: Map<string, ((data: unknown) => void)[]> = new Map();
  private audioBuffer: Buffer[] = [];

  constructor(wsUrl: string, apiKey: string, private options: RealtimeVoiceOptions) {
    this.ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    this.ws.onopen = () => {
      this.connected = true;
      this.options.onConnect?.();
      
      // Send initial configuration
      this.sendConfiguration();
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onerror = (error) => {
      this.options.onError?.(error as any);
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.options.onDisconnect?.();
    };
  }

  private sendConfiguration(): void {
    const config = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: this.options.systemPrompt || 'You are a helpful voice assistant.',
        voice: this.options.voice || 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        },
        tools: this.options.tools?.map(t => ({
          type: 'function',
          name: t.name,
          description: t.description,
          parameters: t.parameters
        })) || []
      }
    };

    this.ws.send(JSON.stringify(config));
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'input_audio_buffer.speech_started':
        // User started speaking
        break;

      case 'input_audio_buffer.speech_stopped':
        // User stopped speaking
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // Transcript of user speech
        this.options.onUserTranscript?.(message.transcript);
        this.emit('transcript', { speaker: 'user', text: message.transcript });
        break;

      case 'response.audio_transcript.delta':
        // Partial transcript of assistant response
        this.options.onAgentTranscript?.(message.delta);
        break;

      case 'response.audio.delta':
        // Audio chunk from assistant
        const audioChunk = Buffer.from(message.delta, 'base64');
        this.audioBuffer.push(audioChunk);
        this.options.onAudioChunk?.(audioChunk);
        this.emit('audio', audioChunk);
        break;

      case 'response.done':
        // Response complete
        break;

      case 'error':
        this.options.onError?.(new Error(message.error?.message || 'Unknown error'));
        break;
    }
  }

  async sendAudio(audio: Buffer): Promise<void> {
    if (!this.connected) {
      throw new Error('WebSocket not connected');
    }

    const base64Audio = audio.toString('base64');
    
    this.ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: base64Audio
    }));
  }

  async sendText(text: string): Promise<void> {
    if (!this.connected) {
      throw new Error('WebSocket not connected');
    }

    this.ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text
        }]
      }
    }));

    // Request a response
    this.ws.send(JSON.stringify({
      type: 'response.create'
    }));
  }

  async disconnect(): Promise<void> {
    this.ws.close();
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
