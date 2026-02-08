import React, { useState, useEffect, useRef } from 'react';
import { Chat } from "@google/genai";
import { ChatMessage, ChatMode, ChatLayoutMode, SdkTheme, CrmContact, Task, CallLog, BotConfig, AdminAuthStatus, WorkspaceStep, SwotAnalysis, ConsultingTask, BusinessData } from '../types';
import { generateBusinessSWOT } from '../services/geminiService';

interface Props {
  mode: ChatMode;
  layoutMode: ChatLayoutMode;
  chatSession: Chat | null;
  botConfig: BotConfig;
  isOpen: boolean;
  onClose: () => void;
  onModeChange: (mode: ChatMode) => void;
  onLayoutChange: (mode: ChatLayoutMode) => void;
  theme?: SdkTheme;
  crmData?: CrmContact[];
  tasks?: Task[];
  calls?: CallLog[];
  businessData?: BusinessData;
  onUpdateBusinessData?: (data: BusinessData) => void;
}

// Default Theme
const defaultTheme: SdkTheme = {
  primaryColor: '#2563eb', // blue-600
  fontFamily: 'Inter, sans-serif',
  borderRadius: '1.5rem',
};

const StandardizedChatInterface: React.FC<Props> = ({ 
  mode, 
  layoutMode,
  chatSession, 
  botConfig,
  isOpen, 
  onClose,
  onModeChange,
  onLayoutChange,
  theme = defaultTheme,
  crmData = [],
  tasks = [],
  calls = [],
  businessData,
  onUpdateBusinessData
}) => {
  const [activeView, setActiveView] = useState<'chat' | 'dashboard' | 'website' | 'crm' | 'tasks' | 'calls' | 'settings'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auth State
  const [authStatus, setAuthStatus] = useState<AdminAuthStatus>('idle');
  
  // Workspace/Dashboard State
  const [showUpgradeFlow, setShowUpgradeFlow] = useState(false);
  const [wsStep, setWsStep] = useState<WorkspaceStep>('plans');
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [swotData, setSwotData] = useState<SwotAnalysis | null>(null);
  const [consultingTasks, setConsultingTasks] = useState<ConsultingTask[]>([
    { id: '1', title: 'Customize Color Scheme', description: 'Update site colors to match brand logo', cost: 10, status: 'recommended' },
    { id: '2', title: 'Import Customer List', description: 'Bulk import contacts from CSV', cost: 10, status: 'recommended' },
    { id: '3', title: 'Set Up Automated Replies', description: 'Configure after-hours auto-response', cost: 15, status: 'recommended' },
    { id: '4', title: 'Voice Concierge Tuning', description: 'Adjust voice pitch and speed', cost: 10, status: 'recommended' },
  ]);

  // Voice Config State
  const [voiceConfig, setVoiceConfig] = useState({
    voice: 'Zephyr',
    speed: 1.0,
    pitch: 1.0,
    stability: 0.5
  });

  // Website Edit Form State
  const [editForm, setEditForm] = useState({
    name: businessData?.name || '',
    tagline: businessData?.tagline || '',
    description: businessData?.description || ''
  });

  // Initialize Chat
  useEffect(() => {
    // Only set initial greeting if chat is empty
    if (messages.length === 0) {
      setMessages([{ 
        role: 'model', 
        text: `Hi! I'm ${botConfig.agentProfile.name}, the ${botConfig.agentProfile.role}. How can I help you today?` 
      }]);
    }
  }, [botConfig]);

  // Sync edit form with props
  useEffect(() => {
    if (businessData) {
        setEditForm({
            name: businessData.name,
            tagline: businessData.tagline,
            description: businessData.description
        });
    }
  }, [businessData]);

  // Handle Mode Switching based on Auth
  useEffect(() => {
    if (mode === 'customer') {
      setActiveView('chat');
    } else if (mode === 'owner') {
      setActiveView('dashboard');
    } else if (mode === 'developer') {
      setActiveView('settings');
    }
  }, [mode]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeView, isOpen, layoutMode]);

  const handleAdminRequest = () => {
    if (authStatus === 'authenticated') {
        setActiveView('dashboard');
        onModeChange('owner');
        return;
    }

    setAuthStatus('awaiting_otp');
    setMessages(prev => [...prev, { 
      role: 'model', 
      text: "🔒 **Admin Access Requested**\n\nA one-time passcode (OTP) has been sent to the business owner's registered contact method.\n\n• If you are the owner, please enter the **6-digit code** below to access agent settings.\n• If this was a mistake, you can ignore this and continue chatting." 
    }]);
  };

  const handleSend = async () => {
    if (!input.trim() || !chatSession) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    // INTERCEPT FOR OTP IF WAITING
    if (authStatus === 'awaiting_otp') {
        if (/^\d{6}$/.test(userMsg.trim())) {
            setTimeout(async () => {
                setIsTyping(false);
                setAuthStatus('authenticated');
                setMessages(prev => [...prev, { role: 'model', text: "✅ **Access Granted**\n\nWelcome back! I've opened your Business Dashboard. You can now edit your site, configure your voice agent, and manage your business." }]);
                onModeChange('owner');
                setActiveView('dashboard'); 
                
                // Generate SWOT in background if not exists
                if (!swotData && businessData) {
                    try {
                        const analysis = await generateBusinessSWOT(businessData);
                        setSwotData(analysis);
                    } catch(e) {}
                }
            }, 1000);
            return;
        }
    }

    try {
      const response = await chatSession.sendMessage({ message: userMsg });
      const text = response.text || "I'm sorry, I couldn't process that.";
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Connection error. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };
  
  // --- ACTIONS ---

  const handleSaveWebsite = () => {
      if (businessData && onUpdateBusinessData) {
          onUpdateBusinessData({
              ...businessData,
              ...editForm
          });
          // Show success feedback
          const btn = document.getElementById('save-site-btn');
          if(btn) {
              const originalText = btn.innerText;
              btn.innerText = 'Saved!';
              setTimeout(() => btn.innerText = originalText, 2000);
          }
      }
  };

  const handleSelectPlan = (plan: 'starter' | 'pro') => {
    setSelectedPlan(plan);
    setWsStep('payment');
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
        setIsProcessing(false);
        setWsStep('account');
    }, 1500);
  };

  const handleAccountSelection = (type: 'existing' | 'new') => {
    setIsProcessing(true);
    setTimeout(() => {
        setIsProcessing(false);
        setWsStep('oauth');
    }, 1000);
  };

  const handleOAuth = async () => {
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsProcessing(false);
    setShowUpgradeFlow(false);
    setActiveView('dashboard');
    // Maybe trigger a notification "Workspace Connected"
  };

  const handleTaskRequest = (task: ConsultingTask) => {
    setConsultingTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'in_progress' } : t));
    
    // Inject request into chat to simulate "Consulting"
    onModeChange('owner'); 
    setActiveView('chat');
    setMessages(prev => [
        ...prev, 
        { role: 'user', text: `I'd like to proceed with the task: "${task.title}" for $${task.cost}.` },
        { role: 'model', text: `Great! I've started the **${task.title}** task. \n\nI will notify you when the updates are live. Is there anything specific you want me to focus on for this?` }
    ]);
  };


  // Helper for dynamic styles
  const primaryStyle = { backgroundColor: theme.primaryColor, color: '#fff' };
  
  const getContainerClasses = () => {
    const baseClasses = "fixed flex flex-col bg-white shadow-2xl overflow-hidden border border-slate-200 z-[60] animate-in fade-in duration-300 font-sans transition-all ease-in-out";
    const mobileClasses = "inset-0 w-full h-full rounded-none";
    
    let desktopClasses = "";
    switch(layoutMode) {
      case 'fixed':
        desktopClasses = "md:inset-y-0 md:right-0 md:left-auto md:bottom-0 md:top-0 md:w-[500px] md:h-full md:rounded-none md:border-l";
        break;
      case 'fullscreen':
        desktopClasses = "md:inset-0 md:w-full md:h-full md:rounded-none";
        break;
      case 'floating':
      default:
        desktopClasses = "md:inset-auto md:bottom-6 md:right-6 md:w-[400px] md:h-[650px] md:rounded-2xl";
        break;
    }

    return `${baseClasses} ${mobileClasses} ${desktopClasses}`;
  };

  if (!isOpen) return null;

  // --- RENDER FUNCTIONS ---
  
  const renderWebsiteEditor = () => (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h3 className="font-bold text-slate-800 mb-1">Website Content</h3>
              <p className="text-xs text-slate-500">Edit your site information in real-time.</p>
          </div>
          
          <div className="space-y-4">
              <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Business Name</label>
                  <input 
                      type="text" 
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tagline</label>
                  <input 
                      type="text" 
                      value={editForm.tagline}
                      onChange={(e) => setEditForm({...editForm, tagline: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">About Description</label>
                  <textarea 
                      value={editForm.description}
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      rows={5}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
              </div>
              
              <button 
                  id="save-site-btn"
                  onClick={handleSaveWebsite}
                  style={primaryStyle}
                  className="w-full py-3 rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-all active:scale-95"
              >
                  Update Live Site
              </button>
          </div>
      </div>
  );

  const renderUpgradeFlow = () => {
    // 1. PLANS
    if (wsStep === 'plans') return (
        <div className="space-y-6 p-2 animate-in slide-in-from-right duration-300">
             <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">Upgrade Workspace</h3>
                <button onClick={() => setShowUpgradeFlow(false)} className="text-xs text-slate-400">Cancel</button>
             </div>
             
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Current Plan</span>
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">Free Tier</span>
                </div>
                <p className="text-xs text-slate-600">Basic website and chatbot included.</p>
            </div>

            <div className="grid gap-4">
                <button onClick={() => handleSelectPlan('starter')} className="text-left group relative bg-white border-2 border-slate-100 hover:border-blue-500 rounded-xl p-4 transition-all hover:shadow-lg">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Starter</h3>
                        <span className="font-bold text-xl text-blue-600">$49<span className="text-sm text-slate-400 font-normal">/mo</span></span>
                    </div>
                    <ul className="space-y-1 mt-2">
                        <li className="text-xs text-slate-600 flex items-center gap-2">✓ Google Workspace Integration</li>
                        <li className="text-xs text-slate-600 flex items-center gap-2">✓ Custom Domain Support</li>
                    </ul>
                </button>

                <button onClick={() => handleSelectPlan('pro')} className="text-left group relative bg-gradient-to-br from-blue-50 to-white border-2 border-blue-100 hover:border-blue-600 rounded-xl p-4 transition-all hover:shadow-lg">
                    <div className="absolute -top-3 left-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">RECOMMENDED</div>
                    <div className="flex justify-between items-center mt-1">
                        <h3 className="font-bold text-slate-800">Pro Business</h3>
                        <span className="font-bold text-xl text-blue-600">$99<span className="text-sm text-slate-400 font-normal">/mo</span></span>
                    </div>
                    <ul className="space-y-1 mt-2">
                        <li className="text-xs text-slate-600 flex items-center gap-2 font-semibold">✓ Dedicated Business Phone #</li>
                        <li className="text-xs text-slate-600 flex items-center gap-2">✓ Advanced Voice Concierge</li>
                    </ul>
                </button>
            </div>
        </div>
    );

    // 2. PAYMENT
    if (wsStep === 'payment') return (
        <div className="space-y-6 p-2 animate-in slide-in-from-right duration-300">
            <button onClick={() => setWsStep('plans')} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">← Back to Plans</button>
            
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                <div>
                    <div className="text-xs font-bold text-blue-600 uppercase">Selected Plan</div>
                    <div className="font-bold text-slate-900 capitalize">{selectedPlan} Business</div>
                </div>
                <div className="font-bold text-xl text-blue-600">${selectedPlan === 'starter' ? '49' : '99'}<span className="text-sm">/mo</span></div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Card Number</label>
                    <input type="text" placeholder="0000 0000 0000 0000" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Expiry</label>
                        <input type="text" placeholder="MM/YY" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">CVC</label>
                        <input type="text" placeholder="123" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={isProcessing}
                    style={primaryStyle}
                    className="w-full py-3 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-all flex justify-center items-center gap-2"
                >
                    {isProcessing ? 'Processing...' : `Pay $${selectedPlan === 'starter' ? '49.00' : '99.00'}`}
                </button>
            </form>
        </div>
    );

    // 3. ACCOUNT
    if (wsStep === 'account') return (
        <div className="space-y-6 p-2 animate-in slide-in-from-right duration-300 text-center">
            <h3 className="text-xl font-bold text-slate-900">Payment Successful!</h3>
            <p className="text-slate-600 text-sm">Let's set up your business workspace.</p>

            <div className="space-y-3 pt-4">
                <button 
                    onClick={() => handleAccountSelection('existing')}
                    className="w-full p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-3 group"
                >
                    <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-xl font-bold text-blue-600">G</div>
                    <div className="text-left">
                        <div className="font-bold text-slate-800 text-sm">Use Existing Google Account</div>
                        <div className="text-xs text-slate-500">Link your current Gmail or Workspace</div>
                    </div>
                </button>

                <button 
                    onClick={() => handleAccountSelection('new')}
                    className="w-full p-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-3 shadow-lg"
                >
                    <div className="text-left w-full text-center">
                        <div className="font-bold text-sm">Create New Business Account</div>
                        <div className="text-xs text-slate-300">Get a professional <span className="font-mono text-emerald-400">@gateway.global</span> email</div>
                    </div>
                </button>
            </div>
        </div>
    );

    // 4. OAUTH
    if (wsStep === 'oauth') return (
        <div className="space-y-8 p-4 animate-in slide-in-from-right duration-300 flex flex-col items-center justify-center h-full">
            <div className="text-center">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Authorize AI Agent</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                    Allow the AI Biz Bot to access your Calendar and Contacts to automate your business.
                </p>
            </div>

            <button 
                onClick={handleOAuth}
                disabled={isProcessing}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-3"
            >
                {isProcessing ? 'Processing...' : 'Sign in with Google'}
            </button>
        </div>
    );

    return null;
  };

  const renderDashboardView = () => {
    if (showUpgradeFlow) {
        return renderUpgradeFlow();
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Status Card */}
            <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Current Plan</div>
                            <h2 className="text-2xl font-bold">Free Tier</h2>
                        </div>
                        <span className="bg-green-500/20 text-green-300 border border-green-500/30 px-3 py-1 rounded-full text-xs font-bold">Active</span>
                    </div>
                    
                    <div className="flex gap-4 mb-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold">1</div>
                            <div className="text-[10px] text-slate-400 uppercase">Users</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold">100</div>
                            <div className="text-[10px] text-slate-400 uppercase">Msg/mo</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold">Web</div>
                            <div className="text-[10px] text-slate-400 uppercase">Channel</div>
                        </div>
                    </div>

                    <button 
                        onClick={() => { setWsStep('plans'); setShowUpgradeFlow(true); }}
                        className="w-full py-2 bg-white text-slate-900 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="text-blue-600">G</span> Connect Workspace
                    </button>
                </div>
            </div>

            {/* SWOT Report */}
            {swotData && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-100 p-3 flex justify-between items-center border-b border-slate-200">
                        <h3 className="font-bold text-sm text-slate-700">Business Analysis</h3>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">AI Generated</span>
                    </div>
                    <div className="grid grid-cols-2 gap-px bg-slate-200">
                        <div className="bg-white p-3">
                            <div className="text-xs font-bold text-green-600 uppercase mb-1">Strengths</div>
                            <ul className="list-disc ml-3 text-[10px] text-slate-600 space-y-0.5">
                                {swotData.strengths.slice(0, 2).map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                        <div className="bg-white p-3">
                            <div className="text-xs font-bold text-amber-500 uppercase mb-1">Opportunities</div>
                            <ul className="list-disc ml-3 text-[10px] text-slate-600 space-y-0.5">
                                {swotData.opportunities.slice(0, 2).map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Consulting/Tasks */}
            <div>
                <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Recommended Actions</h3>
                <div className="space-y-3">
                    {consultingTasks.map((task) => (
                        <div key={task.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center hover:border-blue-300 transition-colors">
                            <div className="flex-1">
                                <div className="font-bold text-sm text-slate-900">{task.title}</div>
                                <div className="text-xs text-slate-500">{task.description}</div>
                            </div>
                            <button 
                                onClick={() => handleTaskRequest(task)}
                                className="ml-3 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                            >
                                Start (${task.cost})
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  const renderCrmView = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-lg text-slate-800">Contacts</h3>
        <button className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 font-medium">Import CSV</button>
      </div>
      <div className={`${layoutMode === 'fullscreen' ? 'grid grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}`}>
        {crmData.map((contact, i) => (
          <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow group cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                {contact.name.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-900">{contact.name}</div>
                <div className="text-xs text-slate-500">{contact.email}</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
                 <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  contact.status === 'VIP' ? 'bg-purple-100 text-purple-700' : 
                  contact.status === 'Customer' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {contact.status}
                </span>
                <span className="text-[10px] text-slate-400">{contact.lastContact}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTasksView = () => (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
       <div className="flex justify-between items-center mb-2">
           <h3 className="font-bold text-lg text-slate-800">Tasks</h3>
           <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{tasks.length} Active</span>
       </div>
       
       <div className={`${layoutMode === 'fullscreen' ? 'grid grid-cols-2 gap-4' : 'space-y-3'}`}>
        {tasks.map((task, i) => (
          <div key={i} className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm group hover:border-blue-200 transition-colors">
            <input type="checkbox" className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800 group-hover:text-blue-700 transition-colors">{task.title}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">Due: {task.due}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  task.priority === 'High' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                }`}>{task.priority}</span>
              </div>
            </div>
          </div>
        ))}
       </div>
       <button 
         style={{ color: theme.primaryColor, borderColor: theme.primaryColor }}
         className="w-full py-2 border-2 border-dashed rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors mt-2 opacity-60 hover:opacity-100"
       >
         + Add New Task
       </button>
    </div>
  );

  const renderCallsView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Voice Config Panel */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <h3 className="font-bold text-slate-800 mb-3 text-sm">Voice Agent Configuration</h3>
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-600">Persona</span>
                  <select 
                     value={voiceConfig.voice}
                     onChange={(e) => setVoiceConfig({...voiceConfig, voice: e.target.value})}
                     className="text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                  >
                      <option value="Zephyr">Zephyr (Balanced)</option>
                      <option value="Puck">Puck (Energetic)</option>
                      <option value="Kore">Kore (Calm)</option>
                  </select>
              </div>
              <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                      <span>Speed</span>
                      <span>{voiceConfig.speed}x</span>
                  </div>
                  <input 
                     type="range" min="0.5" max="2" step="0.1"
                     value={voiceConfig.speed}
                     onChange={(e) => setVoiceConfig({...voiceConfig, speed: parseFloat(e.target.value)})}
                     className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
              </div>
               <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                      <span>Stability</span>
                      <span>{Math.round(voiceConfig.stability * 100)}%</span>
                  </div>
                  <input 
                     type="range" min="0" max="1" step="0.1"
                     value={voiceConfig.stability}
                     onChange={(e) => setVoiceConfig({...voiceConfig, stability: parseFloat(e.target.value)})}
                     className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
              </div>
          </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Calls</div>
        {calls.map((call, i) => (
          <div key={i} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                call.status === 'Missed' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">{call.caller}</div>
                <div className="text-xs text-slate-500">{call.timestamp} • {call.duration}</div>
              </div>
            </div>
            <div className={`text-[10px] px-2 py-0.5 rounded-full ${
              call.sentiment === 'Positive' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
            }`}>
              {call.sentiment}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDeveloperSettings = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 mb-4">
         <div className="text-xs font-mono text-slate-500 mb-1">Bot Identity</div>
         <div className="flex gap-4 text-sm">
            <div><span className="font-bold">ID:</span> {botConfig.botId}</div>
            <div><span className="font-bold">Config:</span> {botConfig.botConfigId}</div>
         </div>
      </div>
      
      <h3 className="font-bold text-lg text-slate-800 mb-2">Developer Configuration</h3>
      
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="text-xs font-mono text-slate-500 mb-1">API Endpoint</div>
        <div className="text-xs bg-white p-2 rounded border border-slate-200 font-mono break-all">
          https://api.business-generator.ai/v1/chat/webhook
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg cursor-pointer">
          <span className="text-sm font-medium text-slate-700">Enable Debug Mode</span>
          <div className="w-10 h-6 bg-slate-200 rounded-full relative">
            <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
          </div>
        </label>
      </div>
      
      <button 
        style={primaryStyle}
        className="w-full py-2.5 rounded-lg text-sm font-bold shadow-lg hover:opacity-90 transition-opacity"
      >
        Deploy Agent Changes
      </button>
    </div>
  );

  return (
    <div 
      className={getContainerClasses()}
      style={{ borderRadius: layoutMode === 'floating' ? theme.borderRadius : '0', fontFamily: theme.fontFamily }}
    >
      {/* HEADER */}
      <div 
        className="p-4 flex justify-between items-center text-white transition-colors duration-300 shrink-0"
        style={{ 
          backgroundColor: mode === 'developer' ? '#0f172a' : (mode === 'owner' ? '#1e293b' : theme.primaryColor) 
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-sm font-bold border border-white/20">
            {mode === 'customer' ? 'AI' : mode === 'owner' ? 'Biz' : 'Dev'}
          </div>
          <div>
            <div className="font-bold leading-tight">{botConfig.agentProfile.name}</div>
            <div className="text-[10px] opacity-80 uppercase tracking-wider font-semibold">
              {mode === 'customer' ? botConfig.agentProfile.role : `${mode} Portal`}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          
          {/* Admin / Settings Cog */}
          <button 
            onClick={handleAdminRequest}
            className={`p-1.5 rounded-full transition-colors ${authStatus === 'awaiting_otp' ? 'bg-amber-500 animate-pulse text-white' : 'hover:bg-white/20 text-white'}`}
            title="Admin Settings"
          >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
               <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
               <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
             </svg>
          </button>

          {/* Mode Switcher (Visible only if Authenticated) */}
          {authStatus === 'authenticated' && (
             <select 
               value={mode} 
               onChange={(e) => onModeChange(e.target.value as ChatMode)}
               className="bg-black/20 text-white text-xs border border-white/10 rounded-lg px-2 py-1 outline-none focus:bg-black/30 cursor-pointer hidden md:block"
             >
               <option value="customer">Customer</option>
               <option value="owner">Owner</option>
               <option value="developer">Developer</option>
             </select>
          )}

          {/* Layout Toggle */}
          <button 
            onClick={() => onLayoutChange(layoutMode === 'fullscreen' ? 'floating' : 'fullscreen')}
            className="hover:bg-white/20 p-1.5 rounded-full transition-colors hidden md:block"
            title={layoutMode === 'fullscreen' ? 'Exit Full Screen' : 'Full Screen'}
          >
            {layoutMode === 'fullscreen' ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            )}
          </button>

          <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* SUB-HEADER TABS (Only for Owner/Dev AND Authenticated) */}
      {authStatus === 'authenticated' && mode !== 'customer' && (
        <div className="flex bg-slate-50 border-b border-slate-200 p-1 shrink-0 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Hub', icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' },
            { id: 'website', label: 'Website', icon: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418' },
            { id: 'chat', label: 'Chat', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
            { id: 'crm', label: 'CRM', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
            { id: 'tasks', label: 'Tasks', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z' },
            { id: 'calls', label: 'Calls', icon: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as any)}
              className={`flex-1 flex flex-col items-center py-2 px-1 rounded-lg transition-all duration-200 min-w-[50px] ${
                activeView === item.id 
                  ? 'bg-white shadow-sm text-slate-900 scale-95' 
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
            </button>
          ))}
          {mode === 'developer' && (
             <button
             onClick={() => setActiveView('settings')}
             className={`flex-1 flex flex-col items-center py-2 rounded-lg transition-all duration-200 ${
               activeView === 'settings' 
                 ? 'bg-white shadow-sm text-slate-900 scale-95' 
                 : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
             }`}
           >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
               <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.43.816 1.035.79 1.688.075.65-.253 1.259-.838 1.528-1.748.803-3.712.986-5.617.525-1.905-.46-3.48-1.874-4.218-3.784-.136-.35-.39-.63-.717-.79-.627-.306-1.229.356-1.144 1.052.128 1.05.416 2.058.838 2.99.28.623.93 1.042 1.637.95 2.073-.269 4.22-.103 6.183.48 1.963.582 3.68 1.764 4.904 3.376" />
             </svg>
             <span className="text-[10px] font-medium mt-1">API</span>
           </button>
          )}
        </div>
      )}
      
      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={scrollRef}>
        
        {/* VIEW ROUTER */}
        {activeView === 'chat' && (
            <div className="max-w-3xl mx-auto w-full">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
                  <div 
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                        ? 'text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                    }`}
                    style={msg.role === 'user' ? primaryStyle : {}}
                  >
                     {/* Markdown-like rendering for bold text */}
                     {msg.text.split('\n').map((line, idx) => (
                        <p key={idx} className={idx > 0 ? 'mt-2' : ''}>
                           {line.split('**').map((part, pIdx) => (
                              pIdx % 2 === 1 ? <strong key={pIdx}>{part}</strong> : part
                           ))}
                        </p>
                     ))}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
        )}

        {activeView === 'dashboard' && renderDashboardView()}
        {activeView === 'website' && renderWebsiteEditor()}
        {activeView === 'crm' && renderCrmView()}
        {activeView === 'tasks' && renderTasksView()}
        {activeView === 'calls' && renderCallsView()}
        {activeView === 'settings' && renderDeveloperSettings()}

      </div>

      {/* INPUT AREA (Only visible in Chat View) */}
      {activeView === 'chat' && (
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <div className="flex gap-2 max-w-3xl mx-auto w-full">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={authStatus === 'awaiting_otp' ? "Enter 6-digit code..." : "Ask me anything..."}
              className="flex-1 px-4 py-3 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all"
              style={{ caretColor: theme.primaryColor }}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim()}
              style={input.trim() ? primaryStyle : {}}
              className={`p-3 rounded-full text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 ${!input.trim() ? 'bg-slate-300' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StandardizedChatInterface;