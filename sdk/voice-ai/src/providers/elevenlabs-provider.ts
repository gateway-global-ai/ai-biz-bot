/**
 * ElevenLabs Voice Provider
 * High-quality TTS with voice cloning capabilities
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

export class ElevenLabsProvider extends BaseVoiceProvider {
  readonly name = 'elevenlabs';
  readonly capabilities = {
    tts: true,
    stt: true,
    realtime: false, // No native realtime API yet
    voiceCloning: true,
    streaming: true,
    emotions: true,
    wordTimestamps: true,
    speakerDiarization: false,
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'hi', 'ar', 'ja', 'ko', 'zh', 'tr', 'vi', 'nl', 'ru']
  };

  private apiEndpoint = 'https://api.elevenlabs.io/v1';
  private wsEndpoint = 'wss://api.elevenlabs.io/v1';

  async initialize(config: VoiceConfig): Promise<void> {
    await super.initialize(config);
    if (config.apiEndpoint) {
      this.apiEndpoint = config.apiEndpoint;
    }
  }

  async synthesize(options: TTSOptions): Promise<TTSResponse> {
    this.ensureInitialized();

    const voiceId = options.voice || '21m00Tcm4TlvDq8ikWAM'; // Default: Rachel
    const model = options.model || 'eleven_multilingual_v2';

    const response = await axios.post(
      `${this.apiEndpoint}/text-to-speech/${voiceId}`,
      {
        text: options.text,
        model_id: model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true
        },
        pronunciation_dictionary_locators: []
      },
      {
        headers: {
          'xi-api-key': this.config.apiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    const duration = this.estimateDuration(options.text);

    return {
      audio: Buffer.from(response.data),
      duration,
      format: options.format || 'mp3',
      sampleRate: options.sampleRate || 44100,
      charactersUsed: options.text.length,
      cost: this.estimateCost('tts', options.text.length).estimatedCost
    };
  }

  async synthesizeStreaming(options: StreamingTTSOptions): Promise<void> {
    this.ensureInitialized();

    const voiceId = options.voice || '21m00Tcm4TlvDq8ikWAM';
    const model = options.model || 'eleven_multilingual_v2';

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(
        `${this.wsEndpoint}/text-to-speech/${voiceId}/stream-input?model_id=${model}`,
        {
          headers: {
            'xi-api-key': this.config.apiKey
          }
        }
      );

      ws.on('open', () => {
        // Send initial configuration
        ws.send(JSON.stringify({
          text: options.text,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          },
          generation_config: {
            chunk_length_schedule: [120, 160, 250, 290]
          },
          x_api_key: this.config.apiKey
        }));
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.audio) {
            const audioChunk = Buffer.from(message.audio, 'base64');
            options.onAudioChunk?.(audioChunk);
          }

          if (message.isFinal) {
            options.onComplete?.();
            ws.close();
            resolve();
          }

          if (message.error) {
            throw new Error(message.error);
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

    if (options.labels) {
      formData.append('labels', JSON.stringify(options.labels));
    }

    // Add audio samples
    options.audioSamples.forEach((sample, index) => {
      const blob = new Blob([sample], { type: 'audio/wav' });
      formData.append('files', blob, `sample_${index}.wav`);
    });

    const response = await axios.post(
      `${this.apiEndpoint}/voices/add`,
      formData,
      {
        headers: {
          'xi-api-key': this.config.apiKey,
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

    await axios.delete(`${this.apiEndpoint}/voices/${voiceId}`, {
      headers: {
        'xi-api-key': this.config.apiKey
      }
    });
  }

  async listVoices(): Promise<Array<{id: string; name: string; preview?: string}>> {
    this.ensureInitialized();

    const response = await axios.get(`${this.apiEndpoint}/voices`, {
      headers: {
        'xi-api-key': this.config.apiKey
      }
    });

    return response.data.voices.map((v: any) => ({
      id: v.voice_id,
      name: v.name,
      preview: v.preview_url
    }));
  }

  estimateCost(service: 'tts' | 'stt' | 'realtime', inputUnits: number): CostEstimate {
    return CostCalculator.calculateTTSCost(this.name, inputUnits);
  }

  private estimateDuration(text: string): number {
    const words = text.length / 5;
    return (words / 150) * 60;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.apiEndpoint}/user`, {
        headers: {
          'xi-api-key': this.config.apiKey
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
