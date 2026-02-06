import React, { useState, useRef, useEffect } from 'react';
import { Review, ChatMessage } from '../types';
import { createSupportChatSession } from '../services/geminiService';
import { Chat } from '@google/genai';

interface Props {
  data: any;
  reviews: Review[];
  ignoredFields: Set<string>;
  hiddenReviews: Set<number>;
  minRating: number;
  onToggleField: (field: string) => void;
  onToggleReview: (index: number) => void;
  onSetMinRating: (rating: number) => void;
  onClose: () => void;
}

type DevTab = 'data' | 'reviews' | 'integrations';
type AiTab = 'chat' | 'contacts' | 'leads' | 'tasks' | 'reports';
type ViewMode = 'admin' | 'ai' | 'workspace';

// Mock Data for Business View
const MOCK_CONTACTS = [
  { name: 'Alice Johnson', email: 'alice@example.com', type: 'Customer', lastActive: '2 hrs ago', status: 'Active' },
  { name: 'Bob Smith', email: 'bob.smith@local.co', type: 'Lead', lastActive: '1 day ago', status: 'Pending' },
  { name: 'Carol White', email: 'c.white@design.net', type: 'Customer', lastActive: '3 days ago', status: 'Active' },
  { name: 'David Brown', email: 'dbrown@tech.io', type: 'Partner', lastActive: '1 week ago', status: 'Inactive' },
];

const MOCK_LEADS = [
  { company: 'TechCorp HQ', contact: 'David Miller', value: '$5,000', stage: 'Negotiation', probability: '80%' },
  { company: 'The Local Bistro', contact: 'Sarah Jenkins', value: '$1,500', stage: 'Qualified', probability: '40%' },
  { company: 'StartUp Inc', contact: 'Mike Ross', value: '$12,000', stage: 'Discovery', probability: '20%' },
];

const MOCK_TASKS = [
  { title: 'Follow up with TechCorp contract', due: 'Today', priority: 'High', type: 'Sales' },
  { title: 'Send invoice #1024 to Alice', due: 'Tomorrow', priority: 'Medium', type: 'Finance' },
  { title: 'Update holiday business hours', due: 'Fri', priority: 'Low', type: 'Admin' },
  { title: 'Review monthly analytics', due: 'Mon', priority: 'Medium', type: 'Marketing' },
];

