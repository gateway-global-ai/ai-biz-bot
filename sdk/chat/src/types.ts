export interface GatewayMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface ThemeConfig {
  primaryColor?: string;
  backgroundColor?: string;
  headerBackground?: string;
  headerText?: string;
  userBubbleColor?: string;
  userBubbleText?: string;
  assistantBubbleColor?: string;
  assistantBubbleText?: string;
  fontFamily?: string;
  borderRadius?: string;
}

export interface VoiceConfig {
  enabled?: boolean;
  visualizerStyle?: 'bars' | 'orb' | 'waveform';
  listeningText?: string;
  processingText?: string;
}

export interface ChatWidgetConfig {
  botId: string;
  apiBase?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: ThemeConfig;
  voice?: VoiceConfig;
  greetingMessage?: string;
  placeholderText?: string;
  botName?: string;
  botAvatar?: string;
  headerSubtitle?: string;
  width?: string;
  height?: string;
  zIndex?: number;
  autoOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (message: GatewayMessage) => void;
  onError?: (error: Error) => void;
}

export interface BotPublicConfig {
  id: string;
  name: string;
  ui_config: {
    position: string;
    primaryColor: string;
    greetingMessage: string;
    placeholderText: string;
  };
}

export interface ChatWidgetAPI {
  open: () => void;
  close: () => void;
  toggle: () => void;
  destroy: () => void;
  sendMessage: (text: string) => Promise<void>;
  getMessages: () => GatewayMessage[];
  setVoiceMode: (enabled: boolean) => void;
  isOpen: () => boolean;
  isVoiceActive: () => boolean;
}
