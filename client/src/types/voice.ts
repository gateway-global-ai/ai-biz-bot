/**
 * Voice AI System Type Definitions
 * 
 * Core types for the dual-engine voice system:
 * - Clear Voice (Premium): Ultra-low latency streaming via WebSocket
 * - Standard: Cost-efficient PTT with server-side audio analysis
 */

export interface VoiceMessage {
  type: 'transcription' | 'response' | 'error' | 'metadata';
  text?: string;
  isFinal?: boolean;
  metadata?: {
    placeId?: string;
    emotion?: string;
    sentiment?: number;
    disc?: DISCProfile;
  };
}

export interface VoiceConfig {
  mode: 'clear_voice' | 'standard_ptt'; // 'clear_voice' = streaming, 'standard_ptt' = transactional
  latency: 'ultra-low' | 'standard';
  bufferDelay?: number; // Hard-wired to SPEECH_RECOGNITION_THRESHOLD_MS (800ms); not user-configurable
  silenceThreshold?: number; // Optional silence detection threshold
  enableAnalysis: {
    emotion: boolean;
    sentiment: boolean;
    disc: boolean;
  };
  analysis?: {
    emotion: boolean;
    sentiment: boolean;
    disc: boolean;
  };
  model: string; // e.g., 'gemini-2.5-flash-native-audio-preview-12-2025'
  /** Prebuilt voice name from Mixing Board (e.g. Puck, Kore, Charon). Defaults to Puck if unset. */
  voiceName?: string;
}

export interface BusinessContext {
  id: string; // The UUID of the site configuration (siteConfigId)
  placeId: string;
  name: string;
  address: string;
  hours?: string;
  services?: string[];
  primaryColor?: string;
  /** DB-backed system prompt from site_configs.system_prompt_override. When present,
   *  takes priority over the enriched or default instruction in GeminiStreamingClient. */
  systemPromptOverride?: string | null;
  /**
   * Dynamic Entry Point Engine — set by ConciergePanel when the user activates
   * a specific entry point node. Sent in sessionContext to the proxy which compiles
   * the master system instruction server-side (Contextual Snap).
   */
  entryPointAgentId?: string;
  entryPointMetaPrompt?: string;
}

export interface AgentConfig {
  role: string;
  personality: string;
  objectives: string[];
  constraints: string[];
}

export interface DISCProfile {
  dominance: number;
  influence: number;
  steadiness: number;
  conscientiousness: number;
}

/**
 * Payload attached to a ChatMessage when the model triggers an upsell
 * via the suggestIntegration function call.
 */
export interface UpsellData {
  /** Display name of the product being upsold. */
  productName: string;
  /** Price in USD (e.g. 99 for $99). */
  price: number;
  /** Unique function-call ID for tool-response tracking. */
  functionCallId: string;
  /** Short pitch line shown on the card. */
  pitch?: string;
  /** Route to navigate to after purchase, if applicable. */
  ctaRoute?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
  /** When true the message renders an upsell card instead of plain text. */
  isUpsell?: boolean;
  /** Required when isUpsell is true. */
  upsellData?: UpsellData;
}
