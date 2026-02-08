
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { ViewState, BusinessData, AgentConfig, ChatMode, ChatLayoutMode, SdkTheme, CrmContact, Task, CallLog, BotConfig, MenuItem, CartItem } from './types';
import { enrichBusinessData, createChatSession } from './services/geminiService';
import { LiveVoiceClient } from './services/liveService';
import HeroSection from './components/HeroSection';
import InfoGrid from './components/InfoGrid';
import MenuSection from './components/MenuSection';
import StandardizedChatInterface from './components/StandardizedChatInterface';
import PlaceSearch from './components/PlaceSearch';
import { Chat } from '@google/genai';

const MOCK_CRM: CrmContact[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', status: 'Customer', lastContact: '2h ago' },
  { id: '2', name: 'Bob Smith', email: 'bob@tech.co', status: 'Lead', lastContact: '1d ago' },
  { id: '3', name: 'Carol White', email: 'c.white@design.net', status: 'VIP', lastContact: '3d ago' },
];

const LOADING_STEPS = [
  { threshold: 0, message: "Researching business data..." },
  { threshold: 15, message: "Organizing content structure..." },
  { threshold: 35, message: "Assembling visual components..." },
  { threshold: 55, message: "Creating AI agent persona..." },
  { threshold: 75, message: "Enabling neural voice engine..." },
  { threshold: 90, message: "Finalizing your experience..." },
];

