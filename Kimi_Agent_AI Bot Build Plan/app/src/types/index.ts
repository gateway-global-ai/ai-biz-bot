// Bot Types for Gateway Bot Matrix

export type ModelProvider = 'openai' | 'anthropic' | 'kimi';

export type BotInterface = 'chat' | 'voice' | 'widget';

export type BotPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface ToolConfig {
  webSearch?: boolean;
  fileUpload?: boolean;
  codeInterpreter?: boolean;
  apiCalls?: boolean;
}

export interface UIConfig {
  interface: BotInterface;
  position: BotPosition;
  primaryColor?: string;
  avatarUrl?: string;
  greetingMessage?: string;
  placeholderText?: string;
}

export interface BotTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'support' | 'onboarding' | 'custom';
  default_system_prompt: string;
  default_model: ModelProvider;
  default_tools: ToolConfig;
  default_ui_config: Partial<UIConfig>;
  icon: string;
  created_at?: string;
  updated_at?: string;
}

export interface PageBot {
  id: string;
  page_id: string;
  name: string;
  system_prompt: string;
  model_provider: ModelProvider;
  model_name?: string;
  tools_config: ToolConfig;
  ui_config: UIConfig;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface BotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ChatSession {
  id: string;
  bot_id: string;
  page_id: string;
  visitor_id: string;
  messages: BotMessage[];
  created_at: string;
  updated_at: string;
}

export interface BotConfigPublic {
  id: string;
  name: string;
  ui_config: UIConfig;
  greeting_message?: string;
}

export interface ChatRequest {
  botId: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  stream?: boolean;
}

export interface ChatResponse {
  message: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface User {
  id: string;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  org_id?: string;
  created_at?: string;
}

export interface Page {
  id: string;
  url: string;
  title?: string;
  org_id?: string;
  created_at?: string;
}

export interface BotSnapshot {
  id: string;
  bot_id: string;
  config: PageBot;
  created_at: string;
  created_by?: string;
}

export interface DocumentUpload {
  id: string;
  bot_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  content_vector?: number[];
  metadata?: Record<string, unknown>;
  created_at: string;
}
