/**
 * Deepgram Voice Provider
 * STT (Nova-2) and TTS (Aura-2) with Voice Agent API
 */

import axios from 'axios';
import WebSocket from 'ws';
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

export class DeepgramProvider extends BaseVoiceProvider {
  readonly name = 'deepgram';
  readonly capabilities = {
    tts: true,
    stt: true,
    realtime: true, // Via Voice Agent API
    voiceCloning: false,
    streaming: true,
    emotions: false,
    wordTimestamps: true,
    speakerDiarization: true,
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'hi', 'ja', 'ko', 'zh', 'ru', 'tr', 'pl']
  };

  private apiEndpoint = 'https://api.deepgram.com/v1';
  private wsEndpoint = 'wss://api.deepgram.com/v1';

  async initialize(config: VoiceConfig): Promise<void> {
    await super.initialize(config);
    if (config.apiEndpoint) {
      this.apiEndpoint = config.apiEndpoint;
    }
  }

  async synthesize(options: TTSOptions): Promise<TTSResponse> {
    this.ensureInitialized();

    const model = options.model || 'aura-2';
    const voice = options.voice || 'aura-2-thalia-en';

    const response = await axios.post(
      `${this.apiEndpoint}/speak`,
      {
        text: options.text
      },
      {
        headers: {
          'Authorization': `Token ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          model: voice
        },
        responseType: 'arraybuffer'
      }
    );

    const duration = this.estimateDuration(options.text);

    return {
      audio: Buffer.from(response.data),
      duration,
      format: options.format || 'mp3',
      sampleRate: options.sampleRate || 24000,
      charactersUsed: options.text.length,
      cost: this.estimateCost('tts', options.text.length).estimatedCost
    };
  }

  async synthesizeStreaming(options: StreamingTTSOptions): Promise<void> {
    this.ensureInitialized();

    const voice = options.voice || 'aura-2-thalia-en';

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(
        `${this.wsEndpoint}/speak?model=${voice}`,
        {
          headers: {
            'Authorization': `Token ${this.config.apiKey}`
          }
        }
      );

      ws.on('open', () => {
        // Send text to synthesize
        ws.send(JSON.stringify({
          type: 'Speak',
          text: options.text
        }));
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'Audio' && message.data) {
            const audioChunk = Buffer.from(message.data, 'base64');
            options.onAudioChunk?.(audioChunk);
          }

          if (message.type === 'Flush' || message.type === 'Close') {
            options.onComplete?.();
            ws.close();
            resolve();
          }

          if (message.type === 'Error') {
            throw new Error(message.message);
          }
        } catch (error) {
          options.onError?.(error as Error);
          reject(error);
        }
      });

      ws.on('error', (error) => {
        options.onError?.(error);
        reject(error);
      });
    });
  }

  async transcribe(options: STTOptions): Promise<STTResponse> {
    this.ensureInitialized();

    const audioBuffer = options.audio instanceof Buffer 
      ? options.audio 
      : await this.streamToBuffer(options.audio as ReadableStream);

    const model = options.model || 'nova-2';
    
    const response = await axios.post(
      `${this.apiEndpoint}/listen`,
      audioBuffer,
      {
        headers: {
          'Authorization': `Token ${this.config.apiKey}`,
          'Content-Type': 'audio/wav'
        },
        params: {
          model,
          language: options.language || 'en',
          punctuate: options.enablePunctuation ?? true,
          diarize: options.enableSpeakerDiarization ?? false,
          utterances: true,
          word_timestamps: options.wordTimestamps ?? false
        }
      }
    );

    const result = response.data.results;
    const channels = result.channels?.[0];

    return {
      text: channels?.alternatives?.[0]?.transcript || '',
      confidence: channels?.alternatives?.[0]?.confidence,
      words: channels?.alternatives?.[0]?.words?.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence
      })),
      speakers: result.utterances?.map((u: any) => ({
        speaker: `Speaker ${u.speaker}`,
        text: u.transcript,
        start: u.start,
        end: u.end
      })),
      duration: result.duration,
      cost: this.estimateCost('stt', result.duration / 60).estimatedCost
    };
  }

  async connectRealtime(options: RealtimeVoiceOptions): Promise<RealtimeConnection> {
    this.ensureInitialized();
    return new DeepgramRealtimeConnection(this.config.apiKey, this.wsEndpoint, options);
  }

  estimateCost(service: 'tts' | 'stt' | 'realtime', inputUnits: number): CostEstimate {
    if (service === 'stt') {
      return CostCalculator.calculateSTTCost(this.name, inputUnits);
    }
    return CostCalculator.calculateTTSCost(this.name, inputUnits);
  }

  private estimateDuration(text: string): number {
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

  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.apiEndpoint}/projects`, {
        headers: {
          'Authorization': `Token ${this.config.apiKey}`
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
 * Deepgram Streaming STT WebSocket Connection
 */
class DeepgramRealtimeConnection implements RealtimeConnection {
  private ws: WebSocket;
  private connected = false;
  private eventHandlers: Map<string, ((data: unknown) => void)[]> = new Map();
  private transcriptBuffer = '';

  constructor(
    apiKey: string,
    wsEndpoint: string,
    private options: RealtimeVoiceOptions
  ) {
    const params = new URLSearchParams({
      model: 'nova-2',
      language: 'en-US',
      punctuate: 'true',
      interim_results: 'true',
      utterance_end_ms: '1000',
      vad_events: 'true'
    });

    this.ws = new WebSocket(
      `${wsEndpoint}/listen?${params.toString()}`,
      {
        headers: {
          'Authorization': `Token ${apiKey}`
        }
      }
    );

    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    this.ws.onopen = () => {
      this.connected = true;
      this.options.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data.toString());
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

  private handleMessage(message: any): void {
    // Handle speech detected
    if (message.type === 'SpeechStarted') {
      this.transcriptBuffer = '';
    }

    // Handle transcript
    if (message.channel?.alternatives?.[0]) {
      const alternative = message.channel.alternatives[0];
      
      if (message.is_final) {
        this.transcriptBuffer += alternative.transcript;
        this.options.onUserTranscript?.(this.transcriptBuffer);
        this.emit('transcript', { 
          speaker: 'user', 
          text: this.transcriptBuffer, 
          isFinal: true 
        });
        this.transcriptBuffer = '';
      } else {
        // Interim results
        this.options.onUserTranscript?.(alternative.transcript);
      }
    }

    // Handle utterance end
    if (message.type === 'UtteranceEnd') {
      if (this.transcriptBuffer) {
        this.options.onUserTranscript?.(this.transcriptBuffer);
        this.emit('transcript', { 
          speaker: 'user', 
          text: this.transcriptBuffer, 
          isFinal: true 
        });
        this.transcriptBuffer = '';
      }
    }
  }

  async sendAudio(audio: Buffer): Promise<void> {
    if (!this.connected) {
      throw new Error('WebSocket not connected');
    }

    // Deepgram expects raw audio bytes
    this.ws.send(audio);
  }

  async sendText(text: string): Promise<void> {
    // Deepgram STT doesn't support text input
    // This would be used in a hybrid setup with TTS
    throw new Error('Deepgram STT does not support text input');
  }

  async disconnect(): Promise<void> {
    // Send close frame
    this.ws.send(JSON.stringify({ type: 'CloseStream' }));
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