const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>(ViewState.LANDING);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('customer');
  const [chatLayout, setChatLayout] = useState<ChatLayoutMode>('fixed');
  const [initialView, setInitialView] = useState<'chat' | 'voice'>('chat');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [sdkTheme, setSdkTheme] = useState<SdkTheme>({
    primaryColor: '#2563eb',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '1.5rem',
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);
  const [voiceTranscription, setVoiceTranscription] = useState<{text: string, isFinal: boolean} | undefined>();
  
  const [botConfig, setBotConfig] = useState<BotConfig>({
    botId: "bot_12345",
    botConfigId: "cfg_98765",
    agentProfile: {
      name: "Ava",
      role: "Concierge",
      discProfile: "Steadiness (Supportive, Patient)",
      basePrompt: "You are a friendly AI concierge."
    },
    voiceConfig: {
      voiceName: 'Zephyr',
      language: 'English',
      isPushToTalk: true
    }
  });

  const voiceClient = useRef(new LiveVoiceClient());
  const dataRef = useRef<BusinessData | null>(null);
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkDataIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearLoadingIntervals = useCallback(() => {
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
    if (checkDataIntervalRef.current) {
      clearInterval(checkDataIntervalRef.current);
      checkDataIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearLoadingIntervals();
  }, [clearLoadingIntervals]);

  const handlePlaceSelect = async (place: any) => {
    clearLoadingIntervals();
    setViewState(ViewState.LOADING);
    setLoadingProgress(0);
    dataRef.current = null;

    // Start fetching data immediately
    enrichBusinessData(place).then(data => {
      dataRef.current = data;
    }).catch(err => {
      console.error(err);
      setViewState(ViewState.ERROR);
      clearLoadingIntervals();
    });

    // Start 30-second orchestrated loading
    const duration = 30000; // 30 seconds
    const intervalTime = 100;
    const increment = (intervalTime / duration) * 100;

    loadingIntervalRef.current = setInterval(() => {
      setLoadingProgress(prev => {
        const next = prev + increment;
        if (next >= 100) {
          if (loadingIntervalRef.current) {
            clearInterval(loadingIntervalRef.current);
            loadingIntervalRef.current = null;
          }
          // Only create the data-polling interval once (avoid multiple intervals if this callback re-runs)
          if (!checkDataIntervalRef.current) {
            checkDataIntervalRef.current = setInterval(() => {
              if (dataRef.current) {
                if (checkDataIntervalRef.current) {
                  clearInterval(checkDataIntervalRef.current);
                  checkDataIntervalRef.current = null;
                }
                setBusinessData(dataRef.current);
                setViewState(ViewState.GENERATED);
              }
            }, 500);
          }
          return 100;
        }
        return next;
      });
    }, intervalTime);
  };

  useEffect(() => {
    if (businessData) {
      const session = createChatSession(businessData, botConfig.agentProfile);
      setChatSession(session);
    }
  }, [botConfig.agentProfile, businessData]);

  const toggleVoice = useCallback(async () => {
    if (isVoiceActive) {
      voiceClient.current.disconnect();
      setIsVoiceActive(false);
    } else if (businessData) {
      voiceClient.current.onVolumeChange = setVoiceVolume;
      voiceClient.current.onOutputVolumeChange = setOutputVolume;
      voiceClient.current.onTranscriptionUpdate = (text, isFinal) => {
        setVoiceTranscription({ text, isFinal });
      };
      try {
        await voiceClient.current.connect(businessData, botConfig.agentProfile, botConfig.voiceConfig?.voiceName);
        setIsVoiceActive(true);
      } catch (e: any) {
        alert(e.message || "Microphone access needed.");
      }
    }
  }, [isVoiceActive, businessData, botConfig.agentProfile, botConfig.voiceConfig]);

  const handleVoiceConciergeClick = () => {
    setInitialView('voice');
    setChatLayout('fixed');
    setIsChatOpen(true);
    if (!isVoiceActive) toggleVoice();
  };

  const handleChatConciergeClick = () => {
    setInitialView('chat');
    setChatLayout('fixed');
    setIsChatOpen(true);
  };

  const handleReset = () => {
    setViewState(ViewState.LANDING);
    setBusinessData(null);
    setChatSession(null);
    setIsChatOpen(false);
    setIsVoiceActive(false);
    voiceClient.current.disconnect();
  };

  const currentLoadingStep = useMemo(() => {
    return [...LOADING_STEPS].reverse().find(step => loadingProgress >= step.threshold)?.message || LOADING_STEPS[0].message;
  }, [loadingProgress]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {businessData && (
        <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={handleReset} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
            </button>
            <div className="font-bold text-xl tracking-tight">{businessData?.name}</div>
          </div>
        </nav>
      )}

      <main>
        {businessData && (
          <>
            <HeroSection 
              data={businessData} 
              onVoiceToggle={handleVoiceConciergeClick} 
              onChatClick={handleChatConciergeClick} 
              isVoiceActive={isVoiceActive} 
              voiceVolume={voiceVolume} 
            />
            <InfoGrid data={businessData} ignoredFields={new Set()} />
            {businessData.menu && <MenuSection menu={businessData.menu} onAddToCart={() => {}} categoryType={businessData.categoryType} />}
          </>
        )}
      </main>

      {businessData && (
        <StandardizedChatInterface 
          mode={chatMode} 
          layoutMode={chatLayout} 
          chatSession={chatSession} 
          botConfig={botConfig} 
          isOpen={isChatOpen}
          initialView={initialView}
          onClose={() => setIsChatOpen(false)} 
          onModeChange={setChatMode} 
          onLayoutChange={setChatLayout} 
          theme={sdkTheme}
          onUpdateTheme={(t) => setSdkTheme(prev => ({...prev, ...t}))}
          onUpdateBotConfig={(cfg) => setBotConfig(prev => ({
            ...prev,
            ...(cfg.agentProfile && { agentProfile: { ...prev.agentProfile, ...cfg.agentProfile } }),
            ...(cfg.voiceConfig && { voiceConfig: { ...prev.voiceConfig, ...cfg.voiceConfig } }),
          }))}
          crmData={MOCK_CRM} businessData={businessData}
          cart={cart} onAddToCart={() => {}} onRemoveFromCart={() => {}}
          isVoiceActive={isVoiceActive}
          voiceVolume={voiceVolume}
          outputVolume={outputVolume}
          onToggleVoice={toggleVoice}
          voiceTranscription={voiceTranscription}
          onPTTStart={() => {
            voiceClient.current.resumeAudio();
            voiceClient.current.setStreaming(true);
          }}
          onPTTEnd={() => voiceClient.current.setStreaming(false)}
          onSendVoiceMessage={(text) => voiceClient.current.sendText(text)}
        />
      )}
      
      {!isChatOpen && businessData && (
        <button onClick={() => setIsChatOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 text-white rounded-full shadow-xl transition-transform hover:scale-105 flex items-center justify-center z-40" style={{ backgroundColor: sdkTheme.primaryColor }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
        </button>
      )}

      {viewState === ViewState.LANDING && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-center">
          <div className="absolute top-10 left-10 flex items-center gap-2">
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">B</div>
             <span className="font-bold text-xl tracking-tight">BizFlow AI</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 max-w-4xl leading-[1.1] tracking-tight text-slate-900">
            Build your free website with <span className="text-blue-600">AI Voice</span> in 30 seconds.
          </h1>
          <p className="text-slate-500 text-lg md:text-xl mb-12 max-w-2xl font-medium">
            Just search for any business on Google Maps and our AI will generate a complete site with an integrated Voice Concierge.
          </p>
          <div className="w-full max-w-xl">
            <PlaceSearch onPlaceSelect={handlePlaceSelect} isLoading={false} />
          </div>
          <div className="mt-16 flex flex-wrap justify-center gap-8 opacity-40 grayscale pointer-events-none">
             <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" className="h-6" alt="Google" />
             <img src="https://upload.wikimedia.org/wikipedia/commons/a/ab/Stripe_logo%2C_revised_2016.png" className="h-6" alt="Stripe" />
             <img src="https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" className="h-6" alt="Netflix" />
          </div>
        </div>
      )}

      {viewState === ViewState.LOADING && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 text-center overflow-hidden">
          <div className="absolute inset-0 bg-blue-50/30 backdrop-blur-3xl -z-10"></div>
          
          {/* Animated Background Rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-blue-100 rounded-full animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-blue-200 rounded-full animate-pulse delay-75"></div>
          
          <div className="relative mb-12">
            <div className="w-32 h-32 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-16 h-16 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            {/* Particle Effects */}
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-amber-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-blue-400 rounded-full blur-xl opacity-50 animate-pulse delay-150"></div>
          </div>
          
          <h2 className="text-3xl font-black text-slate-900 mb-2 transition-all duration-500">
            {currentLoadingStep}
          </h2>
          <p className="text-slate-500 font-medium mb-12 uppercase tracking-widest text-xs">
            Almost Ready • Experience the future
          </p>

          <div className="w-full max-w-md bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200 p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(37,99,235,0.4)]"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <div className="mt-4 text-sm font-bold text-blue-600 font-mono">
            {Math.floor(loadingProgress)}%
          </div>

          <div className="absolute bottom-12 flex items-center gap-3 text-slate-400">
             <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse"></div>
             <span className="text-xs font-bold uppercase tracking-wider">Powered by Gemini 3 Pro & BizFlow Voice Engine</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
