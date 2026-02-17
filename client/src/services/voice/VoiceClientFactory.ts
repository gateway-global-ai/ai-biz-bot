/**
 * VoiceClientFactory
 * 
 * Factory pattern for creating the appropriate voice engine based on configuration.
 * Supports both streaming (Clear Voice Premium) and transactional (Standard PTT) modes.
 */

import { IVoiceClient } from './IVoiceClient';
import { GeminiStreamingClient } from './GeminiStreamingClient';
import { RestTransactionalClient } from './RestTransactionalClient';
import { VoiceConfig } from '@/types/voice';

export class VoiceClientFactory {
  /**
   * Create a voice client based on the provided configuration
   */
  static createClient(config: VoiceConfig): IVoiceClient {
    switch (config.mode) {
      case 'streaming':
        return new GeminiStreamingClient(config);
      case 'transactional':
        return new RestTransactionalClient(config);
      default:
        throw new Error(`Unknown voice mode: ${config.mode}`);
    }
  }
  
  /**
   * Get default configuration for a subscription tier
   * 
   * @param tier - 'premium' for Clear Voice (streaming), 'standard' for PTT
   */
  static getDefaultConfig(tier: 'premium' | 'standard'): VoiceConfig {
    if (tier === 'premium') {
      return {
        mode: 'streaming',
        latency: 'ultra-low',
        bufferDelay: 0,
        enableAnalysis: { 
          emotion: false, 
          sentiment: false, 
          disc: false 
        },
        model: 'gemini-2.0-flash-exp'
      };
    } else {
      return {
        mode: 'transactional',
        latency: 'standard',
        bufferDelay: 1000, // 1 second buffer for PTT (faster response)
        enableAnalysis: { 
          emotion: true, 
          sentiment: true, 
          disc: true 
        },
        model: 'gemini-2.0-flash-exp'
      };
    }
  }
}
