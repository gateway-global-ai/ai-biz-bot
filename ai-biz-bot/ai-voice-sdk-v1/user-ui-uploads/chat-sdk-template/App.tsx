import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { ViewState, BusinessData, AgentConfig, ChatMode, ChatLayoutMode, SdkTheme, CrmContact, Task, CallLog, BotConfig } from './types';
import { enrichBusinessData, createChatSession } from './services/geminiService';
import { LiveVoiceClient } from './services/liveService';
import HeroSection from './components/HeroSection';
import InfoGrid from './components/InfoGrid';
import BlogSection from './components/BlogSection';
import StandardizedChatInterface from './components/StandardizedChatInterface';
import VoiceIndicator from './components/VoiceIndicator';
import PlaceSearch from './components/PlaceSearch';
import { Chat } from '@google/genai';

// Mock Data for SDK Showcase
const MOCK_CRM: CrmContact[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', status: 'Customer', lastContact: '2h ago' },
  { id: '2', name: 'Bob Smith', email: 'bob@tech.co', status: 'Lead', lastContact: '1d ago' },
  { id: '3', name: 'Carol White', email: 'c.white@design.net', status: 'VIP', lastContact: '3d ago' },
];

const MOCK_TASKS: Task[] = [
  { id: '1', title: 'Follow up with Alice', due: 'Today', priority: 'High' },
  { id: '2', title: 'Prepare Invoice #1042', due: 'Tomorrow', priority: 'Medium' },
  { id: '3', title: 'Update Holiday Hours', due: 'Fri', priority: 'Low' },
];

const MOCK_CALLS: CallLog[] = [
  { id: '1', caller: 'Alice Johnson', duration: '4m 32s', timestamp: '10:42 AM', status: 'Completed', sentiment: 'Positive' },
  { id: '2', caller: 'Unknown', duration: '0s', timestamp: '9:15 AM', status: 'Missed', sentiment: 'Neutral' },
  { id: '3', caller: 'Bob Smith', duration: '1m 15s', timestamp: 'Yesterday', status: 'Voicemail', sentiment: 'Negative' },
];

