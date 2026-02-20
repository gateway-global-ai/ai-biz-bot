/**
 * Google Maps Map ID Configuration
 * 
 * These Map IDs correspond to custom styled maps created in Google Cloud Console:
 * - Day: Clear Voice AI - Day (133113f6b0af325aa994b4cc)
 * - Midnight: Clear Voice AI Midnight (133113f6b0af325ac3bd97e2)
 * 
 * Values are read from environment variables (set in Doppler) with fallbacks
 * to the hardcoded IDs if env vars are missing.
 */

export const MAP_IDS = {
  day: import.meta.env.VITE_GOOGLE_MAP_ID || '133113f6b0af325aa994b4cc',
  midnight: import.meta.env.VITE_GOOGLE_MAP_ID_MIDNIGHT || '133113f6b0af325ac3bd97e2'
} as const;

export type MapTheme = 'day' | 'midnight';
