import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { Agent, BusinessData } from "../types";
import { LiveVoiceClient } from "../services/liveService";

export type VoiceTranscription = { text: string; isFinal: boolean };

export interface VoiceContextValue {
  isVoiceActive: boolean;
  isRecording: boolean;
  voiceVolume: number;
  transcription?: VoiceTranscription;
  activeAgentId?: string;

  connect: (businessData: BusinessData, agent: Agent, userContext?: string) => Promise<void>;
  disconnect: () => void;
  setStreaming: (enabled: boolean) => void;
  sendText: (text: string) => Promise<void>;
}

const VoiceContext = createContext<VoiceContextValue | undefined>(undefined);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [transcription, setTranscription] = useState<VoiceTranscription | undefined>(undefined);
  const [activeAgentId, setActiveAgentId] = useState<string | undefined>(undefined);

  const voiceClientRef = useRef<LiveVoiceClient | null>(null);
  if (!voiceClientRef.current) {
    voiceClientRef.current = new LiveVoiceClient();
  }

  const connect = useCallback(async (businessData: BusinessData, agent: Agent, userContext: string = "") => {
    const vc = voiceClientRef.current!;

    // Keep callbacks stable across reconnects
    vc.onVolumeChange = setVoiceVolume;
    vc.onTranscriptionUpdate = (text, isFinal) => setTranscription({ text, isFinal });
    vc.onError = (message) => {
      console.error("[Voice] Error:", message);
      // Ensure UI state doesn't get stuck
      setIsVoiceActive(false);
      setIsRecording(false);
    };

    // If already connected with a different agent, reconnect
    await vc.connect(businessData, agent, agent.voiceConfig.voiceName, userContext);
    setActiveAgentId(agent.id);
    setIsVoiceActive(true);
  }, []);

  const disconnect = useCallback(() => {
    const vc = voiceClientRef.current!;
    vc.disconnect();
    setIsVoiceActive(false);
    setIsRecording(false);
    setVoiceVolume(0);
    setTranscription(undefined);
    setActiveAgentId(undefined);
  }, []);

  const setStreaming = useCallback((enabled: boolean) => {
    const vc = voiceClientRef.current!;
    setIsRecording(enabled);
    vc.setStreaming(enabled);
  }, []);

  const sendText = useCallback(async (text: string) => {
    const vc = voiceClientRef.current!;
    await vc.sendText(text);
  }, []);

  const value = useMemo<VoiceContextValue>(
    () => ({
      isVoiceActive,
      isRecording,
      voiceVolume,
      transcription,
      activeAgentId,
      connect,
      disconnect,
      setStreaming,
      sendText,
    }),
    [isVoiceActive, isRecording, voiceVolume, transcription, activeAgentId, connect, disconnect, setStreaming, sendText]
  );

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice(): VoiceContextValue {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used within a VoiceProvider");
  return ctx;
}

