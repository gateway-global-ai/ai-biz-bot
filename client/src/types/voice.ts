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
    tool_type?: string;
    [key: string]: any;
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
  hours?: string | string[];
  services?: string[];
  primaryColor?: string;
  /** Google Places rating (1–5) */
  rating?: number;
  /** Number of Google reviews */
  userRatingsTotal?: number;
  /** Formatted phone number */
  phone?: string;
  /** Google Places type tags (e.g. ['airport', 'transit_station']) */
  types?: string[];
  /** Hero image URL for the business (photo-proxy or manual) */
  heroImageUrl?: string | null;
  /** Stored lat/lng from placeData.geometry.location — no live API call needed */
  lat?: number;
  lng?: number;
  /**
   * Owner agent role — controls which AI advisor the owner is talking to.
   * Only relevant when showOwnerControls is true.
   *   • 'concierge'   — the business's voice agent (customer-facing, default)
   *   • 'biz-bot'     — AI Biz Bot: consulting on strategy, ops, business profile
   *   • 'bot-builder' — AI Bot Builder: guides owner through configuring this agent
   */
  ownerAgentRole?: 'concierge' | 'biz-bot' | 'bot-builder';
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
  /**
   * Workspace lifecycle state from site_configs.workspace_state.
   * Drives ConciergePanel shell mode:
   *   'demo'        → customer mode + "Is this your business?" banner
   *   'provisioned' → customer mode (agents ready, not yet claimed)
   *   'claimed'     → customer mode + sign-in gate for owner controls
   *   'active'      → claimed + telephony active
   *   'archived'    → read-only / retired
   */
  workspaceState?: 'demo' | 'provisioned' | 'claimed' | 'active' | 'archived';
  /** Ownership claim lifecycle from site_configs.claim_status. */
  claimStatus?: 'unclaimed' | 'invite_sent' | 'payment_pending' | 'claimed' | null;
  /** Owner's customer account ID — compared against auth user.id to gate owner controls. */
  ownerId?: string | null;
  /** Business plan tier from site_configs.plan. */
  plan?: 'free' | 'pro' | 'voice' | 'enterprise' | null;
}

export interface AgentConfig {
  name?: string;
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
