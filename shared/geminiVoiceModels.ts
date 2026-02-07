/**
 * Gemini Voice Model Configurations
 * Each model has specific requirements for system prompts, sampling, and API format
 */

export interface GeminiModelConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  releaseDate: string;
  isLatest: boolean;
  isBudgetFriendly: boolean;
  
  // API Configuration
  apiEndpoint: string;
  usesLiveAPI: boolean;
  usesBidiStreaming: boolean;
  
  // Capabilities
  capabilities: {
    audioInput: boolean;
    audioOutput: boolean;
    textInput: boolean;
    textOutput: boolean;
    streaming: boolean;
    functionCalling: boolean;
  };
  
  // System Prompt Configuration
  systemPromptConfig: {
    format: 'systemInstruction' | 'firstMessage' | 'config';
    maxLength: number;
    supportsRoles: boolean;
  };
  
  // Sampling Parameters
  samplingConfig: {
    temperature: {
      min: number;
      max: number;
      default: number;
      recommended: number;
    };
    topP: {
      min: number;
      max: number;
      default: number;
      recommended: number;
    };
    topK: {
      min: number;
      max: number;
      default: number;
      recommended: number;
    };
    maxOutputTokens: {
      min: number;
      max: number;
      default: number;
      recommended: number;
    };
  };
  
  // Voice Configuration
  availableVoices: Array<{
    id: string;
    name: string;
    gender: string;
    description: string;
    quality: 'standard' | 'hd' | 'premium';
  }>;
  
  // Pricing (per 1M tokens/minutes)
  pricing: {
    inputAudioPerMinute: number;
    outputAudioPerMinute: number;
    inputTextPer1MTokens: number;
    outputTextPer1MTokens: number;
    currency: string;
  };
  
  // Performance Metrics
  performance: {
    averageLatency: number; // ms
    streamingLatency: number; // ms
    audioQuality: string;
  };
  
  // SDK Template
  sdkTemplate: string;
  exampleCode: string;
}

