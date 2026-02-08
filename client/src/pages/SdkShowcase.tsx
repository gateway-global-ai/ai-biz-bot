import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare, X, Send, Mic, MicOff, Phone, Globe, Map, Settings,
  ChevronRight, ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
  Hotel, UtensilsCrossed, Plane, Calendar, Search, ArrowLeft,
  Volume2, VolumeX, Share2, Maximize2, Bot, User, Loader2,
  Mail, Video, FileText, CheckSquare, Building2, Shield,
  Copy, ExternalLink, Code2, Layers, Palette, Sparkles,
  Menu, Eye, EyeOff
} from 'lucide-react';

const ACCENT = '#6366f1';

const Section = ({ id, title, subtitle, children }: { id: string; title: string; subtitle: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24">
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-2" data-testid={`text-section-${id}`}>{title}</h2>
      <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">{subtitle}</p>
    </div>
    {children}
  </section>
);

const DemoFrame = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div className="relative bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
    <div className="absolute top-3 left-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
    <div className="pt-10 pb-6 px-4 flex items-center justify-center min-h-[420px]">
      {children}
    </div>
  </div>
);

const CodeBlock = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-indigo-300 overflow-x-auto leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
      <button
        className="absolute top-3 right-3 p-1.5 rounded-md bg-slate-800 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
        data-testid="button-copy-code"
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      >
        {copied ? <span className="text-[10px] text-green-400">Copied</span> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};

