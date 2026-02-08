/**
 * Inworld AI Voice Provider
 * #1 ranked on Artificial Analysis for quality/price ratio
 * Best-in-class TTS with sub-200ms latency
 */

import axios from 'axios';
import WebSocket from 'ws';
import {
  VoiceConfig,
  TTSOptions,
  TTSResponse,
  StreamingTTSOptions,
  VoiceCloneOptions,
  VoiceCloneResponse,
  CostEstimate
} from '../types';
import { BaseVoiceProvider } from '../types/provider';
import { CostCalculator } from '../utils/cost-calculator';

export class InworldProvider extends BaseVoiceProvider {
  readonly name = 'inworld';
  readonly capabilities = {
    tts: true,
    stt: false,
    realtime: false, // TTS only provider
    voiceCloning: true,
    streaming: true,
    emotions: true,
    wordTimestamps: true,
    speakerDiarization: false,
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'nl', 'pl', 'ru', 'hi', 'ar', 'he']
  };

  private apiEndpoint = 'https://api.inworld.ai';
  private wsEndpoint = 'wss://api.inworld.ai';

  async initialize(config: VoiceConfig): Promise<void> {
    await super.initialize(config);
    if (config.apiEndpoint) {
      this.apiEndpoint = config.apiEndpoint;
    }
  }

  async synthesize(options: TTSOptions): Promise<TTSResponse> {
    this.ensureInitialized();

    const model = options.model || 'tts-1.5-max';
    const voice = options.voice || 'default';

    // Build emotion tags if specified
    let text = options.text;
    if (options.emotion) {
      text = `[${options.emotion}]${text}[/${options.emotion}]`;
    }

    const response = await axios.post(
      `${this.apiEndpoint}/tts/v1/synthesize`,
      {
        text,
        voice,
        model,
        output_format: this.mapAudioFormat(options.format || 'mp3'),
        sample_rate: options.sampleRate || 24000,
        speed: options.speed || 1.0,
        return_timestamps: options.wordTimestamps || false
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    // Parse response headers for metadata
    const duration = parseFloat(response.headers['x-audio-duration'] || '0');
    const charactersUsed = parseInt(response.headers['x-characters-used'] || '0');

    return {
      audio: Buffer.from(response.data),
      duration: duration || this.estimateDuration(options.text),
      format: options.format || 'mp3',
      sampleRate: options.sampleRate || 24000,
      charactersUsed: charactersUsed || options.text.length,
      cost: this.estimateCost('tts', options.text.length).estimatedCost
    };
  }

  async synthesizeStreaming(options: StreamingTTSOptions): Promise<void> {
    this.ensureInitialized();

    const model = options.model || 'tts-1.5-max';
    const voice = options.voice || 'default';

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(
        `${this.wsEndpoint}/tts/v1/stream`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          }
        }
      );

      ws.on('open', () => {
        // Send synthesis request
        ws.send(JSON.stringify({
          type: 'synthesize',
          text: options.text,
          voice,
          model,
          output_format: 'pcm',
          sample_rate: 24000,
          stream: true
        }));
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          // Check if binary audio data
          if (data instanceof Buffer) {
            options.onAudioChunk?.(data);
            return;
          }

          const message = JSON.parse(data.toString());

          if (message.type === 'audio') {
            const audioChunk = Buffer.from(message.data, 'base64');
            options.onAudioChunk?.(audioChunk);
          }

          if (message.type === 'done') {
            options.onComplete?.();
            ws.close();
            resolve();
          }

          if (message.type === 'error') {
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

  async cloneVoice(options: VoiceCloneOptions): Promise<VoiceCloneResponse> {
    this.ensureInitialized();

    const formData = new FormData();
    formData.append('name', options.name);
    
    if (options.description) {
      formData.append('description', options.description);
    }

    // Add audio samples (2-15 seconds each for zero-shot)
    options.audioSamples.forEach((sample, index) => {
      const blob = new Blob([sample], { type: 'audio/wav' });
      formData.append('samples', blob, `sample_${index}.wav`);
    });

    const response = await axios.post(
      `${this.apiEndpoint}/tts/v1/voices/clone`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return {
      voiceId: response.data.voice_id,
      name: options.name,
      previewUrl: response.data.preview_url
    };
  }

  async deleteVoice(voiceId: string): Promise<void> {
    this.ensureInitialized();

    await axios.delete(`${this.apiEndpoint}/tts/v1/voices/${voiceId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    });
  }

  async listVoices(): Promise<Array<{id: string; name: string; preview?: string}>> {
    this.ensureInitialized();

    const response = await axios.get(`${this.apiEndpoint}/tts/v1/voices`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    });

    return response.data.voices.map((v: any) => ({
      id: v.voice_id,
      name: v.name,
      preview: v.preview_url
    }));
  }

  /**
   * Get word-level timestamps for lipsync
   */
  async getTimestamps(text: string, voice?: string): Promise<Array<{word: string; start: number; end: number}>> {
    this.ensureInitialized();

    const response = await axios.post(
      `${this.apiEndpoint}/tts/v1/timestamps`,
      {
        text,
        voice: voice || 'default'
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.timestamps;
  }

  estimateCost(service: 'tts' | 'stt' | 'realtime', inputUnits: number): CostEstimate {
    return CostCalculator.calculateTTSCost(this.name, inputUnits);
  }

  private mapAudioFormat(format: string): string {
    const formatMap: Record<string, string> = {
      'mp3': 'mp3',
      'wav': 'wav',
      'ogg': 'ogg',
      'opus': 'opus',
      'pcm': 'pcm_s16le',
      'aac': 'aac'
    };
    return formatMap[format] || 'mp3';
  }

  private estimateDuration(text: string): number {
    // Inworld optimized for natural speech rates
    const words = text.length / 5;
    return (words / 150) * 60;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.apiEndpoint}/tts/v1/health`, {
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
