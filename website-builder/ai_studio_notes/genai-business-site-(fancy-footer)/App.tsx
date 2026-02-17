import * as React from 'react';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { ViewState, BusinessData, Agent, ChatMode, ChatLayoutMode, SdkTheme, CartItem, AgentRole } from './types';
import { enrichBusinessData, createAgentSession, createSupportChatSession } from './services/geminiService';
import { LiveVoiceClient } from './services/liveService';
import HeroSection from './components/HeroSection';
import InfoGrid from './components/InfoGrid';
import MenuSection from './components/MenuSection';
import StandardizedChatInterface from './components/StandardizedChatInterface';
import TechGuide from './components/TechGuide';
import PlaceSearch from './components/PlaceSearch';
import NavigationDock from './components/NavigationDock';
import { type Chat } from '@google/genai';

const PLATFORM_BUSINESS_DATA: BusinessData = {
  name: "BizFlow AI",
  tagline: "The World's First Talking Website Machine",
  description: "A neural-network driven onboarding experience. Speak to build.",
  address: "Global AI Hub",
  rating: 5.0,
  reviewCount: 9999,
  mapLink: "#",
  hours: ["Online 24/7"],
  reviews: [],
  insights: ["Voice Command Only", "Maps Integrated", "Instant Generation"],
  images: [],
  nearbyRestaurants: [],
  nearbyActivities: [],
  rawPlaceData: {},
  categoryType: 'catalog'
};

const LOADING_STEPS = [
  { threshold: 0, message: "Establishing neural link..." },
  { threshold: 20, message: "Scanning Google Maps architecture..." },
  { threshold: 40, message: "Decrypting business identity..." },
  { threshold: 60, message: "Synthesizing UI components..." },
  { threshold: 80, message: "Deploying voice nodes..." },
  { threshold: 95, message: "Initializing machine core..." },
];

const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'concierge-1',
    name: 'Ava',
    role: 'Concierge',
    roleType: 'customer',
    type: 'concierge',
    discProfile: 'Supportive, Patient',
    basePrompt: 'You are a friendly AI concierge helping customers with items and questions.',
    voiceConfig: { voiceName: 'Zephyr', language: 'en', isPushToTalk: true },
    enabled: true,
    isSystem: true
  },
  {
    id: 'advisor-1',
    name: 'Biz Machine',
    role: 'AI Biz Bot',
    roleType: 'owner',
    type: 'assistant',
    discProfile: 'High Influence, Technical, Energetic',
    basePrompt: 'Technical business advisor. You have all business data. Assist the owner with management.',
    voiceConfig: { voiceName: 'Kore', language: 'en', isPushToTalk: true },
    enabled: true,
    isSystem: true
  }
];

