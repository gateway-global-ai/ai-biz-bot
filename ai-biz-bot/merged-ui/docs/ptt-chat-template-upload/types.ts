
export interface NearbyPlace {
  name: string;
  type: string;
  summary: string;
  location: string;
  rating: number;
  imageUrl?: string;
}

export interface Review {
  author_name: string;
  rating: number;
  relative_time_description: string;
  text: string;
  profile_photo_url: string;
  time: number;
}

export interface MenuItem {
  name: string;
  description: string;
  price: string;
  imageUrl?: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface MenuSection {
  category: string;
  items: MenuItem[];
}

export type InventoryType = 'menu' | 'catalog' | 'services';

export interface BusinessData {
  name: string;
  tagline: string;
  description: string;
  address: string;
  rating: number;
  reviewCount: number;
  mapLink: string;
  hours: string[];
  reviews: Review[];
  insights: string[];
  images: string[];
  nearbyRestaurants: NearbyPlace[];
  nearbyActivities: NearbyPlace[];
  rawPlaceData: any;
  types?: string[];
  menu?: MenuSection[];
  categoryType: InventoryType;
}

export interface AgentConfig {
  name: string;
  role: string;
  discProfile: string;
  basePrompt: string;
}

export interface VoiceConfig {
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  language: string;
  isPushToTalk?: boolean;
}

export interface VoiceQueueItem {
  id: string;
  text: string;
  status: 'pending' | 'sent' | 'error';
  timestamp: number;
}

export interface BotConfig {
  botId: string;
  botConfigId: string;
  agentProfile: AgentConfig;
  voiceConfig?: VoiceConfig;
}

export enum ViewState {
  LANDING = 'LANDING',
  LOADING = 'LOADING',
  GENERATED = 'GENERATED',
  ERROR = 'ERROR'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isUpsell?: boolean;
  isProductCard?: boolean;
  productData?: MenuItem;
  upsellData?: {
    title: string;
    price: string;
    description: string;
    features: string[];
    cta: string;
  };
}

// SDK Specific Types
export type ChatMode = 'customer' | 'owner' | 'developer';
export type ChatLayoutMode = 'floating' | 'fixed' | 'fullscreen';
export type AdminAuthStatus = 'idle' | 'awaiting_otp' | 'authenticated';

export interface SdkTheme {
  primaryColor: string;
  fontFamily: string;
  borderRadius: string;
}

export interface CrmContact {
  id: string;
  name: string;
  email: string;
  status: 'Lead' | 'Customer' | 'VIP';
  lastContact: string;
}

export interface Task {
  id: string;
  title: string;
  due: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface CallLog {
  id: string;
  caller: string;
  duration: string;
  timestamp: string;
  status: 'Missed' | 'Completed' | 'Voicemail';
  sentiment: 'Positive' | 'Neutral' | 'Negative';
}

// Workspace & Onboarding Types
export type WorkspaceStep = 'plans' | 'payment' | 'account' | 'oauth' | 'dashboard';

export interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface ConsultingTask {
  id: string;
  title: string;
  description: string;
  cost: number;
  status: 'recommended' | 'in_progress' | 'completed';
}
