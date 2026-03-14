import type { GeminiContextSyncPayload } from "../contracts/SyncPayload";
import type { GeminiIncomingAction } from "../contracts/IncomingAction";
import type { ProviderInjectionResult } from "./LiveGeminiBridge";

export type BridgeMode = "cloud" | "local";
export type AgentCognitiveState =
  | "IDLE"
  | "LISTENING"
  | "STT_PROCESSING"
  | "LLM_THINKING"
  | "TTS_BUFFERING"
  | "SPEAKING"
  | "ERROR";

export type BridgeConnectionState =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING";

export interface BridgeConnectionSnapshot {
  isConnected: boolean;
  mode: BridgeMode;
  agentState?: AgentCognitiveState;
  lastTtsVoice?: string | null;
  lastTtsModel?: string | null;
  lastTtsSampleRate?: number | null;
  lastTtsProcessingMs?: number | null;
  lastTtsAudioBytes?: number | null;
  state: BridgeConnectionState;
  lastDisconnectCode: number | null;
  lastDisconnectReason: string | null;
  microphoneActive: boolean;
  isRecording: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
}

export interface IGeminiExecutionBridge {
  connect(endpoint?: string): Promise<void>;
  disconnect(): Promise<void>;
  sendContextSync(payload: GeminiContextSyncPayload): Promise<boolean>;
  onIncomingAction(
    callback: (action: GeminiIncomingAction) => Promise<boolean>
  ): void;
  onConnectionStateChange(
    callback: (snapshot: BridgeConnectionSnapshot) => void
  ): void;
  onProviderEvent(callback: (result: ProviderInjectionResult) => void): void;
  sendToolResponse(response: any): Promise<void>;
  startPushToTalk(): Promise<void>;
  stopPushToTalk(): Promise<void>;
}
