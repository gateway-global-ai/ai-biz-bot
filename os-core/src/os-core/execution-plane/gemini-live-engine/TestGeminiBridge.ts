import type { GeminiContextSyncPayload } from "../contracts/SyncPayload";
import type { GeminiIncomingAction } from "../contracts/IncomingAction";
import type {
  BridgeConnectionSnapshot,
  BridgeConnectionState,
  IGeminiExecutionBridge,
} from "./IGeminiExecutionBridge";
import type { ProviderInjectionResult } from "./LiveGeminiBridge";

export interface TestGeminiBridgeOptions {
  minLatencyMs?: number;
  maxLatencyMs?: number;
  dropRate?: number;
}

export class TestGeminiBridge implements IGeminiExecutionBridge {
  private options: Required<TestGeminiBridgeOptions>;
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

  constructor(options: TestGeminiBridgeOptions = {}) {
    this.options = {
      minLatencyMs: options.minLatencyMs ?? 50,
      maxLatencyMs: options.maxLatencyMs ?? 4000,
      dropRate: options.dropRate ?? 15,
    };
  }

  setOptions(options: TestGeminiBridgeOptions) {
    this.options = {
      ...this.options,
      ...options,
    };
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
    // Chaos bridge does not emit provider verdicts.
  }

  async sendToolResponse(_response: any): Promise<void> {
    await this.applyChaos();
    // Chaos bridge ignores tool responses after applying chaos
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

  private async applyChaos() {
    const {
      minLatencyMs,
      maxLatencyMs,
      dropRate,
    } = this.options;

    const delay =
      Math.floor(Math.random() * Math.max(maxLatencyMs - minLatencyMs, 0)) +
      minLatencyMs;
    await new Promise((resolve) => window.setTimeout(resolve, delay));

    if (Math.random() * 100 < dropRate) {
      if (Math.random() < 0.5) {
        throw new Error("Chaos bridge simulated network failure.");
      }
      await new Promise(() => {
        /* simulate dropped packet / hung request */
      });
    }
  }

  async sendContextSync(_payload: GeminiContextSyncPayload): Promise<boolean> {
    await this.applyChaos();
    return true;
  }

  async simulateIncomingToolCall(
    action: GeminiIncomingAction
  ): Promise<boolean> {
    await this.applyChaos();

    if (!this.incomingActionCallback) {
      throw new Error("No incoming action listener registered on chaos bridge.");
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

export const testGeminiBridge = new TestGeminiBridge();
