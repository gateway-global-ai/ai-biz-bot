/**
 * Voice AI Provider Exports
 */

export { OpenAIVoiceProvider } from './openai-provider';
export { GeminiVoiceProvider } from './gemini-provider';
export { KimiVoiceProvider } from './kimi-provider';
export { ElevenLabsProvider } from './elevenlabs-provider';
export { DeepgramProvider } from './deepgram-provider';
export { InworldProvider } from './inworld-provider';

// Provider factory
import { VoiceProvider } from '../types';
import { VoiceProviderInterface } from '../types/provider';
import { OpenAIVoiceProvider } from './openai-provider';
import { GeminiVoiceProvider } from './gemini-provider';
import { KimiVoiceProvider } from './kimi-provider';
import { ElevenLabsProvider } from './elevenlabs-provider';
import { DeepgramProvider } from './deepgram-provider';
import { InworldProvider } from './inworld-provider';

export function createProvider(provider: VoiceProvider): VoiceProviderInterface {
  switch (provider) {
    case 'openai':
      return new OpenAIVoiceProvider();
    case 'gemini':
      return new GeminiVoiceProvider();
    case 'kimi':
      return new KimiVoiceProvider();
    case 'elevenlabs':
      return new ElevenLabsProvider();
    case 'deepgram':
      return new DeepgramProvider();
    case 'inworld':
      return new InworldProvider();
    default:
      throw new Error(`Provider ${provider} not implemented yet`);
  }
}

export const AVAILABLE_PROVIDERS: VoiceProvider[] = [
  'openai',
  'gemini',
  'kimi',
  'elevenlabs',
  'deepgram',
  'inworld'
];
