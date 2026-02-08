import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLiveApi } from './hooks/useLiveApi';
import { VoiceName, VisualizerType, Language } from './types';
import SetupPanel from './components/SetupPanel';
import AudioPulseSettings from './components/AudioPulseSettings';
import CodeBlock from './components/CodeBlock';
import Logger from './components/Logger';
import ChatHistory from './components/ChatHistory';
import ControlPanel from './components/ControlPanel';
import ArchitectureView from './components/ArchitectureView';
import TelephonyView from './components/TelephonyView';
import { Mic, Power, Sparkles, LayoutTemplate, Network, Sliders, Phone, Activity, ToggleLeft, ToggleRight, X, Radio, MicOff, SendHorizontal, CheckCircle2, Loader2, Monitor } from 'lucide-react';

const DEFAULT_INSTRUCTION = "You are currently running inside a React demo application using the Gemini 2.5 Live API. Be helpful, professional, and clear.";
const DEFAULT_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

type Tab = 'voice' | 'identity' | 'visualizer' | 'architecture' | 'telephony';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('voice');
  const [selectedVoice, setSelectedVoice] = useState<string>(VoiceName.Zephyr);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(Language.English);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [manualInstruction, setManualInstruction] = useState(DEFAULT_INSTRUCTION);
  
  // Visualizer & PTT State
  const [visualizerType, setVisualizerType] = useState<VisualizerType>('bars');
  const [isPttMode, setIsPttMode] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

  // Desktop Detection
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Force PTT off on desktop to prevent usage where click/touch logic might differ or be less ideal
  useEffect(() => {
    if (isDesktop && isPttMode) {
      setIsPttMode(false);
    }
  }, [isDesktop, isPttMode]);

  // Refs for PTT logic
  const pttTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptionLengthRef = useRef(0);

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

  // Sync mute state with PTT mode
  useEffect(() => {
    if (isConnected) {
      setIsMuted(isPttMode);
    }
  }, [isConnected, isPttMode, setIsMuted]);

  // Handle Response State Changes
  useEffect(() => {
    const lastMsg = chatHistory[chatHistory.length - 1];
    if (lastMsg && lastMsg.role === 'model' && lastMsg.isStreaming) {
      setIsWaitingForResponse(false);
    }
  }, [chatHistory]);

  const handleToggle = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
      // Auto-switch tabs to improve UX
      if (isPttMode) setActiveTab('visualizer');
      else setActiveTab('identity');
    }
  };

  const finalizePttTurn = () => {
    const userMessages = chatHistory.filter(m => m.role === 'user');
    const latestUserMsg = userMessages[userMessages.length - 1];
    
    // Explicitly send the captured text to ensure the model responds to the full context
    if (latestUserMsg && latestUserMsg.text.trim()) {
      sendText(latestUserMsg.text);
      setJustSent(true);
      setIsWaitingForResponse(true);
      setTimeout(() => setJustSent(false), 3000);
    }
    
    if (pttTimerRef.current) {
      clearTimeout(pttTimerRef.current);
      pttTimerRef.current = null;
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[700px]">
            
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl h-full flex flex-col">
                <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                    <div className="flex items-center gap-3 text-blue-400">
                      <Activity size={24} />
                      <h2 className="text-xl font-bold">Signal Analyzer</h2>
                    </div>
                    <div className="flex bg-gray-950 p-1 rounded-xl border border-gray-800">
                      {(['bars', 'wave', 'orb'] as VisualizerType[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => setVisualizerType(type)}
                          className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
                            visualizerType === type 
                            ? 'bg-blue-600 text-white shadow-lg' 
                            : 'text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {type.toUpperCase()}
                        </button>
                      ))}
                    </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <AudioPulseSettings 
                    volume={volume} 
                    isConnected={isConnected} 
                    visualizerType={visualizerType} 
                    isMuted={isMuted}
                  />
                  
                  <div className="mt-6 p-6 bg-gray-950/50 border border-gray-800 rounded-2xl flex flex-col items-center justify-center text-center">
                    {!isConnected ? (
                      <div className="py-4">
                        <Radio size={40} className="mx-auto mb-4 text-gray-700" />
                        <h3 className="font-bold text-gray-400 uppercase tracking-widest text-sm mb-2">PTT System Offline</h3>
                        <p className="text-xs text-gray-600 mb-6">Start a session above to enable Walkie-Talkie mode.</p>
                        
                        {isDesktop ? (
                          <div className="flex flex-col items-center gap-2 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                             <span className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                               <Monitor size={14} />
                               Desktop Mode Detected
                             </span>
                             <span className="text-[10px] text-gray-600 text-center max-w-[200px]">
                               Push-to-Talk is disabled on desktop devices. Please use mobile for PTT or standard Live Mode.
                             </span>
                          </div>
                        ) : (
                            <button 
                              onClick={() => setIsPttMode(!isPttMode)}
                              className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-xs transition-all mx-auto ${
                                  isPttMode ? 'bg-orange-600 text-white shadow-orange-500/20 shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                              }`}
                            >
                              {isPttMode ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                              {isPttMode ? 'PTT ENABLED' : 'ENABLE PTT MODE'}
                            </button>
                        )}
                      </div>
                    ) : isPttMode ? (
                      <div className="w-full space-y-6">
                        <div className="relative group">
                          {justSent && (
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-black px-4 py-2 rounded-full shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-300">
                               <CheckCircle2 size={12} />
                               MESSAGE COMMITTED
                            </div>
                          )}
                          {isWaitingForResponse && !justSent && (
                             <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-black px-4 py-2 rounded-full shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-300">
                               <Loader2 size={12} className="animate-spin" />
                               AI ANALYZING TRANSCRIPTION
                             </div>
                          )}
                          <button
                            onMouseDown={handlePttDown}
                            onMouseUp={handlePttUp}
                            onMouseLeave={handlePttUp}
                            onTouchStart={(e) => { e.preventDefault(); handlePttDown(); }}
                            onTouchEnd={(e) => { e.preventDefault(); handlePttUp(); }}
                            className={`
                              w-full py-12 rounded-3xl font-black text-2xl flex flex-col items-center gap-4 transition-all transform active:scale-95 shadow-2xl select-none border-b-8
                              ${!isMuted 
                                ? 'bg-red-600 text-white border-red-900 ring-8 ring-red-600/20' 
                                : isWaitingForResponse ? 'bg-blue-600 text-white border-blue-900 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-900 shadow-emerald-600/20'}
                            `}
                          >
                            <div className={`p-4 rounded-full bg-white/10 ${!isMuted ? 'animate-pulse' : ''}`}>
                              {isWaitingForResponse ? <Loader2 size={48} className="animate-spin" /> : <Radio size={48} />}
                            </div>
                            <span className="tracking-tighter uppercase">
                              {!isMuted ? 'RECORDING VOICE...' : isWaitingForResponse ? 'PROCESSING...' : 'HOLD TO TALK'}
                            </span>
                          </button>
                        </div>
                        <div className="flex items-center justify-center gap-3 p-4 bg-black/40 rounded-xl border border-white/5">
                           {!isMuted ? (
                             <>
                               <Activity className="text-red-400 animate-pulse" size={16} />
                               <span className="text-xs font-bold text-red-400 uppercase">Live Transcription below</span>
                             </>
                           ) : isWaitingForResponse ? (
                             <>
                               <Loader2 className="text-blue-400 animate-spin" size={16} />
                               <span className="text-xs font-bold text-blue-400 uppercase">Finalizing Text Turn</span>
                             </>
                           ) : (
                             <>
                               <MicOff className="text-gray-500" size={16} />
                               <span className="text-xs font-bold text-gray-500 uppercase">Radio Standby</span>
                             </>
                           )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-8">
                         <Activity size={40} className="mx-auto mb-4 text-blue-500 animate-pulse" />
                         <h3 className="font-bold text-blue-400 uppercase tracking-widest text-sm mb-2">VAD Active</h3>
                         <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4 leading-relaxed">Continuous conversation mode enabled. The AI will listen and respond automatically.</p>
                         
                         {!isDesktop && (
                            <button 
                                onClick={() => setIsPttMode(true)}
                                className="text-xs font-bold text-gray-500 underline hover:text-white transition-colors"
                            >
                                Switch to Walkie-Talkie Mode
                            </button>
                         )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col">
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl h-full flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                    <div className="flex items-center gap-3 text-purple-400">
                      <SendHorizontal size={24} />
                      <div>
                        <h2 className="text-xl font-bold">Transcription Canvas</h2>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Real-time Voice to Text</p>
                      </div>
                    </div>
                    {chatHistory.length > 0 && (
                      <div className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-[10px] font-black border border-purple-500/20">
                        {chatHistory.length} ENTRIES
                      </div>
                    )}
                </div>
                
                <ChatHistory messages={chatHistory} />
                
                <div className="mt-6 pt-4 border-t border-gray-800 flex items-start gap-3">
                   <div className="p-2 bg-gray-800 rounded-lg text-gray-400 shrink-0">
                      <Sparkles size={16} />
                   </div>
                   <p className="text-[11px] text-gray-500 leading-relaxed italic">
                     {isPttMode 
                       ? "Push-To-Talk: Releasing the button triggers a 1.2s buffer to capture the final transcription tokens before sending the full text to Gemini for an uninterrupted response."
                       : "VAD Mode: Voice Activity Detection automatically identifies when you stop talking and provides a response based on the audio stream."}
                   </p>
                </div>
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