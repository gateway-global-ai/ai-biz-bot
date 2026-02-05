import React, { useState, useRef, useEffect, useCallback } from 'react';
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

type Tab = 'data' | 'reviews' | 'integrations';

const BACKEND_API_URL = (typeof window !== 'undefined' && (window as any).__BACKEND_API_URL__) || '';

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
  const [activeTab, setActiveTab] = useState<Tab>('data');

  // Chat State
  const [adminChatSession, setAdminChatSession] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // Google Workspace State
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  
  // Get business ID from place data
  const businessId = data?.place_id || data?.rawPlaceData?.place_id || 'default';
  
  // Check Google Workspace connection status
  useEffect(() => {
    const checkGoogleStatus = async () => {
      try {
        // Check if Google is configured on the server
        const statusRes = await fetch(`${BACKEND_API_URL}/api/google/status`);
        if (statusRes.ok) {
          const status = await statusRes.json();
          setGoogleConfigured(status.configured);
        }
        
        // Check if this business has Google connected
        const connRes = await fetch(`${BACKEND_API_URL}/api/google/connection/${businessId}`);
        if (connRes.ok) {
          const conn = await connRes.json();
          setGoogleConnected(conn.connected);
        }
      } catch (e) {
        console.log('Google status check failed (may not be configured):', e);
      }
    };
    
    checkGoogleStatus();
  }, [businessId]);
  
  // Execute Google Workspace tool call
  const executeGoogleTool = useCallback(async (toolName: string, args: any) => {
    try {
      const response = await fetch(`${BACKEND_API_URL}/api/google/execute-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, toolName, args })
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [businessId]);
  
  // Connect to Google Workspace
  const handleConnectGoogle = async () => {
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/google/auth-url?businessId=${businessId}`);
      if (res.ok) {
        const { authUrl } = await res.json();
        window.location.href = authUrl;
      }
    } catch (e) {
      console.error('Failed to get Google auth URL:', e);
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, activeTab]);

  const handleStartChat = async () => {
    setIsChatTyping(true);
    try {
      const session = await createSupportChatSession(googleConnected);
      setAdminChatSession(session);
      const welcomeMsg = googleConnected 
        ? "Hello! I'm the AI Biz Bot with Google Workspace connected. I can create calendar events, tasks, documents, and spreadsheets for you. What would you like to do?"
        : "Hello! I'm the AI Biz Bot. How can I help you integrate real-time data today?";
      setChatMessages([{ role: 'model', text: welcomeMsg }]);
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
      
      // Check for function calls
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          const args = call.args as any;
          let functionResult: any = { result: "Unknown function" };
          
          // Handle suggestIntegration (upsell)
          if (call.name === 'suggestIntegration') {
            if (args.integrationType === 'google_workspace') {
              setChatMessages(prev => [...prev, {
                role: 'model',
                text: "I can definitely help with that! Integrating Google Workspace is the best way to handle professional emails and appointments. Here are the details:",
                isUpsell: true,
                upsellData: {
                  title: "Google Workspace Integration",
                  price: "$99",
                  description: "Get professional email, calendar, and collaboration tools fully integrated into your site.",
                  features: ["Professional Email (@yourbusiness.com)", "Appointment Booking & Calendar", "Drive Storage & Docs", "24/7 Priority Support"],
                  cta: googleConfigured ? "Connect Google" : "Contact Sales"
                }
              }]);
              functionResult = { result: "Upsell card displayed to user." };
            }
          }
          // Handle Google Workspace tool calls
          else if (call.name === 'generateBusinessReport') {
            try {
              const reportResponse = await fetch(`${backendUrl}/api/reports/business-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  businessName: args.businessName || args.placeId,
                  businessTypes: args.businessType ? [args.businessType] : undefined,
                  radiusMeters: args.radiusMeters || 5000
                })
              });
              const reportData = await reportResponse.json();

              if (reportData.success) {
                setChatMessages(prev => [...prev, {
                  role: 'model',
                  text: reportData.formatted.chat,
                  isToolResult: true,
                  toolSuccess: true
                }]);
                functionResult = { success: true, report: reportData.report };
              } else {
                setChatMessages(prev => [...prev, {
                  role: 'model',
                  text: `Report generation failed: ${reportData.error}`,
                  isToolResult: true,
                  toolSuccess: false
                }]);
                functionResult = { success: false, error: reportData.error };
              }
            } catch (reportErr: any) {
              setChatMessages(prev => [...prev, {
                role: 'model',
                text: `Could not generate report: ${reportErr.message}`,
                isToolResult: true,
                toolSuccess: false
              }]);
              functionResult = { success: false, error: reportErr.message };
            }
          }
          else if (['createCalendarEvent', 'listCalendarEvents', 'createTask', 'listTasks', 'createDocument', 'createSpreadsheet'].includes(call.name)) {
            const toolResult = await executeGoogleTool(call.name, args);
            
            if (toolResult.success) {
              // Format success message based on tool
              let successMsg = "";
              switch (call.name) {
                case 'createCalendarEvent':
                  successMsg = `Created calendar event: "${toolResult.data.summary}"\nLink: ${toolResult.data.htmlLink}`;
                  break;
                case 'listCalendarEvents':
                  const events = toolResult.data.events || [];
                  successMsg = events.length > 0 
                    ? `Upcoming events:\n${events.map((e: any) => `• ${e.summary} - ${new Date(e.start).toLocaleDateString()}`).join('\n')}`
                    : "No upcoming events found.";
                  break;
                case 'createTask':
                  successMsg = `Created task: "${toolResult.data.title}"`;
                  break;
                case 'listTasks':
                  const tasks = toolResult.data.tasks || [];
                  successMsg = tasks.length > 0
                    ? `Your tasks:\n${tasks.map((t: any) => `• ${t.title} (${t.status})`).join('\n')}`
                    : "No tasks found.";
                  break;
                case 'createDocument':
                  successMsg = `Created document: "${toolResult.data.title}"\nOpen it here: ${toolResult.data.url}`;
                  break;
                case 'createSpreadsheet':
                  successMsg = `Created spreadsheet: "${toolResult.data.title}"\nOpen it here: ${toolResult.data.url}`;
                  break;
              }
              
              setChatMessages(prev => [...prev, { 
                role: 'model', 
                text: successMsg,
                isToolResult: true,
                toolSuccess: true
              }]);
              functionResult = { success: true, ...toolResult.data };
            } else {
              // Handle error or auth required
              if (toolResult.requiresAuth) {
                setChatMessages(prev => [...prev, {
                  role: 'model',
                  text: "Google Workspace is not connected yet. Would you like to connect it now?",
                  isUpsell: true,
                  upsellData: {
                    title: "Connect Google Workspace",
                    price: "Free",
                    description: "Connect your Google account to enable calendar, tasks, docs, and sheets integration.",
                    features: ["Google Calendar", "Google Tasks", "Google Docs", "Google Sheets"],
                    cta: "Connect Now"
                  }
                }]);
              } else {
                setChatMessages(prev => [...prev, { 
                  role: 'model', 
                  text: `Error: ${toolResult.error}`,
                  isToolResult: true,
                  toolSuccess: false
                }]);
              }
              functionResult = { error: toolResult.error };
            }
          }
          
          // Send function response back to Gemini
          await adminChatSession.sendMessage({
            message: [{
              functionResponse: {
                name: call.name,
                response: functionResult,
                id: call.id
              }
            }]
          });
        }
        
        // Get follow-up text from model after function calls
        const followUp = await adminChatSession.sendMessage({ message: "Please provide a brief summary of what was done." });
        if (followUp.text) {
          setChatMessages(prev => [...prev, { role: 'model', text: followUp.text! }]);
        }
      } else {
         // Standard text response
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

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex justify-end animate-in slide-in-from-right duration-300">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white shrink-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold">Admin Dashboard</h2>
              <p className="text-slate-400 text-sm">Manage website content and reviews</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-slate-800 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex gap-4 border-b border-slate-700">
            <button 
              onClick={() => setActiveTab('data')}
              className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'data' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white'}`}
            >
              Business Data
            </button>
            <button 
               onClick={() => setActiveTab('reviews')}
               className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'reviews' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white'}`}
            >
              Reviews ({reviews.length})
            </button>
            <button 
               onClick={() => setActiveTab('integrations')}
               className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'integrations' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white'}`}
            >
              AI Biz Bot
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 flex flex-col">
          
          {activeTab === 'data' && (
            <div className="space-y-6">
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
              <div className="p-4 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 text-sm flex gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p>Unchecking items will hide the corresponding sections on the main website.</p>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-8">
               
               {/* Editorial Summary */}
               {data.editorial_summary && (
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                   <h3 className="font-semibold text-slate-900 mb-2">Editorial Summary</h3>
                   <p className="text-slate-600 text-sm">{data.editorial_summary.overview || "No summary available."}</p>
                 </div>
               )}

               {/* Filters */}
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

               {/* Review List */}
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
                            {!isVisibleOnSite && (
                                <span className="text-[10px] font-bold uppercase tracking-wide text-red-500 bg-red-50 px-2 py-0.5 rounded">Hidden</span>
                            )}
                            {isVisibleOnSite && (
                                <span className="text-[10px] font-bold uppercase tracking-wide text-green-600 bg-green-50 px-2 py-0.5 rounded">Visible</span>
                            )}
                         </div>
                       </div>
                     </div>
                   );
                 })}
               </div>
            </div>
          )}

          {activeTab === 'integrations' && (
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
                     <div className="flex flex-wrap gap-2 justify-center pt-2">
                        {['Square', 'Shopify', 'Toast', 'Salesforce', 'HubSpot'].map(i => (
                          <span key={i} className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded-md border border-slate-200">{i}</span>
                        ))}
                     </div>
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
                                  {/* Upsell Card Header */}
                                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white">
                                    <div className="flex justify-between items-start">
                                      <h3 className="font-bold text-lg pr-4">{msg.upsellData.title}</h3>
                                      <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-sm font-bold border border-white/20 whitespace-nowrap">
                                        {msg.upsellData.price}
                                      </span>
                                    </div>
                                    <p className="text-blue-100 text-xs mt-1">{msg.upsellData.description}</p>
                                  </div>
                                  
                                  {/* Upsell Card Body */}
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
                                    <button className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2">
                                      {msg.upsellData.cta}
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                      </svg>
                                    </button>
                                  </div>
                                  
                                  {/* Text content below card if any */}
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