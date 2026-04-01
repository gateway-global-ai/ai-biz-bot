/**
 * IVoiceClient Interface
 * 
 * Contract that all voice engines must implement.
 * Provides engine-agnostic methods for both streaming and transactional modes.
 */

import { VoiceMessage, VoiceConfig, BusinessContext, AgentConfig } from '@/types/voice';

export interface IVoiceClient {
  // Connection lifecycle
  connect(business: BusinessContext, agent: AgentConfig, config: VoiceConfig): Promise<void>;
  disconnect(): void;
  
  // Audio control - ABSTRACTED for both engines
  // These methods work for both streaming and transactional modes:
  // - Streaming: startSession() unmutes audio stream, endSession() mutes
  // - Transactional: startSession() starts recording blob, endSession() uploads
  startSession(): void;
  endSession(): void;
  
  // Text input
  sendText(text: string): void;
  
  // Tool I/O (optional, as not all clients may support it)
  sendToolResponse?(toolResponse: { name: string; result: any; callId?: string }): void;

  // Event callbacks
  onMessage(callback: (message: VoiceMessage) => void): void;
  onVolumeChange(callback: (volume: number) => void): void;
  onConnectionChange(callback: (connected: boolean) => void): void;
  onOutputVolumeChange?: (callback: (volume: number) => void) => void;
  
  // Mute control
  setMuted?: (muted: boolean) => void;
  
  // State
  isConnected(): boolean;
  getConfig(): VoiceConfig;
}
