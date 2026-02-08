
import React, { useState } from 'react';
import { GlassCard } from './GlassCard';
import { AdminTicket, AdminGuest, AdminOrder } from '../types';
import { 
  Plus, 
  Users, 
  CreditCard, 
  Mail, 
  Search, 
  MoreVertical, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  ShieldCheck,
  Lock,
  Send,
  X,
  ArrowLeft,
  Store,
  Briefcase
} from 'lucide-react';

const MOCK_GUESTS: AdminGuest[] = [
  { id: '1', name: 'Alex Rivera', email: 'alex@techcorp.com', company: 'TechCorp', status: 'Registered', ticketType: 'Executive', classification: 'attendee', orderDate: '2025-10-12' },
  { id: '2', name: 'Jason Trindade', email: 'jason@pidea.ai', company: 'Pidea AI', status: 'Checked In', ticketType: 'All-Access', classification: 'attendee', orderDate: '2025-11-05' },
  { id: '3', name: 'Sarah Chen', email: 'sarah@innovation.io', company: 'InnoWorks', status: 'Pending', ticketType: 'General', classification: 'vendor', orderDate: '2025-12-01' },
  { id: '4', name: 'Marcus Vane', email: 'marcus@startup.ly', company: 'Startup.ly', status: 'Registered', ticketType: 'Exhibitor', classification: 'vendor', orderDate: '2025-12-15' },
];

const MOCK_TICKETS: AdminTicket[] = [
  { id: '1', name: 'Executive Pass', price: 999, quantity: 100, sold: 45, benefits: ['VIP Lounge', 'Private Sessions'] },
  { id: '2', name: 'All-Access Pass', price: 299, quantity: 1000, sold: 650, benefits: ['Exhibits', 'Keynotes'] },
  { id: '3', name: 'Vendor Gold', price: 1599, quantity: 50, sold: 12, benefits: ['Booth Space', 'Lead Retrieval'] },
];

const MOCK_ORDERS: AdminOrder[] = [
  { id: 'ORD-7721', guestName: 'Alex Rivera', amount: 999, date: '10 mins ago', status: 'Success' },
  { id: 'ORD-7720', guestName: 'Jason Trindade', amount: 299, date: '1 hour ago', status: 'Success' },
  { id: 'ORD-7719', guestName: 'Sarah Chen', amount: 1599, date: '3 hours ago', status: 'Success' },
];