const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>(ViewState.LANDING);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  
  // SDK & Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('customer');
  const [chatLayout, setChatLayout] = useState<ChatLayoutMode>('floating');
  const [sdkTheme, setSdkTheme] = useState<SdkTheme>({
    primaryColor: '#2563eb',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '1.5rem',
  });

  // Voice State
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  
  // Admin Data (Legacy support for logic, visible via Owner Mode now)
  const [ignoredFields, setIgnoredFields] = useState<Set<string>>(new Set());
  const [hiddenReviews, setHiddenReviews] = useState<Set<number>>(new Set());
  const [minRating, setMinRating] = useState<number>(3); 
  
  // Bot Config State
  const [botConfig, setBotConfig] = useState<BotConfig>({
    botId: "bot_12345",
    botConfigId: "cfg_98765",
    agentProfile: {
      name: "Ava",
      role: "Concierge",
      discProfile: "Steadiness (Supportive, Patient)",
      basePrompt: "You are a friendly and knowledgeable AI concierge."
    }
  });

  const voiceClient = useRef(new LiveVoiceClient());

  const handlePlaceSelect = async (place: any) => {
    setViewState(ViewState.LOADING);
    try {
      const data = await enrichBusinessData(place);
      setBusinessData(data);
      
      const session = createChatSession(data, botConfig.agentProfile);
      setChatSession(session);
      
      setViewState(ViewState.GENERATED);
    } catch (error) {
      console.error(error);
      setViewState(ViewState.ERROR);
    }
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
      try {
        await voiceClient.current.connect(businessData, botConfig.agentProfile);
        setIsVoiceActive(true);
      } catch (e) {
        console.error("Failed to connect voice", e);
        alert("Microphone access is needed for voice concierge.");
      }
    }
  }, [isVoiceActive, businessData, botConfig.agentProfile]);

  const handleReset = () => {
    setViewState(ViewState.LANDING);
    setBusinessData(null);
    setChatSession(null);
    setIsChatOpen(false);
    setIsVoiceActive(false);
    setChatMode('customer');
    setChatLayout('floating');
    setIgnoredFields(new Set());
    setHiddenReviews(new Set());
    setMinRating(3);
    voiceClient.current.disconnect();
  };

  // Legacy admin handlers (can be connected to SDK Dev Mode later)
  const filteredReviews = useMemo(() => {
    if (!businessData) return [];
    return businessData.reviews.filter((review, index) => {
      if (hiddenReviews.has(index)) return false;
      if (review.rating < minRating) return false;
      return true;
    });
  }, [businessData, hiddenReviews, minRating]);

  // Landing Page
  if (viewState === ViewState.LANDING || viewState === ViewState.LOADING || viewState === ViewState.ERROR) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden font-sans">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        
        <div className="z-10 w-full max-w-2xl px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              AI Business SDK
            </h1>
            <p className="text-lg text-slate-600">
              Generate a business site and test the <span className="font-semibold text-blue-600">Standardized Chat Interface</span>.
            </p>
          </div>

          <PlaceSearch 
            onPlaceSelect={handlePlaceSelect} 
            isLoading={viewState === ViewState.LOADING} 
          />

          {viewState === ViewState.ERROR && (
             <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl">Generation Failed. Try again.</div>
          )}
        </div>
      </div>
    );
  }

  // Generated Site View
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 animate-in fade-in duration-500 pb-24">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={handleReset} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div className="font-bold text-xl tracking-tight text-slate-900">
            {businessData?.name}
          </div>
        </div>
        <div className="flex gap-3 items-center">
           <button 
             onClick={toggleVoice}
             className={`px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-2 shadow-lg ${isVoiceActive ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'}`}
           >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
               {isVoiceActive ? (
                 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
               ) : (
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
               )}
             </svg>
             {isVoiceActive ? 'End Call' : 'Concierge'}
           </button>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {businessData && (
          <>
            <HeroSection 
              data={businessData} 
              onVoiceToggle={toggleVoice} 
              onChatClick={() => setIsChatOpen(true)}
              isVoiceActive={isVoiceActive} 
              voiceVolume={voiceVolume} 
            />
            <InfoGrid 
              data={businessData} 
              ignoredFields={ignoredFields}
              filteredReviews={filteredReviews}
            />
            <BlogSection 
              restaurants={businessData.nearbyRestaurants} 
              activities={businessData.nearbyActivities}
            />
            
            <div className="max-w-7xl mx-auto px-6 py-12 mb-20 text-center border-t border-slate-200">
              <p className="text-slate-400 text-sm">
                Generated with Gemini 2.5 • Data provided by Google Maps • <a href={businessData.mapLink} target="_blank" rel="noreferrer" className="underline hover:text-slate-600">View on Maps</a>
              </p>
            </div>
          </>
        )}
      </main>

      {/* SDK CONFIGURATION PANEL (For Demo Purposes) */}
      <div className="fixed bottom-6 left-6 z-50 bg-white p-4 rounded-xl shadow-2xl border border-slate-200 w-64 animate-in slide-in-from-left-10">
         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">SDK Playground</h4>
         
         <div className="space-y-4">
            <div>
               <label className="text-xs text-slate-700 font-medium block mb-1">Layout Mode</label>
               <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                  {['floating', 'fixed', 'fullscreen'].map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setChatLayout(m as ChatLayoutMode);
                        setIsChatOpen(true);
                      }}
                      className={`text-[10px] py-1.5 rounded-md capitalize transition-all ${
                        chatLayout === m 
                          ? 'bg-white shadow text-slate-900 font-semibold' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {m === 'fullscreen' ? 'Full' : m}
                    </button>
                  ))}
               </div>
            </div>

            <div>
               <label className="text-xs text-slate-700 font-medium block mb-1">Theme Color</label>
               <div className="flex gap-2">
                  {['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c'].map(color => (
                     <button 
                       key={color} 
                       onClick={() => setSdkTheme(prev => ({...prev, primaryColor: color}))}
                       className={`w-6 h-6 rounded-full border-2 transition-transform ${sdkTheme.primaryColor === color ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                       style={{ backgroundColor: color }}
                     />
                  ))}
               </div>
            </div>

            <div>
               <label className="text-xs text-slate-700 font-medium block mb-1">Bot Name</label>
               <input 
                 type="text" 
                 value={botConfig.agentProfile.name}
                 onChange={(e) => setBotConfig(prev => ({...prev, agentProfile: {...prev.agentProfile, name: e.target.value}}))}
                 className="w-full text-xs px-2 py-1 border border-slate-200 rounded"
               />
            </div>
         </div>
      </div>

      {/* NEW SDK CHAT INTERFACE */}
      {businessData && (
        <StandardizedChatInterface 
          mode={chatMode}
          layoutMode={chatLayout}
          chatSession={chatSession}
          botConfig={botConfig}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onModeChange={setChatMode}
          onLayoutChange={setChatLayout}
          theme={sdkTheme}
          crmData={MOCK_CRM}
          tasks={MOCK_TASKS}
          calls={MOCK_CALLS}
          businessData={businessData}
          onUpdateBusinessData={setBusinessData}
        />
      )}
      
      {/* Floating Action Button (SDK Launcher) */}
      {!isChatOpen && !isVoiceActive && (
        <button 
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 text-white rounded-full shadow-xl transition-transform hover:scale-105 flex items-center justify-center z-40"
          style={{ backgroundColor: sdkTheme.primaryColor }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </button>
      )}

      {/* Voice Active Overlay */}
      <VoiceIndicator 
        isActive={isVoiceActive} 
        volume={voiceVolume} 
        onStop={toggleVoice} 
      />
    </div>
  );
};

export default App;