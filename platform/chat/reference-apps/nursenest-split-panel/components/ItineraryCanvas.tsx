

import React, { useState, useEffect, useRef } from 'react';
import { Save, Trash2, Calendar, CheckSquare, Edit3, Ticket, Plus, BedDouble, Utensils, Plane, Activity, MoreHorizontal, Briefcase, MapPin, Star, X, Share2, FileText, Mail, Loader2, Link, Car, Footprints, Bus, Bike, DollarSign, PieChart, Home, Zap, ShoppingCart, Coffee, ClipboardList, Check, ShieldCheck } from 'lucide-react';
import { Booking, TripFocus, GoogleAuthToken, TransportMode, TripBudget, Expense, ExpenseCategory, Task, DayItinerary } from '../types';
import { createGoogleDoc, formatItineraryForExport, sendGmail } from '../services/googleWorkspace';
import { ItineraryExportService } from '../../../../src/services/ItineraryExportService';

interface ItineraryCanvasProps {
  content: string;
  bookings: Booking[];
  days: DayItinerary[];
  tripFocus: TripFocus | null;
  tripBudget: TripBudget;
  tripTasks: Task[];
  onChange: (newContent: string) => void;
  onManualBooking: () => void;
  onSetTripFocus: (focus: TripFocus | null) => void;
  onUpdateBudget: (budget: TripBudget) => void;
  onUpdateTasks: (tasks: Task[]) => void;
  googleToken: GoogleAuthToken | null;
  onLoginRequest: () => void;
}

