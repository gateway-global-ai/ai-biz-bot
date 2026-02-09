
import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from './GlassCard';
import { Contact } from '../types';
import { 
  User, 
  Users,
  Briefcase, 
  Phone, 
  Mail, 
  Linkedin, 
  Github, 
  QrCode, 
  Save, 
  Scan, 
  X,
  MessageSquare,
  Image as ImageIcon,
  Camera,
  Layers
} from 'lucide-react';

const BACKGROUND_OPTIONS = [
  { id: 'quantum-grid', url: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&q=80&w=800', label: 'Quantum Grid' },
  { id: 'cyber-glass', url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800', label: 'Cyber Glass' },
  { id: 'neural-mesh', url: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&q=80&w=800', label: 'Neural Mesh' },
  { id: 'prism-core', url: 'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?auto=format&fit=crop&q=80&w=800', label: 'Prism Core' }
];

export const ContactsView: React.FC = () => {
  const [view, setView] = useState<'profile' | 'list'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [myContact, setMyContact] = useState<Contact>(() => {
    const saved = localStorage.getItem('ces_my_contact');
    return saved ? JSON.parse(saved) : {
      name: 'Alex Rivera',
      company: 'TechCorp Innovations',
      jobTitle: 'Senior Product Strategist',
      phone: '+1 (555) 012-3456',
      email: 'alex.rivera@techcorp.com',
      linkedin: 'linkedin.com/in/alexrivera',
      github: 'github.com/arivera-tech',
      backgroundImage: BACKGROUND_OPTIONS[0].url,
      profilePhoto: 'https://i.pravatar.cc/300?u=alex'
    };
  });

  const [network, setNetwork] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('ces_network');
    if (saved) return JSON.parse(saved);
    return [{
      name: 'Jason Trindade',
      company: 'Pidea AI',
      jobTitle: 'CTO',
      phone: '+1 (702) 555-0199',
      email: 'jason@pidea.ai',
      linkedin: 'linkedin.com/in/jasontrindade',
      github: 'github.com/jason-pidea',
      profilePhoto: 'https://i.pravatar.cc/300?u=jason'
    }];
  });

  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    localStorage.setItem('ces_my_contact', JSON.stringify(myContact));
  }, [myContact]);

  useEffect(() => {
    localStorage.setItem('ces_network', JSON.stringify(network));
  }, [network]);

  const handleSave = () => {
    localStorage.setItem('ces_my_contact', JSON.stringify(myContact));
    alert('Contact card updated with your personal style!');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMyContact({ ...myContact, profilePhoto: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const simulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const newContact: Contact = {
        name: 'Jordan Smith',
        company: 'Vanguard Systems',
        jobTitle: 'Lead Engineer',
        phone: '+1 (555) 987-6543',
        email: 'j.smith@vanguard.io',
        linkedin: 'linkedin.com/in/jsmith',
        github: 'github.com/jsmith-dev',
        profilePhoto: 'https://i.pravatar.cc/300?u=jordan'
      };
      setNetwork(prev => [...prev, newContact]);
      setIsScanning(false);
      setView('list');
      alert('New contact imported: Jordan Smith');
    }, 2000);
  };

  const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(JSON.stringify(myContact))}`;

  return (
    <div className="flex flex-col gap-6 px-6 pt-12 pb-32 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">My Network</h1>
          <p className="text-gray-400 text-sm">Exchange cards at CES 2026</p>
        </div>
        <div className="flex gap-2 p-1 glass-panel rounded-2xl">
          <button 
            onClick={() => setView('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${view === 'profile' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
          >
            My Card
          </button>
          <button 
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
          >
            My Network
          </button>
        </div>
      </div>

      {view === 'profile' ? (
        <div className="space-y-6">
          {/* Card Preview */}
          <GlassCard className="relative p-0 overflow-hidden border-none shadow-2xl min-h-[480px] group">
            {/* Background Layer */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
              style={{ backgroundImage: `url(${myContact.backgroundImage || BACKGROUND_OPTIONS[0].url})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/90 backdrop-blur-[1px]" />
            
            <div className="relative z-10 p-8 flex flex-col items-center h-full">
              {/* Profile Photo - Increased size to w-32 h-32 */}
              <div className="relative mt-2">
                <div className="w-32 h-32 rounded-full border-[3px] border-white/40 p-1 bg-black/20 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                  {myContact.profilePhoto ? (
                    <img src={myContact.profilePhoto} className="w-full h-full rounded-full object-cover" alt="Profile" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-blue-600/20 flex items-center justify-center">
                      <User size={56} className="text-white/40" />
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 p-2.5 bg-blue-600 rounded-full border border-white/20 shadow-lg active:scale-90 transition-transform"
                >
                  <Camera size={16} className="text-white" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
              </div>

              <div className="text-center mt-6">
                <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{myContact.name}</h2>
                <div className="h-0.5 w-12 bg-blue-500 mx-auto my-3 rounded-full" />
                <p className="text-blue-300 text-xs font-bold tracking-[0.15em] uppercase drop-shadow-md">{myContact.jobTitle}</p>
                <p className="text-white/70 text-[11px] mt-1 font-semibold uppercase tracking-wider">{myContact.company}</p>
              </div>

              {/* QR Code Section */}
              <div className="mt-auto pt-8 flex flex-col items-center">
                <div className="bg-white p-2.5 rounded-2xl shadow-2xl mb-4 transition-all duration-500 hover:rotate-2 hover:scale-105">
                  <img src={qrUrl} alt="Contact QR" className="w-20 h-20" />
                </div>
                <span className="text-[9px] uppercase tracking-[0.3em] font-black text-white/30">Crystallized Access</span>
              </div>
            </div>

            <div className="absolute top-6 right-6">
               <QrCode className="w-6 h-6 text-white/20" />
            </div>
          </GlassCard>

          {/* Customization & Details */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-blue-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Tech Profiles</h3>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {BACKGROUND_OPTIONS.map((opt) => (
                  <button 
                    key={opt.id}
                    onClick={() => setMyContact({ ...myContact, backgroundImage: opt.url })}
                    className={`h-16 rounded-xl border-2 overflow-hidden transition-all duration-300 ${
                      myContact.backgroundImage === opt.url ? 'border-blue-500 scale-105 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-white/5 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={opt.url} className="w-full h-full object-cover" alt={opt.label} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon size={18} className="text-blue-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Card Data</h3>
              </div>
              <div className="grid gap-4">
                <InputField label="Name" value={myContact.name} icon={<User size={16}/>} onChange={v => setMyContact({...myContact, name: v})} />
                <InputField label="Job Title" value={myContact.jobTitle} icon={<Briefcase size={16}/>} onChange={v => setMyContact({...myContact, jobTitle: v})} />
                <InputField label="Company" value={myContact.company} icon={<Users size={16}/>} onChange={v => setMyContact({...myContact, company: v})} />
                <InputField label="Phone" value={myContact.phone} icon={<Phone size={16}/>} onChange={v => setMyContact({...myContact, phone: v})} />
                <InputField label="Email" value={myContact.email} icon={<Mail size={16}/>} onChange={v => setMyContact({...myContact, email: v})} />
                <InputField label="LinkedIn" value={myContact.linkedin} icon={<Linkedin size={16}/>} onChange={v => setMyContact({...myContact, linkedin: v})} />
                <InputField label="GitHub" value={myContact.github} icon={<Github size={16}/>} onChange={v => setMyContact({...myContact, github: v})} />
              </div>
              
              <button 
                onClick={handleSave}
                className="w-full bg-blue-600 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-600/30 active:scale-95 transition-all mt-6 text-sm uppercase tracking-widest"
              >
                <Save size={18} />
                Sync Personal Identity
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="flex gap-4">
             <button 
              onClick={simulateScan}
              className="flex-1 bg-white/5 border border-white/10 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold active:scale-95 transition-all overflow-hidden relative group"
            >
              <Scan className="group-hover:rotate-90 transition-transform text-blue-400" />
              <span className="text-sm uppercase tracking-widest">Scan Digital Card</span>
              <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          <div className="space-y-4">
            {network.length === 0 ? (
              <div className="text-center py-20 text-gray-500 italic">
                No contacts imported yet. Start scanning badges!
              </div>
            ) : (
              network.map((c, i) => (
                <GlassCard key={i} className="hover:bg-white/10 transition-colors border-white/5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full border border-white/10 bg-white/5 overflow-hidden shrink-0 shadow-lg">
                         {c.profilePhoto ? (
                           <img src={c.profilePhoto} className="w-full h-full object-cover" alt={c.name} />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center bg-blue-600/20"><User size={24} /></div>
                         )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-lg truncate text-white/90">{c.name}</h4>
                        <p className="text-blue-400 text-[10px] font-bold uppercase tracking-wider truncate">{c.jobTitle}</p>
                        <p className="text-gray-500 text-xs mt-0.5 truncate">{c.company}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-4">
                      <a href={`tel:${c.phone}`} className="p-2.5 glass-panel rounded-full hover:bg-blue-600/20 text-blue-400 border-white/5" title="Phone">
                        <Phone size={16}/>
                      </a>
                      <button className="p-2.5 glass-panel rounded-full hover:bg-blue-600/20 text-green-400 border-white/5" title="Message">
                        <MessageSquare size={16}/>
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </div>
      )}

      {isScanning && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center backdrop-blur-md">
          <div className="relative w-72 h-72 border-2 border-blue-500/30 rounded-[3rem] overflow-hidden">
             <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />
             <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-[scan_2s_infinite]" />
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 border border-white/10 rounded-2xl flex items-center justify-center bg-white/5">
                  <Scan size={64} className="text-blue-500/30" />
                </div>
             </div>
          </div>
          <p className="mt-8 text-blue-400 font-black tracking-[0.4em] uppercase text-xs">Decrypting Crystal QR</p>
          <button 
            onClick={() => setIsScanning(false)}
            className="mt-12 p-5 glass-panel rounded-full text-white/30 hover:text-white border-white/10 hover:border-white/30 transition-all"
          >
            <X size={24} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

const InputField: React.FC<{ label: string; value: string; icon: React.ReactNode; onChange: (v: string) => void }> = ({ label, value, icon, onChange }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[9px] uppercase tracking-[0.2em] text-blue-400 font-black ml-1">{label}</label>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
        {icon}
      </div>
      <input 
        type="text" 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/5 rounded-xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all focus:bg-white/10" 
      />
    </div>
  </div>
);
