
import React, { useState } from 'react';
import { 
  Phone, Building2, Users, Globe, ShieldCheck, 
  ArrowLeft, CheckCircle2, MessageSquare, 
  Briefcase, Zap, PhoneCall, CreditCard, ChevronRight,
  Headphones, Calendar, TrendingUp, Store
} from 'lucide-react';

interface BusinessPageProps {
  onBack: () => void;
}

export const BusinessPage: React.FC<BusinessPageProps> = ({ onBack }) => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    company: '',
    interests: [] as string[],
    phoneDetails: {
      useCase: 'customer-support',
      volume: '<100',
      countries: '',
      budget: '<50'
    }
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const toggleInterest = (value: string) => {
    setFormState(prev => ({
      ...prev,
      interests: prev.interests.includes(value)
        ? prev.interests.filter(i => i !== value)
        : [...prev.interests, value]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeout(() => setIsSubmitted(true), 800);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-200 overflow-y-auto scrollbar-thin">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-lg tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Gateway<span className="text-slate-500">Global</span> Business
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
          <Phone className="w-3 h-3" /> Enterprise Solutions
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-blue-400 mb-4 animate-in fade-in slide-in-from-bottom-4">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Now Available: SIP Trunking
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6">
            Give Your AI Agent a <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400">
              Real Phone Number
            </span>
          </h1>
          <p className="text-2xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
            Your Customers Can Now Call Your AI Assistant. <br/>
            <span className="text-white font-medium">24/7 AI Receptionist starting at $99/mo.</span>
          </p>
        </div>
      </section>

      {/* Use Cases Grid */}
      <section className="py-16 px-6 bg-slate-900/30 border-y border-slate-900">
        <div className="max-w-6xl mx-auto">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Store, title: "Small Business", quote: "AI receptionist for $99 vs human for $3000/mo.", color: "text-emerald-400" },
                { icon: ShoppingCartIcon, title: "E-Commerce", quote: "Handle order status questions via SMS 24/7.", color: "text-blue-400" },
                { icon: Calendar, title: "Service Biz", quote: "Book appointments directly over the phone.", color: "text-violet-400" },
                { icon: Building2, title: "Real Estate", quote: "Answer property inquiries instantly, anytime.", color: "text-amber-400" },
              ].map((item, i) => (
                <div key={i} className="p-6 bg-slate-950 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all group">
                   <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <item.icon className={`w-6 h-6 ${item.color}`} />
                   </div>
                   <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                   <p className="text-sm text-slate-400 leading-relaxed">"{item.quote}"</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* Main Content: Form & Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
           
           {/* Left: Upsell Ladder */}
           <div className="space-y-12">
              <div>
                <h2 className="text-3xl font-bold text-white mb-4">Scale with your Business</h2>
                <p className="text-slate-400">Start with a chat agent, upgrade to a full enterprise telephony system.</p>
              </div>

              <div className="space-y-6 relative">
                 <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-800" />
                 
                 {[
                   { title: "Free User", price: "$0", desc: "Create & share chat agents", active: false },
                   { title: "Pro Creator", price: "$29/mo", desc: "Custom voice & deep analytics", active: false },
                   { title: "Business Phone", price: "$99/mo", desc: "Real US Number + Inbound/Outbound Voice", active: true },
                   { title: "Enterprise", price: "$999/mo", desc: "Multiple numbers, HIPAA/SOC2, White-label", active: false }
                 ].map((tier, i) => (
                   <div key={i} className={`relative pl-12 transition-all ${tier.active ? 'opacity-100 scale-105' : 'opacity-60 hover:opacity-100'}`}>
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-4 border-slate-950 flex items-center justify-center z-10 ${tier.active ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-slate-700'}`}>
                        {tier.active && <Phone className="w-3 h-3 text-white" />}
                      </div>
                      <div className={`p-6 rounded-2xl border ${tier.active ? 'bg-blue-900/10 border-blue-500/50' : 'bg-slate-900 border-slate-800'}`}>
                         <div className="flex justify-between items-center mb-1">
                            <h3 className={`font-bold ${tier.active ? 'text-blue-400' : 'text-white'}`}>{tier.title}</h3>
                            <span className="text-sm font-mono text-slate-500">{tier.price}</span>
                         </div>
                         <p className="text-sm text-slate-400">{tier.desc}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           {/* Right: Interest Form */}
           <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-indigo-600/10 rounded-3xl blur-2xl" />
              <div className="relative bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
                 {!isSubmitted ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                       <div>
                          <h3 className="text-2xl font-bold text-white mb-2">Request Business Access</h3>
                          <p className="text-slate-400 text-sm">Configure your enterprise requirements below.</p>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
                             <input 
                               type="text" 
                               required
                               value={formState.name}
                               onChange={e => setFormState({...formState, name: e.target.value})}
                               className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">Company</label>
                             <input 
                               type="text" 
                               required
                               value={formState.company}
                               onChange={e => setFormState({...formState, company: e.target.value})}
                               className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                             />
                          </div>
                       </div>

                       <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase">Work Email</label>
                          <input 
                             type="email" 
                             required
                             value={formState.email}
                             onChange={e => setFormState({...formState, email: e.target.value})}
                             className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                           />
                       </div>

                       <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-500 uppercase">Features of Interest</label>
                          <div className="grid grid-cols-1 gap-2">
                             {[
                               { id: 'agent-creation', label: 'AI Agent Creation', sub: 'Natural language setup' },
                               { id: 'phone-numbers', label: 'Phone Numbers', sub: 'Real numbers for calls/text' },
                               { id: 'marketplace', label: 'Marketplace', sub: 'Buy/Sell templates & APIs' },
                               { id: 'enterprise', label: 'Enterprise', sub: 'SSO, HIPAA, Whitelabel' }
                             ].map(opt => (
                                <label key={opt.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${formState.interests.includes(opt.id) ? 'bg-blue-600/10 border-blue-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}>
                                   <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${formState.interests.includes(opt.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}>
                                      {formState.interests.includes(opt.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                   </div>
                                   <input 
                                     type="checkbox" 
                                     className="hidden" 
                                     checked={formState.interests.includes(opt.id)}
                                     onChange={() => toggleInterest(opt.id)}
                                   />
                                   <div>
                                      <div className={`text-sm font-bold ${formState.interests.includes(opt.id) ? 'text-blue-400' : 'text-slate-300'}`}>{opt.label}</div>
                                      <div className="text-xs text-slate-500">{opt.sub}</div>
                                   </div>
                                </label>
                             ))}
                          </div>
                       </div>

                       {/* Conditional Phone Details */}
                       {formState.interests.includes('phone-numbers') && (
                          <div className="space-y-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl animate-in fade-in slide-in-from-top-2">
                             <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                               <PhoneCall className="w-4 h-4" /> Number Requirements
                             </h4>
                             
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                   <label className="text-[10px] font-bold text-slate-500 uppercase">Primary Use Case</label>
                                   <select 
                                     value={formState.phoneDetails.useCase}
                                     onChange={e => setFormState({...formState, phoneDetails: {...formState.phoneDetails, useCase: e.target.value}})}
                                     className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                   >
                                      <option value="customer-support">Customer Support</option>
                                      <option value="appointments">Appointment Scheduling</option>
                                      <option value="sales">Sales/Lead Gen</option>
                                      <option value="internal">Internal Assistant</option>
                                   </select>
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] font-bold text-slate-500 uppercase">Monthly Volume</label>
                                   <select 
                                     value={formState.phoneDetails.volume}
                                     onChange={e => setFormState({...formState, phoneDetails: {...formState.phoneDetails, volume: e.target.value}})}
                                     className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                   >
                                      <option value="<100">&lt; 100 calls</option>
                                      <option value="100-1000">100 - 1k calls</option>
                                      <option value="1000-10000">1k - 10k calls</option>
                                      <option value="10000+">10k+ calls</option>
                                   </select>
                                </div>
                             </div>

                             <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Countries Needed</label>
                                <input 
                                  type="text"
                                  placeholder="e.g. US, UK, Canada..."
                                  value={formState.phoneDetails.countries}
                                  onChange={e => setFormState({...formState, phoneDetails: {...formState.phoneDetails, countries: e.target.value}})}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                />
                             </div>
                          </div>
                       )}

                       <button 
                         type="submit"
                         className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                       >
                         Request Access <ChevronRight className="w-4 h-4" />
                       </button>
                    </form>
                 ) : (
                    <div className="py-20 text-center animate-in zoom-in duration-300">
                      <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-blue-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Request Received</h3>
                      <p className="text-slate-400 max-w-sm mx-auto mb-8">
                        Our enterprise team will review your requirements. Expect an email at <span className="text-white font-mono">{formState.email}</span> within 24 hours.
                      </p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center text-slate-600 text-sm border-t border-slate-900">
        <p>&copy; 2024 Gateway Global AI. Enterprise Division.</p>
      </footer>
    </div>
  );
};

// Simple Icon component helper
function ShoppingCartIcon(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}
