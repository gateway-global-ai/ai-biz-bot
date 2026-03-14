import type { GeminiIncomingAction } from "../contracts/IncomingAction";
import type { GeminiContextSyncPayload } from "../contracts/SyncPayload";
import { AudioPlayer } from "../audio-io/AudioPlayer";
import { AudioRecorder } from "../audio-io/AudioRecorder";
import type {
  AgentCognitiveState,
  BridgeConnectionSnapshot,
  IGeminiExecutionBridge,
} from "../gemini-live-engine/IGeminiExecutionBridge";
import type { ProviderInjectionResult } from "../gemini-live-engine/LiveGeminiBridge";

interface LocalVoiceMessage {
  type:
    | "pipeline_state"
    | "audio_output"
    | "tts_metadata"
    | "tool_call"
    | "tool_drop"
    | "turn_complete"
    | "error";
  state?: AgentCognitiveState;
  data?: string;
  sample_rate?: number;
  tool_name?: string;
  args?: Record<string, unknown>;
  reason?: string;
  message?: string;
  voice?: string | null;
  model?: string | null;
  text_length?: number;
  processing_ms?: number;
  audio_bytes?: number;
}

export class LocalVoiceBridge implements IGeminiExecutionBridge {
  private ws: WebSocket | null = null;
  private endpoint: string;
  private readonly recorder = new AudioRecorder();
  private readonly player = new AudioPlayer({
    onTelemetryChange: (telemetry) => {
      this.updateState({
        isPlaying: telemetry.isPlaying,
        isBuffering: telemetry.isBuffering,
        agentState: telemetry.isPlaying
          ? "SPEAKING"
          : telemetry.isBuffering
            ? "TTS_BUFFERING"
            : this.state.agentState === "SPEAKING" ||
                this.state.agentState === "TTS_BUFFERING"
              ? "IDLE"
              : this.state.agentState,
      });
    },
  });
  private onActionCallback:
    | ((action: GeminiIncomingAction) => Promise<boolean>)
    | null = null;
  private onStateCallback:
    | ((state: BridgeConnectionSnapshot) => void)
    | null = null;
  private onProviderEventCallback:
    | ((result: ProviderInjectionResult) => void)
    | null = null;

  private state: BridgeConnectionSnapshot = {
    isConnected: false,
    mode: "local",
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

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  public async connect(endpoint?: string): Promise<void> {
    if (endpoint) {
      this.endpoint = endpoint;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.updateState({
      isConnected: false,
      state: "CONNECTING",
      agentState: "IDLE",
      lastDisconnectCode: null,
      lastDisconnectReason: null,
    });

    await new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(this.endpoint);

      this.ws.onopen = () => {
        this.updateState({
          isConnected: true,
          state: "CONNECTED",
          agentState: "IDLE",
        });
        this.ws?.send(
          JSON.stringify({
            type: "setup",
            allowed_tools: ["mutate_chaos_settings"],
          })
        );
        resolve();
      };

      this.ws.onmessage = this.handleIncomingMessage.bind(this);

      this.ws.onerror = (event) => {
        this.updateState({
          isConnected: false,
          state: "DISCONNECTED",
          agentState: "ERROR",
          lastDisconnectCode: 1006,
          lastDisconnectReason: "LOCAL_SOCKET_ERROR",
        });
        reject(event);
      };

      this.ws.onclose = (event) => {
        this.updateState({
          isConnected: false,
          state: "DISCONNECTED",
          agentState: "IDLE",
          lastDisconnectCode: event.code,
          lastDisconnectReason: event.reason || "LOCAL_SOCKET_CLOSED",
          microphoneActive: false,
          isRecording: false,
          isPlaying: false,
          isBuffering: false,
        });
      };
    });
  }

  public async disconnect(): Promise<void> {
    await this.recorder.stop();
    await this.player.dispose();
    this.ws?.close();
    this.ws = null;
    this.updateState({
      isConnected: false,
      state: "DISCONNECTED",
      agentState: "IDLE",
      microphoneActive: false,
      isRecording: false,
      isPlaying: false,
      isBuffering: false,
    });
  }

