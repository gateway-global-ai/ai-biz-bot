/**
 * AI Biz Bot MCP Server - Types
 * Standardizes deployments of Gemini Voice AI into chat and websites.
 */

export type ChatWindowComponentId =
  | 'message_list'
  | 'input_row'
  | 'voice_ptt_button'
  | 'typing_indicator'
  | 'header'
  | 'transcript_editor'
  | 'voice_visualizer'
  | 'admin_controls'
  | 'user_greeting';

export type WebsiteComponentId =
  | 'floating_widget'
  | 'fixed_window'
  | 'embed_script'
  | 'fullscreen_chat'
  | 'floating_fab';

export interface ChatWindowComponent {
  id: ChatWindowComponentId;
  name: string;
  description: string;
  slot: 'header' | 'body' | 'footer' | 'sidebar';
  required: boolean;
  configSchema?: Record<string, unknown>;
  addedAt: string;
}

export interface WebsiteComponent {
  id: WebsiteComponentId;
  name: string;
  description: string;
  embedType: 'script' | 'iframe' | 'web-component';
  configSchema?: Record<string, unknown>;
  addedAt: string;
}

export interface VoicePttConfig {
  /** Default mode: 'ptt' (push-to-talk) or 'vad' (voice activity detection) */
  defaultMode: 'ptt' | 'vad';
  /** Milliseconds to allow user to edit transcribed text before auto-submit. Default 1000. */
  editWindowMs: number;
  /** On mobile, use PTT as default. Default true. */
  mobileDefaultPtt: boolean;
  /** When true, mic only listens while user holds PTT; when AI speaks, no listening. Default true. */
  listenOnlyOnPtt: boolean;
  /** Buffer ms after PTT release before finalizing transcript (to capture trailing STT). Default 1200. */
  pttReleaseBufferMs: number;
  /**
   * When user PTTs again during AI response: 'always' = always interrupt;
   * 'never' = always queue; 'smart' = analyze input and decide (Gateway PTT protocol default).
   */
  interruptPolicy?: 'always' | 'never' | 'smart';
}

export interface VoiceModuleRegistration {
  id: string;
  /** 'user' = visitor-facing communication; 'admin' = voice controls, system prompt, visitor management */
  interface: 'user' | 'admin';
  /** Fixed window layout: chat + voice module in same frame */
  layout: 'fixed_window';
  components: ChatWindowComponentId[];
  voicePttConfig: VoicePttConfig;
  addedAt: string;
}