const MOCK_WORKSPACE_APPS = [
  { id: 'gmail', name: 'Gmail', icon: 'M', description: 'Business email integration', status: true, color: 'text-red-500', bg: 'bg-red-50' },
  { id: 'calendar', name: 'Google Calendar', icon: 'C', description: 'Schedule & appointment syncing', status: true, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'drive', name: 'Google Drive', icon: 'D', description: 'File storage & document sharing', status: false, color: 'text-green-500', bg: 'bg-green-50' },
  { id: 'meet', name: 'Google Meet', icon: 'V', description: 'Video conferencing integration', status: false, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { id: 'chat', name: 'Google Chat', icon: 'G', description: 'Team messaging & collaboration', status: true, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'sheets', name: 'Google Sheets', icon: 'S', description: 'Spreadsheet data synchronization', status: false, color: 'text-green-600', bg: 'bg-green-50' },
  { id: 'docs', name: 'Google Docs', icon: 'D', description: 'Document creation & management', status: false, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'tasks', name: 'Google Tasks', icon: 'T', description: 'Task tracking & to-do lists', status: true, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { id: 'business', name: 'Google My Business', icon: 'B', description: 'Business Profile management', status: true, color: 'text-blue-700', bg: 'bg-blue-50' },
];

const AdminPanel: React.FC<Props> = ({ 
  data, 
  reviews,
  ignoredFields, 
  hiddenReviews,
  minRating,
  onToggleField, 
  onToggleReview,
  onSetMinRating,
  onClose 
}) => {
  const [mode, setMode] = useState<ViewMode>('admin');
  const [activeDevTab, setActiveDevTab] = useState<DevTab>('data');
  const [activeAiTab, setActiveAiTab] = useState<AiTab>('chat');
  
  // Workspace App State
  const [workspaceApps, setWorkspaceApps] = useState(MOCK_WORKSPACE_APPS);

  // Chat State
  const [adminChatSession, setAdminChatSession] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [isInstalling, setIsInstalling] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, activeDevTab, activeAiTab, mode]);

  const handleStartChat = async () => {
    setIsChatTyping(true);
    try {
      const session = await createSupportChatSession();
      setAdminChatSession(session);
      setChatMessages([{ role: 'model', text: "Hello! I'm the AI Biz Bot. How can I help you integrate real-time data today?" }]);
    } catch (e) {
      console.error("Failed to start admin chat", e);
    } finally {
      setIsChatTyping(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !adminChatSession) return;

    const msg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatInput('');
    setIsChatTyping(true);

    try {
      const response = await adminChatSession.sendMessage({ message: msg });
      
      // Check for function calls (Upsell Trigger)
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          if (call.name === 'suggestIntegration') {
            const args = call.args as any;
            if (args.integrationType === 'google_workspace') {
              // Add the Upsell Card to the chat
              setChatMessages(prev => [...prev, {
                role: 'model',
                text: "I can definitely help with that! Integrating Google Workspace is the best way to handle professional emails and appointments. Here are the details:",
                isUpsell: true,
                upsellData: {
                  title: "Google Workspace Integration",
                  price: "$99",
                  description: "Get professional email, calendar, and collaboration tools fully integrated into your site.",
                  features: ["Professional Email (@yourbusiness.com)", "Appointment Booking & Calendar", "Drive Storage & Docs", "24/7 Priority Support"],
                  cta: "Add Integration"
                }
              }]);

              await adminChatSession.sendMessage({
                message: [{
                  functionResponse: {
                    name: call.name,
                    response: { result: "Upsell card displayed to user." },
                    id: call.id
                  }
                }]
              });
            }
          }
        }
      } else {
         const text = response.text || "I'm having trouble connecting right now.";
         setChatMessages(prev => [...prev, { role: 'model', text }]);
      }

    } catch (e) {
      console.error(e);
      setChatMessages(prev => [...prev, { role: 'model', text: "Error sending message. Please try again." }]);
    } finally {
      setIsChatTyping(false);
    }
  };

  const handleInstallIntegration = async (title: string | undefined) => {
    if (!title) return;
    setIsInstalling(title);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setChatMessages(prev => [...prev, { 
      role: 'model', 
      text: `✅ Success! ${title} has been added to your account. You will receive a configuration email shortly to complete the setup.` 
    }]);
    setIsInstalling(null);
  };
  
  const toggleWorkspaceApp = (id: string) => {
    setWorkspaceApps(prev => prev.map(app => 
        app.id === id ? { ...app, status: !app.status } : app
    ));
  };

  // Helper to format values for display
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') {
      if (Array.isArray(value)) return `Array (${value.length} items)`;
      return 'Object';
    }
    return String(value);
  };

  const fields = Object.keys(data).sort();

  // Reusable Chat Render Logic
  const renderChatInterface = () => (
    <div className="h-full flex flex-col">
       {!adminChatSession ? (
         <div className="flex flex-col items-center justify-center flex-1 text-center p-8 space-y-8 animate-in fade-in duration-500">
           <div className="relative">
             <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full"></div>
             <div className="relative w-24 h-24 bg-gradient-to-br from-slate-900 to-slate-700 rounded-3xl flex items-center justify-center shadow-xl border border-white/10">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-blue-400">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12h1.5m1.875 5.775l-1.5 1.125c.621.264 1.283.483 1.927.66m11.25 0c.644-.177 1.306-.396 1.927-.66l-1.5-1.125m-18 0l1.5-1.125a23.388 23.388 0 01-1.927-.66m18 0c-.644.177-1.306.396-1.927.66l1.5 1.125m-18 0l1.5-1.125m1.875-5.775H6m12 0h-1.875m0 0l-1.125-1.5M6 12l1.125-1.5M21 12c0 4.97-4.03 9-9 9a9 9 0 01-9-9m9-9c1.657 0 3 4.03 3 9s-1.343 9-3 9m0-18c-1.657 0-3 4.03-3 9s1.343 9 3 9m-9-9c0-4.97 4.03-9 9-9" />
               </svg>
             </div>
           </div>
           
           <div className="max-w-md space-y-3">
             <h3 className="text-2xl font-bold text-slate-900">AI Business Assistant</h3>
             <p className="text-slate-600 leading-relaxed">
               Connect your live inventory, reservation systems, CRMs, or POS directly to your website. 
             </p>
           </div>
           
           <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 max-w-sm w-full">
              <h4 className="font-semibold text-blue-900 mb-2">Integration & Setup</h4>
              <p className="text-sm text-blue-700 mb-4">
                Our AI Biz Bot is a technical specialist that can help you generate API keys and configure webhooks.
              </p>
              <button 
                onClick={handleStartChat}
                disabled={isChatTyping}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                {isChatTyping ? (
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                   </svg>
                )}
                Chat with AI Biz Bot
              </button>
           </div>
         </div>
       ) : (
         <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
            {/* Chat Header inside the card */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12h1.5m1.875 5.775l-1.5 1.125c.621.264 1.283.483 1.927.66m11.25 0c.644-.177 1.306-.396 1.927-.66l-1.5-1.125m-18 0l1.5-1.125a23.388 23.388 0 01-1.927-.66m18 0c-.644.177-1.306.396-1.927.66l1.5 1.125m-18 0l1.5-1.125m1.875-5.775H6m12 0h-1.875m0 0l-1.125-1.5M6 12l1.125-1.5M21 12c0 4.97-4.03 9-9 9a9 9 0 01-9-9m9-9c1.657 0 3 4.03 3 9s-1.343 9-3 9m0-18c-1.657 0-3 4.03-3 9s1.343 9 3 9m-9-9c0-4.97 4.03-9 9-9" />
                     </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">AI Biz Bot</h4>
                    <p className="text-xs text-blue-600 font-medium">Integration Specialist</p>
                  </div>
               </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={chatScrollRef}>
               {chatMessages.map((msg, i) => (
                 <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[85%] rounded-2xl text-sm leading-relaxed overflow-hidden shadow-sm ${
                     msg.role === 'user' 
                       ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-600/10 px-5 py-3' 
                       : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                   }`}>
                     {msg.isUpsell && msg.upsellData ? (
                       <div className="w-full">
                          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white">
                            <div className="flex justify-between items-start">
                              <h3 className="font-bold text-lg pr-4">{msg.upsellData.title}</h3>
                              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-sm font-bold border border-white/20 whitespace-nowrap">
                                {msg.upsellData.price}
                              </span>
                            </div>
                            <p className="text-blue-100 text-xs mt-1">{msg.upsellData.description}</p>
                          </div>
                          
                          <div className="p-4 bg-white">
                            <ul className="space-y-2 mb-4">
                              {msg.upsellData.features.map((feature, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-slate-700 text-xs font-medium">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500 shrink-0">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                  </svg>
                                  {feature}
                                </li>
                              ))}
                            </ul>
                            <button 
                              onClick={() => handleInstallIntegration(msg.upsellData?.title)}
                              disabled={isInstalling === msg.upsellData.title}
                              className={`w-full py-2.5 rounded-lg font-bold text-sm transition-colors shadow-lg flex items-center justify-center gap-2 ${
                                isInstalling === msg.upsellData.title 
                                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                  : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10'
                              }`}
                            >
                              {isInstalling === msg.upsellData.title ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Installing...
                                </>
                              ) : (
                                <>
                                  {msg.upsellData.cta}
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                  </svg>
                                </>
                              )}
                            </button>
                          </div>
                          
                          {msg.text && (
                             <div className="px-5 pb-3 text-slate-600 bg-white border-t border-slate-100 pt-3">
                               {msg.text}
                             </div>
                          )}
                       </div>
                     ) : (
                       <div className="px-5 py-3">
                         {msg.text}
                       </div>
                     )}
                   </div>
                 </div>
               ))}
               {isChatTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-200">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                      </div>
                    </div>
                  </div>
               )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
               <div className="flex gap-2 relative">
                 <input
                   type="text"
                   value={chatInput}
                   onChange={(e) => setChatInput(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                   placeholder="Ask about integrations (e.g., 'How do I connect Shopify?')"
                   className="flex-1 px-4 py-3 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all pl-4 pr-12"
                 />
                 <button 
                   onClick={handleChatSend}
                   disabled={!chatInput.trim() || isChatTyping}
                   className="absolute right-2 top-1.5 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-400 transition-colors"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                   </svg>
                 </button>
               </div>
            </div>
         </div>
       )}
     </div>
  );

  const getHeaderTitle = () => {
      switch(mode) {
          case 'ai': return 'AI Business Mode';
          case 'workspace': return 'Google Workspace';
          default: return 'Admin Dashboard';
      }
  };

  const getHeaderSubtitle = () => {
      switch(mode) {
          case 'ai': return 'Focus on your business metrics and tasks';
          case 'workspace': return 'Manage your connected Google Apps';
          default: return 'Manage website content and settings';
      }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex justify-end animate-in slide-in-from-right duration-300">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className={`p-6 text-white shrink-0 transition-colors duration-300 ${mode === 'workspace' ? 'bg-[#0f9d58]' : 'bg-slate-900'}`}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                {mode === 'ai' && <span className="w-3 h-3 rounded-full bg-blue-400 animate-pulse"></span>}
                {getHeaderTitle()}
              </h2>
              <p className="text-white/70 text-sm mt-1">
                  {getHeaderSubtitle()}
              </p>
            </div>
            
            <div className="flex gap-3 items-center">
                 {/* Workspace Toggle */}
                 <button 
                    onClick={() => setMode(mode === 'workspace' ? 'admin' : 'workspace')}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all border-2 ${mode === 'workspace' ? 'bg-white border-white' : 'bg-transparent border-white/30 hover:border-white/50'}`}
                    title="Google Workspace Integration"
                 >
                     <span className={`absolute left-1 top-1 flex items-center justify-center h-5 w-5 rounded-full transition-transform duration-200 ${mode === 'workspace' ? 'translate-x-6 bg-[#0f9d58]' : 'bg-white text-slate-900'}`}>
                        {mode === 'workspace' ? (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                        ) : (
                            <span className="text-[10px] font-bold">G</span>
                        )}
                     </span>
                 </button>

                 {/* AI Mode Toggle */}
                 <button 
                    onClick={() => setMode(mode === 'ai' ? 'admin' : 'ai')}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all border-2 ${mode === 'ai' ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-white/30 hover:border-white/50'}`}
                    title="Toggle AI Business Mode"
                 >
                    <span className={`inline-block h-5 w-5 ml-1 transform rounded-full bg-white transition duration-200 ${mode === 'ai' ? 'translate-x-6' : ''}`} />
                 </button>

                <div className="h-8 w-px bg-white/20 mx-1"></div>

                <button 
                    onClick={onClose} 
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                </button>
            </div>
          </div>
          
          <div className="flex gap-4 border-b border-white/10 overflow-x-auto pb-1 scrollbar-hide">
             {mode === 'admin' && (
                 <>
                    <button 
                        onClick={() => setActiveDevTab('data')}
                        className={`pb-3 text-sm font-medium transition-colors whitespace-nowrap ${activeDevTab === 'data' ? 'text-white border-b-2 border-white' : 'text-white/50 hover:text-white'}`}
                    >
                    Business Data
                    </button>
                    <button 
                        onClick={() => setActiveDevTab('reviews')}
                        className={`pb-3 text-sm font-medium transition-colors whitespace-nowrap ${activeDevTab === 'reviews' ? 'text-white border-b-2 border-white' : 'text-white/50 hover:text-white'}`}
                    >
                    Reviews ({reviews.length})
                    </button>
                    <button 
                        onClick={() => setActiveDevTab('integrations')}
                        className={`pb-3 text-sm font-medium transition-colors whitespace-nowrap ${activeDevTab === 'integrations' ? 'text-white border-b-2 border-white' : 'text-white/50 hover:text-white'}`}
                    >
                    AI Biz Bot
                    </button>
                 </>
             )}
             
             {mode === 'ai' && (
                 <>
                    {(['chat', 'contacts', 'leads', 'tasks', 'reports'] as AiTab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveAiTab(tab)}
                            className={`pb-3 text-sm font-medium transition-colors capitalize whitespace-nowrap ${activeAiTab === tab ? 'text-white border-b-2 border-white' : 'text-white/50 hover:text-white'}`}
                        >
                            {tab}
                        </button>
                    ))}
                 </>
             )}

             {mode === 'workspace' && (
                 <div className="pb-3 text-sm font-medium text-white border-b-2 border-white">
                     Connected Apps
                 </div>
             )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 flex flex-col">
          
          {/* ----- DEV MODE CONTENT ----- */}
          {mode === 'admin' && activeDevTab === 'data' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                      <th className="p-4">Include</th>
                      <th className="p-4">Field Name</th>
                      <th className="p-4">Value Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fields.map((field) => {
                      const isIncluded = !ignoredFields.has(field);
                      return (
                        <tr key={field} className={`group hover:bg-slate-50 transition-colors ${!isIncluded ? 'opacity-50 grayscale' : ''}`}>
                          <td className="p-4 w-16">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={isIncluded} 
                                onChange={() => onToggleField(field)}
                                className="sr-only peer" 
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </td>
                          <td className="p-4 font-medium text-slate-700 font-mono text-sm">
                            {field}
                          </td>
                          <td className="p-4 text-slate-500 text-sm truncate max-w-xs">
                            {formatValue(data[field])}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {mode === 'admin' && activeDevTab === 'reviews' && (
            <div className="space-y-8 animate-in fade-in duration-300">
               {data.editorial_summary && (
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                   <h3 className="font-semibold text-slate-900 mb-2">Editorial Summary</h3>
                   <p className="text-slate-600 text-sm">{data.editorial_summary.overview || "No summary available."}</p>
                 </div>
               )}

               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-900">Minimum Rating Filter</h3>
                    <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{minRating} Stars</span>
                 </div>
                 <input 
                   type="range" 
                   min="1" 
                   max="5" 
                   step="0.5" 
                   value={minRating}
                   onChange={(e) => onSetMinRating(Number(e.target.value))}
                   className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                 />
                 <p className="text-xs text-slate-500 mt-2">Reviews below this rating will be hidden automatically, unless manually selected below.</p>
               </div>

               <div className="space-y-4">
                 <h3 className="font-semibold text-slate-900">Manage Individual Reviews</h3>
                 {reviews.map((review, idx) => {
                   const isHidden = hiddenReviews.has(idx);
                   const isBelowThreshold = review.rating < minRating;
                   const isVisibleOnSite = !isHidden && !isBelowThreshold;

                   return (
                     <div key={idx} className={`bg-white p-4 rounded-xl border ${isVisibleOnSite ? 'border-green-200 shadow-sm' : 'border-slate-200 opacity-70'} transition-all`}>
                       <div className="flex justify-between items-start gap-4">
                         <div className="flex-1">
                           <div className="flex items-center gap-2 mb-1">
                             <img src={review.profile_photo_url} alt={review.author_name} className="w-6 h-6 rounded-full" />
                             <span className="font-semibold text-sm">{review.author_name}</span>
                             <span className="text-xs text-slate-400">• {review.relative_time_description}</span>
                           </div>
                           <div className="flex text-amber-400 text-xs mb-2">
                             {[...Array(5)].map((_, i) => (
                               <svg key={i} className={`w-3 h-3 ${i < Math.round(review.rating) ? 'fill-current' : 'text-slate-200 fill-current'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                             ))}
                           </div>
                           <p className="text-sm text-slate-600 line-clamp-3">{review.text}</p>
                         </div>
                         
                         <div className="flex flex-col items-end gap-2">
                            <label className="relative inline-flex items-center cursor-pointer" title="Manually Show/Hide">
                              <input 
                                type="checkbox" 
                                checked={!isHidden} 
                                onChange={() => onToggleReview(idx)}
                                className="sr-only peer" 
                              />
                              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                         </div>
                       </div>
                     </div>
                   );
                 })}
               </div>
            </div>
          )}

          {mode === 'admin' && activeDevTab === 'integrations' && renderChatInterface()}

          {/* ----- AI BUSINESS MODE CONTENT ----- */}
          
          {mode === 'ai' && activeAiTab === 'chat' && renderChatInterface()}
          
          {mode === 'ai' && activeAiTab === 'contacts' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-500 font-medium">
                              <tr>
                                  <th className="p-4">Name</th>
                                  <th className="p-4">Email</th>
                                  <th className="p-4">Type</th>
                                  <th className="p-4">Status</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {MOCK_CONTACTS.map((c, i) => (
                                  <tr key={i} className="hover:bg-slate-50">
                                      <td className="p-4 font-medium text-slate-900">{c.name}</td>
                                      <td className="p-4 text-slate-500">{c.email}</td>
                                      <td className="p-4">
                                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.type === 'Customer' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                              {c.type}
                                          </span>
                                      </td>
                                      <td className="p-4 text-slate-500">{c.status}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {mode === 'ai' && activeAiTab === 'leads' && (
              <div className="grid gap-4 animate-in fade-in duration-300">
                   {MOCK_LEADS.map((lead, i) => (
                       <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                           <div>
                               <h4 className="font-bold text-slate-900">{lead.company}</h4>
                               <p className="text-sm text-slate-500">{lead.contact}</p>
                           </div>
                           <div className="text-right">
                               <p className="font-bold text-slate-900">{lead.value}</p>
                               <div className="flex items-center gap-2 justify-end mt-1">
                                    <span className="text-xs text-slate-400">{lead.stage}</span>
                                    <span className={`text-xs font-bold ${parseInt(lead.probability) > 50 ? 'text-green-600' : 'text-amber-600'}`}>{lead.probability}</span>
                               </div>
                           </div>
                       </div>
                   ))}
              </div>
          )}
          
          {mode === 'ai' && activeAiTab === 'tasks' && (
               <div className="space-y-3 animate-in fade-in duration-300">
                   {MOCK_TASKS.map((task, i) => (
                       <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                           <div className="mt-1">
                               <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                           </div>
                           <div className="flex-1">
                               <h4 className="font-medium text-slate-900">{task.title}</h4>
                               <div className="flex gap-3 mt-1 text-xs">
                                   <span className={`font-bold ${task.priority === 'High' ? 'text-red-500' : 'text-slate-500'}`}>{task.priority} Priority</span>
                                   <span className="text-slate-400">Due {task.due}</span>
                                   <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-500">{task.type}</span>
                               </div>
                           </div>
                       </div>
                   ))}
               </div>
          )}

          {mode === 'ai' && activeAiTab === 'reports' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                          <p className="text-blue-600 font-medium text-sm mb-1">Total Revenue</p>
                          <h3 className="text-3xl font-bold text-blue-900">$24,500</h3>
                          <span className="text-green-600 text-xs font-bold">↑ 12% from last month</span>
                      </div>
                      <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                          <p className="text-purple-600 font-medium text-sm mb-1">New Leads</p>
                          <h3 className="text-3xl font-bold text-purple-900">18</h3>
                          <span className="text-green-600 text-xs font-bold">↑ 4 new this week</span>
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-64 flex items-center justify-center text-slate-400">
                      Chart Visualization Placeholder
                  </div>
              </div>
          )}

          {/* ----- GOOGLE WORKSPACE MODE CONTENT ----- */}
          {mode === 'workspace' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                     <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Google Workspace Status</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="flex h-2.5 w-2.5 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                </span>
                                <span className="text-sm text-green-700 font-medium">Connected & Active</span>
                            </div>
                        </div>
                     </div>
                     <p className="text-slate-600 text-sm">
                         Your business account is fully integrated. Manage individual app permissions below to control data synchronization with your website.
                     </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {workspaceApps.map(app => (
                          <div key={app.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-lg ${app.bg} ${app.color} flex items-center justify-center font-bold text-lg`}>
                                          {app.icon}
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-slate-900 text-sm">{app.name}</h4>
                                          <p className="text-xs text-slate-500 mt-0.5">{app.description}</p>
                                      </div>
                                  </div>
                                  
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={app.status} 
                                      onChange={() => toggleWorkspaceApp(app.id)}
                                      className="sr-only peer" 
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0f9d58]"></div>
                                  </label>
                              </div>
                              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                  <span className={`text-xs font-semibold px-2 py-1 rounded ${app.status ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                      {app.status ? 'Syncing Active' : 'Disconnected'}
                                  </span>
                                  {app.status && (
                                      <button className="text-xs text-blue-600 font-medium hover:underline">Configure</button>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;