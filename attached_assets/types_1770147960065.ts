
export interface DiscProfile {
  dominance: number;
  influence: number;
  steadiness: number;
  conscientiousness: number;
}

export interface ArchProfile {
  acknowledge: number;
  reflect: number;
  context: number;
  handoff: number;
}

export interface BrandAwareness {
  businessDetails: number;
  enthusiasm: number;
  environment: number;
  experience: number;
  pay: number;
}

export interface GroundingData {
  opportunity: boolean;
  type: 'who' | 'where' | 'when' | 'none';
  tool: string;
}

export interface VisualItem {
  title: string;
  snippet: string;
  url?: string;
  address?: string;
  rating?: string;
}

export interface VisualContext {
  activate: boolean;
  mode: 'browser' | 'map';
  query: string;
  content: VisualItem[];
}

export interface Message {
  role: 'user' | 'agent';
  content: string;
  analysis?: {
    arch: ArchProfile;
    wordCount: number;
    grounding?: GroundingData;
  };
  visualContext?: VisualContext;
}

export interface CallLog {
  id: string;
  direction: 'inbound' | 'outbound';
  number: string;
  duration: number;
  timestamp: number;
  status: 'completed' | 'missed' | 'blocked' | 'failed';
  recordingUrl?: string;
}

export interface TwilioConfig {
  friendlyName?: string;
  phoneSid?: string;
  messagingServiceSid?: string;
  voiceUrl?: string;
  voiceFallbackUrl?: string;
  statusCallbackUrl?: string;
  smsUrl?: string;
  smsFallbackUrl?: string;
  errorUrl?: string;
}

export interface TelephonyConfig {
  phoneNumber: string | null;
  allowedNumbers: string[];
  callHistory: CallLog[];
  firewallEnabled: boolean;
  maxCallDuration: number;
  timeout: number;
  ownerPhone?: string;
  ownerEmail?: string;
  twilio?: TwilioConfig;
}

export interface AgentConfig {
  name: string;
  roleDescription: string;
  disc: DiscProfile;
  arch: ArchProfile;
  brand: BrandAwareness;
  groundingFocus: number;
  tools: string[];
  telephony: TelephonyConfig;
}

export interface SavedSession {
  id: string;
  config: AgentConfig;
  messages: Message[];
  timestamp: number;
  lastMessagePreview: string;
}
