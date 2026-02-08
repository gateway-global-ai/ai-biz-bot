/**
 * Voice AI Unified SDK
 * Main exports
 */

// Core SDK
export { VoiceAI, SDKConfig } from './voice-ai-sdk';

// Types
export * from './types';
export * from './types/provider';

// Providers
export * from './providers';

// Utilities
export { CostCalculator, PROVIDER_PRICING } from './utils/cost-calculator';

// Version
export const VERSION = '1.0.0';
