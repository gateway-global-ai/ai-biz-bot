import type { GeminiContextSyncPayload } from "../contracts/SyncPayload";
import type { GeminiIncomingAction } from "../contracts/IncomingAction";
import type {
  BridgeConnectionSnapshot,
  BridgeConnectionState,
  IGeminiExecutionBridge,
} from "./IGeminiExecutionBridge";
import type { ProviderInjectionResult } from "./LiveGeminiBridge";

export interface MockGeminiBridgeOptions {
  latencyMs?: number;
  failureRate?: number;
}

export class MockGeminiBridge implements IGeminiExecutionBridge {
  private readonly latencyMs: number;
  private readonly failureRate: number;
  private incomingActionCallback:
    | ((action: GeminiIncomingAction) => Promise<boolean>)
    | null = null;
  private connectionStateCallback:
    | ((snapshot: BridgeConnectionSnapshot) => void)
    | null = null;
  private snapshot: BridgeConnectionSnapshot = {
    isConnected: false,
    mode: "cloud",
    agentState: "IDLE",
    lastTtsVoice: null,
    lastTtsModel: null,
    lastTtsSampleRate: null,
    lastTtsProcessingMs: null,
    lastTtsAudioBytes: null,
    state: "DISCONNECTED",
    lastDisconnectCode: null,
    lastDisconnectReason: null,
    microphoneActive: false,
    isRecording: false,
    isPlaying: false,
    isBuffering: false,
  };

  constructor(options: MockGeminiBridgeOptions = {}) {
    this.latencyMs = options.latencyMs ?? 300;
    this.failureRate = options.failureRate ?? 0;
  }

  async sendContextSync(_payload: GeminiContextSyncPayload): Promise<boolean> {
    await new Promise((resolve) => window.setTimeout(resolve, this.latencyMs));

    if (this.failureRate > 0 && Math.random() < this.failureRate) {
      throw new Error("Mock Gemini bridge simulated network failure.");
    }

    return true;
  }

  onIncomingAction(
    callback: (action: GeminiIncomingAction) => Promise<boolean>
  ): void {
    this.incomingActionCallback = callback;
  }

  onConnectionStateChange(
    callback: (snapshot: BridgeConnectionSnapshot) => void
  ): void {
    this.connectionStateCallback = callback;
    this.connectionStateCallback(this.snapshot);
  }

  onProviderEvent(_callback: (result: ProviderInjectionResult) => void): void {
    // Mock bridge does not emit provider verdicts.
  }

  async sendToolResponse(_response: any): Promise<void> {
    // Mock bridge ignores tool responses
  }

  async connect(): Promise<void> {
    this.snapshot = {
      ...this.snapshot,
      isConnected: true,
      state: "CONNECTED",
    };
    this.connectionStateCallback?.(this.snapshot);
  }

  async disconnect(): Promise<void> {
    this.snapshot = {
      ...this.snapshot,
      isConnected: false,
      state: "DISCONNECTED",
      agentState: "IDLE",
      microphoneActive: false,
      isRecording: false,
      isPlaying: false,
      isBuffering: false,
    };
    this.connectionStateCallback?.(this.snapshot);
  }

  async simulateIncomingToolCall(
    action: GeminiIncomingAction
  ): Promise<boolean> {
    await new Promise((resolve) => window.setTimeout(resolve, this.latencyMs));

    if (!this.incomingActionCallback) {
      throw new Error("No incoming action listener registered on mock bridge.");
    }

    return this.incomingActionCallback(action);
  }

  async startPushToTalk(): Promise<void> {
    this.snapshot = {
      ...this.snapshot,
      microphoneActive: true,
      isRecording: true,
      agentState: "LISTENING",
    };
    this.connectionStateCallback?.(this.snapshot);
  }

  async stopPushToTalk(): Promise<void> {
    this.snapshot = {
      ...this.snapshot,
      microphoneActive: false,
      isRecording: false,
      agentState: "IDLE",
    };
    this.connectionStateCallback?.(this.snapshot);
  }
}

export const mockGeminiBridge = new MockGeminiBridge();
