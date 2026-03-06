/**
 * Gemini Live Protocol Configuration
 * 
 * CRITICAL: This file defines the IMMUTABLE structure required by Google's
 * Gemini Multimodal Live API (v1beta BidiGenerateContent).
 * 
 * DO NOT modify the JSON structure without verifying against the official
 * protocol documentation. Incorrect nesting will cause immediate connection
 * termination with error codes 1007, 1008, or 1011.
 * 
 * Last validated: 2026-02-17
 * Protocol version: v1beta
 */

import { getServerMapsApiKey } from "./mapsApiKey";

// Environment variable validation (use GEMINI_MODEL_ID per platform standards)
const GEMINI_MODEL_ID = process.env.GEMINI_MODEL_ID || '';
const GEMINI_VOICE_NAME = process.env.GEMINI_VOICE_NAME || 'Puck';
const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION || '';

/**
 * Startup Validation: Fail Fast
 * 
 * This validation runs at server boot time to catch configuration errors
 * before any user connections are attempted.
 */
export function validateGeminiConfig(): void {
  const errors: string[] = [];

  // Validate model name
  if (!GEMINI_MODEL_ID) {
    errors.push('GEMINI_MODEL_ID is not set in environment variables');
  } else if (!GEMINI_MODEL_ID.includes('native-audio-preview')) {
    errors.push(
      `Invalid model for Live API: ${GEMINI_MODEL_ID}\n` +
      `Expected: models/gemini-2.5-flash-native-audio-preview-12-2025`
    );
  }

  // Validate API version
  if (GEMINI_API_VERSION !== 'v1beta') {
    errors.push(
      `Invalid API version: ${GEMINI_API_VERSION || '(not set)'}\n` +
      `Expected: v1beta`
    );
  }

  // Validate voice name
  const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'];
  if (!validVoices.includes(GEMINI_VOICE_NAME)) {
    errors.push(
      `Invalid voice name: ${GEMINI_VOICE_NAME}\n` +
      `Valid options: ${validVoices.join(', ')}`
    );
  }

  if (errors.length > 0) {
    console.error('\n❌ GEMINI CONFIGURATION ERROR ❌\n');
    errors.forEach(err => console.error(`  • ${err}`));
    console.error('\nPlease check your .env file and restart the server.\n');
    throw new Error('Invalid Gemini Live API configuration');
  }

  console.log('✅ Gemini Live API configuration validated');
  
  // Optional: Validate Google Maps configuration (warnings only)
  const googleMapsKey = getServerMapsApiKey();
  if (!googleMapsKey) {
    console.warn('⚠️  Google Maps API key not set (set GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_GROUNDING_LITE_API_KEY, or GOOGLE_PLACES_API_KEY) - Map tools will be unavailable');
  } else {
    console.log('✅ Google Maps API key configured');
  }
}

/**
 * Get Setup Message
 * 
 * Returns the correctly structured setup message for the Gemini Live API.
 * This structure is NON-NEGOTIABLE - do not modify without protocol updates.
 * 
 * @param systemInstruction - Optional system instruction text
 * @param tools - Optional array of tool declarations
 * @returns Gemini Live API setup object
 */
export function getGeminiLiveSetup(systemInstruction?: string, tools?: any[]) {
  const setup: any = {
    setup: {
      model: GEMINI_MODEL_ID,
      generation_config: {
        response_modalities: ["AUDIO"], // MUST be uppercase
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: GEMINI_VOICE_NAME
            }
          }
        }
      }
    }
  };

  // Add system instruction if provided
  if (systemInstruction) {
    setup.setup.system_instruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  // Add tools if provided. Live API expects one tool object with one functionDeclarations array.
  if (tools && tools.length > 0) {
    setup.setup.tools = [{
      functionDeclarations: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }))
    }];
  }

  return setup;
}

/**
 * Get WebSocket URL
 * 
 * Constructs the correct WebSocket URL for the Gemini Live API.
 * 
 * @param apiKey - Gemini API key
 * @returns Complete WebSocket URL
 */
export function getGeminiWebSocketUrl(apiKey: string): string {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required');
  }

  return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.${GEMINI_API_VERSION}.GenerativeService.BidiGenerateContent?key=${apiKey}`;
}

/**
 * Configuration Constants
 */
export const GEMINI_CONFIG = {
  MODEL: GEMINI_MODEL_ID,
  API_VERSION: GEMINI_API_VERSION,
  VOICE_NAME: GEMINI_VOICE_NAME,
  INPUT_SAMPLE_RATE: parseInt(process.env.GEMINI_INPUT_SAMPLE_RATE || '16000'),
  OUTPUT_SAMPLE_RATE: parseInt(process.env.GEMINI_OUTPUT_SAMPLE_RATE || '24000'),
  BUFFER_DELAY_MS: parseInt(process.env.VOICE_BUFFER_DELAY_MS || '2000')
} as const;

/**
 * Protocol Version Info
 */
export const PROTOCOL_INFO = {
  version: 'v1beta',
  endpoint: 'BidiGenerateContent',
  lastValidated: '2026-02-17',
  requiredModelPrefix: 'models/gemini-2.5-flash-native-audio-preview'
} as const;
