/**
 * UnifiedChatInterface — Merges chat-sdk-template UI with AI Realtime Voice and PTT.
 * - 3 screen modes: floating (desktop default), fixed (mobile default / split), fullscreen.
 * - Voice: regular chat (sendText), Push to Talk, and Live (VAD). View menu overlay to switch.
 * - PTT layout: 25% fixed header, 25% visualizer, 25% transcription (edit/recall/add), 25% PTT footer.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveApi } from '../hooks/useLiveApi';
import ChatHeader from './ChatHeader';
import ChatHistory from './ChatHistory';
import PTTChatFooter from './PTTChatFooter';
import Visualizer from './Visualizer';
import {
  ChatLayoutMode,
  SdkTheme,
  BotConfig,
  ChatInterfaceMode,
  VisualizerType,
} from '../types';
import { getDefaultVoiceForModel } from '../config/modelVoiceConfig';
import { Maximize2, MessageSquare, Radio, Activity, SendHorizontal } from 'lucide-react';

const DEFAULT_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const DEFAULT_INSTRUCTION = "You are a helpful business assistant. Be professional and clear.";

const defaultTheme: SdkTheme = {
  primaryColor: '#2563eb',
  fontFamily: 'Inter, sans-serif',
  borderRadius: '1.5rem',
};

export interface UnifiedChatInterfaceProps {
  layoutMode: ChatLayoutMode;
  onLayoutChange: (mode: ChatLayoutMode) => void;
  botConfig: BotConfig;
  isOpen: boolean;
  onClose: () => void;
  theme?: SdkTheme;
  /** Override model (default: native audio preview) */
  model?: string;
  /** Override voice (default: from model) */
  voice?: string;
  /** System instruction for Live API */
  systemInstructionOverride?: string;
}