interface AdminDashboardProps {
  onExit: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'tickets' | 'guests' | 'email'>('stats');
  const [isAddingTicket, setIsAddingTicket] = useState(false);
  const [emailModal, setEmailModal] = useState<{ open: boolean, to?: string }>({ open: false });

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} onExit={onExit} />;
  }

  return (
    <div className="flex flex-col gap-6 px-6 pt-12 pb-32 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <button 
            onClick={onExit}
            className="p-3 glass-panel rounded-2xl text-gray-400 hover:text-white transition-all active:scale-90"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Organizer Portal</h1>
            <p className="text-gray-400 text-base">CES 2026 Admin Control Room</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAuthenticated(false)}
          className="p-3 glass-panel rounded-2xl text-gray-500 hover:text-red-400 transition-colors"
        >
          <Lock size={20} />
        </button>
      </div>

      {/* Internal Navigation */}
      <div className="flex gap-2 p-1.5 glass-panel rounded-2xl">
        <TabBtn active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<TrendingUp size={18}/>} label="Stats" />
        <TabBtn active={activeTab === 'tickets'} onClick={() => setActiveTab('tickets')} icon={<CreditCard size={18}/>} label="Inventory" />
        <TabBtn active={activeTab === 'guests'} onClick={() => setActiveTab('guests')} icon={<Users size={18}/>} label="Registry" />
        <TabBtn active={activeTab === 'email'} onClick={() => setActiveTab('email')} icon={<Mail size={18}/>} label="Broadcast" />
      </div>

      {activeTab === 'stats' && <StatsView />}
      {activeTab === 'tickets' && <TicketsView onAdd={() => setIsAddingTicket(true)} />}
      {activeTab === 'guests' && <GuestsView onEmail={(email) => setEmailModal({ open: true, to: email })} />}
      {activeTab === 'email' && <BroadcastView />}

      {/* Email Modal */}
      {emailModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setEmailModal({ open: false })} />
          <div className="relative w-full max-w-md glass-panel rounded-[2.5rem] p-8 space-y-6 shadow-2xl border-white/10 animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-white">New Message</h3>
              <button onClick={() => setEmailModal({ open: false })} className="text-gray-500 hover:text-white transition-colors"><X size={28}/></button>
            </div>
            <div className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-widest text-blue-400 font-bold ml-1">Recipient</label>
                <div className="px-5 py-4 glass-panel rounded-2xl border-white/5 text-sm text-gray-200">
                  {emailModal.to || 'All Event Attendees'}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-widest text-blue-400 font-bold ml-1">Subject</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-blue-500" placeholder="Important CES Update..." />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-widest text-blue-400 font-bold ml-1">Content</label>
                <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-blue-500 min-h-[150px] resize-none" placeholder="Write your message here..." />
              </div>
            </div>
            <button 
              className="w-full bg-blue-600 py-5 rounded-2xl flex items-center justify-center gap-3 font-bold active:scale-95 transition-all text-sm uppercase tracking-widest"
              onClick={() => { alert('Message Sent!'); setEmailModal({ open: false }); }}
            >
              <Send size={20} />
              Transmit Message
            </button>
          </div>
        </div>
      )}

      {/* Add Ticket Modal */}
      {isAddingTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsAddingTicket(false)} />
          <div className="relative w-full max-w-md glass-panel rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-white">Create New Tier</h3>
              <button onClick={() => setIsAddingTicket(false)} className="text-gray-500 hover:text-white transition-colors"><X size={28}/></button>
            </div>
            <div className="space-y-4">
              <InputField label="Pass Name" placeholder="e.g. Media Gold" />
              <InputField label="Classification" placeholder="Attendee or Vendor" />
              <InputField label="Price (USD)" placeholder="0.00" />
              <InputField label="Total Quantity" placeholder="500" />
            </div>
            <button 
              className="w-full bg-blue-600 py-5 rounded-2xl flex items-center justify-center gap-3 font-bold active:scale-95 transition-all text-sm uppercase tracking-widest"
              onClick={() => { alert('Tier Created!'); setIsAddingTicket(false); }}
            >
              <Plus size={20} />
              Finalize Inventory
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminLogin: React.FC<{ onLogin: () => void; onExit: () => void }> = ({ onLogin, onExit }) => {
  const [pass, setPass] = useState('');
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 animate-in zoom-in-95">
      <button 
        onClick={onExit}
        className="absolute top-8 left-8 p-3 glass-panel rounded-2xl text-gray-500 hover:text-white transition-all flex items-center gap-2"
      >
        <ArrowLeft size={18} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Back to App</span>
      </button>

      <div className="w-24 h-24 rounded-3xl bg-blue-600/20 flex items-center justify-center border border-blue-500/50 mb-8 shadow-2xl">
        <ShieldCheck size={48} className="text-blue-500" />
      </div>
      <h2 className="text-3xl font-bold text-center mb-2">Organizer Access</h2>
      <p className="text-gray-400 text-base text-center mb-10">Crystal-secure portal for CES 2026 management</p>
      
      <div className="w-full max-w-sm space-y-5">
        <div className="flex flex-col gap-2">
           <label className="text-xs uppercase tracking-widest text-blue-400 font-black ml-1">Master Access Key</label>
           <input 
              type="password" 
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 focus:outline-none focus:border-blue-500 transition-all text-center tracking-[0.4em] text-lg"
              placeholder="••••••••"
           />
        </div>
        <button 
          onClick={onLogin}
          className="w-full bg-blue-600 py-6 rounded-2xl font-bold text-base uppercase tracking-widest shadow-lg shadow-blue-600/30 active:scale-95 transition-all mt-4"
        >
          Decrypt Dashboard
        </button>
      </div>
    </div>
  );
};

