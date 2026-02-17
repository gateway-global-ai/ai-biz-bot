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
  mode: 'streaming' | 'transactional';
  latency: 'ultra-low' | 'standard';
  bufferDelay: number; // milliseconds (e.g., 2000 for PTT)
  enableAnalysis: {
    emotion: boolean;
    sentiment: boolean;
    disc: boolean;
  };
  model: string; // e.g., 'gemini-2.0-flash-exp'
}

export interface BusinessContext {
  placeId: string;
  name: string;
  address: string;
  hours?: string;
  services?: string[];
  primaryColor?: string;
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

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}