export const GEMINI_VOICE_MODELS: Record<string, GeminiModelConfig> = {
  'gemini-2.5-flash-native-audio-preview': {
    id: 'gemini-2.5-flash-native-audio-preview',
    name: 'gemini-2.5-flash-native-audio-preview',
    displayName: 'Gemini 2.5 Flash Native Audio',
    description: 'Latest model with best quality native audio support and advanced features',
    releaseDate: '2025-01',
    isLatest: true,
    isBudgetFriendly: false,
    
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    usesLiveAPI: true,
    usesBidiStreaming: true,
    
    capabilities: {
      audioInput: true,
      audioOutput: true,
      textInput: true,
      textOutput: true,
      streaming: true,
      functionCalling: true,
    },
    
    systemPromptConfig: {
      format: 'systemInstruction',
      maxLength: 8000,
      supportsRoles: true,
    },
    
    samplingConfig: {
      temperature: {
        min: 0,
        max: 2.0,
        default: 1.0,
        recommended: 0.8,
      },
      topP: {
        min: 0,
        max: 1.0,
        default: 0.95,
        recommended: 0.95,
      },
      topK: {
        min: 1,
        max: 40,
        default: 40,
        recommended: 40,
      },
      maxOutputTokens: {
        min: 1,
        max: 8192,
        default: 8192,
        recommended: 2048,
      },
    },
    
    availableVoices: [
      { id: 'Aoede', name: 'Aoede', gender: 'female', description: 'Warm and expressive', quality: 'premium' },
      { id: 'Kore', name: 'Kore', gender: 'female', description: 'Clear and articulate', quality: 'premium' },
      { id: 'Leda', name: 'Leda', gender: 'female', description: 'Soft and soothing', quality: 'premium' },
      { id: 'Zephyr', name: 'Zephyr', gender: 'female', description: 'Bright and energetic', quality: 'premium' },
      { id: 'Charon', name: 'Charon', gender: 'male', description: 'Deep and authoritative', quality: 'premium' },
      { id: 'Fenrir', name: 'Fenrir', gender: 'male', description: 'Strong and confident', quality: 'premium' },
      { id: 'Orus', name: 'Orus', gender: 'male', description: 'Professional and clear', quality: 'premium' },
      { id: 'Puck', name: 'Puck', gender: 'male', description: 'Friendly and approachable', quality: 'premium' },
    ],
    
    pricing: {
      inputAudioPerMinute: 0.04,
      outputAudioPerMinute: 0.12,
      inputTextPer1MTokens: 0.075,
      outputTextPer1MTokens: 0.30,
      currency: 'USD',
    },
    
    performance: {
      averageLatency: 800,
      streamingLatency: 300,
      audioQuality: 'Premium HD (24kHz)',
    },
    
    sdkTemplate: 'gemini-2.5-live-api',
    exampleCode: `// Gemini 2.5 Flash Native Audio - Live API
import { GoogleGenAI, Modality } from '@google/genai';

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Connect to Live API for bidirectional streaming
const session = await client.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview',
  config: {
    systemInstruction: {
      parts: [{ text: 'You are a helpful AI assistant.' }]
    },
    responseModalities: [Modality.AUDIO, Modality.TEXT],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: 'Puck' }
      }
    },
    generationConfig: {
      temperature: 0.8,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
    }
  },
  callbacks: {
    onopen: () => console.log('Connected'),
    onmessage: (msg) => handleResponse(msg),
    onerror: (err) => console.error(err),
  }
});

// Send audio input
await session.sendRealtimeInput({
  media: { data: audioBase64, mimeType: 'audio/pcm;rate=16000' }
});`,
  },
  
  'gemini-2.0-flash-native-audio': {
    id: 'gemini-2.0-flash-native-audio',
    name: 'gemini-2.0-flash-native-audio',
    displayName: 'Gemini 2.0 Flash Native Audio',
    description: 'Budget-friendly model with good quality audio support',
    releaseDate: '2024-12',
    isLatest: false,
    isBudgetFriendly: true,
    
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    usesLiveAPI: true,
    usesBidiStreaming: true,
    
    capabilities: {
      audioInput: true,
      audioOutput: true,
      textInput: true,
      textOutput: true,
      streaming: true,
      functionCalling: false,
    },
    
    systemPromptConfig: {
      format: 'systemInstruction',
      maxLength: 4000,
      supportsRoles: false,
    },
    
    samplingConfig: {
      temperature: {
        min: 0,
        max: 1.5,
        default: 1.0,
        recommended: 0.7,
      },
      topP: {
        min: 0,
        max: 1.0,
        default: 0.9,
        recommended: 0.9,
      },
      topK: {
        min: 1,
        max: 32,
        default: 32,
        recommended: 32,
      },
      maxOutputTokens: {
        min: 1,
        max: 4096,
        default: 4096,
        recommended: 1024,
      },
    },
    
    availableVoices: [
      { id: 'Puck', name: 'Puck', gender: 'male', description: 'Friendly and approachable', quality: 'hd' },
      { id: 'Charon', name: 'Charon', gender: 'male', description: 'Deep and authoritative', quality: 'hd' },
      { id: 'Kore', name: 'Kore', gender: 'female', description: 'Clear and articulate', quality: 'hd' },
      { id: 'Fenrir', name: 'Fenrir', gender: 'male', description: 'Strong and confident', quality: 'hd' },
    ],
    
    pricing: {
      inputAudioPerMinute: 0.02,
      outputAudioPerMinute: 0.08,
      inputTextPer1MTokens: 0.05,
      outputTextPer1MTokens: 0.20,
      currency: 'USD',
    },
    
    performance: {
      averageLatency: 1000,
      streamingLatency: 400,
      audioQuality: 'HD (16kHz)',
    },
    
    sdkTemplate: 'gemini-2.0-live-api',
    exampleCode: `// Gemini 2.0 Flash Native Audio - Live API
import { GoogleGenAI, Modality } from '@google/genai';

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Connect to Live API
const session = await client.live.connect({
  model: 'gemini-2.0-flash-native-audio',
  config: {
    systemInstruction: {
      parts: [{ text: 'You are a helpful AI assistant.' }]
    },
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: 'Puck' }
      }
    },
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 32,
      maxOutputTokens: 1024,
    }
  },
  callbacks: {
    onopen: () => console.log('Connected'),
    onmessage: (msg) => handleResponse(msg),
  }
});

// Send audio
await session.sendRealtimeInput({
  media: { data: audioBase64, mimeType: 'audio/pcm;rate=16000' }
});`,
  },
};