const UnifiedChatInterface: React.FC<UnifiedChatInterfaceProps> = ({
  layoutMode,
  onLayoutChange,
  botConfig,
  isOpen,
  onClose,
  theme = defaultTheme,
  model = DEFAULT_MODEL,
  voice: voiceProp,
  systemInstructionOverride,
}) => {
  const selectedVoice = voiceProp ?? getDefaultVoiceForModel(model);
  const [voiceMode, setVoiceMode] = useState<ChatInterfaceMode>('chat');
  const [showVoiceModeOverlay, setShowVoiceModeOverlay] = useState(false);
  const [visualizerType, setVisualizerType] = useState<VisualizerType>('bars');
  const [isDesktop, setIsDesktop] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftKey, setDraftKey] = useState<'ptt' | 'callback' | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [justSent, setJustSent] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const lastSentDraftRef = useRef('');
  const pttTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptionLengthRef = useRef(0);

  const systemInstruction = useMemo(() => {
    return systemInstructionOverride ?? `You are ${botConfig.agentProfile.name}, ${botConfig.agentProfile.role}. ${botConfig.agentProfile.basePrompt || DEFAULT_INSTRUCTION}`;
  }, [botConfig, systemInstructionOverride]);

  const config = { temperature: 0.8, topP: 0.95, topK: 40 };

  const {
    isConnected,
    isError,
    volume,
    chatHistory,
    isMuted,
    setIsMuted,
    connect,
    disconnect,
    sendText,
  } = useLiveApi(model, selectedVoice, systemInstruction, config);

  const [isConnecting, setIsConnecting] = useState(false);

  // Desktop vs mobile: default voice mode when starting session
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Sync mute by voice mode
  useEffect(() => {
    if (!isConnected) return;
    if (voiceMode === 'realtime') setIsMuted(false);
    else setIsMuted(true);
  }, [isConnected, voiceMode, setIsMuted]);

  // Clear waiting when model starts streaming
  useEffect(() => {
    const last = chatHistory[chatHistory.length - 1];
    if (last?.role === 'model' && last.isStreaming) setIsWaitingForResponse(false);
  }, [chatHistory]);

  // Clear connecting state when connection succeeds or fails
  useEffect(() => {
    if (isConnected || isError) setIsConnecting(false);
  }, [isConnected, isError]);

  const finalizePttTurn = useCallback(() => {
    const userMessages = chatHistory.filter((m) => m.role === 'user');
    const latestUserMsg = userMessages[userMessages.length - 1];

    if (pttTimerRef.current) {
      clearTimeout(pttTimerRef.current);
      pttTimerRef.current = null;
    }

    if (voiceMode === 'ptt' && latestUserMsg?.text?.trim()) {
      setDraftText(latestUserMsg.text);
      setDraftKey('ptt');
      return;
    }
    if (latestUserMsg?.text?.trim()) {
      sendText(latestUserMsg.text);
      setJustSent(true);
      setIsWaitingForResponse(true);
      setTimeout(() => setJustSent(false), 3000);
    }
  }, [chatHistory, voiceMode, sendText]);

  const handlePttDown = useCallback(() => {
    if (voiceMode === 'ptt' && isConnected) {
      setIsMuted(false);
      setJustSent(false);
      setIsWaitingForResponse(false);
      if (pttTimerRef.current) {
        clearTimeout(pttTimerRef.current);
        pttTimerRef.current = null;
      }
    }
  }, [voiceMode, isConnected, setIsMuted]);

  const handlePttUp = useCallback(() => {
    if (voiceMode === 'ptt' && isConnected) {
      setIsMuted(true);
      const userMsg = chatHistory.filter((m) => m.role === 'user').pop();
      lastTranscriptionLengthRef.current = userMsg?.text.length ?? 0;
      if (pttTimerRef.current) clearTimeout(pttTimerRef.current);
      pttTimerRef.current = setTimeout(finalizePttTurn, 1200);
    }
  }, [voiceMode, isConnected, chatHistory, finalizePttTurn, setIsMuted]);

  const handleFooterSubmit = useCallback(
    (text: string) => {
      if (!text.trim() || isWaitingForResponse) return;
      lastSentDraftRef.current = text;
      sendText(text.trim());
      setDraftText('');
      setDraftKey(null);
      setJustSent(true);
      setIsWaitingForResponse(true);
      setTimeout(() => setJustSent(false), 3000);
    },
    [sendText, isWaitingForResponse]
  );

  const handleFooterCallback = useCallback(() => {
    setDraftText(lastSentDraftRef.current);
    setDraftKey('callback');
  }, []);

  const handleDraftChange = useCallback((text: string) => setDraftText(text), []);

  // Keep finalization timer alive if transcription still arriving
  useEffect(() => {
    if (voiceMode !== 'ptt' || !isMuted || !pttTimerRef.current) return;
    const userMsg = chatHistory.filter((m) => m.role === 'user').pop();
    const currentLen = userMsg?.text.length ?? 0;
    if (currentLen > lastTranscriptionLengthRef.current) {
      lastTranscriptionLengthRef.current = currentLen;
      clearTimeout(pttTimerRef.current);
      pttTimerRef.current = setTimeout(finalizePttTurn, 1200);
    }
  }, [chatHistory, voiceMode, isMuted, finalizePttTurn]);

  const handleStartVoice = async () => {
    if (isConnecting || isConnected) return;
    setIsConnecting(true);
    setVoiceMode(isDesktop ? 'realtime' : 'ptt');
    try {
      await connect();
    } catch (err) {
      setIsConnecting(false);
      console.error('Voice connection error:', err);
    }
  };

  const primaryStyle = { backgroundColor: theme.primaryColor, color: '#fff' };

  const getContainerClasses = () => {
    const base =
      'fixed flex flex-col bg-white shadow-2xl overflow-hidden border border-slate-200 z-[60] animate-in fade-in duration-300 font-sans transition-all ease-in-out';
    // Mobile: full viewport (100% height). Use h-screen so we get 100vh regardless of parent.
    const mobile = 'inset-0 w-full h-screen min-h-screen rounded-none';
    let desktop = '';
    switch (layoutMode) {
      case 'fixed':
        desktop =
          'md:inset-y-0 md:right-0 md:left-auto md:bottom-0 md:top-0 md:w-[500px] md:h-screen md:min-h-screen md:rounded-none md:border-l';
        break;
      case 'fullscreen':
        desktop = 'md:inset-0 md:w-full md:h-screen md:min-h-screen md:rounded-none';
        break;
      case 'floating':
      default:
        desktop = 'md:inset-auto md:bottom-6 md:right-6 md:w-[400px] md:h-[650px] md:min-h-0 md:rounded-2xl';
        break;
    }
    return `${base} ${mobile} ${desktop}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className={getContainerClasses()}
      style={{
        borderRadius: layoutMode === 'floating' ? theme.borderRadius : '0',
        fontFamily: theme.fontFamily,
      }}
    >
      {/* Header: bot name, view menu (screen expansion), layout toggle, close */}
      <div
        className="p-4 flex justify-between items-center text-white shrink-0"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-sm font-bold border border-white/20">
            AI
          </div>
          <div>
            <div className="font-bold leading-tight">{botConfig.agentProfile.name}</div>
            <div className="text-[10px] opacity-80 uppercase tracking-wider font-semibold">
              {botConfig.agentProfile.role}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View options: opens overlay to select Chat / PTT / Realtime (only when connected) */}
          {isConnected && (
            <button
              onClick={() => setShowVoiceModeOverlay(true)}
              className="hover:bg-white/20 p-1.5 rounded-full transition-colors"
              title="View options – switch voice method"
              aria-label="View options"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          )}
          {/* Layout toggle */}
          <button
            onClick={() => onLayoutChange(layoutMode === 'fullscreen' ? 'floating' : 'fullscreen')}
            className="hover:bg-white/20 p-1.5 rounded-full transition-colors hidden md:block"
            title={layoutMode === 'fullscreen' ? 'Exit full screen' : 'Full screen'}
            aria-label={layoutMode === 'fullscreen' ? 'Exit full screen' : 'Full screen'}
          >
            {layoutMode === 'fullscreen' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              disconnect();
              onClose();
            }}
            className="hover:bg-white/20 p-1.5 rounded-full transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Voice mode overlay: 100% of chat window, select Chat / PTT / Realtime */}
      {showVoiceModeOverlay && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-900/95 backdrop-blur-sm min-h-0 flex-1"
          style={{ fontFamily: theme.fontFamily, minHeight: '100%' }}
        >
          <h3 className="text-lg font-bold text-white mb-2">Voice method</h3>
          <p className="text-sm text-slate-300 mb-6">Choose how you want to talk to the assistant.</p>
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
            {(
              [
                { value: 'chat' as const, label: 'Chat', icon: <MessageSquare size={24} /> },
                { value: 'ptt' as const, label: 'Push to Talk', icon: <Radio size={24} /> },
                { value: 'realtime' as const, label: 'Live', icon: <Activity size={24} /> },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setVoiceMode(opt.value);
                  setShowVoiceModeOverlay(false);
                }}
                className={`flex flex-col items-center gap-2 p-6 rounded-2xl border-2 transition-all ${
                  voiceMode === opt.value
                    ? 'border-white bg-white/10 text-white'
                    : 'border-slate-600 text-slate-300 hover:border-slate-500 hover:bg-slate-800/50'
                }`}
              >
                {opt.icon}
                <span className="font-bold text-sm">{opt.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowVoiceModeOverlay(false)}
            className="mt-8 px-6 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 text-sm font-medium"
          >
            Done
          </button>
        </div>
      )}

      {/* Main content: flex-1 min-h-0 so it fills and can scroll */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50" style={{ minHeight: 0 }}>
        {!isConnected ? (
          <>
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-0">
              <Activity className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-600 text-sm mb-6">
                Start a voice session to chat, use Push to Talk, or talk in real time.
              </p>
              {isError && (
                <p className="text-red-600 text-sm mb-4 max-w-xs">
                  Connection failed. Check your API key (e.g. .env GEMINI_API_KEY) and microphone permission, then try again.
                </p>
              )}
              <button
                onClick={handleStartVoice}
                disabled={isConnecting}
                style={primaryStyle}
                className="px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connecting…
                  </>
                ) : (
                  <>
                    <Activity size={18} />
                    Voice Chat
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Voice UI: header (25%) with business name + mode switcher */}
            <div className="shrink-0" style={{ minHeight: '25%' }}>
              <ChatHeader
                businessName={botConfig.agentProfile.name}
                mode={voiceMode}
                onModeChange={setVoiceMode}
                disabled={false}
              />
            </div>

            {voiceMode === 'chat' && (
              <>
                <div className="flex-1 overflow-auto p-4 bg-slate-50">
                  <ChatHistory messages={chatHistory} />
                </div>
                <div className="shrink-0 p-4 bg-white border-t border-slate-200 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && chatInput.trim()) {
                        e.preventDefault();
                        handleFooterSubmit(chatInput.trim());
                        setChatInput('');
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    style={{ caretColor: theme.primaryColor }}
                    disabled={isWaitingForResponse}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (chatInput.trim()) {
                        handleFooterSubmit(chatInput.trim());
                        setChatInput('');
                      }
                    }}
                    disabled={isWaitingForResponse || !chatInput.trim()}
                    style={chatInput.trim() ? primaryStyle : {}}
                    className="p-3 rounded-xl text-white font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <SendHorizontal size={18} />
                  </button>
                </div>
              </>
            )}

            {voiceMode === 'ptt' && (
              <>
                {/* 25% visualizer */}
                <div
                  className="shrink-0 flex items-center justify-center border-b border-slate-200 bg-slate-100/80"
                  style={{ minHeight: '25%' }}
                >
                  <Visualizer
                    volume={volume}
                    isActive={isConnected && !isMuted}
                    type={visualizerType}
                  />
                </div>
                {/* 25% transcription + 25% PTT footer: PTTChatFooter handles both */}
                <div className="flex-1 flex flex-col min-h-0" style={{ minHeight: '50%' }}>
                  <PTTChatFooter
                    draftText={draftText}
                    onDraftChange={handleDraftChange}
                    onPTTDown={handlePttDown}
                    onPTTUp={handlePttUp}
                    onSubmit={handleFooterSubmit}
                    onCallback={handleFooterCallback}
                    isRecording={isConnected && voiceMode === 'ptt' && !isMuted}
                    isWaitingResponse={isWaitingForResponse}
                    canSubmit={!isWaitingForResponse}
                    allowAutoSubmit={draftKey !== 'callback'}
                  />
                </div>
              </>
            )}

            {voiceMode === 'realtime' && (
              <>
                {/* 25% visualizer */}
                <div
                  className="shrink-0 flex items-center justify-center border-b border-slate-200 bg-slate-100/80"
                  style={{ minHeight: '25%' }}
                >
                  <Visualizer
                    volume={volume}
                    isActive={isConnected && !isMuted}
                    type={visualizerType}
                  />
                </div>
                <div className="flex-1 overflow-auto p-4 bg-slate-50">
                  <ChatHistory messages={chatHistory} />
                </div>
                <div className="shrink-0 p-4 border-t border-slate-200 flex items-center gap-2 text-slate-500 text-sm bg-white">
                  <Activity size={16} className="shrink-0 text-emerald-500 animate-pulse" />
                  <span className="text-xs">
                    Live: microphone is on; speak and the assistant will respond automatically.
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UnifiedChatInterface;