const StatsView: React.FC = () => (
  <div className="space-y-6 animate-in slide-in-from-right-4">
    <div className="grid grid-cols-2 gap-5">
      <GlassCard className="!p-6 bg-blue-600/10 border-blue-500/20">
        <div className="text-xs font-black uppercase tracking-widest text-blue-400 mb-1">Gross Revenue</div>
        <div className="text-3xl font-bold">$244,500</div>
        <div className="text-xs text-green-400 mt-2 flex items-center gap-1.5">
          <TrendingUp size={12} /> +12.4% Growth
        </div>
      </GlassCard>
      <GlassCard className="!p-6">
        <div className="text-xs font-black uppercase tracking-widest text-purple-400 mb-1">Total Registry</div>
        <div className="text-3xl font-bold">1,842</div>
        <div className="text-xs text-blue-400 mt-2">74% Target Reached</div>
      </GlassCard>
    </div>

    <div className="grid grid-cols-2 gap-5">
      <GlassCard className="!p-5 bg-white/5">
        <div className="flex items-center gap-3 mb-2">
          <Store size={16} className="text-purple-400" />
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">Vendors</span>
        </div>
        <div className="text-2xl font-bold">412</div>
        <p className="text-[10px] text-gray-600 mt-1 uppercase">Exhibitors & Sponsors</p>
      </GlassCard>
      <GlassCard className="!p-5 bg-white/5">
        <div className="flex items-center gap-3 mb-2">
          <Briefcase size={16} className="text-blue-400" />
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">Attendees</span>
        </div>
        <div className="text-2xl font-bold">1,430</div>
        <p className="text-[10px] text-gray-600 mt-1 uppercase">Industry Professionals</p>
      </GlassCard>
    </div>

    <div className="space-y-4">
      <h3 className="text-base font-bold uppercase tracking-widest text-gray-500 ml-1">Live Transaction Feed</h3>
      <div className="space-y-4">
        {MOCK_ORDERS.map((order) => (
          <GlassCard key={order.id} className="!p-5 border-white/5 hover:bg-white/5 transition-colors">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-blue-400 border border-white/10">
                  <DollarSign size={20} />
                </div>
                <div>
                  <div className="font-bold text-base text-white">{order.guestName}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{order.date} • {order.id}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-green-400">+${order.amount}</div>
                <div className="text-[10px] uppercase font-black text-gray-600 tracking-tighter mt-1">SUCCESSFUL</div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  </div>
);

const TicketsView: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <div className="space-y-6 animate-in slide-in-from-right-4">
    <div className="flex justify-between items-center">
      <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Inventory Management</h3>
      <button 
        onClick={onAdd}
        className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5 hover:text-blue-300 transition-colors"
      >
        <Plus size={16} /> Add Pass Type
      </button>
    </div>

    <div className="space-y-5">
      {MOCK_TICKETS.map((t) => (
        <GlassCard key={t.id} className="relative overflow-hidden group !p-7 shadow-xl">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-600/10 rounded-bl-[5rem] group-hover:bg-blue-600/20 transition-all" />
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="text-2xl font-bold text-white">{t.name}</h4>
              <p className="text-blue-400 text-sm font-black uppercase tracking-widest mt-1">${t.price} Unit Price</p>
            </div>
            <button className="text-gray-500 hover:text-white transition-colors"><MoreVertical size={20} /></button>
          </div>
          
          <div className="space-y-4">
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden shadow-inner">
               <div className="h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${(t.sold / t.quantity) * 100}%` }} />
            </div>
            <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
              <span>{t.sold} SOLD</span>
              <span>{t.quantity} MAX CAPACITY</span>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2.5">
            {t.benefits.map((b, i) => (
              <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/50">
                {b}
              </span>
            ))}
          </div>
        </GlassCard>
      ))}
    </div>
  </div>
);

const GuestsView: React.FC<{ onEmail: (email: string) => void }> = ({ onEmail }) => {
  const [filter, setFilter] = useState<'all' | 'attendee' | 'vendor'>('all');

  const filteredGuests = filter === 'all' 
    ? MOCK_GUESTS 
    : MOCK_GUESTS.filter(g => g.classification === filter);

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4">
      <div className="flex gap-2">
        <FilterBtn active={filter === 'all'} label="All" onClick={() => setFilter('all')} />
        <FilterBtn active={filter === 'attendee'} label="Attendees" onClick={() => setFilter('attendee')} />
        <FilterBtn active={filter === 'vendor'} label="Vendors" onClick={() => setFilter('vendor')} />
      </div>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={22} />
        <input 
          type="text" 
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-5 py-5 text-base focus:outline-none focus:border-blue-500 transition-all shadow-inner"
          placeholder="Find guest by name or company..."
        />
      </div>

      <div className="space-y-4">
        {filteredGuests.map((guest) => (
          <GlassCard key={guest.id} className="!p-5 border-white/5 hover:border-white/20 transition-all shadow-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-[1.25rem] bg-gradient-to-br border border-white/10 flex items-center justify-center font-bold text-xl shadow-inner ${
                  guest.classification === 'vendor' ? 'from-purple-600/30 to-blue-600/30 text-purple-300' : 'from-blue-600/30 to-purple-600/30 text-blue-300'
                }`}>
                  {guest.name[0]}
                </div>
                <div>
                  <div className="font-bold text-lg text-white">{guest.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 uppercase tracking-widest">{guest.company}</span>
                    <span className="w-1 h-1 bg-gray-700 rounded-full" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">{guest.classification}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => onEmail(guest.email)}
                  className="p-3.5 glass-panel rounded-2xl text-blue-400 hover:bg-blue-600/20 border-white/5 active:scale-90 transition-all shadow-xl"
                >
                  <Mail size={20} />
                </button>
                <button className="p-3.5 glass-panel rounded-2xl text-gray-400 hover:bg-white/10 border-white/5 active:scale-90 transition-all shadow-xl">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2.5">
              {guest.status === 'Registered' && <CheckCircle2 size={14} className="text-green-400" />}
              {guest.status === 'Checked In' && <CheckCircle2 size={14} className="text-blue-400" />}
              {guest.status === 'Pending' && <Clock size={14} className="text-yellow-400" />}
              <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-600">{guest.status}</span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

const FilterBtn: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
      active ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'
    }`}
  >
    {label}
  </button>
);

const BroadcastView: React.FC = () => (
  <div className="space-y-6 animate-in slide-in-from-right-4">
    <GlassCard className="space-y-8 !p-8 shadow-2xl">
      <div className="flex items-center gap-4 text-blue-400">
        <Mail size={32} />
        <h3 className="text-2xl font-bold">Official Broadcast</h3>
      </div>
      <p className="text-gray-400 text-base leading-relaxed">Reach all <span className="text-white font-bold">1,842</span> registered attendees instantly via direct push notification and crystal-mail.</p>
      
      <div className="space-y-6">
        <div className="p-6 bg-blue-600/10 border border-blue-500/20 rounded-[2rem] space-y-3 shadow-inner">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Audience Segmentation</div>
          <div className="flex flex-wrap gap-3">
            <span className="px-4 py-2 bg-blue-600 text-xs font-bold rounded-xl shadow-lg cursor-pointer">All Registry</span>
            <span className="px-4 py-2 bg-white/5 text-xs font-bold rounded-xl text-gray-500 hover:text-gray-300 border border-white/5 cursor-pointer">Vendor Only</span>
            <span className="px-4 py-2 bg-white/5 text-xs font-bold rounded-xl text-gray-500 hover:text-gray-300 border border-white/5 cursor-pointer">Attendee Only</span>
          </div>
        </div>

        <InputField label="Broadcast Subject" placeholder="CES 2026: Official Logistics Update" />
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest text-blue-400 font-black ml-1">Message Content</label>
          <textarea className="w-full bg-white/5 border border-white/10 rounded-[2rem] px-6 py-5 text-base focus:outline-none focus:border-blue-500 min-h-[220px] resize-none leading-relaxed shadow-inner" placeholder="Type your official announcement here..." />
        </div>
      </div>

      <button 
        className="w-full bg-blue-600 py-6 rounded-[2.5rem] flex items-center justify-center gap-4 font-bold text-base uppercase tracking-[0.3em] shadow-2xl shadow-blue-600/40 active:scale-95 transition-all text-white"
        onClick={() => alert('Official Broadcast Transmitted!')}
      >
        <Send size={24} />
        Initialize Broadcast
      </button>
    </GlassCard>
  </div>
);

const TabBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all duration-300 ${
      active ? 'bg-blue-600 text-white shadow-xl scale-105 z-10' : 'text-gray-500 hover:text-gray-300'
    }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const InputField: React.FC<{ label: string; placeholder: string }> = ({ label, placeholder }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs uppercase tracking-widest text-blue-400 font-black ml-1">{label}</label>
    <input 
      type="text" 
      className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] px-6 py-5 text-base focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-600 shadow-inner"
      placeholder={placeholder}
    />
  </div>
);
