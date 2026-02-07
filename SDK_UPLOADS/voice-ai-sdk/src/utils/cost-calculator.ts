/**
 * Voice AI Cost Calculator
 * Comprehensive cost comparison across all supported providers
 * Based on latest 2025-2026 pricing data
 */

import { VoiceProvider, CostEstimate, ProviderPricing } from '../types';

// Pricing data as of February 2026
// Sources: Official provider pricing pages, Artificial Analysis benchmarks
export const PROVIDER_PRICING: Record<VoiceProvider, ProviderPricing> = {
  openai: {
    provider: 'openai',
    tts: {
      perCharacter: 0.000015, // $15 per 1M characters (TTS-1)
      models: {
        'tts-1': 0.000015,
        'tts-1-hd': 0.000030, // $30 per 1M characters
        'gpt-4o-mini-tts': 0.000015 // Per minute: $0.015
      }
    },
    stt: {
      perMinute: 0.006, // Whisper
      models: {
        'whisper-1': 0.006,
        'gpt-4o-transcribe': 0.006,
        'gpt-4o-mini-transcribe': 0.003
      }
    },
    realtime: {
      audioInputPerMinute: 0.06,  // $32 per 1M tokens ≈ $0.06/min
      audioOutputPerMinute: 0.24, // $64 per 1M tokens ≈ $0.24/min
      textInputPer1MTokens: 4.00,
      textOutputPer1MTokens: 16.00
    }
  },
  
  gemini: {
    provider: 'gemini',
    tts: {
      perCharacter: 0.000012, // Part of Live API audio output at $12/1M audio tokens
      models: {
        'gemini-2.5-flash-native-audio': 0.000012, // Audio output
        'gemini-2.5-flash': 0.0000025 // Text output
      }
    },
    stt: {
      perMinute: 0.05, // Estimated based on audio input pricing
      models: {
        'gemini-2.5-flash-native-audio': 0.05
      }
    },
    realtime: {
      audioInputPerMinute: 0.18,  // $3.00 per 1M audio tokens
      audioOutputPerMinute: 0.72, // $12.00 per 1M audio tokens
      textInputPer1MTokens: 0.50,
      textOutputPer1MTokens: 2.00
    }
  },
  
  kimi: {
    provider: 'kimi',
    tts: {
      perCharacter: 0.000008, // Estimated - Moonshot doesn't have native TTS yet
      models: {
        'kimi-k2': 0.000008
      }
    },
    stt: {
      perMinute: 0.004, // Estimated
      models: {
        'kimi-k2': 0.004
      }
    },
    realtime: {
      audioInputPerMinute: 0.08,
      audioOutputPerMinute: 0.16,
      textInputPer1MTokens: 0.60,
      textOutputPer1MTokens: 2.50
    }
  },
  
  elevenlabs: {
    provider: 'elevenlabs',
    tts: {
      perCharacter: 0.000206, // Scale plan: ~$206 per 1M characters
      models: {
        'multilingual-v2': 0.000206,
        'flash': 0.000050, // Turbo model
        'turbo-v2.5': 0.000050
      }
    },
    stt: {
      perMinute: 0.008, // Speech-to-text
      models: {
        'default': 0.008
      }
    },
    voiceCloning: {
      perClone: 0,
      freeTiers: 1
    }
  },
  
  deepgram: {
    provider: 'deepgram',
    tts: {
      perCharacter: 0.000030, // Aura-2: $0.030 per 1K characters
      models: {
        'aura-2': 0.000030,
        'aura': 0.000025
      }
    },
    stt: {
      perMinute: 0.0043, // Batch: $0.0043/min, Streaming: $0.0077/min
      models: {
        'nova-2': 0.0043,
        'nova-2-streaming': 0.0077
      }
    },
    voiceAgent: {
      perMinute: 0.08 // Voice Agent API: $0.04-$0.16/min
    }
  },
  
  cartesia: {
    provider: 'cartesia',
    tts: {
      perCharacter: 0.0000467, // Sonic-3: $46.70 per 1M characters
      models: {
        'sonic-3': 0.0000467,
        'sonic-2': 0.000038,
        'sonic-turbo': 0.000030
      }
    },
    voiceCloning: {
      perClone: 0,
      freeTiers: 3
    }
  },
  
  inworld: {
    provider: 'inworld',
    tts: {
      perCharacter: 0.000010, // TTS-1.5-Max: $10 per 1M characters
      models: {
        'tts-1.5-max': 0.000010,
        'tts-1.5-mini': 0.000005 // $5 per 1M characters
      }
    },
    voiceCloning: {
      perClone: 0, // Free zero-shot cloning
      freeTiers: Infinity
    }
  },
  
  hume: {
    provider: 'hume',
    tts: {
      perCharacter: 0.0000076, // ~$7.60 per 1M characters
      models: {
        'octave-tts': 0.0000076
      }
    },
    realtime: {
      audioInputPerMinute: 0.05,
      audioOutputPerMinute: 0.10,
      textInputPer1MTokens: 3.00,
      textOutputPer1MTokens: 10.00
    },
    voiceCloning: {
      perClone: 0,
      freeTiers: 1
    }
  },
  
  replicate: {
    provider: 'replicate',
    tts: {
      perCharacter: 0.000020, // Varies by model, estimated average
      models: {
        'xtts': 0.000020,
        'fish-speech': 0.000015,
        'styletts2': 0.000010
      }
    },
    voiceCloning: {
      perClone: 0,
      freeTiers: 0
    }
  },
  
  'fish-audio': {
    provider: 'fish-audio',
    tts: {
      perCharacter: 0.000015, // $15 per 1M characters
      models: {
        'fish-speech-1.5': 0.000015
      }
    },
    voiceCloning: {
      perClone: 0,
      freeTiers: 1
    }
  },
  
  assemblyai: {
    provider: 'assemblyai',
    stt: {
      perMinute: 0.0025, // Universal Streaming: $0.15/hr = $0.0025/min
      perHour: 0.15,
      models: {
        'universal-streaming': 0.0025,
        'universal-streaming-multilingual': 0.0033
      }
    }
  }
};

