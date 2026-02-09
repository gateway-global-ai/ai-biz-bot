
import React, { useState } from 'react';
import { TabType, Session, CESEvent } from './types';
import { ItineraryView } from './components/ItineraryView';
import { MapView } from './components/MapView';
import { TicketView } from './components/TicketView';
import { AIChat } from './components/AIChat';
import { ContactsView } from './components/ContactsView';
import { AdminDashboard } from './components/AdminDashboard';
import { GlassCard } from './components/GlassCard';
import { FEATURED_EXHIBITORS, KEYNOTE_SESSIONS, CES_EVENTS } from './constants';
import { 
  Calendar, 
  Map, 
  Ticket, 
  MessageSquare, 
  Users, 
  ShieldCheck, 
  LayoutGrid, 
  Mic2, 
  Lock, 
  Zap, 
  X, 
  Presentation, 
  Plus, 
  Search,
  CheckCircle,
  Building2,
  Clock,
  MapPin,
  ChevronRight,
  Sparkles,
  PartyPopper,
  Info,
  DollarSign,
  Ticket as TicketIcon
} from 'lucide-react';

const EventsView: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [activeDate, setActiveDate] = useState<'Mon, Jan 5' | 'Tue, Jan 6'>('Tue, Jan 6');
  const [addedEvents, setAddedEvents] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const filteredEvents = CES_EVENTS.filter(e => e.date === activeDate);

  const toggleEvent = (id: string) => {
    const next = new Set(addedEvents);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setAddedEvents(next);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={onClose} />
      
      <div className="relative w-full h-full sm:h-[90vh] sm:max-w-6xl glass-panel rounded-none sm:rounded-[4rem] overflow-hidden shadow-2xl sm:border-white/10 border-none animate-in slide-in-from-bottom-0 sm:slide-in-from-bottom-12 duration-500 flex flex-col">
        {/* Header */}
        <div className="pt-8 sm:pt-12 pb-6 sm:pb-8 px-6 sm:px-10 border-b border-white/5 bg-white/5 flex flex-col gap-5 sm:gap-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-pink-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] mb-1 sm:mb-2">CES 2026 Social Hub</p>
              <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight flex items-center gap-2 sm:gap-3">
                Networking & Parties <PartyPopper className="text-pink-500 w-6 h-6 sm:w-8 sm:h-8" />
              </h2>
            </div>
            <button onClick={onClose} className="p-3 sm:p-4 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10 group active:scale-90">
              <X className="w-5 h-5 sm:w-7 sm:h-7 group-hover:rotate-90 transition-transform" />
            </button>
          </div>

          <div className="flex gap-1.5 p-1 glass-panel rounded-xl sm:rounded-2xl w-full sm:w-fit border-white/5 shrink-0">
            <button 
              onClick={() => setActiveDate('Mon, Jan 5')}
              className={`flex-1 sm:flex-none px-6 sm:px-10 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                activeDate === 'Mon, Jan 5' ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20' : 'text-gray-500 hover:text-white'
              }`}
            >
              Monday
            </button>
            <button 
              onClick={() => setActiveDate('Tue, Jan 6')}
              className={`flex-1 sm:flex-none px-6 sm:px-10 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                activeDate === 'Tue, Jan 6' ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20' : 'text-gray-500 hover:text-white'
              }`}
            >
              Tuesday
            </button>
          </div>
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar space-y-4 sm:space-y-6 pb-32 sm:pb-20">
          {filteredEvents.map((ev) => (
            <GlassCard key={ev.id} className="group !p-6 sm:!p-8 border-white/5 hover:border-pink-500/30 transition-all duration-500">
              <div className="flex flex-col md:flex-row justify-between gap-6 sm:gap-8">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                      ev.access === 'Free' ? 'bg-green-600/10 border-green-500/30 text-green-400' :
                      ev.access === 'Invitation Only' ? 'bg-amber-600/10 border-amber-500/30 text-amber-400' :
                      'bg-blue-600/10 border-blue-500/30 text-blue-400'
                    }`}>
                      {ev.access}
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock size={12} className="text-pink-500" />
                      {ev.time}
                    </span>
                  </div>
                  
                  <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-pink-400 transition-colors">
                    {ev.title}
                  </h3>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-400 font-medium">
                      <MapPin size={14} className="text-pink-500 mt-0.5 shrink-0" />
                      {ev.location}
                    </div>
                    {ev.description && (
                      <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-2xl font-medium">
                        {ev.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="md:w-56 flex flex-col justify-center gap-4">
                   <button 
                    onClick={() => toggleEvent(ev.id)}
                    className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 shadow-xl ${
                      addedEvents.has(ev.id) 
                      ? 'bg-green-600/20 border border-green-500/50 text-green-400' 
                      : 'bg-pink-600 text-white shadow-pink-600/20 active:scale-95'
                    }`}
                   >
                     {addedEvents.has(ev.id) ? (
                       <><CheckCircle size={16} /> Added</>
                     ) : (
                       <><Zap size={16} /> RSVP / Plan</>
                     )}
                   </button>
                   <button className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all">
                     <Info size={16} /> Details
                   </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
};

const KeynotesView: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [activeDate, setActiveDate] = useState<'Wed, Jan 07' | 'Thu, Jan 08'>('Wed, Jan 07');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedSessions, setAddedSessions] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const filteredSessions = KEYNOTE_SESSIONS.filter(s => 
    s.date === activeDate && 
    (s.topic.toLowerCase().includes(searchQuery.toLowerCase()) || 
     s.speaker?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleSession = (id: string) => {
    const next = new Set(addedSessions);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setAddedSessions(next);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={onClose} />
      
      <div className="relative w-full h-full sm:h-[90vh] sm:max-w-6xl glass-panel rounded-none sm:rounded-[4rem] overflow-hidden shadow-2xl sm:border-white/10 border-none animate-in slide-in-from-bottom-0 sm:slide-in-from-bottom-12 duration-500 flex flex-col">
        {/* Header */}
        <div className="pt-8 sm:pt-12 pb-6 sm:pb-8 px-6 sm:px-10 border-b border-white/5 bg-white/5 flex flex-col gap-5 sm:gap-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] mb-1 sm:mb-2">CES 2026 Programming</p>
              <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight flex items-center gap-2 sm:gap-3">
                Keynotes & Foundry <Sparkles className="text-purple-500 w-6 h-6 sm:w-8 sm:h-8" />
              </h2>
            </div>
            <button onClick={onClose} className="p-3 sm:p-4 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10 group active:scale-90">
              <X className="w-5 h-5 sm:w-7 sm:h-7 group-hover:rotate-90 transition-transform" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-center">
            {/* Date Selector */}
            <div className="flex gap-1.5 p-1 glass-panel rounded-xl sm:rounded-2xl w-full sm:w-fit border-white/5 shrink-0">
              <button 
                onClick={() => setActiveDate('Wed, Jan 07')}
                className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                  activeDate === 'Wed, Jan 07' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'
                }`}
              >
                Wed
              </button>
              <button 
                onClick={() => setActiveDate('Thu, Jan 08')}
                className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                  activeDate === 'Thu, Jan 08' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'
                }`}
              >
                Thu
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sessions..."
                className="w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl pl-12 sm:pl-14 pr-4 sm:pr-6 py-3 sm:py-4 text-xs sm:text-sm focus:outline-none focus:border-purple-500 transition-all shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar space-y-6 sm:space-y-8 pb-32 sm:pb-20">
          {filteredSessions.length > 0 ? (
            filteredSessions.map((session) => (
              <GlassCard key={session.id} className="group !p-6 sm:!p-8 border-white/5 hover:border-purple-500/30 transition-all duration-500 relative overflow-hidden">
                <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
                  <div className="md:w-48 shrink-0">
                    <div className="flex items-center gap-2 text-purple-400 font-black text-[11px] sm:text-sm uppercase tracking-widest mb-2 sm:mb-3">
                      <Clock size={14} className="sm:w-4 sm:h-4" />
                      {session.time}
                    </div>
                    {session.speaker && (
                      <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Presented by</div>
                    )}
                    <div className="font-bold text-white text-base sm:text-lg leading-snug">{session.speaker}</div>
                  </div>

                  <div className="flex-1 space-y-3 sm:space-y-4">
                    <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-purple-400 transition-colors leading-tight">
                      {session.topic}
                    </h3>
                    
                    <div className="flex items-start gap-2 text-[11px] sm:text-xs text-gray-400 font-medium">
                      <MapPin size={12} className="text-purple-500 shrink-0 mt-0.5 sm:w-3.5 sm:h-3.5" />
                      {session.location}
                    </div>

                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-medium line-clamp-2 group-hover:line-clamp-none transition-all duration-500">
                      {session.description}
                    </p>
                  </div>

                  <div className="md:w-48 shrink-0 flex flex-col justify-center">
                    <button 
                      onClick={() => toggleSession(session.id)}
                      className={`w-full py-3 sm:py-4 rounded-lg sm:rounded-xl flex items-center justify-center gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 shadow-xl ${
                        addedSessions.has(session.id) 
                        ? 'bg-green-600/20 border border-green-500/50 text-green-400' 
                        : 'bg-purple-600 text-white shadow-purple-600/20 active:scale-95'
                      }`}
                    >
                      {addedSessions.has(session.id) ? (
                        <>
                          <CheckCircle size={14} className="sm:w-4 sm:h-4" />
                          Added
                        </>
                      ) : (
                        <>
                          <Plus size={14} className="sm:w-4 sm:h-4" />
                          To Planner
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))
          ) : (
            <div className="text-center py-16 sm:py-20">
              <Mic2 className="mx-auto w-12 h-12 sm:w-16 sm:h-16 text-white/5 mb-4 sm:mb-6" />
              <p className="text-xs sm:text-sm text-gray-500 font-bold uppercase tracking-widest px-6">No sessions match your search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ExhibitsView: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'featured'>('schedule');
  const [addedExhibitors, setAddedExhibitors] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const schedule = [
    { date: 'SUN, JAN 4', media: 'Media Day 1 / Unveiled', cspace: 'Media Only', conf: 'Closed', exhibits: 'None', foundry: 'Closed' },
    { date: 'MON, JAN 5', media: 'Media Day 2', cspace: 'Media Only', conf: '9 AM - 6 PM', exhibits: 'Conf Only', foundry: '10 AM - 5 PM' },
    { date: 'TUE, JAN 6', media: 'Show Floor Press Conf', cspace: '9 AM - 6 PM', conf: '9 AM - 5 PM', exhibits: '10 AM - 6 PM', foundry: 'Closed' },
    { date: 'WED, JAN 7', media: 'Show Floor Press Conf', cspace: '9 AM - 6 PM', conf: '9 AM - 5 PM', exhibits: '9 AM - 6 PM', foundry: '9 AM - 6 PM' },
    { date: 'THU, JAN 8', media: 'None', cspace: '9 AM - 6 PM', conf: '9 AM - 5 PM', exhibits: '9 AM - 6 PM', foundry: '9 AM - 6 PM' },
    { date: 'FRI, JAN 9', media: 'None', cspace: 'Closed', conf: 'None', exhibits: '9 AM - 4 PM', foundry: 'Closed' },
  ];

  const toggleExhibitor = (id: string) => {
    const next = new Set(addedExhibitors);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setAddedExhibitors(next);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={onClose} />
      
      <div className="relative w-full h-full sm:h-[90vh] sm:max-w-6xl glass-panel rounded-none sm:rounded-[4rem] overflow-hidden shadow-2xl sm:border-white/10 border-none animate-in slide-in-from-bottom-0 sm:slide-in-from-bottom-12 duration-500 flex flex-col">
        {/* Header Section */}
        <div className="pt-8 sm:pt-12 pb-6 sm:pb-8 px-6 sm:px-10 border-b border-white/5 bg-white/5 flex flex-col gap-6 sm:gap-8">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] mb-1 sm:mb-2">CES 2026 Core Intelligence</p>
              <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">Exhibits & Ventures</h2>
            </div>
            <button onClick={onClose} className="p-3 sm:p-4 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10 group active:scale-90">
              <X className="w-5 h-5 sm:w-7 sm:h-7 group-hover:rotate-90 transition-transform" />
            </button>
          </div>

          {/* Sub Navigation Toggle */}
          <div className="flex gap-1.5 p-1 glass-panel rounded-xl sm:rounded-2xl w-full sm:w-fit border-white/5">
            <button 
              onClick={() => setActiveSubTab('schedule')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-8 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                activeSubTab === 'schedule' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'
              }`}
            >
              <Calendar size={14} />
              Schedule
            </button>
            <button 
              onClick={() => setActiveSubTab('featured')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-8 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                activeSubTab === 'featured' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'
              }`}
            >
              <Presentation size={14} />
              Featured
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar pb-32 sm:pb-20">
          {activeSubTab === 'schedule' ? (
            <div className="animate-in slide-in-from-left-4 duration-500">
               <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 border-separate border-spacing-y-2 sm:border-spacing-y-4">
                  <thead>
                    <tr>
                      <th className="px-3 sm:px-6 py-2 sm:py-4 text-left text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-gray-500">Date</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-4 text-left text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-blue-400">Media</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-4 text-left text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-purple-400">C Space</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-4 text-left text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-green-400">Exhibits</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-4 text-left text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-orange-400">Foundry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {schedule.map((row) => (
                      <tr key={row.date} className="group hover:bg-white/5 transition-all duration-300 rounded-lg sm:rounded-2xl">
                        <td className="px-3 sm:px-6 py-4 sm:py-8 whitespace-nowrap text-sm sm:text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{row.date}</td>
                        <td className="px-3 sm:px-6 py-4 sm:py-8 text-[11px] sm:text-sm text-gray-300 font-medium leading-tight sm:leading-relaxed">{row.media}</td>
                        <td className="px-3 sm:px-6 py-4 sm:py-8 text-[11px] sm:text-sm text-gray-300 font-medium leading-tight sm:leading-relaxed">{row.cspace}</td>
                        <td className="px-3 sm:px-6 py-4 sm:py-8 text-[11px] sm:text-sm font-bold text-green-400 leading-tight sm:leading-relaxed">{row.exhibits}</td>
                        <td className="px-3 sm:px-6 py-4 sm:py-8 text-[11px] sm:text-sm text-gray-300 font-medium leading-tight sm:leading-relaxed">{row.foundry}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 animate-in slide-in-from-right-4 duration-500 pb-12">
              {FEATURED_EXHIBITORS.map((exh) => (
                <GlassCard key={exh.id} className="relative !p-6 sm:!p-8 border-white/10 hover:border-blue-500/30 group transition-all duration-500">
                   <div className="flex justify-between items-start mb-4 sm:mb-6 gap-4">
                      <div className="flex-1">
                        <div className="text-[9px] sm:text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{exh.category}</div>
                        <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight group-hover:text-blue-400 transition-colors">{exh.name}</h3>
                      </div>
                      <div className="px-3 sm:px-5 py-1.5 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-widest text-gray-400 shrink-0">
                        #{exh.booth}
                      </div>
                   </div>
                   
                   <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mb-6 sm:mb-8 min-h-0 sm:min-h-[4.5rem] font-medium opacity-80">
                      {exh.summary}
                   </p>

                   <button 
                    onClick={() => toggleExhibitor(exh.id)}
                    className={`w-full py-4 sm:py-5 rounded-lg sm:rounded-2xl flex items-center justify-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 shadow-xl ${
                      addedExhibitors.has(exh.id) 
                      ? 'bg-green-600/20 border border-green-500/50 text-green-400' 
                      : 'bg-blue-600 text-white shadow-blue-600/20 active:scale-95'
                    }`}
                   >
                     {addedExhibitors.has(exh.id) ? (
                       <>
                        <CheckCircle size={16} />
                        Itinerary
                       </>
                     ) : (
                       <>
                        <Plus size={16} />
                        Planner
                       </>
                     )}
                   </button>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('itinerary');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showExhibits, setShowExhibits] = useState(false);
  const [showKeynotes, setShowKeynotes] = useState(false);
  const [showEvents, setShowEvents] = useState(false);

  const renderContent = () => {
    if (isAdminMode) return <AdminDashboard onExit={() => setIsAdminMode(false)} />;
    
    switch (activeTab) {
      case 'itinerary': return <ItineraryView />;
      case 'maps': return <MapView />;
      case 'tickets': return <TicketView onAdminAccess={() => setIsAdminMode(true)} />;
      case 'ai': return <AIChat />;
      case 'contacts': return <ContactsView />;
      default: return <ItineraryView />;
    }
  };

  return (
    <div className="gradient-bg h-screen relative overflow-hidden text-white flex flex-col">
      {/* Background Orbs */}
      <div className="floating-orb top-[-50px] left-[-50px] bg-blue-500/10" />
      <div className="floating-orb bottom-[10%] right-[-100px] bg-purple-500/10 animation-delay-2000" />
      <div className="floating-orb top-[40%] left-[20%] w-[500px] h-[500px] bg-indigo-500/5 animation-delay-5000" />

      {/* Persistent Global Fixed Header */}
      {!isAdminMode && (
        <header className="fixed top-0 left-0 right-0 z-[60] pt-8 pb-4 px-6 bg-black/40 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="w-full h-[6px] bg-white/20 rounded-full mb-4 overflow-hidden">
                <div className="h-full w-1/3 bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mb-1">
                  CES 2026 • OFFICIAL ATTENDEE
                </p>
                <h1 className="text-xl font-bold tracking-tight text-white/90">
                  {activeTab === 'itinerary' && 'Your Journey'}
                  {activeTab === 'maps' && 'Global Navigation'}
                  {activeTab === 'tickets' && 'Gateway Access'}
                  {activeTab === 'contacts' && 'Network Portal'}
                  {activeTab === 'ai' && 'Concierge AI'}
                </h1>
              </div>

              {/* Category Icons consistently at top right */}
              <div className="flex gap-4 items-center shrink-0">
                <HeaderIcon icon={<LayoutGrid size={22} />} label="Exhibits" onClick={() => setShowExhibits(true)} />
                <HeaderIcon icon={<Mic2 size={22} />} label="Keynotes" onClick={() => setShowKeynotes(true)} />
                <HeaderIcon icon={<PartyPopper size={22} />} label="Events" onClick={() => setShowEvents(true)} />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area - Scroll Container */}
      <main className={`flex-1 relative z-10 overflow-y-auto scroll-smooth w-full ${!isAdminMode ? 'pt-32' : ''}`}>
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      {/* Overlays */}
      <ExhibitsView isOpen={showExhibits} onClose={() => setShowExhibits(false)} />
      <KeynotesView isOpen={showKeynotes} onClose={() => setShowKeynotes(false)} />
      <EventsView isOpen={showEvents} onClose={() => setShowEvents(false)} />

      {/* Persistent Footer Navigation */}
      {!isAdminMode && (
        <footer className="fixed bottom-0 left-0 right-0 z-50 p-6 pointer-events-none pb-8">
          <div className="max-w-lg mx-auto bg-[#0a192f]/98 backdrop-blur-3xl rounded-[3.5rem] py-6 px-8 flex items-center justify-between shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10 pointer-events-auto ring-1 ring-white/5">
            <NavButton 
              active={activeTab === 'itinerary'} 
              onClick={() => setActiveTab('itinerary')}
              icon={<Calendar className="w-7 h-7" />}
              label="Plan"
            />
            <NavButton 
              active={activeTab === 'maps'} 
              onClick={() => setActiveTab('maps')}
              icon={<Map className="w-7 h-7" />}
              label="Maps"
            />
            
            {/* Featured Middle Button: THE EVENT */}
            <div className="relative -top-8 flex flex-col items-center">
              <button
                onClick={() => setActiveTab('tickets')}
                className={`flex flex-col items-center justify-center w-20 h-20 rounded-full transition-all duration-500 shadow-2xl border-4 ${
                  activeTab === 'tickets' 
                  ? 'bg-blue-600 border-white scale-110 shadow-blue-600/50' 
                  : 'bg-white/85 border-white/20 scale-105 hover:bg-white opacity-90'
                }`}
              >
                <Zap className={`w-9 h-9 ${activeTab === 'tickets' ? 'text-white' : 'text-blue-600'}`} />
              </button>
              <span className={`absolute -bottom-10 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors duration-300 ${activeTab === 'tickets' ? 'text-white' : 'text-gray-400'}`}>
                The Event
              </span>
            </div>

            <NavButton 
              active={activeTab === 'contacts'} 
              onClick={() => setActiveTab('contacts')}
              icon={<Users className="w-7 h-7" />}
              label="Network"
            />
            <NavButton 
              active={activeTab === 'ai'} 
              onClick={() => setActiveTab('ai')}
              icon={<MessageSquare className="w-7 h-7" />}
              label="Concierge"
            />
          </div>
        </footer>
      )}
    </div>
  );
};

const HeaderIcon: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
  <div 
    onClick={onClick}
    className="flex flex-col items-center gap-1 group cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
  >
    <div className="w-11 h-11 rounded-xl glass-panel flex items-center justify-center border-white/10 group-hover:bg-blue-600/20 group-hover:border-blue-500/30 transition-all duration-300 active:scale-90 shadow-lg">
      <div className="text-white group-hover:text-blue-400">
        {icon}
      </div>
    </div>
    <span className="text-[8px] font-black uppercase tracking-tighter text-gray-400 group-hover:text-blue-400">
      {label}
    </span>
  </div>
);

const NavButton: React.FC<{ 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string 
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-2 px-3 transition-all duration-300 ${
      active ? 'text-white scale-110 opacity-100' : 'text-gray-400 hover:text-white opacity-90'
    }`}
  >
    <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'scale-100'}`}>
      {icon}
    </div>
    <span className={`text-[10px] font-bold uppercase tracking-tighter ${active ? 'opacity-100' : 'opacity-80'}`}>
      {label}
    </span>
  </button>
);

export default App;