  public async sendContextSync(_payload: GeminiContextSyncPayload): Promise<boolean> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "context_sync",
          payload: _payload,
        })
      );
    }

    return true;
  }

  public async sendToolResponse(toolResponse: any): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "tool_response",
          payload: toolResponse,
        })
      );
    }
  }

  public async startPushToTalk(): Promise<void> {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    await this.recorder.start((base64AudioChunk: string) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: "audio_input",
            data: base64AudioChunk,
          })
        );
      }
    });

    this.updateState({
      microphoneActive: true,
      isRecording: true,
      agentState: "LISTENING",
    });
  }

  public async stopPushToTalk(): Promise<void> {
    await this.recorder.stop();

    this.updateState({
      microphoneActive: false,
      isRecording: false,
      agentState: "STT_PROCESSING",
    });

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "turn_complete" }));
    }
  }

  public onIncomingAction(
    callback: (action: GeminiIncomingAction) => Promise<boolean>
  ): void {
    this.onActionCallback = callback;
  }

  public onConnectionStateChange(
    callback: (state: BridgeConnectionSnapshot) => void
  ): void {
    this.onStateCallback = callback;
    this.onStateCallback(this.state);
  }

  public onProviderEvent(callback: (result: ProviderInjectionResult) => void): void {
    this.onProviderEventCallback = callback;
  }

  public getConnectionState(): BridgeConnectionSnapshot {
    return this.state;
  }

  private async handleIncomingMessage(event: MessageEvent): Promise<void> {
    const payload = JSON.parse(event.data) as LocalVoiceMessage;

    switch (payload.type) {
      case "pipeline_state":
        this.updateState({
          agentState: payload.state ?? "IDLE",
        });
        break;
      case "audio_output":
        if (typeof payload.data === "string") {
          await this.player.enqueueBase64PCM(
            payload.data,
            payload.sample_rate ?? 24000
          );
        }
        break;
      case "tts_metadata":
        this.updateState({
          lastTtsVoice: payload.voice ?? null,
          lastTtsModel: payload.model ?? null,
          lastTtsSampleRate: payload.sample_rate ?? 24000,
          lastTtsProcessingMs: payload.processing_ms ?? null,
          lastTtsAudioBytes: payload.audio_bytes ?? null,
        });
        break;
      case "tool_call":
        if (!payload.tool_name || !payload.args) {
          break;
        }

        this.onProviderEventCallback?.({
          status: "ACCEPTED",
          functionName: payload.tool_name,
          detail: "Local tool call accepted by the browser bridge.",
        });

        if (this.onActionCallback) {
          await this.onActionCallback({
            timestamp: new Date().toISOString(),
            target_agent_id: "ClearVoiceOSAdminPilotAgent",
            tool_name: payload.tool_name as GeminiIncomingAction["tool_name"],
            args: payload.args as GeminiIncomingAction["args"],
          } as GeminiIncomingAction);
        }
        break;
      case "tool_drop":
        this.onProviderEventCallback?.({
          status: "DROPPED",
          functionName: payload.tool_name,
          detail: payload.reason ?? "Backend dropped invalid local tool call.",
        });
        break;
      case "turn_complete":
        this.player.markStreamComplete();
        this.updateState({
          agentState: this.state.isPlaying ? "SPEAKING" : "IDLE",
        });
        break;
      case "error":
        this.onProviderEventCallback?.({
          status: "ERROR",
          detail: payload.message ?? "Unknown local voice pipeline error.",
        });
        this.updateState({
          agentState: "ERROR",
        });
        break;
    }
  }

  private updateState(partial: Partial<BridgeConnectionSnapshot>): void {
    this.state = { ...this.state, ...partial };
    this.onStateCallback?.(this.state);
  }
}

export const localVoiceBridge = new LocalVoiceBridge(
  `${window.location.origin.replace(/^http/, "ws")}/ws/local-voice`
);