// Characters per minute estimate (average speaking rate)
const CHARS_PER_MINUTE = 150 * 5; // ~150 words/min * 5 chars/word = 750 chars/min

export class CostCalculator {
  /**
   * Calculate TTS cost for a given provider and character count
   */
  static calculateTTSCost(
    provider: VoiceProvider,
    characters: number,
    model?: string
  ): CostEstimate {
    const pricing = PROVIDER_PRICING[provider]?.tts;
    if (!pricing) {
      throw new Error(`TTS pricing not available for provider: ${provider}`);
    }

    const rate = model && pricing.models[model] 
      ? pricing.models[model] 
      : pricing.perCharacter || Math.min(...Object.values(pricing.models));

    const estimatedCost = characters * rate;

    return {
      provider,
      service: 'tts',
      inputUnits: characters,
      estimatedCost: Math.round(estimatedCost * 10000) / 10000,
      currency: 'USD',
      details: {
        rate,
        characters,
        model: model || 'default'
      }
    };
  }

  /**
   * Calculate STT cost for a given provider and audio duration
   */
  static calculateSTTCost(
    provider: VoiceProvider,
    minutes: number,
    model?: string
  ): CostEstimate {
    const pricing = PROVIDER_PRICING[provider]?.stt;
    if (!pricing) {
      throw new Error(`STT pricing not available for provider: ${provider}`);
    }

    const rate = model && pricing.models[model]
      ? pricing.models[model]
      : pricing.perMinute || Math.min(...Object.values(pricing.models));

    const estimatedCost = minutes * rate;

    return {
      provider,
      service: 'stt',
      inputUnits: minutes,
      estimatedCost: Math.round(estimatedCost * 10000) / 10000,
      currency: 'USD',
      details: {
        rate,
        minutes,
        model: model || 'default'
      }
    };
  }

  /**
   * Calculate real-time voice conversation cost
   */
  static calculateRealtimeCost(
    provider: VoiceProvider,
    audioInputMinutes: number,
    audioOutputMinutes: number,
    textInputTokens?: number,
    textOutputTokens?: number
  ): CostEstimate {
    const pricing = PROVIDER_PRICING[provider]?.realtime;
    if (!pricing) {
      throw new Error(`Realtime pricing not available for provider: ${provider}`);
    }

    let totalCost = 0;
    const details: Record<string, number> = {};

    if (pricing.audioInputPerMinute) {
      details.audioInputCost = audioInputMinutes * pricing.audioInputPerMinute;
      totalCost += details.audioInputCost;
    }

    if (pricing.audioOutputPerMinute) {
      details.audioOutputCost = audioOutputMinutes * pricing.audioOutputPerMinute;
      totalCost += details.audioOutputCost;
    }

    if (textInputTokens && pricing.textInputPer1MTokens) {
      details.textInputCost = (textInputTokens / 1000000) * pricing.textInputPer1MTokens;
      totalCost += details.textInputCost;
    }

    if (textOutputTokens && pricing.textOutputPer1MTokens) {
      details.textOutputCost = (textOutputTokens / 1000000) * pricing.textOutputPer1MTokens;
      totalCost += details.textOutputCost;
    }

    return {
      provider,
      service: 'realtime',
      inputUnits: audioInputMinutes + audioOutputMinutes,
      estimatedCost: Math.round(totalCost * 10000) / 10000,
      currency: 'USD',
      details
    };
  }

