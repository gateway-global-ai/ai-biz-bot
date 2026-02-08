/**
 * Gateway Global AI - Chat SDK Type Definitions
 * 
 * Frontend SDK for embedding AI chat widgets that connect
 * to the Gateway Global AI platform APIs.
 */

export interface GatewayMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface ThemeConfig {
  /** Primary brand color (hex). Default: '#2563eb' */
  primaryColor?: string;
  /** Chat background color. Default: '#f8fafc' */
  chatBackground?: string;
  /** Header background color. Default: primaryColor */
  headerBackground?: string;
  /** Header text color. Default: '#ffffff' */
  headerText?: string;
  /** User message bubble color. Default: primaryColor */
  userBubbleColor?: string;
  /** User message text color. Default: '#ffffff' */
  userBubbleText?: string;
  /** Assistant message bubble color. Default: '#ffffff' */
  assistantBubbleColor?: string;
  /** Assistant message text color. Default: '#1e293b' */
  assistantBubbleText?: string;
  /** Font family. Default: system-ui */
  fontFamily?: string;
  /** Border radius for the widget container. Default: '24px' */
  borderRadius?: string;
  /** FAB (floating action button) size. Default: '56px' */
  fabSize?: string;
}

export interface VoiceConfig {
  /** Enable voice input button in footer. Default: false */
  enabled?: boolean;
  /** Visualizer animation style. Default: 'bars' */
  visualizerStyle?: 'bars' | 'orb' | 'waveform';
  /** Text shown while listening. Default: 'Listening...' */
  listeningText?: string;
  /** Text shown while processing. Default: 'Processing...' */
  processingText?: string;
}

export interface GatewayChatConfig {
  /** Bot ID from the Gateway platform (required) */
  botId: string;
  /** Gateway platform API base URL. Auto-detected from script src if omitted */
  apiBase?: string;
  /** Widget position on screen. Default: 'bottom-right' */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Theme customization */
  theme?: ThemeConfig;
  /** Voice input configuration */
  voice?: VoiceConfig;
  /** Initial greeting message. Overrides server config */
  greetingMessage?: string;
  /** Input placeholder text. Default: 'Type a message...' */
  placeholderText?: string;
  /** Bot display name. Overrides server config */
  botName?: string;
  /** URL for bot avatar image */
  botAvatar?: string;
  /** Subtitle shown under bot name in header */
  headerSubtitle?: string;
  /** Widget width. Default: '360px' */
  width?: string;
  /** Widget height. Default: '500px' */
  height?: string;
  /** CSS z-index. Default: 2147483647 */
  zIndex?: number;
  /** Open chat automatically on load. Default: false */
  autoOpen?: boolean;
  /** Called when chat opens */
  onOpen?: () => void;
  /** Called when chat closes */
  onClose?: () => void;
  /** Called when a message is sent or received */
  onMessage?: (message: GatewayMessage) => void;
  /** Called on errors */
  onError?: (error: Error) => void;
}

export interface GatewayChatWidget {
  /** Open the chat window */
  open(): void;
  /** Close the chat window */
  close(): void;
  /** Toggle chat open/closed */
  toggle(): void;
  /** Remove the widget from the page entirely */
  destroy(): void;
  /** Send a message programmatically */
  sendMessage(text: string): Promise<void>;
  /** Get all messages in the conversation */
  getMessages(): GatewayMessage[];
  /** Toggle voice mode on/off */
  setVoiceMode(enabled: boolean): void;
  /** Check if chat is open */
  isOpen(): boolean;
  /** Check if voice mode is active */
  isVoiceActive(): boolean;
}

/**
 * Initialize a Gateway Chat widget.
 * 
 * @example Script tag (simplest):
 * ```html
 * <script src="https://your-gateway.com/sdk/gateway-chat.js" 
 *   data-bot-id="your-bot-id"></script>
 * ```
 * 
 * @example Programmatic:
 * ```js
 * const chat = GatewayChat.init({
 *   botId: 'your-bot-id',
 *   apiBase: 'https://your-gateway.com',
 *   theme: { primaryColor: '#8b5cf6' },
 *   voice: { enabled: true }
 * });
 * chat.open();
 * ```
 */
export declare function init(config: GatewayChatConfig): GatewayChatWidget;

declare global {
  interface Window {
    GatewayChat: {
      init: typeof init;
    };
  }
}
