/**
 * client/src/hooks/useLiveApi.ts
 *
 * React hook wrapper around GeminiStreamingClient.
 * Provides a clean, React-idiomatic interface for managing a Gemini Live API
 * WebSocket session — connection lifecycle, messages, and volume — without
 * callers needing to manage the class instance directly.
 *
 * PTT / VAD: Silence threshold (turn-taking gavel) is hard-wired at
 * SPEECH_RECOGNITION_THRESHOLD_MS (800ms) in GeminiStreamingClient — no UI override.
 *
 * Usage:
 *   const { isConnected, messages, volume, connect, disconnect, sendText } = useLiveApi();
 *
 * The hook auto-disconnects on component unmount to prevent zombie WebSocket
 * connections and AudioContext leaks.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { GeminiStreamingClient, SPEECH_RECOGNITION_THRESHOLD_MS } from "@/services/voice/GeminiStreamingClient";
import { VoiceClientFactory } from "@/services/voice/VoiceClientFactory";
import type { VoiceMessage, BusinessContext, AgentConfig, VoiceConfig } from "@/types/voice";

/** Re-exported for callers that need to reference the hard-wired PTT threshold (800ms). */
export { SPEECH_RECOGNITION_THRESHOLD_MS };

export interface UseLiveApiReturn {
  /** Whether the WebSocket session is currently open and ready. */
  isConnected: boolean;
  /** Normalized 0–1 microphone input volume level. */
  volume: number;
  /** Ordered list of messages received from the Live API. */
  messages: VoiceMessage[];
  /** Open a new voice session. Requests mic permissions and connects the WS. */
  connect: (business: BusinessContext, agent: AgentConfig, config?: VoiceConfig) => Promise<void>;
  /** Cleanly close the session and release all audio resources. */
  disconnect: () => Promise<void>;
  /** Send a text turn to the model (bypasses audio pipeline). */
  sendText: (text: string) => void;
  /** Begin streaming audio (PTT press). */
  startSession: () => void;
  /** End streaming audio (PTT release). */
  endSession: () => void;
  /** Whether a connection attempt is currently in flight. */
  isConnecting: boolean;
  /** Last error message, if any. */
  error: string | null;
}

export function useLiveApi(): UseLiveApiReturn {
  const clientRef = useRef<GeminiStreamingClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [volume, setVolume] = useState(0);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Ensure a single client instance per hook mount
  if (!clientRef.current) {
    const defaultConfig = VoiceClientFactory.getDefaultConfig("premium");
    clientRef.current = new GeminiStreamingClient(defaultConfig);
  }

  // Wire up persistent callbacks once on mount
  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;

    client.onConnectionChange((connected) => {
      setIsConnected(connected);
      if (connected) setError(null);
    });

    client.onVolumeChange((v) => setVolume(v));

    client.onMessage((msg) => {
      if (msg.type === "error" && msg.text) {
        setError(msg.text);
      }
      setMessages((prev) => [...prev, msg]);
    });

    // Disconnect and release resources on unmount
    return () => {
      if (client.isConnected()) {
        client.disconnect().catch(() => {});
      }
    };
  }, []);

  const connect = useCallback(
    async (
      business: BusinessContext,
      agent: AgentConfig,
      config?: VoiceConfig
    ) => {
      const client = clientRef.current;
      if (!client) return;

      setError(null);
      setIsConnecting(true);
      setMessages([]);
      try {
        const effectiveConfig = config ?? VoiceClientFactory.getDefaultConfig("premium");
        await client.connect(business, agent, effectiveConfig);
      } catch (err: any) {
        setError(err?.message ?? "Failed to connect to voice service.");
      } finally {
        setIsConnecting(false);
      }
    },
    []
  );

  const disconnect = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    await client.disconnect();
    setVolume(0);
  }, []);

  const sendText = useCallback((text: string) => {
    clientRef.current?.sendText(text);
  }, []);

  const startSession = useCallback(() => {
    clientRef.current?.startSession();
  }, []);

  const endSession = useCallback(() => {
    clientRef.current?.endSession();
  }, []);

  return {
    isConnected,
    isConnecting,
    volume,
    messages,
    error,
    connect,
    disconnect,
    sendText,
    startSession,
    endSession,
  };
}