  /**
   * Calculate complete voice agent session cost (STT + LLM + TTS)
   */
  static calculateVoiceAgentSession(
    sttProvider: VoiceProvider,
    ttsProvider: VoiceProvider,
    sessionMinutes: number,
    userTalkRatio: number = 0.5, // User talks 50% of the time
    agentTalkRatio: number = 0.4, // Agent talks 40% of the time
    silenceRatio: number = 0.1
  ): {
    stt: CostEstimate;
    tts: CostEstimate;
    total: number;
    details: Record<string, unknown>;
  } {
    // STT cost (user speech)
    const userTalkMinutes = sessionMinutes * userTalkRatio;
    const sttCost = this.calculateSTTCost(sttProvider, userTalkMinutes);

    // TTS cost (agent speech)
    const agentTalkMinutes = sessionMinutes * agentTalkRatio;
    const agentChars = agentTalkMinutes * CHARS_PER_MINUTE;
    const ttsCost = this.calculateTTSCost(ttsProvider, agentChars);

    const total = sttCost.estimatedCost + ttsCost.estimatedCost;

    return {
      stt: sttCost,
      tts: ttsCost,
      total: Math.round(total * 10000) / 10000,
      details: {
        sessionMinutes,
        userTalkMinutes,
        agentTalkMinutes,
        agentCharacters: agentChars,
        userTalkRatio,
        agentTalkRatio
      }
    };
  }

  /**
   * Compare costs across all providers for a given service
   */
  static compareCosts(
    service: 'tts' | 'stt' | 'realtime',
    inputUnits: number
  ): CostEstimate[] {
    const estimates: CostEstimate[] = [];

    for (const provider of Object.keys(PROVIDER_PRICING) as VoiceProvider[]) {
      try {
        let estimate: CostEstimate;
        
        switch (service) {
          case 'tts':
            estimate = this.calculateTTSCost(provider, inputUnits);
            break;
          case 'stt':
            estimate = this.calculateSTTCost(provider, inputUnits);
            break;
          case 'realtime':
            // For realtime, assume equal input/output
            estimate = this.calculateRealtimeCost(provider, inputUnits / 2, inputUnits / 2);
            break;
        }
        
        estimates.push(estimate);
      } catch {
        // Provider doesn't support this service
      }
    }

    return estimates.sort((a, b) => a.estimatedCost - b.estimatedCost);
  }

  /**
   * Get the most cost-effective provider for a service
   */
  static getMostCostEffective(
    service: 'tts' | 'stt' | 'realtime',
    inputUnits: number
  ): CostEstimate | null {
    const comparisons = this.compareCosts(service, inputUnits);
    return comparisons[0] || null;
  }

  /**
   * Format cost as human-readable string
   */
  static formatCost(cost: number): string {
    if (cost < 0.01) {
      return `$${(cost * 100).toFixed(2)}¢`;
    }
    return `$${cost.toFixed(4)}`;
  }

  /**
   * Generate monthly cost projection
   */
  static projectMonthlyCost(
    dailySessions: number,
    avgSessionMinutes: number,
    sttProvider: VoiceProvider,
    ttsProvider: VoiceProvider,
    workingDays: number = 22
  ): {
    daily: number;
    monthly: number;
    annual: number;
    breakdown: Record<string, number>;
  } {
    const dailyMinutes = dailySessions * avgSessionMinutes;
    const monthlyMinutes = dailyMinutes * workingDays;

    const dailyCost = this.calculateVoiceAgentSession(
      sttProvider,
      ttsProvider,
      dailyMinutes
    );

    const monthlyCost = dailyCost.total * workingDays;
    const annualCost = monthlyCost * 12;

    return {
      daily: Math.round(dailyCost.total * 10000) / 10000,
      monthly: Math.round(monthlyCost * 10000) / 10000,
      annual: Math.round(annualCost * 100) / 100,
      breakdown: {
        dailySessions,
        avgSessionMinutes,
        dailyMinutes,
        monthlyMinutes,
        sttCost: dailyCost.stt.estimatedCost * workingDays,
        ttsCost: dailyCost.tts.estimatedCost * workingDays
      }
    };
  }
}

export default CostCalculator;
