
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chat } from "@google/genai";
import { ChatMessage, ChatMode, ChatLayoutMode, SdkTheme, CrmContact, Task, CallLog, BotConfig, AdminAuthStatus, BusinessData, AgentConfig, MenuItem, CartItem, VoiceQueueItem } from '../types';
import AdminPanel from './AdminPanel';
import AgentVoiceSettingsPanel from './AgentVoiceSettingsPanel';

interface Props {
  mode: ChatMode;
  layoutMode: ChatLayoutMode;
  chatSession: Chat | null;
  botConfig: BotConfig;
  isOpen: boolean;
  initialView?: 'chat' | 'voice';
  onClose: () => void;
  onModeChange: (mode: ChatMode) => void;
  onLayoutChange: (mode: ChatLayoutMode) => void;
  theme?: SdkTheme;
  onUpdateTheme?: (theme: Partial<SdkTheme>) => void;
  onUpdateBotConfig?: (config: Partial<BotConfig>) => void;
  crmData?: CrmContact[];
  tasks?: Task[];
  calls?: CallLog[];
  businessData?: BusinessData;
  onUpdateBusinessData?: (data: BusinessData) => void;
  cart: CartItem[];
  onAddToCart: (item: MenuItem) => void;
  onRemoveFromCart: (name: string) => void;
  isVoiceActive: boolean;
  voiceVolume: number;
  /** Volume level of incoming TTS (AI) playback; drives visualizer when not recording. */
  outputVolume?: number;
  onToggleVoice: () => void;
  voiceTranscription?: { text: string; isFinal: boolean };
  onPTTStart: () => void;
  onPTTEnd: () => void;
  onSendVoiceMessage: (text: string) => void;
}

const defaultTheme: SdkTheme = {
  primaryColor: '#2563eb',
  fontFamily: 'Inter, sans-serif',
  borderRadius: '1.5rem',
};

