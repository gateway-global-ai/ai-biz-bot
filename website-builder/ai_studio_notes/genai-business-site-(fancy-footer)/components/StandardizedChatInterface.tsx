
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chat } from "@google/genai";
import { ChatMessage, ChatMode, ChatLayoutMode, SdkTheme, CrmContact, Task, CallLog, BotConfig, AdminAuthStatus, BusinessData, Agent, MenuItem, CartItem, VoiceQueueItem } from '../types';
import AdminPanel from './AdminPanel';

interface Props {
  mode: ChatMode;
  layoutMode: ChatLayoutMode;
  agents: Agent[];
  activeAgentId: string;
  onSelectAgent: (id: string) => void;
  onUpdateAgent: (agent: Agent) => void;
  chatSession: Chat | null;
  botConfig: BotConfig;
  isOpen: boolean;
  initialView?: 'chat' | 'voice';
  onClose: () => void;
  onModeChange: (mode: ChatMode) => void;
  onLayoutChange: (mode: ChatLayoutMode) => void;
  theme?: SdkTheme;
  onUpdateTheme?: (theme: Partial<SdkTheme>) => void;
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
  onToggleVoice: () => void;
  voiceTranscription?: { text: string; isFinal: boolean };
  onPTTStart: () => void;
  onPTTEnd: () => void;
  onSendVoiceMessage: (text: string) => void;
  userActions?: string[];
  onToolCall?: (call: any) => Promise<any>;
}

const defaultTheme: SdkTheme = {
  primaryColor: '#2563eb',
  fontFamily: 'Inter, sans-serif',
  borderRadius: '1.5rem',
};