const MachineVisualizer = ({ volume, active, isRecording }: { volume: number, active: boolean, isRecording: boolean }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-[100px] transition-all duration-700 ${active ? 'opacity-100 scale-110' : 'opacity-20 scale-100'}`}></div>
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-blue-500/10 transition-transform duration-100 ${isRecording ? 'scale-110 border-red-500/20' : 'scale-100'}`}
           style={{ transform: `translate(-50%, -50%) scale(${1 + volume * 1.5})` }}></div>
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-indigo-500/20 transition-transform duration-150 ${isRecording ? 'scale-115 border-red-500/30' : 'scale-100'}`}
           style={{ transform: `translate(-50%, -50%) scale(${1 + volume * 2.5})` }}></div>
    </div>
  );
};

const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>(ViewState.LANDING);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [userActions, setUserActions] = useState<string[]>([]);
  
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [activeRole, setActiveRole] = useState<AgentRole>('customer');
  const [chatSessions, setChatSessions] = useState<Record<string, Chat>>({});
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTechGuideOpen, setIsTechGuideOpen] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [voiceTranscription, setVoiceTranscription] = useState<{text: string, isFinal: boolean} | undefined>();
  
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro'>('pro');
  const [regForm, setRegForm] = useState({ name: '', phone: '', email: '' });
  
  const voiceClient = useRef(new LiveVoiceClient());
  const dataRef = useRef<BusinessData | null>(null);

  const logAction = (action: string) => {
    setUserActions(prev => {
        const timestamp = new Date().toLocaleTimeString();
        return [...prev, `[${timestamp}] ${action}`].slice(-10); 
    });
  };

  useEffect(() => {
    if (!chatSessions['advisor-1']) {
       const session = createSupportChatSession() as any;
       setChatSessions(prev => ({ ...prev, 'advisor-1': session }));
    }
  }, []);

  const handlePlaceSelect = async (place: any) => {
    logAction(`Satellite link active for: "${place.name}"`);
    setViewState(ViewState.LOADING);
    setLoadingProgress(0);
    setIsChatOpen(false);
    dataRef.current = null;

    enrichBusinessData(place).then(data => {
      dataRef.current = data;
    }).catch(err => {
      console.error(err);
      setViewState(ViewState.ERROR);
    });

    const timer = setInterval(() => {
      setLoadingProgress(prev => {
        const next = prev + 5;
        if (next >= 100) {
          clearInterval(timer);
          const checkData = setInterval(() => {
            if (dataRef.current) {
              const newData = dataRef.current;
              setBusinessData(newData);
              setViewState(ViewState.ACTION_CENTER);
              
              const concierge = agents.find(a => a.roleType === 'customer');
              const advisor = agents.find(a => a.roleType === 'owner');
              
              const newSessions: Record<string, Chat> = {};
              if (concierge) newSessions[concierge.id] = createAgentSession(newData, concierge) as any;
              if (advisor) newSessions[advisor.id] = createAgentSession(newData, advisor) as any;
              
              setChatSessions(prev => ({ ...prev, ...newSessions }));
              clearInterval(checkData);
            }
          }, 300);
          return 100;
        }
        return next;
      });
    }, 100);
  };

  const handleAgentToolCall = async (call: any) => {
     return { status: "Acknowledge" };
  };

  const toggleVoice = useCallback(async (agentId?: string) => {
    if (isVoiceActive) {
      voiceClient.current.disconnect();
      setIsVoiceActive(false);
      setIsRecording(false);
      setVoiceVolume(0);
      if (!agentId) return; 
    }

    const targetAgentId = agentId || agents.find(a => a.roleType === activeRole)?.id || agents[0].id;
    const targetAgent = agents.find(a => a.id === targetAgentId) || agents[0];
    const context = businessData || PLATFORM_BUSINESS_DATA;

    voiceClient.current.onVolumeChange = setVoiceVolume;
    voiceClient.current.onTranscriptionUpdate = (text, isFinal) => setVoiceTranscription({ text, isFinal });
    voiceClient.current.onToolCall = handleAgentToolCall;
    
    try {
      await voiceClient.current.connect(context, targetAgent, targetAgent.voiceConfig.voiceName, userActions.join('\n'));
      setIsVoiceActive(true);
    } catch (e: any) {
      console.error(e);
      alert("Microphone node activation failed. Please check permissions.");
    }
  }, [isVoiceActive, businessData, agents, activeRole, userActions]);

  const handlePTTStart = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isVoiceActive) {
      const agentId = agents.find(a => a.roleType === activeRole)?.id;
      await toggleVoice(agentId);
      return;
    }
    setIsRecording(true);
    voiceClient.current.setStreaming(true);
  };

  const handlePTTEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isRecording) {
      setIsRecording(false);
      voiceClient.current.setStreaming(false);
    }
  };

  const switchRole = async (role: AgentRole) => {
    if (role === activeRole) return;
    
    if (isVoiceActive) {
      voiceClient.current.disconnect();
      setIsVoiceActive(false);
      setIsRecording(false);
      setVoiceVolume(0);
    }
    
    setActiveRole(role);
    logAction(`Interface reconfiguration: Mode ${role}`);
  };

  const handleUpdateAgent = useCallback((updatedAgent: Agent) => {
    setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
    logAction(`Neural profile updated: ${updatedAgent.name}`);
  }, []);

  const handleReset = () => {
    setViewState(ViewState.LANDING);
    setBusinessData(null);
    setChatSessions({});
    setIsChatOpen(false);
    setIsVoiceActive(false);
    setIsRecording(false);
    voiceClient.current.disconnect();
    setActiveRole('customer');
  };

  const handleBuyNow = () => {
    setIsPricingOpen(true);
  };

  const handleSelectPlan = (plan: 'free' | 'pro') => {
    setSelectedPlan(plan);
    setIsPricingOpen(false);
    setIsRegistrationOpen(true);
  };

  const handleRegSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const planText = selectedPlan === 'pro' ? 'Business Launch' : 'Starter';
    alert(`Success! Finalizing synchronization for ${regForm.name} on the ${planText} plan.`);
    setIsRegistrationOpen(false);
  };

  const currentLoadingStep = useMemo(() => {
    return [...LOADING_STEPS].reverse().find(step => loadingProgress >= step.threshold)?.message || LOADING_STEPS[0].message;
  }, [loadingProgress]);

  const activeAgentId = useMemo(() => agents.find(a => a.roleType === activeRole)?.id || agents[0].id, [agents, activeRole]);
  const activeAgent = useMemo(() => agents.find(a => a.id === activeAgentId) || agents[0], [agents, activeRole]);

  return (
    <div className={`min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-transparent ${viewState === ViewState.GENERATED ? 'overflow-y-auto' : 'overflow-hidden touch-none'}`}>
      
      {/* Platform Header - Hidden in Generated View */}
      {viewState !== ViewState.GENERATED && (
        <nav className="fixed top-0 w-full z-40 px-8 py-6 flex justify-between items-center bg-gradient-to-b from-slate-950 to-transparent">
          <div className="flex items-center gap-3 select-none">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-600/40">B</div>
            <span className="font-black text-2xl tracking-tighter uppercase italic text-white">BizFlow</span>
          </div>
          <div className="flex gap-8 items-center">
            <button onClick={() => setIsTechGuideOpen(true)} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-colors">Neural Architecture</button>
            {businessData && (
              <button onClick={handleReset} className="px-5 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/10 text-white">Restart Machine</button>
            )}
          </div>
        </nav>
      )}

      {/* Background Visualizer for Landing/Action Center */}
      {(viewState === ViewState.LANDING || viewState === ViewState.ACTION_CENTER) && (
        <MachineVisualizer volume={voiceVolume} active={isVoiceActive} isRecording={isRecording} />
      )}

      <main className={`relative z-10 ${viewState === ViewState.GENERATED ? 'pb-[18vh]' : ''}`}>
        {viewState === ViewState.LANDING && (
          <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-20">
            <div className="text-center mb-16 max-w-3xl select-none animate-in fade-in slide-in-from-bottom-10 duration-1000">
              <div className="inline-block px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-widest mb-8">System Online: v3.14-Neural</div>
              <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-8 leading-[0.85] text-white">
                TALKING<br/>MACHINE
              </h1>
              <p className="text-xl text-slate-400 font-light leading-relaxed max-w-xl mx-auto mb-12">
                 Welcome. Identification required. Find your business on Google Maps to begin synchronization.
              </p>
              <div className="w-full max-w-xl mx-auto">
                <PlaceSearch onPlaceSelect={handlePlaceSelect} isLoading={false} />
              </div>
            </div>
          </div>
        )}

        {viewState === ViewState.LOADING && (
          <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center p-6 text-center select-none">
             <div className="w-80 h-1 bg-slate-900 rounded-full mb-10 overflow-hidden relative border border-white/5">
                <div className="absolute inset-0 bg-blue-600/20 blur-md"></div>
                <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_25px_rgba(37,99,235,0.9)] transition-all duration-300 ease-out relative z-10" style={{ width: `${loadingProgress}%` }}></div>
             </div>
             <h2 className="text-4xl font-black text-white italic tracking-tighter mb-4 uppercase">{currentLoadingStep}</h2>
             <div className="flex gap-2">
               {[...Array(8)].map((_, i) => (
                 <div key={i} className="w-1.5 h-6 bg-blue-600/50 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
               ))}
             </div>
          </div>
        )}

        {viewState === ViewState.ACTION_CENTER && businessData && (
          <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 animate-in fade-in zoom-in-95 duration-700 overflow-y-auto">
             <div className="text-center mb-12 select-none">
                <div className="inline-block px-4 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-[10px] font-black uppercase tracking-widest mb-4">Neural Data Extracted</div>
                <h2 className="text-6xl font-black tracking-tight text-white mb-2">{businessData.name}</h2>
                <p className="text-blue-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-8 italic">"{businessData.tagline}"</p>
                
                <div className="bg-slate-900/60 border border-white/10 p-8 rounded-[2rem] max-w-2xl mx-auto mb-12 text-left backdrop-blur-md">
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      Business Intelligence Report
                   </h3>
                   <div className="grid grid-cols-2 gap-8">
                      <div>
                         <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1">Reputation Score</label>
                         <p className="text-2xl font-black text-white">{businessData.rating.toFixed(1)} <span className="text-xs text-slate-400">/ 5.0</span></p>
                         <p className="text-[10px] text-slate-500 mt-1">Based on {businessData.reviewCount} user interactions</p>
                      </div>
                      <div>
                         <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1">Catalog Depth</label>
                         <p className="text-2xl font-black text-white">{businessData.menu?.reduce((acc, cat) => acc + cat.items.length, 0) || 0}</p>
                         <p className="text-[10px] text-slate-500 mt-1">Items across {businessData.menu?.length || 0} categories</p>
                      </div>
                      <div className="col-span-2">
                         <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1">Location Context</label>
                         <p className="text-sm font-medium text-slate-300 leading-relaxed">{businessData.address}</p>
                      </div>
                   </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setViewState(ViewState.GENERATED)}
                    className="px-12 py-5 bg-blue-600 text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 hover:scale-105 active:scale-95"
                  >
                    Enter Generated World
                  </button>
                  <button 
                    onClick={handleReset}
                    className="px-8 py-5 bg-white/5 border border-white/10 text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-white/10 transition-all"
                  >
                    Abort
                  </button>
                </div>
             </div>
          </div>
        )}

        {viewState === ViewState.GENERATED && businessData && (
          <div className="animate-in fade-in duration-1000 bg-white text-slate-900 min-h-screen relative">
            <HeroSection 
              data={businessData} 
              onVoiceToggle={() => {
                switchRole('customer');
                setIsChatOpen(true);
              }} 
              onChatClick={() => {
                switchRole('customer');
                setIsChatOpen(true);
              }} 
              isVoiceActive={isVoiceActive} 
              voiceVolume={voiceVolume} 
            />
            <InfoGrid data={businessData} ignoredFields={new Set()} />
            {businessData.menu && <MenuSection menu={businessData.menu} categoryType={businessData.categoryType} />}
          </div>
        )}
      </main>

      {/* Fixed footer: Back, PTT + Role, Buy — NavigationDock (S-Class module) */}
      {viewState === ViewState.GENERATED && businessData && (
        <NavigationDock
          viewState={viewState}
          activeRole={activeRole}
          isVoiceActive={isVoiceActive}
          isRecording={isRecording}
          voiceVolume={voiceVolume}
          onReset={handleReset}
          onSwitchRole={switchRole}
          onPTTStart={handlePTTStart}
          onPTTEnd={handlePTTEnd}
          onEnableVoice={() => setIsVoiceActive(true)}
          onBuy={handleBuyNow}
        />
      )}

      {/* PRICING MODAL */}
      {isPricingOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Free Plan */}
                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden group hover:border-slate-700 transition-all cursor-pointer" onClick={() => handleSelectPlan('free')}>
                   <h3 className="text-2xl font-black text-white uppercase italic mb-2">Starter</h3>
                   <div className="text-4xl font-black text-slate-500 mb-6">Free</div>
                   <ul className="space-y-4 mb-8 flex-1">
                      <li className="flex items-center gap-3 text-slate-400 text-sm font-medium">
                         <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                         GatewayGlobal.ai Subdomain
                      </li>
                      <li className="flex items-center gap-3 text-slate-400 text-sm font-medium">
                         <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                         Standard Layout
                      </li>
                      <li className="flex items-center gap-3 text-slate-400 text-sm font-medium">
                         <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                         No Editing / Admin Panel
                      </li>
                   </ul>
                   <button className="w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs bg-slate-800 text-white group-hover:bg-white group-hover:text-slate-900 transition-colors">Select Free</button>
                </div>

                {/* Pro Plan */}
                <div className="bg-gradient-to-b from-blue-600 to-blue-800 border border-blue-500 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden shadow-2xl shadow-blue-900/50 transform md:scale-105 cursor-pointer" onClick={() => handleSelectPlan('pro')}>
                   <div className="absolute top-0 right-0 bg-white text-blue-700 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-2xl">Recommended</div>
                   <h3 className="text-2xl font-black text-white uppercase italic mb-2">Business Launch</h3>
                   <div className="text-4xl font-black text-white mb-6">$99 <span className="text-lg font-bold text-blue-200">/mo</span></div>
                   <ul className="space-y-4 mb-8 flex-1">
                      <li className="flex items-center gap-3 text-blue-100 text-sm font-bold">
                         <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                         Custom Domain Name
                      </li>
                      <li className="flex items-center gap-3 text-blue-100 text-sm font-bold">
                         <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                         Dedicated Phone Number
                      </li>
                      <li className="flex items-center gap-3 text-blue-100 text-sm font-bold">
                         <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                         Full Admin & Editing Suite
                      </li>
                       <li className="flex items-center gap-3 text-blue-100 text-sm font-bold">
                         <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                         Small Business Starter Pack
                      </li>
                   </ul>
                   <button className="w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs bg-white text-blue-900 shadow-xl hover:bg-blue-50 transition-colors">Select & Configure</button>
                </div>
            </div>
            <button onClick={() => setIsPricingOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white p-2">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
      )}

      {/* REGISTRATION & PAYMENT MODAL */}
      {isRegistrationOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
             <div className="bg-slate-900 p-8 text-white relative">
                <button 
                  onClick={() => setIsRegistrationOpen(false)}
                  className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-600/20">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M4.5 3.75a3 3 0 0 0-3 3v.75h21v-.75a3 3 0 0 0-3-3h-15Z" /><path fillRule="evenodd" d="M22.5 9.75h-21v7.5a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3v-7.5Zm-18 3.75a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" clipRule="evenodd" /></svg>
                </div>
                <h3 className="text-3xl font-black tracking-tight uppercase italic mb-2">Finalize Launch</h3>
                <p className="text-slate-400 text-sm font-medium">
                   {selectedPlan === 'pro' ? 'Complete your Business Launch Plan setup.' : 'Activate your free Starter site.'}
                </p>
             </div>
             <form onSubmit={handleRegSubmit} className="p-10 space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Full Name</label>
                   <input 
                      required
                      type="text" 
                      placeholder="e.g. John Machine"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 transition-all"
                      value={regForm.name}
                      onChange={e => setRegForm({...regForm, name: e.target.value})}
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Phone Number</label>
                   <input 
                      required
                      type="tel" 
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 transition-all"
                      value={regForm.phone}
                      onChange={e => setRegForm({...regForm, phone: e.target.value})}
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Email Address</label>
                   <input 
                      required
                      type="email" 
                      placeholder="owner@business.com"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 transition-all"
                      value={regForm.email}
                      onChange={e => setRegForm({...regForm, email: e.target.value})}
                   />
                </div>
                
                {selectedPlan === 'pro' && (
                   <div className="pt-2 border-t border-slate-100 mt-4">
                      <div className="flex items-center gap-3 mb-4">
                         <div className="h-8 w-12 bg-slate-200 rounded"></div>
                         <div className="h-8 w-12 bg-slate-200 rounded"></div>
                         <div className="h-8 w-12 bg-slate-200 rounded"></div>
                         <span className="text-xs text-slate-400 font-medium ml-auto">Secure Payment</span>
                      </div>
                      <input 
                        required
                        type="text" 
                        placeholder="Card Number"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 transition-all"
                      />
                   </div>
                )}
                
                <div className="pt-4">
                   <button 
                     type="submit"
                     className="w-full py-5 bg-blue-600 text-white rounded-full font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-600/20 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                   >
                     <span>{selectedPlan === 'pro' ? 'Pay $99 & Launch' : 'Activate Free Site'}</span>
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                   </button>
                   <p className="text-center text-[9px] text-slate-400 mt-4 uppercase tracking-widest font-bold">256-bit AES Encrypted Synchronization</p>
                </div>
             </form>
          </div>
        </div>
      )}

      <StandardizedChatInterface
        mode={activeRole === 'owner' ? 'owner' : 'customer'}
        layoutMode="floating"
        agents={agents}
        activeAgentId={activeAgentId}
        onSelectAgent={(id) => {
          const agent = agents.find(a => a.id === id);
          if (agent) switchRole(agent.roleType);
        }}
        onUpdateAgent={handleUpdateAgent}
        chatSession={chatSessions[activeAgentId] || null}
        userActions={userActions}
        botConfig={{ botId: activeAgentId, botConfigId: activeAgentId, agentProfile: activeAgent, voiceConfig: activeAgent.voiceConfig }}
        isOpen={isChatOpen}
        initialView="chat"
        onClose={() => setIsChatOpen(false)}
        onModeChange={(m) => switchRole(m === 'owner' ? 'owner' : 'customer')}
        onLayoutChange={() => {}}
        businessData={businessData || PLATFORM_BUSINESS_DATA}
        cart={cart}
        onAddToCart={(item) => setCart(prev => [...prev, {...item, quantity: 1}])}
        onRemoveFromCart={(name) => setCart(prev => prev.filter(i => i.name !== name))}
        isVoiceActive={isVoiceActive}
        voiceVolume={voiceVolume}
        onToggleVoice={() => toggleVoice()}
        voiceTranscription={voiceTranscription}
        onPTTStart={() => voiceClient.current.setStreaming(true)}
        onPTTEnd={() => voiceClient.current.setStreaming(false)}
        onSendVoiceMessage={(text) => voiceClient.current.sendText(text)}
        onToolCall={handleAgentToolCall}
      />

      <TechGuide isOpen={isTechGuideOpen} onClose={() => setIsTechGuideOpen(false)} />
    </div>
  );
};

export default App;