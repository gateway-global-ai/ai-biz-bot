import type { GeminiContextSyncPayload } from "../contracts/SyncPayload";
import type { GeminiIncomingAction } from "../contracts/IncomingAction";
import { loadActions } from "../../control-plane/registry-loader/loadActions";
import type { ActionsDef } from "../../control-plane/registry-loader/types";
import { AudioPlayer } from "../audio-io/AudioPlayer";
import { AudioRecorder } from "../audio-io/AudioRecorder";
import type {
  AgentCognitiveState,
  BridgeConnectionSnapshot,
  BridgeConnectionState,
  IGeminiExecutionBridge,
} from "./IGeminiExecutionBridge";

export interface LiveGeminiBridgeConfig {
  webSocketUrl: string;
  modelId?: string;
  initialSystemInstruction: string;
}

export interface ProviderInjectionResult {
  status: "ACCEPTED" | "DROPPED" | "ERROR";
  detail?: string;
  functionName?: string;
}

interface LiveToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: "OBJECT";
    properties: Record<
      string,
      {
        type: "STRING" | "NUMBER" | "BOOLEAN";
        description?: string;
      }
    >;
    required?: string[];
  };
}

export class LiveGeminiBridge implements IGeminiExecutionBridge {
  private connectionState: BridgeConnectionState = "DISCONNECTED";

  private incomingActionCallback:
    | ((action: GeminiIncomingAction) => Promise<boolean>)
    | null = null;

  /**
   * Future transport handles. Intentionally typed as unknown placeholders until
   * the governed live adapter implementation is approved.
   */
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private intentionalClose = false;
  private config: LiveGeminiBridgeConfig | null = null;
  private connectionStateCallback:
    | ((snapshot: BridgeConnectionSnapshot) => void)
    | null = null;
  private providerEventCallback:
    | ((result: ProviderInjectionResult) => void)
    | null = null;
  private audioRecorder: AudioRecorder | null = null;
  private audioPlayer: AudioPlayer | null = null;
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

  public configure(config: LiveGeminiBridgeConfig): void {
    this.config = config;
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

  onProviderEvent(callback: (result: ProviderInjectionResult) => void): void {
    this.providerEventCallback = callback;
  }

  /**
   * TODO: establish the provider transport session without leaking any
   * WebSocket lifecycle concerns into the control plane.
   */
  public async connect(): Promise<void> {
    if (!this.config) {
      throw new Error("LiveGeminiBridge is missing configuration.");
    }
    if (this.socket && this.connectionState === "CONNECTED") {
      return;
    }

    this.setConnectionState("CONNECTING");

    await new Promise<void>((resolve, reject) => {
      try {
        this.intentionalClose = false;
        const socket = new WebSocket(this.config!.webSocketUrl);
        this.socket = socket;

        socket.onopen = () => {
          this.setConnectionState("CONNECTED");
          this.reconnectAttempts = 0;
          try {
            socket.send(JSON.stringify(this.buildInitialSetupPayload()));
            resolve();
          } catch (error) {
            reject(error);
          }
        };

        socket.onclose = () => {
          this.socket = null;
          this.snapshot = {
            ...this.snapshot,
            isConnected: false,
            agentState: "IDLE",
            microphoneActive: false,
            isRecording: false,
            isPlaying: false,
            isBuffering: false,
          };
          if (this.intentionalClose) {
            this.setConnectionState("DISCONNECTED", 1000, "OS_SHUTDOWN");
            return;
          }
          this.setConnectionState("DISCONNECTED", 1006, "ABNORMAL_CLOSURE");
        };

        socket.onerror = () => {
          this.setConnectionState("DISCONNECTED", 1006, "SOCKET_ERROR");
          reject(new Error("LiveGeminiBridge socket error."));
        };

        socket.onmessage = (event) => {
          void this.parseGoogleMessage(event.data).then((result) => {
            if (result.functionName || result.status !== "ACCEPTED") {
              this.providerEventCallback?.(result);
            }
          });
        };
      } catch (error) {
        this.setConnectionState("DISCONNECTED", 1006, "CONNECTION_FAILURE");
        reject(error);
      }
    });
  }

  /**
   * TODO: perform a graceful teardown and release transport resources.
   */
  public async disconnect(): Promise<void> {
    this.intentionalClose = true;
    await this.stopPushToTalk();
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close(1000, "OS_SHUTDOWN");
    }
    this.setConnectionState("DISCONNECTED", 1000, "OS_SHUTDOWN");
    this.socket = null;
    await this.audioPlayer?.dispose();
    this.audioPlayer = null;
    this.updateAudioTelemetry({
      microphoneActive: false,
      isRecording: false,
      isPlaying: false,
      isBuffering: false,
      agentState: "IDLE",
    });
  }