const StandardizedChatInterface: React.FC<Props> = ({ 
  mode, 
  layoutMode,
  agents,
  activeAgentId,
  onSelectAgent,
  onUpdateAgent,
  chatSession, 
  botConfig,
  isOpen, 
  initialView = 'chat',
  onClose,
  onModeChange,
  onLayoutChange,
  theme = defaultTheme,
  onUpdateTheme,
  businessData,
  cart,
  isVoiceActive,
  voiceVolume,
  onToggleVoice,
  voiceTranscription,
  onPTTStart,
  onPTTEnd,
  onSendVoiceMessage,
  userActions = [],
  onToolCall
}) => {
  const [activeView, setActiveView] = useState<'chat' | 'cart' | 'dashboard' | 'voice' | 'settings'>(initialView);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({}); 
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [authStatus, setAuthStatus] = useState<AdminAuthStatus>('idle');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [voiceQueue, setVoiceQueue] = useState<VoiceQueueItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [tempTranscription, setTempTranscription] = useState('');

  useEffect(() => {
    if (isOpen) setActiveView(initialView);
  }, [isOpen, initialView]);
  
  useEffect(() => {
    const closeDropdowns = () => setIsAgentDropdownOpen(false);
    if (isAgentDropdownOpen) document.addEventListener('click', closeDropdowns);
    return () => document.removeEventListener('click', closeDropdowns);
  }, [isAgentDropdownOpen]);

  useEffect(() => {
    if (!messages[activeAgentId] || messages[activeAgentId].length === 0) {
      setMessages(prev => ({
        ...prev,
        [activeAgentId]: [{ 
            role: 'model', 
            text: `Hi! I'm ${botConfig.agentProfile.name}, your ${botConfig.agentProfile.role}. How can I help you today?` 
        }]
      }));
    }
  }, [activeAgentId, botConfig, businessData]);

  const currentMessages = messages[activeAgentId] || [];

  const getContainerClasses = () => {
    const base = "fixed z-[60] flex flex-col bg-white overflow-hidden shadow-2xl transition-all duration-500 ease-in-out border-slate-200";
    
    let heightClass = 'h-[650px]';
    if (layoutMode === 'fixed' || layoutMode === 'fullscreen') heightClass = 'h-full';
    if (isMinimized) heightClass = 'h-[85px]'; // Collapsed height (Handle + Header approx)

    if (layoutMode === 'fixed') return `${base} top-0 bottom-0 right-0 w-[450px] ${heightClass} rounded-none border-l`;
    if (layoutMode === 'fullscreen') return `${base} inset-0 w-full ${heightClass} rounded-none border-none`;
    
    return `${base} bottom-24 right-6 w-[400px] ${heightClass} rounded-3xl border`;
  };

  const handleLayoutToggle = () => {
    if (layoutMode === 'floating') onLayoutChange('fixed');
    else if (layoutMode === 'fixed') onLayoutChange('fullscreen');
    else onLayoutChange('floating');
  };

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
        setIsFinalizing(false);
      }
    }
  }, [voiceTranscription]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [currentMessages, activeView, isOpen, layoutMode, voiceQueue, tempTranscription]);

  const handleAdminRequest = useCallback(() => {
    setIsMenuOpen(false);
    if (authStatus === 'authenticated') {
        setActiveView('dashboard');
        onModeChange('owner');
        return;
    }
    setAuthStatus('awaiting_otp');
    setActiveView('chat');
    setMessages(prev => ({
        ...prev,
        [activeAgentId]: [...(prev[activeAgentId] || []), { 
             role: 'model', 
             text: "🔒 **Admin Access Requested**\n\nEnter the **6-digit code** to access agent settings." 
        }]
    }));
  }, [authStatus, onModeChange, activeAgentId]);

  const handlePTTStartAction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isVoiceActive) {
      onToggleVoice();
      // First click: turn on mic, don't stream yet
      return;
    }
    setIsRecording(true);
    setIsFinalizing(false);
    onPTTStart();
  };

  const handlePTTEndAction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isRecording) {
      setIsRecording(false);
      setIsFinalizing(true);
      onPTTEnd();
      setTimeout(() => setIsFinalizing(false), 3000); 
    }
  };

  const handleSendQueueItem = (item: VoiceQueueItem) => {
    onSendVoiceMessage(item.text);
    setMessages(prev => ({
        ...prev,
        [activeAgentId]: [...(prev[activeAgentId] || []), { role: 'user', text: item.text }]
    }));
    setVoiceQueue(prev => prev.filter(i => i.id !== item.id));
  };

  const handleSend = async () => {
    if (!input.trim() || !chatSession) return;
    const userMsg = input;
    setMessages(prev => ({
        ...prev,
        [activeAgentId]: [...(prev[activeAgentId] || []), { role: 'user', text: userMsg }]
    }));
    setInput('');
    setIsTyping(true);

    if (authStatus === 'awaiting_otp') {
        if (/^\d{6}$/.test(userMsg.trim())) {
            setTimeout(() => {
                setIsTyping(false);
                setAuthStatus('authenticated');
                setMessages(prev => ({ ...prev, [activeAgentId]: [...(prev[activeAgentId] || []), { role: 'model', text: "✅ Access Granted" }] }));
                onModeChange('owner');
                setActiveView('dashboard'); 
            }, 1000);
            return;
        }
    }

    try {
      let messagePayload = userMsg;
      const currentAgent = agents.find(a => a.id === activeAgentId);
      if (currentAgent && currentAgent.type === 'assistant') {
          const actionSummary = userActions.length > 0 ? userActions.join('\n') : "No recorded actions.";
          const businessInfo = businessData ? `Viewing generated site for: ${businessData.name}.` : `Landing page flow.`;
          messagePayload = `[CONTEXT: ${actionSummary} | STATE: ${businessInfo}] ${userMsg}`;
      }

      const response = await chatSession.sendMessage({ message: messagePayload });
      
      if (response.functionCalls && response.functionCalls.length > 0 && onToolCall) {
          for (const call of response.functionCalls) {
              const result = await onToolCall(call);
              const followUp = await chatSession.sendMessage({
                  message: [{
                      functionResponse: {
                          name: call.name,
                          response: { result },
                          id: call.id
                      }
                  }]
              });
              setMessages(prev => ({ ...prev, [activeAgentId]: [...(prev[activeAgentId] || []), { role: 'model', text: followUp.text || "" }] }));
          }
      } else {
          setMessages(prev => ({ ...prev, [activeAgentId]: [...(prev[activeAgentId] || []), { role: 'model', text: response.text || "" }] }));
      }
    } catch (e) {
      setMessages(prev => ({ ...prev, [activeAgentId]: [...(prev[activeAgentId] || []), { role: 'model', text: "Error. Try again." }] }));
    } finally { setIsTyping(false); }
  };

  if (!isOpen) return null;

  return (
    <div className={getContainerClasses() + " touch-none selection:bg-transparent"}>
      {/* Handle Bar for Minimizing */}
      <div 
        onClick={() => setIsMinimized(!isMinimized)}
        className="w-full h-5 bg-slate-900 flex items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors border-b border-white/5 shrink-0"
      >
        <div className="w-12 h-1 bg-white/20 rounded-full"></div>
      </div>

      <div className="bg-slate-900 p-4 border-b border-white/10 flex justify-between items-center text-white shrink-0 h-[60px]">
        <div className="flex items-center gap-3 relative">
          <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-white/10 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg></button>
          <div className="cursor-pointer group relative" onClick={(e) => { e.stopPropagation(); setIsAgentDropdownOpen(!isAgentDropdownOpen); }}>
            <div className="flex items-center gap-2">
                <div>
                    <span className="font-bold text-sm block flex items-center gap-2">{botConfig.agentProfile.name} <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3 text-white/50"><path d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg></span>
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">{botConfig.agentProfile.role}</span>
                </div>
            </div>
            {isAgentDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden text-slate-900 z-[100] animate-in slide-in-from-top-2">
                    <div className="p-2 bg-slate-50 border-b text-[10px] font-bold text-slate-500 uppercase tracking-widest">Switch Agent</div>
                    {agents.filter(a => a.enabled).map(agent => (
                        <button key={agent.id} onClick={(e) => { e.stopPropagation(); onSelectAgent(agent.id); setIsAgentDropdownOpen(false); }} className={`w-full text-left p-3 hover:bg-blue-50 flex items-center gap-3 ${agent.id === activeAgentId ? 'bg-blue-50' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${agent.type === 'concierge' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>{agent.name.charAt(0)}</div>
                            <div><div className="font-bold text-sm">{agent.name}</div><div className="text-[10px] text-slate-500">{agent.role}</div></div>
                        </button>
                    ))}
                </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleLayoutToggle} className="p-2 hover:bg-white/10 rounded-full hidden sm:block">
            {layoutMode === 'floating' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" /></svg>}
            {layoutMode === 'fixed' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>}
          </button>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col">
        {activeView === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}>
              {currentMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'}`}>{msg.text}</div>
                </div>
              ))}
              {isTyping && <div className="flex justify-start"><div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-200"><div className="flex space-x-1"><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div></div></div></div>}
            </div>
            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex gap-2">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="flex-1 px-4 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none" />
                <button onClick={handleSend} disabled={!input.trim()} className="p-2.5 bg-blue-600 text-white rounded-xl"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg></button>
              </div>
            </div>
          </>
        )}

        {activeView === 'voice' && (
          <div className="h-full flex flex-col bg-[#0a0f1c] text-white">
            <div className="flex-1 p-5 flex flex-col gap-6 overflow-y-auto">
              <div className="bg-[#11182