/**
 * Calculate monthly cost for a given usage pattern
 */
export function calculateMonthlyCost(
  modelId: string,
  avgDailyMinutes: number,
  avgDailyTextTokens: number = 0
): {
  model: string;
  monthlyAudioCost: number;
  monthlyTextCost: number;
  totalMonthlyCost: number;
  costPerSession: number;
  breakdown: string;
} {
  const model = GEMINI_VOICE_MODELS[modelId];
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  
  const monthlyMinutes = avgDailyMinutes * 30;
  
  // Assume 50/50 split between input and output audio
  const inputMinutes = monthlyMinutes * 0.5;
  const outputMinutes = monthlyMinutes * 0.5;
  
  const audioInputCost = (inputMinutes * model.pricing.inputAudioPerMinute);
  const audioOutputCost = (outputMinutes * model.pricing.outputAudioPerMinute);
  const monthlyAudioCost = audioInputCost + audioOutputCost;
  
  // Text tokens (if any)
  const monthlyTextTokens = avgDailyTextTokens * 30;
  const textInputCost = (monthlyTextTokens * model.pricing.inputTextPer1MTokens) / 1000000;
  const textOutputCost = (monthlyTextTokens * model.pricing.outputTextPer1MTokens) / 1000000;
  const monthlyTextCost = textInputCost + textOutputCost;
  
  const totalMonthlyCost = monthlyAudioCost + monthlyTextCost;
  
  // Assume 5-minute average session
  const sessionsPerMonth = monthlyMinutes / 5;
  const costPerSession = totalMonthlyCost / sessionsPerMonth;
  
  const breakdown = `
Audio: ${monthlyMinutes.toFixed(0)} min/month
- Input: $${audioInputCost.toFixed(2)} (${inputMinutes.toFixed(0)} min @ $${model.pricing.inputAudioPerMinute}/min)
- Output: $${audioOutputCost.toFixed(2)} (${outputMinutes.toFixed(0)} min @ $${model.pricing.outputAudioPerMinute}/min)

Sessions: ~${sessionsPerMonth.toFixed(0)} sessions/month (5 min avg)
Cost per session: $${costPerSession.toFixed(4)}
  `.trim();
  
  return {
    model: model.displayName,
    monthlyAudioCost,
    monthlyTextCost,
    totalMonthlyCost,
    costPerSession,
    breakdown,
  };
}

/**
 * Compare costs across models
 */
export function compareModelCosts(avgDailyMinutes: number) {
  const models = Object.keys(GEMINI_VOICE_MODELS);
  const comparisons = models.map(modelId => ({
    ...calculateMonthlyCost(modelId, avgDailyMinutes),
    modelId,
    isLatest: GEMINI_VOICE_MODELS[modelId].isLatest,
    isBudgetFriendly: GEMINI_VOICE_MODELS[modelId].isBudgetFriendly,
  }));
  
  // Sort by total cost
  comparisons.sort((a, b) => a.totalMonthlyCost - b.totalMonthlyCost);
  
  return comparisons;
}

/**
 * Get recommended model based on usage and budget
 */
export function getRecommendedModel(
  avgDailyMinutes: number,
  monthlyBudget: number,
  prioritizeLatest: boolean = false
): string {
  const comparisons = compareModelCosts(avgDailyMinutes);
  
  if (prioritizeLatest) {
    // Find latest model within budget
    const latestInBudget = comparisons.find(
      c => c.isLatest && c.totalMonthlyCost <= monthlyBudget
    );
    if (latestInBudget) return latestInBudget.modelId;
  }
  
  // Find cheapest model within budget
  const cheapestInBudget = comparisons.find(
    c => c.totalMonthlyCost <= monthlyBudget
  );
  
  if (cheapestInBudget) return cheapestInBudget.modelId;
  
  // If nothing fits budget, return the cheapest
  return comparisons[0].modelId;
}
