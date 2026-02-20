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
    // Get the default configuration for the tier to ensure all properties are present.
    const defaultConfig = this.getDefaultConfig(config.mode === 'clear_voice' ? 'premium' : 'standard');

    // Merge the provided config over the defaults, ensuring the model is prioritized.
    const finalConfig: VoiceConfig = {
      ...defaultConfig,
      ...config,
      model: config.model || defaultConfig.model, // Explicitly prioritize incoming model
    };

    switch (finalConfig.mode) {
      case 'clear_voice': // Premium streaming mode
        return new GeminiStreamingClient(finalConfig);
      case 'standard_ptt': // Standard transactional PTT mode
        return new RestTransactionalClient(finalConfig);
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
        mode: 'clear_voice', // Premium streaming mode
        latency: 'ultra-low',
        bufferDelay: 800, // Optimal default for Clear Voice
        enableAnalysis: { 
          emotion: false, 
          sentiment: false, 
          disc: false 
        },
        model: 'gemini-2.5-flash-native-audio-preview-12-2025' // Ensure correct model is default
      };
    } else {
      return {
        mode: 'standard_ptt', // Standard transactional PTT mode
        latency: 'standard',
        bufferDelay: 800, // 800ms buffer for reliable PTT without cutoffs
        enableAnalysis: { 
          emotion: true, 
          sentiment: true, 
          disc: true 
        },
        analysis: {
          emotion: true,
          sentiment: true,
          disc: true
        },
        model: 'gemini-2.5-flash-native-audio-preview-12-2025'
      };
    }
  }
}
