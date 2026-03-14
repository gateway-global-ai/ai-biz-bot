import type { GeminiIncomingAction } from "../contracts/IncomingAction";
import type {
  BridgeConnectionSnapshot,
  IGeminiExecutionBridge,
} from "./IGeminiExecutionBridge";
import {
  liveGeminiBridge,
  type LiveGeminiBridgeConfig,
  type ProviderInjectionResult,
} from "./LiveGeminiBridge";
import { localVoiceBridge } from "../local-voice/LocalVoiceBridge";
import { mockGeminiBridge } from "./MockGeminiBridge";
import { testGeminiBridge } from "./TestGeminiBridge";

export type BridgeMode = "mock" | "chaos" | "live" | "local";

export interface BridgeRuntimeSettings {
  mode: BridgeMode;
  minLatencyMs: number;
  maxLatencyMs: number;
  dropRate: number;
}

type BridgeImportMetaEnv = {
  VITE_OS_GEMINI_BRIDGE_URL?: string;
  VITE_OS_GEMINI_MODEL_ID?: string;
  VITE_OS_LOCAL_BRIDGE_URL?: string;
};

const metaEnv = ((import.meta as unknown as { env?: BridgeImportMetaEnv }).env ??
  {}) as BridgeImportMetaEnv;

const settings: BridgeRuntimeSettings = {
  mode: "mock",
  minLatencyMs: 50,
  maxLatencyMs: 4000,
  dropRate: 15,
};

const liveBridgeDefaultConfig: LiveGeminiBridgeConfig = {
  webSocketUrl:
    metaEnv.VITE_OS_GEMINI_BRIDGE_URL?.trim() ||
    `${window.location.origin.replace(/^http/, "ws")}/ws/os-live`,
  modelId: metaEnv.VITE_OS_GEMINI_MODEL_ID?.trim() || undefined,
  initialSystemInstruction:
    "You are operating within the Gateway Global AI OS. Use governed tools instead of abstract discussion whenever the operator requests a visible OS action. If the operator asks to simulate degraded network conditions, enable chaos mode, increase latency, or stress the connection, you must call mutate_chaos_settings with concrete values instead of replying with analysis alone.",
};

const localBridgeUrl =
  metaEnv.VITE_OS_LOCAL_BRIDGE_URL?.trim() ||
  `${window.location.origin.replace(/^http/, "ws")}/ws/local-voice`;

liveGeminiBridge.configure(liveBridgeDefaultConfig);

export function getBridgeSettings(): BridgeRuntimeSettings {
  return { ...settings };
}

export function getLiveBridgeConfig(): LiveGeminiBridgeConfig {
  return { ...liveBridgeDefaultConfig };
}

export function getLocalBridgeConfig() {
  return { webSocketUrl: localBridgeUrl };
}

export function configureBridgeSettings(
  next: Partial<BridgeRuntimeSettings>
): BridgeRuntimeSettings {
  Object.assign(settings, next);
  testGeminiBridge.setOptions({
    minLatencyMs: settings.minLatencyMs,
    maxLatencyMs: settings.maxLatencyMs,
    dropRate: settings.dropRate,
  });
  return getBridgeSettings();
}

export function getActiveGeminiBridge(): IGeminiExecutionBridge {
  switch (settings.mode) {
    case "chaos":
      return testGeminiBridge;
    case "local":
      return localVoiceBridge;
    case "live":
      return liveGeminiBridge;
    default:
      return mockGeminiBridge;
  }
}

export function registerIncomingActionListener(
  callback: (action: GeminiIncomingAction) => Promise<boolean>
) {
  mockGeminiBridge.onIncomingAction(callback);
  testGeminiBridge.onIncomingAction(callback);
  liveGeminiBridge.onIncomingAction(callback);
  localVoiceBridge.onIncomingAction(callback);
}

export async function simulateIncomingToolCall(
  action: GeminiIncomingAction
): Promise<boolean> {
  const active = getActiveGeminiBridge();
  if ("simulateIncomingToolCall" in active && typeof active.simulateIncomingToolCall === "function") {
    return (active as typeof mockGeminiBridge).simulateIncomingToolCall(action);
  }
  throw new Error("Active bridge does not support incoming tool simulation.");
}

export function getActiveBridgeConnectionState() {
  const active = getActiveGeminiBridge();
  if ("getConnectionState" in active && typeof active.getConnectionState === "function") {
    return active.getConnectionState() as BridgeConnectionSnapshot;
  }
  return {
    isConnected: false,
    mode: settings.mode === "local" ? "local" : "cloud",
    agentState: "IDLE",
    state: "DISCONNECTED",
    lastDisconnectCode: null,
    lastDisconnectReason: null,
    microphoneActive: false,
    isRecording: false,
    isPlaying: false,
    isBuffering: false,
  } satisfies BridgeConnectionSnapshot;
}

export function subscribeToActiveBridgeState(
  callback: (snapshot: BridgeConnectionSnapshot) => void
) {
  mockGeminiBridge.onConnectionStateChange((snapshot) => {
    if (settings.mode === "mock") callback(snapshot);
  });
  testGeminiBridge.onConnectionStateChange((snapshot) => {
    if (settings.mode === "chaos") callback(snapshot);
  });
  liveGeminiBridge.onConnectionStateChange((snapshot) => {
    if (settings.mode === "live") callback(snapshot);
  });
  localVoiceBridge.onConnectionStateChange((snapshot) => {
    if (settings.mode === "local") callback(snapshot);
  });
  return () => {
    // Placeholder cleanup path. If we later support multiple listeners,
    // this will unsubscribe instead of being a no-op.
  };
}

export function registerProviderEventListener(
  callback: (result: ProviderInjectionResult) => void
) {
  mockGeminiBridge.onProviderEvent(callback);
  testGeminiBridge.onProviderEvent(callback);
  liveGeminiBridge.onProviderEvent(callback);
  localVoiceBridge.onProviderEvent(callback);
}

export async function connectActiveBridge() {
  const active = getActiveGeminiBridge();
  if (settings.mode === "local") {
    await active.connect(localBridgeUrl);
    return;
  }
  if (settings.mode === "live") {
    await active.connect(liveBridgeDefaultConfig.webSocketUrl);
    return;
  }
  await active.connect();
}

export async function disconnectActiveBridge() {
  await getActiveGeminiBridge().disconnect();
}

export async function injectLiveBridgeRawPayload(
  rawJson: string
): Promise<ProviderInjectionResult> {
  return liveGeminiBridge.simulateProviderMessage(rawJson);
}

export async function startBridgePushToTalk() {
  await getActiveGeminiBridge().startPushToTalk();
}

export async function stopBridgePushToTalk() {
  await getActiveGeminiBridge().stopPushToTalk();
}

export async function sendBridgeToolResponse(toolResponse: any) {
  await getActiveGeminiBridge().sendToolResponse(toolResponse);
}

export function getActiveBridgeEndpoint() {
  if (settings.mode === "local") {
    return localBridgeUrl;
  }
  if (settings.mode === "live") {
    return liveBridgeDefaultConfig.webSocketUrl;
  }
  return null;
}