  /**
   * TODO: Route inbound audio to the audio output pipeline. This must stay
   * inside the execution plane and never block the React thread.
   */
  private handleIncomingAudioChunk(
    base64PCM: string,
    sequenceNumber?: number
  ): void {
    if (!this.audioPlayer) {
      this.audioPlayer = new AudioPlayer({
        onTelemetryChange: (telemetry) => {
          this.updateAudioTelemetry({
            isPlaying: telemetry.isPlaying,
            isBuffering: telemetry.isBuffering,
            agentState: telemetry.isPlaying
              ? "SPEAKING"
              : telemetry.isBuffering
                ? "TTS_BUFFERING"
                : this.snapshot.agentState === "SPEAKING" ||
                    this.snapshot.agentState === "TTS_BUFFERING"
                  ? "IDLE"
                  : this.snapshot.agentState,
          });
        },
      });
    }

    void this.audioPlayer.enqueueBase64PCM(base64PCM, 16000, sequenceNumber).catch((error) => {
      console.warn("[LiveGeminiBridge] Failed to play inbound audio chunk", error);
    });
  }

  /**
   * TODO: Capture microphone audio, encode/chunk it appropriately, and stream
   * it over the provider socket. This is execution-plane only.
   */
  private async processOutboundMicrophone(): Promise<void> {
    if (!this.socket || this.connectionState !== "CONNECTED") {
      throw new Error("LiveGeminiBridge is not connected.");
    }

    if (!this.audioRecorder) {
      this.audioRecorder = new AudioRecorder();
    }

    await this.audioRecorder.start((base64PCM) => {
      if (!this.socket || this.connectionState !== "CONNECTED") {
        return;
      }

      this.socket.send(
        JSON.stringify({
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: "audio/pcm;rate=16000",
                data: base64PCM,
              },
            ],
          },
        })
      );
    });
  }

  /**
   * TODO: Parse Google-native JSON messages, normalize inbound tool/function
   * calls to GeminiIncomingAction, and pass them through the registered
   * callback so the Action Registry can validate them.
   */
  private async parseGoogleMessage(
    _rawEvent: unknown
  ): Promise<ProviderInjectionResult> {
    try {
      const rawMessage =
        typeof _rawEvent === "string"
          ? _rawEvent
          : _rawEvent instanceof Blob
            ? await _rawEvent.text()
            : String(_rawEvent ?? "");

      const parsed = JSON.parse(rawMessage) as {
        serverContent?: {
          turnComplete?: boolean;
          modelTurn?: {
            parts?: Array<{
              functionCall?: {
                name?: string;
                args?: Record<string, unknown>;
              };
              inlineData?: {
                mimeType?: string;
                data?: string;
                sequenceNumber?: number;
                sequence_number?: number;
              };
            }>;
          };
        };
      };

      const parts = parsed.serverContent?.modelTurn?.parts ?? [];
      let accepted = false;
      for (const part of parts) {
        if (
          part.inlineData?.mimeType?.includes("audio/pcm") &&
          typeof part.inlineData.data === "string"
        ) {
          const sequenceNumber =
            typeof part.inlineData.sequenceNumber === "number"
              ? part.inlineData.sequenceNumber
              : typeof part.inlineData.sequence_number === "number"
                ? part.inlineData.sequence_number
                : undefined;
          this.handleIncomingAudioChunk(part.inlineData.data, sequenceNumber);
          accepted = true;
        }

        const functionCall = part.functionCall;
        if (!functionCall?.name) continue;

        const normalized = this.normalizeFunctionCall(functionCall.name, functionCall.args);
        if (!normalized) {
          console.warn(
            `[LiveGeminiBridge] Dropping unsupported or malformed function call: ${functionCall.name}`
          );
          return {
            status: "DROPPED",
            detail: `Invalid or unsupported provider tool: ${functionCall.name}`,
            functionName: functionCall.name,
          };
        }

        if (!this.incomingActionCallback) {
          return {
            status: "ERROR",
            detail: "No incoming action callback registered.",
            functionName: functionCall.name,
          };
        }

        await this.incomingActionCallback(normalized);
        accepted = true;
        return {
          status: "ACCEPTED",
          detail: "Provider function call normalized and routed to the control plane.",
          functionName: normalized.tool_name,
        };
      }

      if (parsed.serverContent?.turnComplete) {
        this.audioPlayer?.markStreamComplete();
        this.updateAudioTelemetry({
          agentState: this.snapshot.isPlaying ? "SPEAKING" : "IDLE",
        });
        accepted = true;
      }

      return accepted
        ? {
            status: "ACCEPTED",
            detail: "Provider payload normalized and handled by the execution plane.",
          }
        : {
            status: "DROPPED",
            detail: "Provider payload contained no governed function calls.",
          };
    } catch (error) {
      console.warn("[LiveGeminiBridge] Failed to parse provider message", error);
      return {
        status: "ERROR",
        detail:
          error instanceof Error
            ? error.message
            : "Unknown provider message parsing error",
      };
    }
  }

  /**
   * TODO: Translate governed sync payloads into the provider-specific active
   * session message format (e.g. clientContent injection) without dropping the
   * live voice session.
   */
  async sendContextSync(_payload: GeminiContextSyncPayload): Promise<boolean> {
    if (!this.socket || this.connectionState !== "CONNECTED") {
      throw new Error("LiveGeminiBridge is not connected.");
    }

    const googleMessage = {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [{ text: _payload.system_injection }],
          },
        ],
        turnComplete: true,
      },
    };

    this.socket.send(JSON.stringify(googleMessage));
    return true;
  }

  public async sendToolResponse(toolResponse: any): Promise<void> {
    if (!this.socket || this.connectionState !== "CONNECTED") {
      throw new Error("LiveGeminiBridge is not connected.");
    }
    this.socket.send(JSON.stringify(toolResponse));
  }

  public async startPushToTalk(): Promise<void> {
    if (this.snapshot.microphoneActive) {
      return;
    }

    await this.processOutboundMicrophone();
    this.updateAudioTelemetry({
      microphoneActive: true,
      isRecording: true,
      agentState: "LISTENING",
    });
  }

  public async stopPushToTalk(): Promise<void> {
    if (!this.snapshot.microphoneActive) {
      return;
    }

    await this.audioRecorder?.stop();
    this.audioRecorder = null;

    if (this.socket && this.connectionState === "CONNECTED") {
      this.socket.send(
        JSON.stringify({
          clientContent: {
            turns: [],
            turnComplete: true,
          },
        })
      );
    }

    this.updateAudioTelemetry({
      microphoneActive: false,
      isRecording: false,
      agentState: "TTS_BUFFERING",
    });
  }

  /**
   * TODO: Apply retry classification and exponential backoff inside the
   * execution plane only. The control plane should observe only final success
   * or timeout/error outcomes.
   */
  private async handleReconnect(): Promise<void> {
    this.setConnectionState("RECONNECTING");
    this.reconnectAttempts += 1;
    throw new Error(
      "LiveGeminiBridge.handleReconnect() is a governed skeleton only. Reconnection strategy is not implemented yet."
    );
  }

  public getConnectionState() {
    return this.snapshot;
  }

  /**
   * Test-harness only: inject a raw provider message into the same parsing path
   * used by the live socket onmessage handler without requiring a real network
   * session.
   */
  public async simulateProviderMessage(
    rawJson: string
  ): Promise<ProviderInjectionResult> {
    const syntheticEvent = { data: rawJson } as MessageEvent<string>;
    return this.handleProviderMessage(syntheticEvent.data);
  }

  private setConnectionState(
    state: BridgeConnectionState,
    lastDisconnectCode: number | null = this.snapshot.lastDisconnectCode,
    lastDisconnectReason: string | null = this.snapshot.lastDisconnectReason
  ) {
    this.connectionState = state;
    this.snapshot = {
      ...this.snapshot,
      isConnected: state === "CONNECTED",
      state,
      lastDisconnectCode,
      lastDisconnectReason,
      ...(state !== "CONNECTED" ? { agentState: "IDLE" as const } : {}),
    };
    this.connectionStateCallback?.(this.snapshot);
  }

  private updateAudioTelemetry(
    partial: Partial<
      Pick<
      BridgeConnectionSnapshot,
      | "microphoneActive"
      | "isRecording"
      | "isPlaying"
      | "isBuffering"
      | "agentState"
      >
    >
  ) {
    this.snapshot = {
      ...this.snapshot,
      ...partial,
    };
    this.connectionStateCallback?.(this.snapshot);
  }

  private buildInitialSetupPayload() {
    const governedActions = loadActions().actions;
    const liveToolDeclarations = this.buildGovernedToolDeclarations(governedActions);
    const governedCatalog = this.buildGovernedActionCatalog(governedActions);

    return {
      setup: {
        ...(this.config?.modelId ? { model: this.config.modelId } : {}),
        generation_config: {
          response_modalities: ["AUDIO"],
        },
        system_instruction: {
          parts: [
            {
              text: [
                this.config?.initialSystemInstruction ?? "",
                governedCatalog,
              ]
                .filter(Boolean)
                .join("\n\n"),
            },
          ],
        },
        ...(liveToolDeclarations.length > 0
          ? {
              tools: [
                {
                  functionDeclarations: liveToolDeclarations,
                },
              ],
            }
          : {}),
      },
    };
  }

  private async handleProviderMessage(
    rawData: unknown
  ): Promise<ProviderInjectionResult> {
    return this.parseGoogleMessage(rawData);
  }

  private mapRouteAlias(routeId: string): string {
    switch (routeId) {
      case "workspace":
        return "workspace.detail";
      case "admin":
        return "admin.home";
      case "support":
        return "system.support";
      default:
        return routeId;
    }
  }

  private normalizeFunctionCall(
    name: string,
    args: Record<string, unknown> | undefined
  ): GeminiIncomingAction | null {
    const timestamp = new Date().toISOString();
    const targetAgentId =
      typeof args?.target_agent_id === "string"
        ? args.target_agent_id
        : "ClearVoiceOSAdminPilotAgent";

    switch (name) {
      case "switch_view":
        if (
          typeof args?.target_logical_route !== "string" &&
          typeof args?.route_id !== "string"
        ) {
          return null;
        }
        return {
          timestamp,
          target_agent_id: targetAgentId,
          tool_name: "switch_view",
          args: {
            target_logical_route: this.mapRouteAlias(
              typeof args?.target_logical_route === "string"
                ? args.target_logical_route
                : (args?.route_id as string)
            ),
          },
        };
      case "highlight_ui_element":
        if (
          typeof args?.element_id !== "string" ||
          typeof args?.duration_ms !== "number"
        ) {
          return null;
        }
        return {
          timestamp,
          target_agent_id: targetAgentId,
          tool_name: "highlight_ui_element",
          args: {
            element_id: args.element_id,
            duration_ms: args.duration_ms,
          },
        };
      case "focus_behavior_control":
        if (
          args?.target_setting !== "dominance" &&
          args?.target_setting !== "safe_mode" &&
          args?.target_setting !== "grounding"
        ) {
          return null;
        }
        return {
          timestamp,
          target_agent_id: targetAgentId,
          tool_name: "focus_behavior_control",
          args: {
            target_setting: args.target_setting,
          },
        };
      case "request_human_assistance":
        return {
          timestamp,
          target_agent_id: targetAgentId,
          tool_name: "request_human_assistance",
          args: {},
        };
      case "draft_support_ticket":
        if (typeof args?.ticket_body !== "string") return null;
        return {
          timestamp,
          target_agent_id: targetAgentId,
          tool_name: "draft_support_ticket",
          args: {
            ticket_body: args.ticket_body,
          },
        };
      case "mutate_chaos_settings":
        if (
          typeof args?.enabled !== "boolean" ||
          typeof args?.drop_rate !== "number" ||
          typeof args?.max_latency_ms !== "number"
        ) {
          return null;
        }
        return {
          timestamp,
          target_agent_id: targetAgentId,
          tool_name: "mutate_chaos_settings",
          args: {
            enabled: args.enabled,
            drop_rate: args.drop_rate,
            max_latency_ms: args.max_latency_ms,
          },
        };
      case "ground_business_candidates":
        if (typeof args?.search_name !== "string") {
          return null;
        }
        return {
          timestamp,
          target_agent_id: targetAgentId,
          tool_name: "ground_business_candidates",
          args: {
            search_name: args.search_name,
            ...(typeof args?.city === "string" ? { city: args.city } : {}),
            ...(typeof args?.state === "string" ? { state: args.state } : {}),
            ...(typeof args?.zip === "string" ? { zip: args.zip } : {}),
          },
        };
      case "stage_business_onboarding":
        if (typeof args?.business_name !== "string") {
          return null;
        }
        return {
          timestamp,
          target_agent_id: targetAgentId,
          tool_name: "stage_business_onboarding",
          args: {
            business_name: args.business_name,
            ...(typeof args?.city === "string" ? { city: args.city } : {}),
            ...(typeof args?.state === "string" ? { state: args.state } : {}),
            ...(typeof args?.zip === "string" ? { zip: args.zip } : {}),
            ...(typeof args?.contact_email === "string"
              ? { contact_email: args.contact_email }
              : {}),
            ...(typeof args?.category === "string"
              ? { category: args.category }
              : {}),
          },
        };
      default:
        return null;
    }
  }

  private buildGovernedToolDeclarations(actions: ActionsDef[]): LiveToolDeclaration[] {
    const liveCallableActions = actions.filter((action) =>
      [
        "highlight_ui_element",
        "focus_behavior_control",
        "request_human_assistance",
        "draft_support_ticket",
        "mutate_agent_behavior",
        "mutate_chaos_settings",
        "ground_business_candidates",
        "stage_business_onboarding",
      ].includes(action.actionId)
    );

    const switchViewDeclaration: LiveToolDeclaration = {
      name: "switch_view",
      description:
        "Navigate the operator to another governed logical route when the conversation requires a different OS surface.",
      parameters: {
        type: "OBJECT",
        properties: {
          target_logical_route: {
            type: "STRING",
            description: "The governed logical route ID to activate.",
          },
        },
        required: ["target_logical_route"],
      },
    };

    return [
      switchViewDeclaration,
      ...liveCallableActions.map((action) => ({
        name: action.actionId,
        description:
          action.description ??
          `Governed OS action for ${action.entity} via ${action.handler}.`,
        parameters: {
          type: "OBJECT" as const,
          properties: Object.fromEntries(
            Object.entries(action.arguments ?? {}).map(([name, definition]) => [
              name,
              {
                type: this.mapArgumentType(definition.type),
                ...(definition.description
                  ? { description: definition.description }
                  : {}),
              },
            ])
          ),
          ...(Object.entries(action.arguments ?? {}).some(
            ([, definition]) => definition.required
          )
            ? {
                required: Object.entries(action.arguments ?? {})
                  .filter(([, definition]) => definition.required)
                  .map(([name]) => name),
              }
            : {}),
        },
      })),
    ];
  }

  private buildGovernedActionCatalog(actions: ActionsDef[]): string {
    const lines = actions.map((action) => {
      const args = Object.entries(action.arguments ?? {})
        .map(([name, definition]) => `${name}:${definition.type}${definition.required ? "*" : ""}`)
        .join(", ");
      return [
        `- ${action.actionId}`,
        `policy=${action.requiredPolicy}`,
        `mutation=${action.mutationClass}`,
        action.description ? `desc=${action.description.replace(/\s+/g, " ").trim()}` : null,
        args ? `args=[${args}]` : null,
      ]
        .filter(Boolean)
        .join(" | ");
    });

    return [
      "Governed Action Catalog:",
      "This OS session is controlled by the following action registry. Only call executable tools that appear in the provider tools list.",
      "Critical runtime rule: if the operator requests chaos mode, degraded network simulation, packet drops, or latency changes, call mutate_chaos_settings immediately with explicit values. Do not stay in abstract explanation mode.",
      ...lines,
    ].join("\n");
  }

  private mapArgumentType(type: string): "STRING" | "NUMBER" | "BOOLEAN" {
    switch (type.toLowerCase()) {
      case "number":
      case "integer":
        return "NUMBER";
      case "boolean":
        return "BOOLEAN";
      default:
        return "STRING";
    }
  }
}

export const liveGeminiBridge = new LiveGeminiBridge();