const StandardizedChatInterface: React.FC<Props> = ({ 
  mode, 
  layoutMode,
  chatSession, 
  botConfig,
  isOpen, 
  initialView = 'chat',
  onClose,
  onModeChange,
  onLayoutChange,
  theme = defaultTheme,
  onUpdateTheme,
  onUpdateBotConfig,
  businessData,
  cart,
  onAddToCart,
  onRemoveFromCart,
  isVoiceActive,
  voiceVolume,
  outputVolume = 0,
  onToggleVoice,
  voiceTranscription,
  onPTTStart,
  onPTTEnd,
  onSendVoiceMessage
}) => {
  const [activeView, setActiveView] = useState<'chat' | 'cart' | 'cashier' | 'dashboard' | 'voice' | 'settings' | 'customizer'>(initialView);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [authStatus, setAuthStatus] = useState<AdminAuthStatus>('idle');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAgentVoicePanel, setShowAgentVoicePanel] = useState(false);

  // Voice Queue State
  const [voiceQueue, setVoiceQueue] = useState<VoiceQueueItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [tempTranscription, setTempTranscription] = useState('');

  // Update active view when prop changes (e.g. user clicks Voice Concierge button)
  useEffect(() => {
    if (isOpen) {
      setActiveView(initialView);
    }
  }, [isOpen, initialView]);

  const getContainerClasses = () => {
    const base = "fixed z-[60] flex flex-col bg-white overflow-hidden shadow-2xl transition-all duration-500 ease-in-out border-slate-200";
    const isMobile = window.innerWidth < 640;
    
    // For mobile, we ALWAYS want 100% height/width
    if (isMobile) {
      return `${base} inset-0 w-full h-full rounded-none border-none`;
    }
    
    // Desktop Layouts
    if (layoutMode === 'fixed') {
      return `${base} top-0 bottom-0 right-0 w-[450px] h-full rounded-none border-l`;
    }
    if (layoutMode === 'fullscreen') {
      return `${base} inset-0 w-full h-full rounded-none border-none`;
    }
    // Default Floating Desktop
    return `${base} bottom-24 right-6 w-[400px] h-[650px] rounded-3xl border`;
  };

  const cycleLayout = () => {
    if (layoutMode === 'floating') onLayoutChange('fixed');
    else if (layoutMode === 'fixed') onLayoutChange('fullscreen');
    else onLayoutChange('floating');
  };

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ 
        role: 'model', 
        text: `Hi! I'm ${botConfig.agentProfile.name}, your personal concierge for ${businessData?.name}. How can I help you today?` 
      }]);
    }
  }, [botConfig, businessData]);

  useEffect(() => {
    if (voiceTranscription) {
      setTempTranscription(voiceTranscription.text);
      if (voiceTranscription.isFinal && voiceTranscription.text.trim()) {
        const newItem: VoiceQueueItem = {
          id: Math.random().toString(36).substr(2, 9),
          text: voiceTranscription.text,
          status: 'pending',
          timestamp: Date.now()
        };
        setVoiceQueue(prev => [...prev, newItem]);
        setTempTranscription('');
        // Stop the finalizing spinner once we get a final item
        setIsFinalizing(false);
      }
    }
  }, [voiceTranscription]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeView, isOpen, layoutMode, voiceQueue, tempTranscription]);

  const handleAdminRequest = useCallback(() => {
    setIsMenuOpen(false);
    if (authStatus === 'authenticated') {
        setActiveView('dashboard');
        onModeChange('owner');
        return;
    }
    setAuthStatus('awaiting_otp');
    setActiveView('chat');
    setMessages(prev => [...prev, { 
      role: 'model', 
      text: "🔒 **Admin Access Requested**\n\nEnter the **6-digit code** to access agent settings." 
    }]);
  }, [authStatus, onModeChange]);

  const handleMenuNavigation = (view: typeof activeView) => {
    setActiveView(view);
    setIsMenuOpen(false);
  };

  const handleSendQueueItem = (item: VoiceQueueItem) => {
    onSendVoiceMessage(item.text);
    setMessages(prev => [...prev, { role: 'user', text: item.text }]);
    setVoiceQueue(prev => prev.filter(i => i.id !== item.id));
  };

  const handleRemoveQueueItem = (id: string) => {
    setVoiceQueue(prev => prev.filter(i => i.id !== id));
  };

  const handlePTTStartAction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isVoiceActive) onToggleVoice();
    setIsRecording(true);
    setIsFinalizing(false);
    onPTTStart();
  };

  const handlePTTEndAction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsRecording(false);
    setIsFinalizing(true);
    onPTTEnd();
    // Auto-clear finalizing after 3s if no transcription arrives
    setTimeout(() => setIsFinalizing(false), 3000);
  };

  const handleSend = async () => {
    if (!input.trim() || !chatSession) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    if (authStatus === 'awaiting_otp') {
        if (/^\d{6}$/.test(userMsg.trim())) {
            setTimeout(() => {
                setIsTyping(false);
                setAuthStatus('authenticated');
                setMessages(prev => [...prev, { role: 'model', text: "✅ **Access Granted**\n\nWelcome back!" }]);
                onModeChange('owner');
                setActiveView('dashboard'); 
            }, 1000);
            return;
        }
    }

    try {
      const response = await chatSession.sendMessage({ message: userMsg });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "" }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Error. Try again." }]);
    } finally { setIsTyping(false); }
  };

  const primaryStyle = { backgroundColor: theme.primaryColor, color: '#fff' };

  const renderVoiceView = () => (
    <div className="h-full flex flex-col bg-[#0a0f1c] text-white animate-in fade-in duration-500 overflow-hidden">
       {/* Fixed Header */}
       <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#0d1321] shrink-0 z-10">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
             </div>
             <div>
                <h3 className="font-black text-sm uppercase tracking-widest">Voice Engine</h3>
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Secure PTT Mode</p>
             </div>
          </div>
          <button onClick={() => setActiveView('chat')} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest transition-colors border border-white/10">Text Mode</button>
       </div>

       {/* Scrollable Content */}
       <div className="flex-1 p-5 flex flex-col gap-6 overflow-y-auto">
          {/* Signal Analyzer Card */}
          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden shrink-0">
             <div className="flex justify-between items-center mb-6">
                <h4 className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                   <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : (isFinalizing ? 'bg-amber-500 animate-pulse' : outputVolume > 0 ? 'bg-green-500 animate-pulse' : 'bg-blue-500')}`}></span>
                   {isRecording ? 'Capturing Signal...' : (isFinalizing ? 'Finalizing...' : outputVolume > 0 ? 'Agent speaking...' : 'Standby')}
                </h4>
                <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${isVoiceActive ? '100%' : '20%'}` }}></div>
                </div>
             </div>
             <div className="h-20 flex items-center justify-center gap-2">
                {[...Array(12)].map((_, i) => {
                  const vol = isRecording ? voiceVolume : outputVolume;
                  return (
                   <div key={i} className="w-2.5 bg-gradient-to-t from-blue-700 to-blue-400 rounded-full transition-all duration-75" style={{ height: `${vol > 0 ? Math.max(12, vol * (400 + Math.random() * 100)) : 6}px` }} />
                  );
                })}
             </div>
          </div>

          {/* Transcription Preview Area */}
          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 flex flex-col relative min-h-[160px] shadow-lg shrink-0">
             <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4">Transcription Preview</h4>
             <div className={`flex-1 text-base leading-relaxed transition-opacity duration-300 ${(isRecording || isFinalizing) ? 'opacity-100' : 'opacity-40'}`}>
                 {(isRecording || isFinalizing) ? (
                   <div className="flex flex-col gap-3">
                      <p className="text-white font-medium italic">"{tempTranscription || (isFinalizing ? "Processing signal..." : "I'm listening...")}"</p>
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-75"></span>
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-150"></span>
                      </div>
                   </div>
                 ) : (
                   <div className="text-center mt-6">
                      <p className="text-slate-500 text-sm">Hold the button below to capture audio.</p>
                   </div>
                 )}
             </div>
          </div>

          {/* Outgoing Queue */}
          <div className="flex flex-col gap-4">
             <div className="flex items-center justify-between px-2">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Review Queue</h4>
                <span className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full font-bold">{voiceQueue.length} items</span>
             </div>
             
             {voiceQueue.length === 0 ? (
               <div className="py-12 text-center text-xs text-slate-600 border-2 border-dashed border-slate-800 rounded-[2rem] uppercase tracking-widest font-black opacity-50">Empty Queue</div>
             ) : (
               <div className="space-y-4">
                 {voiceQueue.map((item) => (
                   <div key={item.id} className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] shadow-xl animate-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed font-medium">"{item.text}"</p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => handleSendQueueItem(item)} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded-2xl uppercase tracking-[0.15em] transition-all shadow-lg shadow-blue-900/20">Send Now</button>
                        <button onClick={() => handleRemoveQueueItem(item.id)} className="px-5 py-3 bg-slate-800 hover:bg-red-900 text-slate-400 hover:text-white text-[10px] font-black rounded-2xl uppercase tracking-widest transition-all">Discard</button>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
       </div>

       {/* Fixed PTT Controls Footer */}
       <div className="p-8 pb-10 bg-[#0d1321] border-t border-white/5 shrink-0 z-10">
          <button 
             onMouseDown={handlePTTStartAction}
             onMouseUp={handlePTTEndAction}
             onMouseLeave={(e) => { if(isRecording) handlePTTEndAction(e); }}
             onTouchStart={handlePTTStartAction}
             onTouchEnd={handlePTTEndAction}
             className={`w-full py-7 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.25em] transition-all flex flex-col items-center justify-center gap-2 shadow-2xl touch-none select-none relative overflow-hidden group ${
                isRecording 
                ? 'bg-red-600 text-white scale-[0.98] shadow-red-900/40 ring-4 ring-red-600/20' 
                : 'bg-white text-slate-900 hover:bg-slate-100 shadow-slate-900/20'
             }`}
          >
             <div className="flex items-center gap-4 relative z-10">
               {isRecording ? (
                  <>
                    <span className="w-3 h-3 bg-white rounded-full animate-ping"></span>
                    Capturing...
                  </>
               ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 text-blue-600"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                    Hold to Record
                  </>
               )}
             </div>
             {isRecording && <div className="absolute inset-0 bg-black/10 animate-pulse"></div>}
          </button>
          
          <div className="mt-5 flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
             <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isVoiceActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-700'}`}></span>
                {isVoiceActive ? 'Online' : 'Offline'}
             </div>
             <button onClick={onToggleVoice} className="text-blue-500 hover:text-blue-400 transition-colors">Restart Connection</button>
          </div>
       </div>
    </div>
  );

  const renderMenu = () => (
    <div className="absolute inset-0 bg-slate-50 z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {showAgentVoicePanel ? (
          <AgentVoiceSettingsPanel
            botConfig={botConfig}
            onUpdateBotConfig={onUpdateBotConfig!}
            onBack={() => setShowAgentVoicePanel(false)}
          />
        ) : (
          <>
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg">System Options</h3>
            <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="grid grid-cols-1 gap-3">
                <button onClick={() => handleMenuNavigation('chat')} className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all group text-left">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg></div>
                    <div><span className="block font-bold text-slate-900 text-sm">Text Concierge</span><span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Standard Chat</span></div>
                </button>
                <button onClick={() => handleMenuNavigation('voice')} className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-900 rounded-xl shadow-md hover:bg-slate-800 transition-all group text-left relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
                    <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center relative z-10"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg></div>
                    <div className="relative z-10"><span className="block font-bold text-white text-sm">Voice Concierge</span><span className="text-[10px] text-blue-400 uppercase font-black tracking-widest">Push to Talk</span></div>
                </button>
            </div>
            <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Settings</h4>
                <button onClick={() => setShowAgentVoicePanel(true)} className="w-full flex items-center gap-3 p-3 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-left">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                    <span className="font-bold text-xs uppercase tracking-widest">Agent & Voice</span>
                </button>
                <button onClick={() => handleMenuNavigation('customizer')} className="w-full flex items-center gap-3 p-3 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-left mt-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122l9.37-9.37a2.828 2.828 0 114 4.001l-9.37 9.37a4.5 4.5 0 01-1.697 1.134l-2.623.873a.75.75 0 01-.921-.921l.873-2.623a4.5 4.5 0 011.134-1.697zM15 8.121l1.77-1.77m-1.77 1.77l1.77 1.77m-1.77-1.77l-1.77-1.77" /></svg><span className="font-bold text-xs uppercase tracking-widest">Interface Theme</span></button>
                <button onClick={handleAdminRequest} className="w-full flex items-center gap-3 p-3 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors text-left mt-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg><span className="font-bold text-xs uppercase tracking-widest">Admin Dashboard</span></button>
            </div>
        </div>
          </>
        )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className={getContainerClasses()} style={{ fontFamily: theme.fontFamily }}>
      {/* Universal Header */}
      <div className="p-4 flex justify-between items-center text-white transition-colors duration-300 shrink-0" style={{ backgroundColor: activeView === 'customizer' ? '#0f172a' : (mode === 'developer' ? '#0f172a' : (mode === 'owner' ? '#1e293b' : (activeView === 'voice' ? '#0a0f1c' : theme.primaryColor))) }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-sm font-bold">
            {activeView === 'customizer' ? 'SDK' : (mode === 'customer' ? 'AI' : mode === 'owner' ? 'Biz' : 'Dev')}
          </div>
          <div><div className="font-bold text-sm leading-tight">{activeView === 'customizer' ? 'SDK Settings' : botConfig.agentProfile.name}</div><div className="text-[9px] opacity-80 uppercase tracking-widest font-black">{activeView === 'customizer' ? 'Appearance' : (mode === 'customer' ? botConfig.agentProfile.role : `${mode} Portal`)}</div></div>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={cycleLayout}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors hidden sm:block"
            title="Switch View Mode"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
            </svg>
          </button>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`p-1.5 rounded-full transition-all relative ${isMenuOpen ? 'bg-white text-slate-900 shadow-lg' : 'hover:bg-white/20 text-white'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>{cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full border-2 border-white"></span>}</button>
          <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative bg-slate-50/50">
        <div className="absolute inset-0 overflow-y-auto" ref={scrollRef}>
            <div className={`h-full ${activeView === 'voice' ? '' : 'p-4 space-y-4'}`}>
              {activeView === 'chat' && (
                  <div className="max-w-3xl mx-auto w-full">
                  {messages.map((msg, i) => (
                      <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} mb-4`}>
                      <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`} style={msg.role === 'user' ? primaryStyle : {}}>{msg.text}</div>
                      </div>
                  ))}
                  {isTyping && <div className="flex justify-start"><div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100"><div className="flex space-x-1"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div></div></div></div>}
                  </div>
              )}
              {activeView === 'voice' && renderVoiceView()}
              {activeView === 'dashboard' && authStatus === 'authenticated' && businessData && (
                <AdminPanel data={businessData} reviews={businessData.reviews} ignoredFields={new Set()} hiddenReviews={new Set()} minRating={0} agentConfig={botConfig.agentProfile} onToggleField={() => {}} onToggleReview={() => {}} onSetMinRating={() => {}} onUpdateAgentConfig={() => {}} onClose={() => setActiveView('chat')} />
              )}
            </div>
        </div>
        {isMenuOpen && renderMenu()}
      </div>

      {/* Universal Footer for Chat View */}
      {activeView === 'chat' && (
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <div className="flex gap-2 max-w-3xl mx-auto w-full">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask me anything..." className="flex-1 px-4 py-3 bg-slate-100 text-slate-900 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            <button onClick={handleSend} disabled={!input.trim()} style={input.trim() ? primaryStyle : {}} className={`p-3 rounded-full text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 ${!input.trim() ? 'bg-slate-300' : ''}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StandardizedChatInterface;