export const ItineraryCanvas: React.FC<ItineraryCanvasProps> = ({ 
    content, 
    bookings, 
    days,
    tripFocus, 
    tripBudget, 
    tripTasks,
    onChange, 
    onManualBooking,
    onSetTripFocus,
    onUpdateBudget,
    onUpdateTasks,
    googleToken,
    onLoginRequest
}) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'bookings' | 'budget' | 'tasks'>('notes');
  const [localContent, setLocalContent] = useState(content);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Trip Focus Editing State
  const [isEditingFocus, setIsEditingFocus] = useState(false);
  const [focusName, setFocusName] = useState('');
  const [focusLocation, setFocusLocation] = useState('');
  const [focusUri, setFocusUri] = useState('');
  const [focusType, setFocusType] = useState<'event' | 'work' | 'leisure'>('work');
  const [focusTransport, setFocusTransport] = useState<TransportMode>('driving');

  // Budget Editing State
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCat, setNewExpenseCat] = useState<ExpenseCategory>('Groceries');

  // Task Editing State
  const [newTaskText, setNewTaskText] = useState('');

  // Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');

  // Ref for the Autocomplete Input
  const nameInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  // Sync prop changes to local state
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  useEffect(() => {
    if (isEditingFocus && nameInputRef.current && (window as any).google) {
        if (!autocompleteRef.current) {
            autocompleteRef.current = new (window as any).google.maps.places.Autocomplete(nameInputRef.current, {
                types: ['establishment', 'geocode'],
                fields: ['place_id', 'name', 'formatted_address', 'url', 'types'],
            });

            autocompleteRef.current.addListener('place_changed', () => {
                const place = autocompleteRef.current?.getPlace();
                if (place) {
                    if (place.name) setFocusName(place.name);
                    if (place.formatted_address) setFocusLocation(place.formatted_address);
                    if (place.url) setFocusUri(place.url);
                    if (place.types) {
                        if (place.types.includes('point_of_interest') || place.types.includes('stadium') || place.types.includes('tourist_attraction')) {
                            setFocusType('leisure');
                        }
                        if (place.types.includes('event_venue') || place.types.includes('convention_center')) {
                            setFocusType('event');
                        }
                        if (place.types.includes('office') || place.types.includes('finance') || place.types.includes('health') || place.types.includes('hospital')) {
                            setFocusType('work');
                        }
                    }
                }
            });
        }
    }
  }, [isEditingFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setLocalContent(newVal);
    onChange(newVal);
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear your plan notes?")) {
        setLocalContent('');
        onChange('');
    }
  };

  const saveFocus = () => {
      if (!focusName.trim()) return;
      onSetTripFocus({
          id: Date.now().toString(),
          name: focusName,
          location: focusLocation,
          type: focusType,
          uri: focusUri,
          transportMode: focusTransport
      });
      setIsEditingFocus(false);
      setFocusName('');
      setFocusLocation('');
      setFocusUri('');
      setFocusTransport('driving');
      autocompleteRef.current = null;
  };

  const updateTransportMode = (mode: TransportMode) => {
      if (tripFocus) {
          onSetTripFocus({
              ...tripFocus,
              transportMode: mode
          });
      }
  };

  const removeFocus = () => {
      onSetTripFocus(null);
  };

  const insertTemplate = (templateType: 'day' | 'checklist') => {
      let appendText = '';
      if (templateType === 'day') {
          appendText = `\n\n### 📅 Day 1: [Date]\n- 09:00 AM: Start at...\n- 12:00 PM: Lunch at...\n- 03:00 PM: Visit...\n`;
      } else {
          appendText = `\n\n### ✅ Packing List\n- [ ] Passport\n- [ ] Tickets\n- [ ] Chargers\n`;
      }
      const newVal = localContent + appendText;
      setLocalContent(newVal);
      onChange(newVal);
  };

  const getIconForType = (type: string) => {
      switch(type) {
          case 'hotel': return <BedDouble size={16} />;
          case 'restaurant': return <Utensils size={16} />;
          case 'flight': return <Plane size={16} />;
          default: return <Activity size={16} />;
      }
  };

  const getTransportIcon = (mode: TransportMode) => {
      switch(mode) {
          case 'driving': return <Car size={14} />;
          case 'rideshare': return <Car size={14} className="text-indigo-600" />;
          case 'walking': return <Footprints size={14} />;
          case 'transit': return <Bus size={14} />;
          case 'bicycling': return <Bike size={14} />;
      }
  };

  // Google Integration Actions
  const handleSaveToDocs = async () => {
      if (!googleToken) {
          onLoginRequest();
          return;
      }
      setIsProcessing(true);
      setIsShareMenuOpen(false);
      
      const formattedContent = formatItineraryForExport(localContent, bookings, tripFocus);
      const docUrl = await createGoogleDoc(
          googleToken.access_token, 
          `Travel Itinerary - ${tripFocus?.name || 'My Trip'}`, 
          formattedContent
      );
      
      setIsProcessing(false);
      if (docUrl) {
          if (confirm("Itinerary saved to Google Docs! Open it now?")) {
              window.open(docUrl, '_blank');
          }
      } else {
          alert("Failed to create document. Please try again.");
      }
  };

  const handleExportWhitelabelProposal = async () => {
      if (!googleToken) {
          onLoginRequest();
          return;
      }
      setIsProcessing(true);
      setIsShareMenuOpen(false);
      
      try {
          const agentBranding = { 
              name: "Gateway Global Partner", 
              contact: "partner@gatewayglobal.ai" 
          };

          const result = await ItineraryExportService.exportToGoogleDocs(
              googleToken.access_token,
              { days, focus: tripFocus },
              agentBranding
          );
          
          if (result && (result as any).success) {
              alert("B2B Whitelabel Proposal generated successfully!");
          }
      } catch (error) {
          console.error("Export Error:", error);
          alert("Failed to generate proposal. Please verify your connection.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleOpenEmailModal = () => {
      if (!googleToken) {
          onLoginRequest();
          return;
      }
      setIsShareMenuOpen(false);
      setIsEmailModalOpen(true);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!emailTo || !googleToken) return;

      setIsProcessing(true);
      const formattedContent = formatItineraryForExport(localContent, bookings, tripFocus);
      const success = await sendGmail(
          googleToken.access_token,
          emailTo,
          `NurseNest Itinerary: ${tripFocus?.name || 'My Trip'}`,
          formattedContent
      );

      setIsProcessing(false);
      if (success) {
          alert("Email sent successfully!");
          setIsEmailModalOpen(false);
          setEmailTo('');
      } else {
          alert("Failed to send email. Please try again.");
      }
  };

  // Budget Actions
  const handleAddExpense = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newExpenseDesc || !newExpenseAmount) return;

      const newExpense: Expense = {
          id: Date.now().toString(),
          category: newExpenseCat,
          amount: parseFloat(newExpenseAmount),
          description: newExpenseDesc,
          date: new Date().toISOString()
      };

      onUpdateBudget({
          ...tripBudget,
          expenses: [newExpense, ...tripBudget.expenses]
      });

      setNewExpenseDesc('');
      setNewExpenseAmount('');
  };

  const handleDeleteExpense = (id: string) => {
      onUpdateBudget({
          ...tripBudget,
          expenses: tripBudget.expenses.filter(e => e.id !== id)
      });
  };

  // Task Actions
  const handleAddTask = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTaskText.trim()) return;

      const newTask: Task = {
          id: Date.now().toString(),
          text: newTaskText,
          completed: false,
          createdAt: Date.now()
      };

      onUpdateTasks([newTask, ...tripTasks]);
      setNewTaskText('');
  };

  const handleToggleTask = (id: string) => {
      onUpdateTasks(tripTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteTask = (id: string) => {
      onUpdateTasks(tripTasks.filter(t => t.id !== id));
  };

  const totalSpent = tripBudget.expenses.reduce((sum, item) => sum + item.amount, 0);
  const remaining = tripBudget.limit - totalSpent;
  const percentUsed = Math.min(100, (totalSpent / tripBudget.limit) * 100);

  const completedTasks = tripTasks.filter(t => t.completed).length;
  const totalTasks = tripTasks.length;

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200 shadow-xl">
      {/* Top Bar: Tabs & Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
         <div className="flex bg-slate-200/50 p-1 rounded-lg overflow-x-auto">
             <button
                onClick={() => setActiveTab('notes')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === 'notes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
             >
                Plan
             </button>
             <button
                onClick={() => setActiveTab('bookings')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === 'bookings' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
             >
                Bookings
             </button>
             <button
                onClick={() => setActiveTab('budget')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'budget' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
             >
                <PieChart size={14} />
                Budget
             </button>
             <button
                onClick={() => setActiveTab('tasks')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'tasks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
             >
                <ClipboardList size={14} />
                Tasks
             </button>
         </div>

         <div className="flex items-center gap-2">
             <div className="relative">
                 <button 
                    onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                    className="p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors"
                    title="Export / Share"
                 >
                     <Share2 size={18} />
                 </button>
                 
                 {isShareMenuOpen && (
                     <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                         <button 
                            onClick={handleExportWhitelabelProposal}
                            disabled={isProcessing}
                            className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-indigo-50 flex items-center gap-3 border-b border-slate-50"
                         >
                             {isProcessing ? (
                                 <Loader2 className="animate-spin" size={16} /> 
                             ) : (
                                 <ShieldCheck size={16} className="text-emerald-500" />
                             )}
                             <div>
                                 <p className="font-bold">Client Proposal</p>
                                 <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Whitelabel (No Net Rates)</p>
                             </div>
                         </button>

                         <button 
                            onClick={handleSaveToDocs}
                            disabled={isProcessing}
                            className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
                         >
                             <FileText size={16} className="text-blue-500" />
                             Save Full Working Doc
                         </button>
                         <button 
                            onClick={handleOpenEmailModal}
                            disabled={isProcessing}
                            className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                         >
                             <Mail size={16} className="text-red-500" />
                             Email Itinerary
                         </button>
                     </div>
                 )}
                 {isShareMenuOpen && (
                     <div className="fixed inset-0 z-40" onClick={() => setIsShareMenuOpen(false)} />
                 )}
             </div>

             <button 
                onClick={handleClear}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title="Clear Notes"
             >
                 <Trash2 size={18} />
             </button>
         </div>
      </div>

      {/* Trip Anchor Section (Always visible at top if set) */}
      <div className="px-6 py-4 border-b border-slate-100 bg-white">
          {!isEditingFocus ? (
              tripFocus ? (
                  <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 rounded-xl p-4 border border-indigo-100 relative group">
                      <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3">
                              <div className="p-2 bg-indigo-200/50 text-indigo-700 rounded-lg">
                                  {tripFocus.type === 'work' ? <Briefcase size={20} /> : tripFocus.type === 'leisure' ? <MapPin size={20} /> : <Ticket size={20} />}
                              </div>
                              <div>
                                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-0.5">Trip Anchor</p>
                                  <a href={tripFocus.uri} target="_blank" rel="noreferrer" className="text-lg font-bold text-slate-800 hover:underline flex items-center gap-1">
                                      {tripFocus.name}
                                  </a>
                                  {tripFocus.location && (
                                      <p className="text-sm text-slate-500">{tripFocus.location}</p>
                                  )}
                                  
                                  {/* Transport Mode Toggle */}
                                  <div className="flex items-center gap-2 mt-3">
                                      <span className="text-xs text-slate-400">Local Travel Preference:</span>
                                      <div className="flex bg-white/50 rounded-lg p-0.5 border border-indigo-100">
                                          {(['driving', 'rideshare', 'walking', 'transit', 'bicycling'] as TransportMode[]).map(mode => (
                                              <button
                                                  key={mode}
                                                  onClick={() => updateTransportMode(mode)}
                                                  className={`p-1.5 rounded-md transition-all ${
                                                      tripFocus.transportMode === mode 
                                                      ? 'bg-indigo-600 text-white shadow-sm' 
                                                      : 'text-slate-400 hover:text-slate-600 hover:bg-white'
                                                  }`}
                                                  title={mode === 'rideshare' ? "Uber/Lyft" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                                              >
                                                  {getTransportIcon(mode)}
                                              </button>
                                          ))}
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setIsEditingFocus(true)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded">
                                  <Edit3 size={14} />
                              </button>
                              <button onClick={removeFocus} className="p-1.5 text-slate-400 hover:text-red-500 rounded">
                                  <X size={14} />
                              </button>
                          </div>
                      </div>
                  </div>
              ) : (
                  <button 
                    onClick={() => setIsEditingFocus(true)}
                    className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                  >
                      <MapPin size={18} />
                      Set Trip Anchor (Hospital/Location)
                  </button>
              )
          ) : (
              <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm animate-in fade-in zoom-in duration-200">
                  <h3 className="text-sm font-bold text-slate-700 mb-3">Set Trip Anchor</h3>
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs text-slate-500 font-medium ml-1">Location Name</label>
                          <input 
                            ref={nameInputRef}
                            type="text" 
                            value={focusName}
                            onChange={(e) => setFocusName(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. Baton Rouge General Hospital"
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="text-xs text-slate-500 font-medium ml-1">Type</label>
                              <select 
                                value={focusType}
                                onChange={(e) => setFocusType(e.target.value as any)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                              >
                                  <option value="work">Work/Hospital</option>
                                  <option value="event">Event</option>
                                  <option value="leisure">Leisure</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-xs text-slate-500 font-medium ml-1">Local Travel Preference</label>
                              <select 
                                value={focusTransport}
                                onChange={(e) => setFocusTransport(e.target.value as any)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                              >
                                  <option value="driving">Personal Car (Driving)</option>
                                  <option value="rideshare">Uber/Lyft</option>
                                  <option value="walking">Walking</option>
                                  <option value="transit">Public Transit</option>
                                  <option value="bicycling">Bicycling</option>
                              </select>
                          </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                          <button onClick={() => setIsEditingFocus(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                          <button onClick={saveFocus} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Anchor</button>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50">
          
          {/* --- NOTES TAB --- */}
          {activeTab === 'notes' && (
              <div className="h-full flex flex-col p-6">
                 <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    <button onClick={() => insertTemplate('day')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors whitespace-nowrap">
                        <Calendar size={14} /> Add Day
                    </button>
                    <button onClick={() => insertTemplate('checklist')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors whitespace-nowrap">
                        <CheckSquare size={14} /> Add Checklist
                    </button>
                 </div>
                 
                 <div className="flex-1 relative group">
                    <textarea
                        value={localContent}
                        onChange={handleChange}
                        className="w-full h-full bg-transparent resize-none focus:outline-none text-slate-700 leading-relaxed placeholder-slate-400 font-mono text-sm"
                        placeholder="# My Travel Plan&#10;&#10;Start typing here or use the chat to add notes..."
                    />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Edit3 size={16} className="text-slate-300" />
                    </div>
                 </div>
              </div>
          )}

          {/* --- BOOKINGS TAB --- */}
          {activeTab === 'bookings' && (
              <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-slate-700">Reservations ({bookings.length})</h3>
                      <button onClick={onManualBooking} className="text-xs flex items-center gap-1 text-indigo-600 hover:underline">
                          <Plus size={14} /> Manual Add
                      </button>
                  </div>

                  {bookings.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                          <Ticket size={48} className="mx-auto mb-3 opacity-20" />
                          <p>No bookings yet.</p>
                          <p className="text-xs mt-1">Chat with the AI to find places to book.</p>
                      </div>
                  ) : (
                      bookings.map(b => (
                          <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                              <div className="flex justify-between items-start">
                                  <div className="flex gap-3">
                                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg h-fit">
                                          {getIconForType(b.type)}
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-slate-800">{b.title}</h4>
                                          <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                              <span className="flex items-center gap-1"><Calendar size={12}/> {b.date}</span>
                                              {b.time && <span className="flex items-center gap-1"><Activity size={12}/> {b.time}</span>}
                                              {b.guests && <span className="flex items-center gap-1">Guest: {b.guests}</span>}
                                          </div>
                                          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-100">
                                              <span className="font-mono">{b.confirmationCode}</span>
                                          </div>
                                      </div>
                                  </div>
                                  <button className="text-slate-300 hover:text-indigo-600">
                                      <MoreHorizontal size={16} />
                                  </button>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          )}

          {/* --- BUDGET TAB --- */}
          {activeTab === 'budget' && (
              <div className="p-6 space-y-6">
                  {/* Summary Card */}
                  <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
                      <div className="flex justify-between items-start mb-6">
                          <div>
                              <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Remaining Budget</p>
                              <h2 className="text-3xl font-bold mt-1">${remaining.toLocaleString()}</h2>
                          </div>
                          <div className="bg-white/10 p-2 rounded-lg">
                              <DollarSign size={20} className="text-indigo-300" />
                          </div>
                      </div>
                      
                      <div className="space-y-2">
                          <div className="flex justify-between text-xs text-indigo-200">
                              <span>${totalSpent.toLocaleString()} spent</span>
                              <span>Limit: ${tripBudget.limit.toLocaleString()}</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                    percentUsed > 90 ? 'bg-red-500' : percentUsed > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                                }`} 
                                style={{ width: `${percentUsed}%` }}
                              />
                          </div>
                      </div>
                  </div>

                  {/* Add Expense Form */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <h4 className="text-sm font-bold text-slate-700 mb-3">Add Expense</h4>
                      <form onSubmit={handleAddExpense} className="flex gap-2 items-end">
                          <div className="flex-1 space-y-1">
                              <input 
                                type="text" 
                                placeholder="Description"
                                value={newExpenseDesc}
                                onChange={e => setNewExpenseDesc(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                          </div>
                          <div className="w-24 space-y-1">
                              <input 
                                type="number" 
                                placeholder="0.00"
                                value={newExpenseAmount}
                                onChange={e => setNewExpenseAmount(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                          </div>
                          <div className="w-32 space-y-1">
                               <select
                                  value={newExpenseCat}
                                  onChange={e => setNewExpenseCat(e.target.value as ExpenseCategory)}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                               >
                                   <option value="Housing">Housing</option>
                                   <option value="Groceries">Groceries</option>
                                   <option value="Utilities">Utilities</option>
                                   <option value="Transport">Transport</option>
                                   <option value="Entertainment">Fun</option>
                                   <option value="Other">Other</option>
                               </select>
                          </div>
                          <button type="submit" className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                              <Plus size={18} />
                          </button>
                      </form>
                  </div>

                  {/* Expense List */}
                  <div className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-700">Transactions</h4>
                      {tripBudget.expenses.length === 0 ? (
                          <p className="text-center text-xs text-slate-400 py-4">No expenses recorded yet.</p>
                      ) : (
                          tripBudget.expenses.map(exp => (
                              <div key={exp.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-300 transition-colors group">
                                  <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded-full ${
                                          exp.category === 'Housing' ? 'bg-blue-100 text-blue-600' :
                                          exp.category === 'Groceries' ? 'bg-green-100 text-green-600' :
                                          exp.category === 'Utilities' ? 'bg-amber-100 text-amber-600' :
                                          'bg-slate-100 text-slate-600'
                                      }`}>
                                          {exp.category === 'Housing' ? <Home size={14} /> :
                                           exp.category === 'Groceries' ? <ShoppingCart size={14} /> :
                                           exp.category === 'Utilities' ? <Zap size={14} /> :
                                           exp.category === 'Transport' ? <Car size={14} /> :
                                           <DollarSign size={14} />}
                                      </div>
                                      <div>
                                          <p className="text-sm font-medium text-slate-800">{exp.description}</p>
                                          <p className="text-xs text-slate-500">{new Date(exp.date).toLocaleDateString()}</p>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                      <span className="font-bold text-slate-700">-${exp.amount.toFixed(2)}</span>
                                      <button onClick={() => handleDeleteExpense(exp.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Trash2 size={14} />
                                      </button>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          )}

          {/* --- TASKS TAB --- */}
          {activeTab === 'tasks' && (
              <div className="p-6 space-y-6">
                  {/* Progress Header */}
                  <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-700 text-lg">Your Tasks</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                          <div className="relative w-8 h-8 flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90">
                                  <circle cx="16" cy="16" r="14" stroke="#e2e8f0" strokeWidth="4" fill="none"/>
                                  <circle 
                                    cx="16" cy="16" r="14" 
                                    stroke="#10b981" strokeWidth="4" fill="none"
                                    strokeDasharray={88}
                                    strokeDashoffset={totalTasks > 0 ? 88 - (88 * completedTasks / totalTasks) : 88}
                                    className="transition-all duration-500"
                                  />
                              </svg>
                          </div>
                          <span className="font-medium text-slate-700">{completedTasks}/{totalTasks} Done</span>
                      </div>
                  </div>

                  {/* Add Task Input */}
                  <form onSubmit={handleAddTask} className="relative">
                      <Plus className="absolute left-3 top-3 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        placeholder="Add a new task (e.g. Upload nursing license)"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                      />
                  </form>

                  {/* Task List */}
                  <div className="space-y-2">
                      {totalTasks === 0 ? (
                          <div className="text-center py-8 text-slate-400">
                              <ClipboardList size={48} className="mx-auto mb-3 opacity-20" />
                              <p>No tasks yet.</p>
                          </div>
                      ) : (
                          tripTasks
                            .sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1))
                            .map(task => (
                              <div 
                                key={task.id} 
                                className={`flex items-center gap-3 p-3 bg-white border rounded-xl transition-all group ${
                                    task.completed 
                                    ? 'border-slate-100 bg-slate-50/50' 
                                    : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                                }`}
                              >
                                  <button 
                                    onClick={() => handleToggleTask(task.id)}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                        task.completed 
                                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                                        : 'border-slate-300 hover:border-emerald-500 text-transparent'
                                    }`}
                                  >
                                      <Check size={14} />
                                  </button>
                                  
                                  <span className={`flex-1 text-sm ${
                                      task.completed ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'
                                  }`}>
                                      {task.text}
                                  </span>
                                  
                                  <button 
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          )}

      </div>

      {/* Email Modal */}
      {isEmailModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in duration-200">
                  <h3 className="font-bold text-lg text-slate-800 mb-4">Email Itinerary</h3>
                  <form onSubmit={handleSendEmail} className="space-y-4">
                      <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Recipient Email</label>
                          <input 
                            type="email" 
                            required
                            value={emailTo}
                            onChange={e => setEmailTo(e.target.value)}
                            placeholder="nurse@example.com"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                      </div>
                      <div className="flex justify-end gap-2">
                          <button 
                            type="button" 
                            onClick={() => setIsEmailModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
                          >
                              Cancel
                          </button>
                          <button 
                            type="submit"
                            disabled={isProcessing}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                          >
                              {isProcessing && <Loader2 className="animate-spin" size={14} />}
                              Send
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};