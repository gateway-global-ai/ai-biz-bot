import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useLiveApi } from './hooks/useLiveApi';
import { VoiceName, VisualizerType, Language, ChatInterfaceMode } from './types';
import SetupPanel from './components/SetupPanel';
import AudioPulseSettings from './components/AudioPulseSettings';
import CodeBlock from './components/CodeBlock';
import Logger from './components/Logger';
import ChatHistory from './components/ChatHistory';
import ChatHeader from './components/ChatHeader';
import PTTChatFooter from './components/PTTChatFooter';
import ControlPanel from './components/ControlPanel';
import ArchitectureView from './components/ArchitectureView';
import TelephonyView from './components/TelephonyView';
import { Mic, Power, Sparkles, LayoutTemplate, Network, Sliders, Phone, Activity, X, Radio, MicOff, SendHorizontal, CheckCircle2, Loader2 } from 'lucide-react';
import { getDefaultVoiceForModel } from './config/modelVoiceConfig';

const DEFAULT_INSTRUCTION = "You are currently running inside a React demo application using the Gemini 2.5 Live API. Be helpful, professional, and clear.";
const DEFAULT_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

type Tab = 'voice' | 'identity' | 'visualizer' | 'architecture' | 'telephony';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('voice');
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [selectedVoice, setSelectedVoice] = useState<string>(() => getDefaultVoiceForModel(DEFAULT_MODEL));
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(Language.English);
  const [manualInstruction, setManualInstruction] = useState(DEFAULT_INSTRUCTION);
  
  // Visualizer & chat interface mode (shared history across Chat | PTT | Realtime)
  const [visualizerType, setVisualizerType] = useState<VisualizerType>('bars');
  /** Owner-set default when configuring the voice agent (Identity) */
  const [defaultChatMode, setDefaultChatMode] = useState<ChatInterfaceMode>('ptt');
  /** Current view: Chat (text), PTT (walkie-talkie), Realtime (VAD). One at a time; history shared. */
  const [chatInterfaceMode, setChatInterfaceMode] = useState<ChatInterfaceMode>('ptt');
  const isPttMode = chatInterfaceMode === 'ptt';
  const isRealtimeMode = chatInterfaceMode === 'realtime';
  const [justSent, setJustSent] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  /** Draft text in PTT footer (edit before send); set when PTT released in visualizer */
  const [draftText, setDraftText] = useState('');
  /** 'ptt' = from PTT release (allow 1s auto-submit), 'callback' = restored from Callback (no auto-submit), null = none */
  const [draftKey, setDraftKey] = useState<'ptt' | 'callback' | null>(null);
  /** Chat mode: text input line (shared history; no transcript in PTT/Realtime view) */
  const [chatInput, setChatInput] = useState('');
  /** Main photo from Google Places hero (website); used as branded background in visualizer/chat at ~25% opacity */
  const [heroImageUrl, setHeroImageUrl] = useState('');

  // Refs for PTT logic
  const pttTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptionLengthRef = useRef(0);
  const lastSentDraftRef = useRef('');

  // Role / Identity State
  const [role, setRole] = useState({
    company: "TechCorp",
    position: "Support Specialist",
    task: "Help users with troubleshooting"
  });

  // Synthesize System Instruction
  const systemInstruction = useMemo(() => {
    return `
    Language: Please speak in ${selectedLanguage}.
    Identity: You are ${role.position} at ${role.company}. Your primary task is: ${role.task}.
    Context: ${manualInstruction}
    `.trim();
  }, [role, manualInstruction, selectedLanguage]);

  // Model Generation Config State
  const config = { temperature: 0.8, topP: 0.95, topK: 40 };
  
  const { isConnected, volume, logs, chatHistory, isMuted, setIsMuted, connect, disconnect, sendText } = useLiveApi(
    selectedModel,
    selectedVoice, 
    systemInstruction,
    config
  );

  // Sync mute state: Chat = mute (text only); PTT = mute until hold; Realtime = unmute (VAD)
  useEffect(() => {
    if (!isConnected) return;
    if (chatInterfaceMode === 'realtime') setIsMuted(false);
    else if (chatInterfaceMode === 'chat') setIsMuted(true);
    else if (chatInterfaceMode === 'ptt') setIsMuted(true);
  }, [isConnected, chatInterfaceMode, setIsMuted]);

  // Handle Response State Changes — allow next submit when model turn is done (not streaming)
  useEffect(() => {
    const lastMsg = chatHistory[chatHistory.length - 1];
    if (lastMsg && lastMsg.role === 'model' && !lastMsg.isStreaming) {
      setIsWaitingForResponse(false);
    }
  }, [chatHistory]);

  const handleToggle = () => {
    if (isConnected) {
      disconnect();
    } else {
      setChatInterfaceMode(defaultChatMode); // Owner default when starting session
      connect();
      setActiveTab('visualizer'); // Open conversation view
    }
  };

  const finalizePttTurn = () => {
    const userMessages = chatHistory.filter(m => m.role === 'user');
    const latestUserMsg = userMessages[userMessages.length - 1];

    if (pttTimerRef.current) {
      clearTimeout(pttTimerRef.current);
      pttTimerRef.current = null;
    }

    // In visualizer with PTT footer: hand transcript to footer (1s edit → submit); do not send here
    if (activeTab === 'visualizer' && isPttMode && latestUserMsg?.text?.trim()) {
      setDraftText(latestUserMsg.text);
      setDraftKey('ptt');
      return;
    }

    // Otherwise (e.g. PTT without footer): send immediately
    if (latestUserMsg && latestUserMsg.text.trim()) {
      sendText(latestUserMsg.text);
      setJustSent(true);
      setIsWaitingForResponse(true);
      setTimeout(() => setJustSent(false), 3000);
    }
  };

  const handlePttDown = () => {
    if (isPttMode && isConnected) {
      setIsMuted(false);
      setJustSent(false);
      setIsWaitingForResponse(false);
      if (pttTimerRef.current) {
        clearTimeout(pttTimerRef.current);
        pttTimerRef.current = null;
      }
    }
  };

  const handlePttUp = () => {
    if (isPttMode && isConnected) {
      setIsMuted(true);
      
      // Delay finalization to allow the last transcription packets to arrive
      const userMsg = chatHistory.filter(m => m.role === 'user').pop();
      lastTranscriptionLengthRef.current = userMsg?.text.length || 0;
      
      if (pttTimerRef.current) clearTimeout(pttTimerRef.current);
      
      pttTimerRef.current = setTimeout(() => {
        finalizePttTurn();
      }, 1200); // 1.2s is usually enough for the final STT chunk to propagate
    }
  };

  // Keep finalization timer alive if transcription is still arriving
  useEffect(() => {
    if (isPttMode && isMuted && pttTimerRef.current) {
      const userMsg = chatHistory.filter(m => m.role === 'user').pop();
      const currentLen = userMsg?.text.length || 0;
      
      if (currentLen > lastTranscriptionLengthRef.current) {
        lastTranscriptionLengthRef.current = currentLen;
        clearTimeout(pttTimerRef.current);
        pttTimerRef.current = setTimeout(() => {
          finalizePttTurn();
        }, 1200);
      }
    }
  }, [chatHistory, isPttMode, isMuted]);

  const handleFooterSubmit = useCallback((text: string) => {
    lastSentDraftRef.current = text;
    sendText(text);
    setDraftText('');
    setDraftKey(null);
    setJustSent(true);
    setIsWaitingForResponse(true);
    setTimeout(() => setJustSent(false), 3000);
  }, [sendText]);

  const handleFooterCallback = useCallback(() => {
    // Callback: cancel submission during 3s window; restore draft for edit (no backend abort in MVP)
    setJustSent(false);
    setDraftText(lastSentDraftRef.current || '');
    setDraftKey('callback');
  }, []);

  const handleDraftChange = useCallback((text: string) => {
    setDraftText(text);
    if (!text.trim()) setDraftKey(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8 font-sans selection:bg-blue-500/30 overflow-y-auto">
      
      {/* Header */}
      <header className="max-w-[1600px] mx-auto mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
                <Sparkles className="text-white h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                AI Biz Bot Voice
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {!isConnected ? (
                <button
                  onClick={handleToggle}
                  className={`px-6 py-2.5 rounded-lg font-bold flex items-center gap-3 transition-all transform active:scale-95 shadow-lg border ${
                    isPttMode 
                      ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-500/20 border-orange-400' 
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 border-blue-400'
                  }`}
                >
                  {isPttMode ? <Radio size={18} /> : <Mic size={18} />}
                  {isPttMode ? 'START PTT SESSION' : 'START LIVE SESSION'}
                </button>
             ) : (
                <div className="flex items-center gap-2">
                  {isPttMode ? (
                    <button
                      onMouseDown={handlePttDown}
                      onMouseUp={handlePttUp}
                      onMouseLeave={handlePttUp}
                      onTouchStart={(e) => { e.preventDefault(); handlePttDown(); }}
                      onTouchEnd={(e) => { e.preventDefault(); handlePttUp(); }}
                      className={`
                        px-8 py-2.5 rounded-lg font-bold flex items-center gap-3 transition-all transform active:scale-95 shadow-xl select-none
                        ${!isMuted 
                          ? 'bg-red-600 text-white animate-pulse scale-105 border-red-400 ring-4 ring-red-500/20' 
                          : isWaitingForResponse ? 'bg-blue-600/50 text-white border-blue-500/30 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20'}
                      `}
                    >
                      <Radio size={18} />
                      {isWaitingForResponse ? 'PROCESSING...' : 'PUSH TO TALK'}
                    </button>
                  ) : (
                    <button
                      onClick={handleToggle}
                      className="px-6 py-2.5 rounded-lg font-bold flex items-center gap-3 transition-all transform active:scale-95 shadow-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30"
                    >
                      <Power size={18} />
                      STOP SESSION
                    </button>
                  )}

                  <button
                    onClick={disconnect}
                    className="p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg border border-gray-700 transition-colors"
                    title="Disconnect Session"
                  >
                    <X size={18} />
                  </button>
                </div>
             )}

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
              isConnected ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
              {isConnected ? (isPttMode ? (isMuted ? (isWaitingForResponse ? 'PROCESSING' : 'READY') : 'TRANSMITTING') : 'LIVE') : 'OFFLINE'}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 border-b border-gray-800 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('voice')}
            className={`px-6 py-3 text-sm font-bold tracking-wide flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'voice' 
                ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900'
            }`}
          >
            <LayoutTemplate size={16} />
            1. VOICE
          </button>
          <button
            onClick={() => setActiveTab('identity')}
            className={`px-6 py-3 text-sm font-bold tracking-wide flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'identity' 
                ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900'
            }`}
          >
            <Sliders size={16} />
            2. IDENTITY
          </button>
          <button
            onClick={() => setActiveTab('visualizer')}
            className={`px-6 py-3 text-sm font-bold tracking-wide flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'visualizer' 
                ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900'
            }`}
          >
            <Activity size={16} />
            3. VISUALIZER
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-6 py-3 text-sm font-bold tracking-wide flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'architecture' 
                ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900'
            }`}
          >
            <Network size={16} />
            4. ARCHITECTURE
          </button>
          <button
            onClick={() => setActiveTab('telephony')}
            className={`px-6 py-3 text-sm font-bold tracking-wide flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'telephony' 
                ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900'
            }`}
          >
            <Phone size={16} />
            5. TELEPHONY
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1600px] mx-auto min-h-0 pb-12">
        
        {activeTab === 'voice' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
             <div className="lg:col-span-8">
               <SetupPanel 
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  selectedVoice={selectedVoice}
                  onVoiceChange={setSelectedVoice}
                  selectedLanguage={selectedLanguage}
                  onLanguageChange={setSelectedLanguage}
                  disabled={isConnected}
               />
             </div>
             <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm flex-1">
                   <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Selection Preview</h3>
                   <div className="space-y-4">
                      <div className="p-4 bg-black/40 rounded-xl border border-gray-800">
                         <div className="text-xs text-gray-500 mb-1">Active Model</div>
                         <div className="text-blue-400 font-mono text-sm break-all">{selectedModel}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 bg-black/40 rounded-xl border border-gray-800">
                            <div className="text-xs text-gray-500 mb-1">Voice Persona</div>
                            <div className="text-purple-400 font-bold text-lg truncate" title={selectedVoice}>{selectedVoice}</div>
                         </div>
                         <div className="p-4 bg-black/40 rounded-xl border border-gray-800">
                            <div className="text-xs text-gray-500 mb-1">Language</div>
                            <div className="text-emerald-400 font-bold text-lg">{selectedLanguage}</div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'identity' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 flex flex-col">
               <ControlPanel 
                  role={role} setRole={setRole}
                  manualInstruction={manualInstruction} setManualInstruction={setManualInstruction}
                  defaultChatMode={defaultChatMode}
                  setDefaultChatMode={setDefaultChatMode}
                  heroImageUrl={heroImageUrl}
                  setHeroImageUrl={setHeroImageUrl}
                  disabled={isConnected}
               />
            </div>

            <div className="lg:col-span-4 flex flex-col gap-6">
               <div className="flex flex-col gap-6">
                  <div className="min-h-[300px] h-full">
                    <Logger logs={logs} />
                  </div>
                  <div className="min-h-[250px] hidden md:block">
                     <CodeBlock 
                        voice={selectedVoice as VoiceName} 
                        model={selectedModel}
                        systemInstruction={systemInstruction}
                     />
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'visualizer' && (
          <div className="flex flex-col rounded-2xl border border-gray-800 overflow-hidden min-h-[700px] max-h-[85vh] relative">
            {/* Branded background: Google Places hero image at ~25% opacity (fades into chat) */}
            {heroImageUrl && (
              <div className="absolute inset-0 pointer-events-none z-0">
                <img
                  src={heroImageUrl}
                  alt=""
                  className="w-full h-full object-cover opacity-[0.25]"
                  aria-hidden
                />
                <div className="absolute inset-0 bg-gray-950/75" />
              </div>
            )}
            {!heroImageUrl && <div className="absolute inset-0 bg-gray-900/40 z-0 pointer-events-none" />}

            <div className="relative z-10 flex flex-col flex-1 min-h-0">
            {/* Top 15%: business name + mode switcher (Chat | PTT | Realtime); history shared across all */}
            <ChatHeader
              businessName={role.company}
              mode={chatInterfaceMode}
              onModeChange={setChatInterfaceMode}
              disabled={!isConnected}
            />

            {/* Rest: content by mode */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Chat mode: full conversation view — text history + input */}
              {chatInterfaceMode === 'chat' && (
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex-1 min-h-0 overflow-auto p-4">
                    <ChatHistory messages={chatHistory} />
                  </div>
                  <div className="flex-shrink-0 p-4 pt-0 flex gap-2 border-t border-gray-800">
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          const t = chatInput.trim();
                          if (t && !isWaitingForResponse) {
                            sendText(t);
                            setChatInput('');
                            setIsWaitingForResponse(true);
                          }
                        }
                      }}
                      placeholder="Type a message…"
                      rows={2}
                      disabled={!isConnected || isWaitingForResponse}
                      className="flex-1 min-h-[44px] max-h-[120px] px-4 py-3 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const t = chatInput.trim();
                        if (t && !isWaitingForResponse) {
                          sendText(t);
                          setChatInput('');
                          setIsWaitingForResponse(true);
                        }
                      }}
                      disabled={!isConnected || isWaitingForResponse || !chatInput.trim()}
                      className="self-end px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center gap-2"
                    >
                      <SendHorizontal size={18} />
                      Send
                    </button>
                  </div>
                </div>
              )}

              {/* PTT mode: voice-only view — glowing visualizer + PTT footer; no transcript list (history stored, viewable in Chat) */}
              {chatInterfaceMode === 'ptt' && (
                <>
                  <div className="lg:w-[45%] flex flex-col min-h-0 border-r border-gray-800">
                    <div className="p-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-3 text-blue-400">
                        <Activity size={20} />
                        <h2 className="font-bold">Signal</h2>
                      </div>
                      <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
                        {(['bars', 'wave', 'orb'] as VisualizerType[]).map((type) => (
                          <button
                            key={type}
                            onClick={() => setVisualizerType(type)}
                            className={`px-2 py-1 text-[10px] font-black rounded transition-all ${
                              visualizerType === type ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'
                            }`}
                          >
                            {type.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 p-4">
                      <AudioPulseSettings
                        volume={volume}
                        isConnected={isConnected}
                        visualizerType={visualizerType}
                        isMuted={isMuted}
                      />
                    </div>
                    {isConnected && (
                      <div className="p-4 space-y-3 flex-shrink-0">
                        {justSent && (
                          <div className="flex items-center justify-center gap-2 text-emerald-400 text-[10px] font-black uppercase">
                            <CheckCircle2 size={12} /> Message committed
                          </div>
                        )}
                        {isWaitingForResponse && !justSent && (
                          <div className="flex items-center justify-center gap-2 text-blue-400 text-[10px] font-black uppercase">
                            <Loader2 size={12} className="animate-spin" /> Processing…
                          </div>
                        )}
                        <button
                          onMouseDown={handlePttDown}
                          onMouseUp={handlePttUp}
                          onMouseLeave={handlePttUp}
                          onTouchStart={(e) => { e.preventDefault(); handlePttDown(); }}
                          onTouchEnd={(e) => { e.preventDefault(); handlePttUp(); }}
                          className={`
                            w-full py-8 rounded-2xl font-black text-lg flex flex-col items-center gap-3 transition-all transform active:scale-95 select-none border-b-4
                            ${!isMuted
                              ? 'bg-red-600 text-white border-red-900 ring-4 ring-red-500/30'
                              : isWaitingForResponse
                                ? 'bg-blue-600 text-white border-blue-900 cursor-wait'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-800'}
                          `}
                        >
                          {isWaitingForResponse ? <Loader2 size={40} className="animate-spin" /> : <Radio size={40} className={!isMuted ? 'animate-pulse' : ''} />}
                          <span className="uppercase tracking-tight text-sm">
                            {!isMuted ? 'Recording…' : isWaitingForResponse ? 'Processing…' : 'Push to talk'}
                          </span>
                        </button>
                        <div className="flex items-center justify-center gap-2 p-3 bg-black/40 rounded-xl border border-white/5">
                          {!isMuted ? (
                            <><Activity className="text-red-400 animate-pulse" size={14} /><span className="text-[10px] font-bold text-red-400 uppercase">Live</span></>
                          ) : isWaitingForResponse ? (
                            <><Loader2 className="text-blue-400 animate-spin" size={14} /><span className="text-[10px] font-bold text-blue-400 uppercase">Finalizing</span></>
                          ) : (
                            <><MicOff className="text-gray-500" size={14} /><span className="text-[10px] font-bold text-gray-500 uppercase">Standby</span></>
                          )}
                        </div>
                      </div>
                    )}
                    {!isConnected && (
                      <div className="p-6 text-center text-gray-500 text-sm">
                        Start a session to use Push To Talk. Switch to Chat to see conversation history.
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col min-h-0 min-w-0">
                    <PTTChatFooter
                      draftText={draftText}
                      onDraftChange={handleDraftChange}
                      onPTTDown={handlePttDown}
                      onPTTUp={handlePttUp}
                      onSubmit={handleFooterSubmit}
                      onCallback={handleFooterCallback}
                      isRecording={isConnected && isPttMode && !isMuted}
                      isWaitingResponse={isWaitingForResponse}
                      canSubmit={!isWaitingForResponse}
                      allowAutoSubmit={draftKey === 'ptt'}
                    />
                  </div>
                </>
              )}

              {/* Realtime mode: VAD streaming — visualizer only; no transcript list (history stored) */}
              {chatInterfaceMode === 'realtime' && (
                <>
                  <div className="flex-1 flex flex-col min-h-0 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 text-blue-400">
                        <Activity size={20} />
                        <h2 className="font-bold">Signal</h2>
                      </div>
                      <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
                        {(['bars', 'wave', 'orb'] as VisualizerType[]).map((type) => (
                          <button
                            key={type}
                            onClick={() => setVisualizerType(type)}
                            className={`px-2 py-1 text-[10px] font-black rounded transition-all ${
                              visualizerType === type ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'
                            }`}
                          >
                            {type.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 min-h-0">
                      <AudioPulseSettings
                        volume={volume}
                        isConnected={isConnected}
                        visualizerType={visualizerType}
                        isMuted={false}
                      />
                    </div>
                    <div className="mt-4 p-4 bg-gray-950/50 border border-gray-800 rounded-xl flex items-center gap-3">
                      <Activity size={24} className="text-blue-400 animate-pulse shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-gray-200">Realtime streaming</p>
                        <p className="text-xs text-gray-500">Voice activity detection is on. Responses are spoken and logged; switch to Chat to see history.</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            </div>
          </div>
        )}

        {activeTab === 'architecture' && <ArchitectureView />}
        {activeTab === 'telephony' && <TelephonyView />}

      </main>
      
    </div>
  );
};

export default App;