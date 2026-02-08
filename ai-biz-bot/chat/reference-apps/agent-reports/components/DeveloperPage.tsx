
import React, { useState } from 'react';
import { 
  Terminal, Code, Users, Zap, Gift, Layout, Calendar, 
  ArrowLeft, CheckCircle2, ChevronRight, Github, Globe, 
  Cpu, Rocket, ShieldCheck, Mail
} from 'lucide-react';

interface DeveloperPageProps {
  onBack: () => void;
}

export const DeveloperPage: React.FC<DeveloperPageProps> = ({ onBack }) => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    github: '',
    idea: '',
    agreed: false
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock submission
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
            <Terminal className="w-5 h-5 text-violet-500" />
            Gateway<span className="text-slate-500">Global</span> Dev<span className="text-emerald-500 text-xs uppercase border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-1">Early Access</span>
          </span>
        </div>
        <a 
          href="#"
          className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
        >
          <Github className="w-4 h-4" />
          GitHub
        </a>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/20 rounded-full blur-[100px] opacity-30 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-violet-400 mb-4 animate-in fade-in slide-in-from-bottom-4">
            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            v0.1.0 Alpha Access
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6">
            Build the Future of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-emerald-400">
              AI Agents
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Join 2,437+ developers building on the most powerful agentic infrastructure. 
            Access SDKs, MCP Specs, and direct API tools before public launch.
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-12">
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm hover:border-violet-500/30 transition-colors group">
              <div className="text-2xl font-black text-white mb-1 group-hover:text-violet-400 transition-colors">MCP SDK</div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">MCP Marketplace</div>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm hover:border-blue-500/30 transition-colors group">
              <div className="text-2xl font-black text-white mb-1 group-hover:text-blue-400 transition-colors">Telephony SDK</div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Twilio Voice</div>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm hover:border-emerald-500/30 transition-colors group">
              <div className="text-2xl font-black text-white mb-1 group-hover:text-emerald-400 transition-colors">Agent ADK</div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Rapid Deployment</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6 bg-slate-900/30 border-y border-slate-900">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">Early Access Benefits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Zap, title: "First to Build", desc: "Get SDK & API access before public launch.", color: "text-amber-400" },
              { icon: Users, title: "Founder Access", desc: "Weekly office hours with the core engineering team.", color: "text-blue-400" },
              { icon: Gift, title: "Lifetime Discount", desc: "50% off platform fees for early builders.", color: "text-emerald-400" },
              { icon: Layout, title: "Marketplace Priority", desc: "Featured placement for your integrations.", color: "text-violet-400" }
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors group">
                <div className={`w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline & Form Container */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* Roadmap */}
          <div className="space-y-8">
            <h2 className="text-3xl font-bold mb-8">Platform Roadmap</h2>
            <div className="space-y-0 relative border-l-2 border-slate-800 ml-4">
              {[
                { date: "Now", title: "Early Access Signups", desc: "Join waitlist, get development updates.", active: true },
                { date: "Week 2", title: "First 100 Invites", desc: "SDK alpha, documentation access." },
                { date: "Month 1", title: "MCP Specification", desc: "Build Model Context Protocol servers." },
                { date: "Month 2", title: "Public Beta Launch", desc: "Full platform access, marketplace opens." }
              ].map((item, i) => (
                <div key={i} className="relative pl-8 pb-12 last:pb-0">
                  <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-slate-950 ${item.active ? 'bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]' : 'bg-slate-800'}`} />
                  <div className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-1">{item.date}</div>
                  <h3 className={`text-xl font-bold mb-2 ${item.active ? 'text-white' : 'text-slate-400'}`}>{item.title}</h3>
                  <p className="text-slate-500 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Waitlist Form */}
          <div className="relative">
             <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/10 to-emerald-600/10 rounded-3xl blur-2xl" />
             <div className="relative bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
                {!isSubmitted ? (
                  <>
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-white mb-2">Join the Waitlist</h2>
                      <p className="text-slate-400">Limited to the first 5,000 developers.</p>
                      <div className="mt-4 flex items-center gap-2 text-sm font-mono text-emerald-400 bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-500/20 w-fit">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Spots remaining: 2,563
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                        <input 
                          type="text" 
                          required
                          value={formState.name}
                          onChange={e => setFormState({...formState, name: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none transition-all"
                          placeholder="Jane Doe"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                        <input 
                          type="email" 
                          required
                          value={formState.email}
                          onChange={e => setFormState({...formState, email: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none transition-all"
                          placeholder="dev@company.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">GitHub Profile URL</label>
                        <div className="relative">
                          <Github className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                          <input 
                            type="url" 
                            required
                            value={formState.github}
                            onChange={e => setFormState({...formState, github: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:border-violet-500 outline-none transition-all"
                            placeholder="github.com/username"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">What will you build?</label>
                        <textarea 
                          value={formState.idea}
                          onChange={e => setFormState({...formState, idea: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none transition-all min-h-[100px]"
                          placeholder="I want to build an agent that..."
                        />
                      </div>

                      <div className="pt-2">
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <div className={`mt-1 w-4 h-4 rounded border flex items-center justify-center transition-colors ${formState.agreed ? 'bg-violet-600 border-violet-600' : 'border-slate-600 group-hover:border-slate-400'}`}>
                            {formState.agreed && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <input 
                            type="checkbox" 
                            required
                            className="hidden"
                            checked={formState.agreed}
                            onChange={e => setFormState({...formState, agreed: e.target.checked})}
                          />
                          <span className="text-xs text-slate-400 leading-relaxed">
                            I agree to receive development updates and accept the early access <a href="#" className="text-violet-400 hover:underline">Terms & Conditions</a>.
                          </span>
                        </label>
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-4 bg-gradient-to-r from-violet-600 to-emerald-600 hover:from-violet-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-violet-900/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                      >
                        Join Waitlist <ArrowLeft className="w-4 h-4 rotate-180" />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="py-20 text-center animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">You're on the list!</h3>
                    <p className="text-slate-400 max-w-sm mx-auto mb-8">
                      We've reserved your spot. Keep an eye on your inbox for your invite code.
                    </p>
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 inline-block text-left">
                       <p className="text-xs text-slate-500 uppercase font-bold mb-1">Your Position</p>
                       <p className="text-2xl font-mono text-emerald-400">#4,238</p>
                    </div>
                  </div>
                )}
             </div>
          </div>

        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 border-t border-slate-900">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-2xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          {[
            { q: "When will I get access?", a: "We're inviting developers in batches starting next week. You'll receive an email with next steps." },
            { q: "What's the tech stack?", a: "TypeScript/Node.js for the platform backend, MCP protocol for integrations, and support for multiple AI backends including Gemini and OpenAI." },
            { q: "Can I build commercial products?", a: "Yes! Our platform is designed for enterprise businesses. Early access includes commercial usage rights with a generous free tier." }
          ].map((item, i) => (
            <div key={i} className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-violet-500" />
                {item.q}
              </h3>
              <p className="text-slate-400 text-sm pl-6 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center text-slate-600 text-sm border-t border-slate-900">
        <p>&copy; 2024 Gateway Global AI. All rights reserved.</p>
      </footer>
    </div>
  );
};