function TogglePanelDemo() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    gmail: true, calendar: true, drive: false, meet: false, chat: true, sheets: false, docs: false, tasks: true, business: true
  });
  const items = [
    { key: 'gmail', label: 'Gmail', desc: 'Business email integration', icon: 'M', color: '#ef4444' },
    { key: 'calendar', label: 'Google Calendar', desc: 'Schedule & appointment syncing', icon: 'C', color: '#3b82f6' },
    { key: 'drive', label: 'Google Drive', desc: 'File storage & document sharing', icon: 'D', color: '#f59e0b' },
    { key: 'meet', label: 'Google Meet', desc: 'Video conferencing integration', icon: 'V', color: '#10b981' },
    { key: 'chat', label: 'Google Chat', desc: 'Team messaging & collaboration', icon: 'G', color: '#22c55e' },
    { key: 'sheets', label: 'Google Sheets', desc: 'Spreadsheet data synchronization', icon: 'S', color: '#34d399' },
    { key: 'docs', label: 'Google Docs', desc: 'Document creation & management', icon: 'D', color: '#6366f1' },
    { key: 'tasks', label: 'Google Tasks', desc: 'Task tracking & to-do lists', icon: 'T', color: '#8b5cf6' },
    { key: 'business', label: 'Google My Business', desc: 'Business Profile management', icon: 'B', color: '#2563eb' },
  ];
  const toggle = (key: string) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  const activeCount = Object.values(toggles).filter(Boolean).length;

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden" data-testid="demo-toggle-panel">
      <div className="bg-emerald-600 px-5 py-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-sm">Google Workspace</h3>
          <p className="text-emerald-100 text-xs">Manage your connected Google Apps</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">{activeCount}</span>
          </div>
          <X className="w-4 h-4 text-white/60 cursor-pointer" />
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-slate-700">Connected & Active</span>
          <span className="text-[10px] text-slate-400 ml-auto">{activeCount} of {items.length} active</span>
        </div>

        <div className="grid grid-cols-2 gap-3 max-h-[280px] overflow-y-auto">
          {items.map(item => (
            <div key={item.key} className={`p-3 rounded-xl border transition-all ${toggles[item.key] ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: item.color }}>{item.icon}</div>
                  <span className="text-xs font-semibold text-slate-800">{item.label}</span>
                </div>
                <button onClick={() => toggle(item.key)} className="relative w-10 h-5 rounded-full transition-colors" style={{ background: toggles[item.key] ? '#10b981' : '#cbd5e1' }} data-testid={`toggle-${item.key}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${toggles[item.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">{item.desc}</p>
              <p className={`text-[10px] font-medium mt-1 ${toggles[item.key] ? 'text-emerald-600' : 'text-slate-400'}`}>
                {toggles[item.key] ? 'Syncing Active' : 'Disconnected'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
        <button className="px-6 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg" data-testid="button-toggle-done">Done</button>
      </div>
    </div>
  );
}

function OverlayMenuDemo() {
  const [isOpen, setIsOpen] = useState(true);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const navItems = [
    { key: 'chat', label: 'CHAT', icon: MessageSquare, color: '#818cf8' },
    { key: 'browser', label: 'BROWSER', icon: Globe, color: '#60a5fa' },
    { key: 'map', label: 'MAP', icon: Map, color: '#34d399' },
    { key: 'settings', label: 'AI SETTINGS', icon: Settings, color: '#a78bfa' },
  ];
  const categories = [
    { key: 'hotels', label: 'Hotels', icon: Hotel, color: '#10b981' },
    { key: 'dining', label: 'Dining', icon: UtensilsCrossed, color: '#f59e0b' },
    { key: 'flights', label: 'Flights', icon: Plane, color: '#3b82f6' },
    { key: 'events', label: 'Events', icon: Calendar, color: '#8b5cf6' },
  ];

  return (
    <div className="w-full max-w-lg mx-auto" data-testid="demo-overlay-menu">
      <div className="relative bg-slate-950 rounded-2xl overflow-hidden shadow-2xl" style={{ height: 420 }}>
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/80 to-slate-950" />

        {isOpen ? (
          <div className="relative h-full flex flex-col">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 left-4 w-10 h-10 rounded-full border border-slate-600 flex items-center justify-center text-slate-400 z-10" data-testid="button-overlay-close">
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-center gap-6 pt-16 pb-6">
              {navItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => setActivePanel(item.key)}
                  className={`flex flex-col items-center gap-2 transition-all ${activePanel === item.key ? 'scale-110' : ''}`}
                  data-testid={`button-nav-${item.key}`}
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-colors" style={{ borderColor: activePanel === item.key ? item.color : 'rgba(255,255,255,0.15)', background: activePanel === item.key ? `${item.color}15` : 'transparent' }}>
                    <item.icon className="w-6 h-6" style={{ color: item.color }} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: activePanel === item.key ? item.color : '#94a3b8' }}>{item.label}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 mx-4 mb-4 bg-white rounded-2xl overflow-hidden">
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
                  <Globe className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Where to next?</h3>
                <p className="text-xs text-slate-500 mb-6">Use the chat to research or search specifically below.</p>
                <div className="flex gap-4">
                  {categories.map(cat => (
                    <button key={cat.key} className="flex flex-col items-center gap-2 group" data-testid={`button-cat-${cat.key}`}>
                      <div className="w-12 h-12 rounded-xl border border-slate-200 flex items-center justify-center transition-colors group-hover:border-indigo-300 group-hover:bg-indigo-50">
                        <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
                      </div>
                      <span className="text-[10px] font-medium text-slate-600">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 bg-slate-800 rounded-full px-4 py-3">
                <input className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none" placeholder="Ask TravelGenie..." readOnly />
                <button className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center" data-testid="button-overlay-send"><Send className="w-4 h-4 text-white" /></button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative h-full flex items-center justify-center">
            <button onClick={() => setIsOpen(true)} className="flex flex-col items-center gap-3" data-testid="button-overlay-open">
              <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Menu className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-semibold text-slate-400">Tap to open overlay</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function IconToolbarDemo() {
  const [activeIcon, setActiveIcon] = useState('globe');
  const [voiceActive, setVoiceActive] = useState(false);
  const icons = [
    { key: 'globe', icon: Globe, label: 'Web Search' },
    { key: 'phone', icon: Phone, label: 'Telephony' },
    { key: 'share', icon: Share2, label: 'Share' },
    { key: 'expand', icon: Maximize2, label: 'Expand' },
  ];
  const tabs = ['Provisioning', 'Configuration', 'Firewall', 'Diagnostics', 'Call History'];
  const [activeTab, setActiveTab] = useState('Provisioning');

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800" data-testid="demo-icon-toolbar">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Settings className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <span className="text-sm font-bold text-white">The Agent Architect</span>
            <span className="text-xs text-slate-500 ml-1">@ Gateway Global AI</span>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              <span className="text-[10px] text-yellow-500 uppercase font-semibold tracking-wider">IDLE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setVoiceActive(!voiceActive)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors ${voiceActive ? 'bg-red-600/20 border-red-500/50 text-red-400' : 'bg-violet-600 border-violet-500 text-white'}`}
            data-testid="button-voice-toggle"
          >
            {voiceActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            {voiceActive ? 'STOP VOICE' : 'START VOICE'}
          </button>
          {icons.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveIcon(item.key)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${activeIcon === item.key ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              data-testid={`button-icon-${item.key}`}
            >
              <item.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {activeIcon === 'phone' ? (
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <button className="text-slate-400 hover:text-white" data-testid="button-back"><ArrowLeft className="w-5 h-5" /></button>
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Phone className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-white font-bold">Telephony Control Panel</h3>
              <span className="text-[10px] text-yellow-500 uppercase font-semibold tracking-wider">TRUNK: UNPROVISIONED</span>
            </div>
            <span className="ml-auto text-xs text-slate-500 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-500" /> OFFLINE</span>
          </div>

          <div className="flex gap-1 mb-4 bg-slate-900 rounded-xl p-1">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-2 py-2 rounded-lg text-[10px] font-semibold transition-colors ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                data-testid={`button-tab-${tab.toLowerCase()}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="bg-slate-900 rounded-xl border border-dashed border-indigo-500/30 p-4">
            <h4 className="font-bold text-white text-sm mb-1">Number Provisioning</h4>
            <p className="text-[10px] text-slate-400 mb-4">Acquire and configure SIP trunking numbers.</p>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-slate-800 rounded-xl px-4 py-3 border border-slate-700">
                <span className="text-xs text-slate-500">US +1</span>
                <input className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none" placeholder="Area Code (e.g. 415)" readOnly />
              </div>
              <button className="px-5 py-3 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs font-semibold flex items-center gap-1.5" data-testid="button-search-numbers">
                <Search className="w-4 h-4" /> Search
              </button>
            </div>
          </div>
        </div>
      ) : voiceActive ? (
        <div className="flex flex-col items-center justify-center py-12 gap-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center relative z-10">
              <Volume2 className="w-8 h-8 text-slate-300" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-white font-bold">Agent Speaking...</h3>
            <p className="text-xs text-slate-500">Natural voice interaction active. Speaker: Zephyr</p>
          </div>
          <div className="flex gap-0.5 items-end h-10">
            {Array.from({ length: 30 }).map((_, i) => {
              const h = Math.max(3, Math.sin(i * 0.3) * 20 + Math.random() * 15);
              return <div key={i} className="w-1.5 rounded-full transition-all" style={{ height: h, background: `linear-gradient(to top, #a78bfa, #c084fc)` }} />;
            })}
          </div>
          <button onClick={() => setVoiceActive(false)} className="px-6 py-2.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-semibold flex items-center gap-2" data-testid="button-end-conversation">
            <X className="w-4 h-4" /> End Conversation
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <MessageSquare className="w-12 h-12 text-slate-700 mb-4" />
          <h3 className="text-slate-500 font-bold">Interactive Simulation</h3>
          <p className="text-xs text-slate-600 mt-1">Start a voice session or chat manually below.</p>
        </div>
      )}

      <div className="px-4 pb-4">
        <div className="flex items-center gap-2">
          <input className="flex-1 bg-slate-800 rounded-full px-5 py-3 text-sm text-white placeholder:text-slate-600 outline-none border border-slate-700" placeholder="Message agent..." readOnly />
          <button className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center" data-testid="button-toolbar-send"><Send className="w-4 h-4 text-white" /></button>
          <button className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400" data-testid="button-toolbar-mic"><Mic className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
}

function SplitPanelDemo() {
  const [panelOpen, setPanelOpen] = useState(true);
  const sliders = [
    { label: 'DOMINANCE', value: 45, color: '#ef4444' },
    { label: 'INFLUENCE', value: 30, color: '#f59e0b' },
    { label: 'STEADINESS', value: 55, color: '#22c55e' },
    { label: 'CONSCIENTIOUS', value: 90, color: '#3b82f6' },
  ];
  const archSliders = [
    { label: 'BUSINESS DETAILS', value: 90, color: '#94a3b8' },
    { label: 'ENTHUSIASM', value: 30, color: '#f59e0b' },
    { label: 'ENVIRONMENT', value: 40, color: '#22c55e' },
    { label: 'EXPERIENCE', value: 80, color: '#8b5cf6' },
    { label: 'PAY', value: 10, color: '#22c55e' },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex" style={{ height: 460 }} data-testid="demo-split-panel">
      {panelOpen && (
        <div className="w-60 border-r border-slate-800 flex flex-col overflow-y-auto">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Agent DNA</span>
            </div>
            <button onClick={() => setPanelOpen(false)} className="text-slate-500" data-testid="button-close-panel"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-4 space-y-5 flex-1">
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Active Capabilities</h4>
              <span className="inline-block px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-[10px] text-slate-300 font-medium">GEMINI SEARCH</span>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Cognitive Profile</h4>
              <svg viewBox="0 0 120 120" className="w-24 h-24 mx-auto mb-3">
                <polygon points="60,10 110,60 60,110 10,60" fill="none" stroke="rgba(99,102,241,0.2)" strokeWidth="1" />
                <polygon points="60,30 90,60 60,90 30,60" fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth="1" />
                <polygon points={`60,${60-45*0.45} ${60+90*0.30},60 60,${60+55*0.55} ${60-90*0.90},60`} fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.6)" strokeWidth="1.5" />
                <text x="60" y="8" textAnchor="middle" className="text-[8px] fill-slate-400 font-semibold">D</text>
                <text x="115" y="63" textAnchor="middle" className="text-[8px] fill-slate-400 font-semibold">I</text>
                <text x="60" y="118" textAnchor="middle" className="text-[8px] fill-slate-400 font-semibold">S</text>
                <text x="5" y="63" textAnchor="middle" className="text-[8px] fill-slate-400 font-semibold">C</text>
              </svg>
              <div className="space-y-2.5">
                {sliders.map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-[9px] mb-1">
                      <span className="text-slate-500 font-semibold">{s.label}</span>
                      <span className="font-bold" style={{ color: s.color }}>{s.value}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full relative">
                      <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: s.color }} />
                      <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-slate-950" style={{ left: `${s.value}%`, transform: `translateX(-50%) translateY(-50%)`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Brand Awareness</h4>
              <div className="space-y-2">
                {archSliders.map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-[9px] mb-1">
                      <span className="text-slate-500 font-semibold">{s.label}</span>
                      <span className="font-bold" style={{ color: s.color }}>{s.value}%</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {!panelOpen && (
          <button onClick={() => setPanelOpen(true)} className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 z-10" data-testid="button-open-panel">
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <MessageSquare className="w-10 h-10 text-slate-700 mb-3" />
          <h3 className="text-slate-500 font-bold text-sm">Interactive Simulation</h3>
          <p className="text-[11px] text-slate-600 mt-1">Start a voice session or chat manually below.</p>
        </div>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <input className="flex-1 bg-slate-800 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none" placeholder="Message agent..." readOnly />
            <button className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center"><Send className="w-4 h-4 text-white" /></button>
            <button className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"><Mic className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingWidgetDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant' as const, content: 'Hello! How can I help you today?' },
  ]);
  const [inputVal, setInputVal] = useState('');

  const doSend = () => {
    if (!inputVal.trim()) return;
    setMessages(prev => [...prev, { role: 'user' as const, content: inputVal }]);
    setInputVal('');
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: "Thanks for your message! I'm a demo widget powered by the Gateway SDK." }]);
    }, 800);
  };

  return (
    <div className="relative w-full max-w-lg mx-auto" style={{ height: 420 }} data-testid="demo-floating-widget">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 flex items-center justify-center">
        <div className="text-center opacity-30">
          <Globe className="w-16 h-16 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Your website content here</p>
        </div>
      </div>

      {isOpen && (
        <div className="absolute bottom-20 right-4 w-80 bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden z-20" style={{ height: 340 }}>
          <div className="px-4 py-3 flex items-center gap-3" style={{ background: ACCENT }}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">A</div>
            <div className="flex-1">
              <div className="text-sm font-bold text-white">Aria</div>
              <div className="text-[10px] text-white/70 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online</div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-white" data-testid="button-widget-close"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm' : 'bg-white text-slate-800 rounded-2xl rounded-bl-sm border border-slate-200 shadow-sm'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          <div className="p-2.5 bg-white border-t border-slate-100">
            <div className="flex gap-2">
              <input value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSend()} className="flex-1 bg-slate-100 rounded-full px-3 py-2 text-xs outline-none text-slate-800 placeholder:text-slate-400" placeholder="Type a message..." data-testid="input-widget-message" />
              <button onClick={doSend} className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ background: ACCENT }} data-testid="button-widget-send"><Send className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute bottom-4 right-4 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg z-20 transition-transform hover:scale-105"
        style={{ background: ACCENT, boxShadow: '0 4px 24px rgba(99,102,241,0.4)' }}
        data-testid="button-fab"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  );
}

function CategoryGridDemo() {
  const [selected, setSelected] = useState<string | null>(null);
  const categories = [
    { key: 'email', label: 'Email', desc: 'Send campaigns', icon: Mail, color: '#ef4444' },
    { key: 'video', label: 'Video', desc: 'Meeting tools', icon: Video, color: '#3b82f6' },
    { key: 'docs', label: 'Documents', desc: 'Create & edit', icon: FileText, color: '#f59e0b' },
    { key: 'tasks', label: 'Tasks', desc: 'Track progress', icon: CheckSquare, color: '#22c55e' },
    { key: 'crm', label: 'CRM', desc: 'Manage leads', icon: Building2, color: '#8b5cf6' },
    { key: 'security', label: 'Security', desc: 'Access control', icon: Shield, color: '#ec4899' },
  ];

  return (
    <div className="w-full max-w-sm mx-auto" data-testid="demo-category-grid">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-slate-900">
          <h3 className="text-white font-bold text-sm">Quick Actions</h3>
          <p className="text-slate-400 text-[10px] mt-0.5">Select a category to get started</p>
        </div>
        <div className="p-4 grid grid-cols-3 gap-3">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setSelected(selected === cat.key ? null : cat.key)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${selected === cat.key ? 'border-indigo-500 bg-indigo-50 scale-105' : 'border-slate-100 bg-white hover:border-slate-200'}`}
              data-testid={`button-grid-${cat.key}`}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${cat.color}15` }}>
                <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
              </div>
              <span className="text-[11px] font-semibold text-slate-700">{cat.label}</span>
              <span className="text-[9px] text-slate-400">{cat.desc}</span>
            </button>
          ))}
        </div>
        {selected && (
          <div className="px-5 pb-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
              <p className="text-xs text-indigo-700 font-medium">
                {categories.find(c => c.key === selected)?.label} panel would load here
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const NAV_SECTIONS = [
  { id: 'philosophy', label: 'Design Philosophy' },
  { id: 'floating', label: 'Floating Widget' },
  { id: 'overlay', label: 'Multi-Path Overlay' },
  { id: 'toolbar', label: 'Icon Toolbar + Tabs' },
  { id: 'split', label: 'Split Panel + DNA' },
  { id: 'toggles', label: 'Toggle Panel' },
  { id: 'grid', label: 'Category Grid' },
  { id: 'install', label: 'Installation' },
];

export default function SdkShowcase() {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white" data-testid="text-sdk-title">Gateway Chat SDK</h1>
              <p className="text-[10px] text-slate-500">Component Library & Design System</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {NAV_SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors" data-testid={`link-nav-${s.id}`}>{s.label}</a>
            ))}
          </div>
          <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden text-slate-400" data-testid="button-mobile-nav">
            <Menu className="w-5 h-5" />
          </button>
        </div>
        {mobileNav && (
          <div className="md:hidden border-t border-slate-800 px-6 py-3 flex flex-wrap gap-2">
            {NAV_SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} onClick={() => setMobileNav(false)} className="px-3 py-1.5 text-xs text-slate-400 bg-slate-800/50 rounded-lg">{s.label}</a>
            ))}
          </div>
        )}
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-20">
        <Section id="philosophy" title="Design Philosophy" subtitle="How the iPhone teaches us to manage complexity with simplicity.">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-white">The iPhone Principle</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                How many phone designs exist today? Not many. They almost all look the same. 
                An iPhone has thousands of apps and features, yet manages everything with 
                essentially <strong className="text-white">one button</strong>. Volume controls and power aside, 
                the entire experience flows from a single home button.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                Our SDK follows this same principle: <strong className="text-white">manage lots of features through 
                minimal controls</strong>. One button, or maybe two. The rest happens through overlays, 
                toggles, and multi-path menus.
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center">
                <Layers className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Multi-Path Navigation</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Chat headers and footers don't need to be thin bars with single-purpose buttons. 
                Instead, use <strong className="text-white">overlays as intermediate steps</strong>: 
                click to open, make a selection, then view content.
              </p>
              <div className="space-y-2 pt-2">
                {['1 button opens an overlay with all options', 'Toggle switches for features on/off', 'Icon toolbars expand into full panels', 'Category grids as multi-path selectors', 'Split panels: chat + functional content'].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-indigo-600/10 via-violet-600/10 to-purple-600/10 border border-indigo-500/20 rounded-2xl p-6 mt-6">
            <h3 className="text-base font-bold text-white mb-3">The Vision: Become the AI Chat Dependency</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Just like shadcn/ui gives developers beautiful, composable UI components, 
              Gateway Chat SDK provides <strong className="text-white">composable chat interface 
              patterns</strong> that any developer can embed, customize, and extend. 
              These aren't just widgets - they're <strong className="text-white">battle-tested patterns</strong> refined 
              over 2+ years of building production AI interfaces.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {['Floating Widget', 'Split Panel', 'Overlay Menu', 'Icon Toolbar', 'Toggle Panel', 'Category Grid', 'Voice Visualizer', 'Tab Navigation'].map(tag => (
                <span key={tag} className="px-3 py-1 bg-indigo-600/15 border border-indigo-500/20 rounded-full text-[10px] font-semibold text-indigo-300">{tag}</span>
              ))}
            </div>
          </div>
        </Section>

        <Section id="floating" title="Floating Chat Widget" subtitle="The classic pattern. A FAB in the corner, a chat card that pops open. One script tag, zero setup. Shadow DOM for complete CSS isolation.">
          <div className="grid lg:grid-cols-2 gap-6">
            <DemoFrame label="INTERACTIVE DEMO">
              <FloatingWidgetDemo />
            </DemoFrame>
            <div className="space-y-4">
              <CodeBlock code={`<!-- One-line install -->
<script
  src="https://gateway.ai/sdk/chat.js"
  data-bot-id="your-bot-id"
  data-color="#6366f1"
  data-voice="true"
></script>`} />
              <CodeBlock code={`// Programmatic control
const chat = GatewayChat.init({
  botId: 'your-bot-id',
  theme: { primaryColor: '#6366f1' },
  voice: { enabled: true },
  onMessage: (msg) => {
    analytics.track('chat_message', msg);
  }
});

// Open from a custom button
document.getElementById('help')
  .onclick = () => chat.open();`} />
            </div>
          </div>
        </Section>

        <Section id="overlay" title="Multi-Path Overlay Menu" subtitle="One button opens a full overlay with icon navigation, category cards, and contextual content. The user chooses their path, then dives into the content. Like an iPhone home screen inside your chat.">
          <div className="grid lg:grid-cols-2 gap-6">
            <DemoFrame label="INTERACTIVE DEMO">
              <OverlayMenuDemo />
            </DemoFrame>
            <div className="space-y-4">
              <CodeBlock code={`<GatewayOverlay
  nav={[
    { key: 'chat', icon: 'message', label: 'Chat' },
    { key: 'browser', icon: 'globe', label: 'Browser' },
    { key: 'map', icon: 'map', label: 'Map' },
    { key: 'settings', icon: 'settings', label: 'AI Settings' }
  ]}
  categories={[
    { key: 'hotels', icon: 'hotel', label: 'Hotels' },
    { key: 'dining', icon: 'utensils', label: 'Dining' },
    { key: 'flights', icon: 'plane', label: 'Flights' }
  ]}
  onNavigate={(key) => loadPanel(key)}
/>`} />
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-white">Pattern Highlights</h4>
                {['Single button to open / close entire navigation', 'Icon nav row = multi-path selection (not single-path links)', 'Content area changes based on selection', 'Category grid provides quick-access shortcuts', 'Footer input persists across all views'].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
                    <ChevronRight className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section id="toolbar" title="Icon Toolbar + Tab Panels" subtitle="A compact header toolbar where each icon opens a different functional panel. Combined with horizontal tabs for sub-navigation within panels. Voice toggle switches the entire view to an immersive speaking mode.">
          <DemoFrame label="INTERACTIVE DEMO - Click icons and voice button">
            <IconToolbarDemo />
          </DemoFrame>
        </Section>

        <Section id="split" title="Split Panel: Chat + Agent DNA" subtitle="Chat on the right, a functional sidebar on the left with DISC profile sliders, brand awareness metrics, and communication model visualization. The sidebar can collapse to give chat full width.">
          <DemoFrame label="INTERACTIVE DEMO - Toggle the sidebar">
            <SplitPanelDemo />
          </DemoFrame>
        </Section>

        <Section id="toggles" title="Toggle Panel (Settings Overlay)" subtitle="A single overlay with toggle switches for enabling/disabling features. Like the Google Workspace panel - shows connection status, has a grid of services, each with a toggle. One 'Done' button to close.">
          <div className="grid lg:grid-cols-2 gap-6">
            <DemoFrame label="INTERACTIVE DEMO - Flip the toggles">
              <TogglePanelDemo />
            </DemoFrame>
            <div className="space-y-4">
              <CodeBlock code={`<GatewayTogglePanel
  title="Connected Services"
  items={[
    { key: 'gmail', label: 'Gmail',
      desc: 'Email integration',
      enabled: true },
    { key: 'calendar', label: 'Calendar',
      desc: 'Schedule syncing',
      enabled: true },
    { key: 'drive', label: 'Drive',
      desc: 'File sharing',
      enabled: false },
  ]}
  onToggle={(key, value) => {
    updateIntegration(key, value);
  }}
  onDone={() => closeOverlay()}
/>`} />
            </div>
          </div>
        </Section>

        <Section id="grid" title="Category Grid (Quick Actions)" subtitle="A grid of icon+label cards that let users pick a category or action. Tapping one selects it and can load a sub-panel, start a flow, or filter content. Like iPhone app icons in a composable format.">
          <div className="grid lg:grid-cols-2 gap-6">
            <DemoFrame label="INTERACTIVE DEMO - Tap a category">
              <CategoryGridDemo />
            </DemoFrame>
            <div className="space-y-4">
              <CodeBlock code={`<GatewayCategoryGrid
  items={[
    { key: 'email', label: 'Email',
      desc: 'Send campaigns',
      icon: 'mail', color: '#ef4444' },
    { key: 'video', label: 'Video',
      desc: 'Meeting tools',
      icon: 'video', color: '#3b82f6' },
    // ...
  ]}
  columns={3}
  onSelect={(key) => openPanel(key)}
/>`} />
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-white">Use Cases</h4>
                {['Chat quick actions (Hotels, Flights, Events)', 'Admin panel feature launcher', 'Settings category selector', 'Onboarding step picker', 'Bot capability menu'].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
                    <ChevronRight className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section id="install" title="Installation" subtitle="Add Gateway Chat SDK to any website or application.">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Script Tag (Simplest)</h3>
              <CodeBlock code={`<!-- Drop this anywhere in your HTML -->
<script
  src="https://gateway.ai/sdk/gateway-chat.js"
  data-bot-id="your-bot-id"
  data-color="#6366f1"
  data-bot-name="Aria"
  data-voice="true"
  data-auto-open="false"
></script>`} />
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">NPM Package</h3>
              <CodeBlock code={`npm install @gateway-global/chat-sdk`} />
              <CodeBlock code={`import { GatewayChat } from '@gateway-global/chat-sdk';

const widget = GatewayChat.init({
  botId: 'your-bot-id',
  apiBase: 'https://your-gateway.com',
  position: 'bottom-right',
  theme: {
    primaryColor: '#6366f1',
    borderRadius: '24px',
  },
  voice: { enabled: true },
  botName: 'Aria',
  greetingMessage: 'Hey! How can I help?',
  onOpen: () => analytics.track('chat_opened'),
  onMessage: (msg) => analytics.track('message', msg),
});

// Programmatic API
widget.open();
widget.close();
widget.sendMessage('Hello!');
widget.destroy();`} />
            </div>
          </div>

          <div className="mt-8 bg-gradient-to-r from-indigo-600/10 via-violet-600/10 to-purple-600/10 border border-indigo-500/20 rounded-2xl p-6 text-center">
            <h3 className="text-lg font-bold text-white mb-2">Open Source</h3>
            <p className="text-sm text-slate-400 mb-4">
              All widget patterns above are available as standalone, composable components. 
              Fork, customize, and embed them in any project.
            </p>
            <div className="flex justify-center flex-wrap gap-3">
              <a href="https://github.com/gateway-global/chat-sdk" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 rounded-lg text-xs font-bold" data-testid="link-github">
                <Code2 className="w-4 h-4" /> View on GitHub
              </a>
              <a href="#floating" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-bold" data-testid="link-examples">
                <Eye className="w-4 h-4" /> View Examples
              </a>
              <a href="/sdk/google-places" className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold" data-testid="link-google-places-sdk">
                <Globe className="w-4 h-4" /> Google Places SDK
              </a>
            </div>
          </div>
        </Section>
      </div>

      <footer className="border-t border-slate-800 py-8 text-center space-y-2">
        <div className="flex justify-center gap-4 text-xs">
          <a href="/sdk/google-places" className="text-slate-500 hover:text-indigo-400 transition-colors" data-testid="link-footer-google-places">Google Places SDK</a>
        </div>
        <p className="text-xs text-slate-600">Gateway Global AI - Chat SDK v1.0.0</p>
      </footer>
    </div>
  );
}
