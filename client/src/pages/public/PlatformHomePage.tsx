/**
 * PlatformHomePage — The AI OS entry point at /
 *
 * OS boot sequence: booting → ready (START) → active (ConciergePanel + start menu)
 * Products section below the chat interface.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, MessageSquare, Mic, Loader2, Star, Power, User, Sparkles, BookOpen } from 'lucide-react';
import { ConciergePanel } from '@/components/chat/ConciergePanel';
import { VoiceClientFactory } from '@/services/voice/VoiceClientFactory';
import { BusinessContext, AgentConfig } from '@/types/voice';
import AIOSMark from '@/components/public/AIOSMark';
import { BRAND } from '@/config/brand';
import NovaGate from '@/components/nova/NovaGate';

// ─── Home page launcher menu — navigates to pages, not the agent view router ──
const HOME_MENU = [
  { id: 'demo',   label: 'Try a Demo',     icon: Mic,      desc: 'Talk to Nova — no account needed', href: '/agent/ai-biz-bots' },
  { id: 'login',  label: 'Log In',         icon: User,     desc: 'Access your existing workspace',   href: '/login' },
  { id: 'signup', label: 'Get Started',    icon: Sparkles, desc: 'Start your AI OS subscription',   href: '/buy' },
  { id: 'learn',  label: 'How It Works',   icon: BookOpen, desc: 'See the AI OS in action',          href: '/more-info' },
] as const;

type OSPhase = 'booting' | 'ready' | 'active';
// ─── Platform business context ────────────────────────────────────────────────

const PLATFORM_BUSINESS: BusinessContext = {
  id: 'platform_landing',
  placeId: '',
  name: 'Gateway Global AI',
  address: 'AI Business Infrastructure Platform',
  services: ['AI Voice Concierge', 'Smart QR Routing', 'SMS Automation', 'Lead Intelligence'],
  primaryColor: '#6366f1',
  workspaceState: 'active',
  claimStatus: null,
  ownerId: null,
  plan: 'enterprise',
};

const PLATFORM_AGENT: AgentConfig = {
  role: 'AI Platform Concierge',
  personality: 'Warm, confident, and concise — a knowledgeable guide to the Gateway Global AI platform',
  objectives: [
    'Open with a single natural spoken greeting — no reasoning, no markdown, just speak',
    'Introduce Gateway Global AI and its four core products: AI OS Platform, ClearVoice AI, Clear View Front Desk, and Industry Applications',
    'Offer to run a live demo, answer pricing questions, or route the visitor to sign up',
    'Keep every response under 3 sentences when speaking',
  ],
  constraints: [
    'NEVER output markdown, bullet points, bold text, or headings — you are speaking aloud',
    'NEVER reason out loud or explain your thought process',
    'When a visitor says "Hello" or joins — immediately give your opening greeting and nothing else',
    'Opening line must be: "Hi, I\'m Nova, your Gateway Global AI concierge. Welcome — I can show you our AI OS platform, walk you through a live demo, or answer any questions. What brings you here today?"',
  ],
};

// ─── Canonical product definitions — used for idle canvas + fallback ─────────

const CANONICAL_PRODUCTS = [
  {
    id: 'fp-1',
    name: 'AI OS Platform',
    description: 'Complete AI Voice Agents with smart routing, lead intelligence, and full business automation.',
    price: 49, priceUnit: '/mo', type: 'subscription',
    img: '/ai_os_platform.png',
    accent: 'indigo',
    tagline: 'AI Voice Agents',
  },
  {
    id: 'fp-2',
    name: 'ClearVoice AI',
    description: 'Sub-150ms native multimodal voice AI. Studio-quality calls with full analytics and transcription.',
    price: 50, priceUnit: '/mo', type: 'subscription',
    img: '/ai_os_voice_services.png',
    accent: 'violet',
    tagline: 'AI Voice + Data',
  },
  {
    id: 'fp-3',
    name: 'Clear View',
    description: 'AI-powered front desk dashboard — real-time call tracking, lead scoring, and customer insights.',
    price: 49, priceUnit: '/mo', type: 'subscription',
    img: '/ai_os_clearview.png',
    accent: 'emerald',
    tagline: 'AI Dashboard',
  },
  {
    id: 'fp-4',
    name: 'AI OS Team',
    description: 'Industry-specific AI agent packs pre-configured for healthcare, legal, hospitality, and more.',
    price: null, priceUnit: null, type: 'service',
    img: '/ai_os_team.png',
    accent: 'amber',
    tagline: 'Industry Apps',
  },
  {
    id: 'fp-5',
    name: 'Clear ID',
    description: 'Identity verification — phone OTP, biometric, and document verification for gating and compliance.',
    price: null, priceUnit: null, type: 'service',
    img: '/ai_os_verification.png',
    accent: 'sky',
    tagline: 'Verification',
    badge: 'Upsell',
  },
] as const;

// ─── Accent color maps ────────────────────────────────────────────────────────

const ACCENT_RING: Record<string, string> = {
  indigo: 'ring-indigo-400/30 hover:ring-indigo-400/60',
  violet: 'ring-violet-400/30 hover:ring-violet-400/60',
  emerald: 'ring-emerald-400/30 hover:ring-emerald-400/60',
  amber: 'ring-amber-400/30 hover:ring-amber-400/60',
  sky: 'ring-sky-400/30 hover:ring-sky-400/60',
};
const ACCENT_BTN: Record<string, string> = {
  indigo: 'bg-indigo-600 hover:bg-indigo-700',
  violet: 'bg-violet-600 hover:bg-violet-700',
  emerald: 'bg-emerald-600 hover:bg-emerald-700',
  amber: 'bg-amber-500 hover:bg-amber-600',
  sky: 'bg-sky-600 hover:bg-sky-700',
};
const ACCENT_BADGE: Record<string, string> = {
  indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-300/50',
  violet: 'bg-violet-500/10 text-violet-600 border-violet-300/50',
  emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-300/50',
  amber: 'bg-amber-500/10 text-amber-700 border-amber-300/50',
  sky: 'bg-sky-500/10 text-sky-600 border-sky-300/50',
};

// ─── Product card — white background, object-contain for brand images ────────

function ProductCard({
  product,
  onTalk,
  isOwner = false,
  onImageUpdated,
}: {
  product: any;
  onTalk: () => void;
  isOwner?: boolean;
  onImageUpdated?: (id: string, imageUrl: string) => void;
}) {
  const isFallback = product.id?.startsWith('fp-');

  const priceCents = product.priceCents ?? (product.price != null ? product.price * 100 : null);
  const priceLabel = product.priceUnit === 'included'
    ? 'Included'
    : priceCents != null && priceCents > 0
      ? `$${(priceCents / 100).toFixed(0)}${product.priceUnit ?? '/mo'}`
      : null;

  const canonicalMatch = CANONICAL_PRODUCTS.find(
    c => c.name === product.name || c.id === product.id
  );
  const accent = (product.accent ?? canonicalMatch?.accent ?? 'indigo') as string;
  const badge = product.badge ?? canonicalMatch?.badge ?? null;

  const [imgState, setImgState] = useState<{ url: string | null; loading: boolean; generating: boolean }>({
    url: product.imageUrl ?? canonicalMatch?.img ?? null,
    loading: false,
    generating: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    if (!file || isFallback) return;
    setImgState(s => ({ ...s, loading: true }));
    const form = new FormData();
    form.append('image', file);
    try {
      const res = await fetch(`/api/platform-products/${product.id}/image`, { method: 'POST', body: form });
      const data = await res.json();
      if (data.imageUrl) { setImgState({ url: data.imageUrl, loading: false, generating: false }); onImageUpdated?.(product.id, data.imageUrl); }
      else setImgState(s => ({ ...s, loading: false }));
    } catch { setImgState(s => ({ ...s, loading: false })); }
  };

  const handleGenerateImage = async () => {
    if (isFallback) return;
    setImgState(s => ({ ...s, generating: true }));
    try {
      const res = await fetch(`/api/platform-products/${product.id}/generate-image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (data.imageUrl) { setImgState({ url: data.imageUrl, loading: false, generating: false }); onImageUpdated?.(product.id, data.imageUrl); }
      else setImgState(s => ({ ...s, generating: false }));
    } catch { setImgState(s => ({ ...s, generating: false })); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className={`relative flex flex-col bg-white rounded-2xl shadow-md ring-2 transition-all duration-200 overflow-hidden ${ACCENT_RING[accent] ?? ACCENT_RING.indigo}`}
    >
      {/* Image area — white bg so light-bg brand images look correct */}
      <div className="relative w-full bg-white overflow-hidden" style={{ aspectRatio: '1/1' }}>
        {imgState.url ? (
          <img src={imgState.url} alt={product.name} className="w-full h-full object-contain p-3" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Zap size={36} className="text-slate-300" />
          </div>
        )}
        {badge && (
          <span className={`absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${ACCENT_BADGE[accent] ?? ACCENT_BADGE.indigo}`}>
            {badge}
          </span>
        )}
        {isOwner && !isFallback && (
          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={imgState.loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/90 text-slate-800 text-xs font-semibold shadow">
              {imgState.loading ? <Loader2 size={11} className="animate-spin" /> : '📁'} Upload
            </button>
            <button type="button" onClick={handleGenerateImage} disabled={imgState.generating}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow">
              {imgState.generating ? <Loader2 size={11} className="animate-spin" /> : '✨'} {imgState.generating ? 'Generating…' : 'AI Generate'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-4 bg-white border-t border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-slate-900 font-black text-sm leading-tight">{product.name}</h3>
          {priceLabel && (
            <span className="font-mono text-sm font-black text-emerald-600 shrink-0">{priceLabel}</span>
          )}
        </div>
        {product.description && (
          <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{product.description}</p>
        )}
        <button
          type="button"
          onClick={onTalk}
          className={`mt-1 w-full py-2 rounded-xl text-xs font-bold text-white transition-colors ${ACCENT_BTN[accent] ?? ACCENT_BTN.indigo}`}
        >
          Learn more →
        </button>
      </div>
    </motion.div>
  );
}

// ─── Platform idle canvas — shown in the chat area before conversation starts ──

function PlatformIdleCanvas({ connectionStatus }: { connectionStatus: 'disconnected' | 'connecting' | 'connected' }) {
  const [active, setActive] = useState(0);
  const products = CANONICAL_PRODUCTS as readonly any[];

  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    const id = setInterval(() => setActive(i => (i + 1) % products.length), 2500);
    return () => clearInterval(id);
  }, [connectionStatus, products.length]);

  return (
    <div className="w-full flex flex-col items-center gap-5 py-4">
      {/* Connection status pill */}
      <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-500 ${
        connectionStatus === 'connected'
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          : connectionStatus === 'connecting'
          ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 animate-pulse'
          : 'bg-slate-700/40 text-slate-400 border border-slate-600/30'
      }`}>
        <span className={`w-2 h-2 rounded-full ${
          connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' :
          connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-slate-500'
        }`} />
        {connectionStatus === 'connected' ? 'Connected — Nova is ready' :
         connectionStatus === 'connecting' ? 'Connecting…' : 'Initializing…'}
      </div>

      {/* Product cards grid — white bg to match the brand images */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
        {products.slice(0, 6).map((product, i) => (
          <motion.div
            key={product.name}
            animate={{
              scale: active === i && connectionStatus === 'connected' ? 1.06 : 1,
              opacity: connectionStatus === 'disconnected' ? 0.35 : 1,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className={`relative rounded-xl overflow-hidden bg-white shadow-sm ring-1 ${
              active === i && connectionStatus === 'connected'
                ? 'ring-indigo-400/60 shadow-indigo-500/20 shadow-md'
                : 'ring-slate-200'
            }`}
            style={{ aspectRatio: '1/1' }}
          >
            <img src={product.img} alt={product.name} className="w-full h-full object-contain p-1.5" />
            {active === i && connectionStatus === 'connected' && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 shadow-lg animate-pulse" />
            )}
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: connectionStatus === 'connected' ? 1 : 0.4, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-xs text-slate-400 text-center max-w-xs leading-relaxed"
      >
        {connectionStatus === 'connected'
          ? 'Nova is speaking — or hold the button to ask anything'
          : 'AI OS Platform · ClearVoice AI · Industry Applications'}
      </motion.p>
    </div>
  );
}

// ─── OS Start Menu items ──────────────────────────────────────────────────────

const START_MENU = [
  { id: 'demo',     img: '/start/freetrial.png', label: 'Free Demo',  desc: 'Try the AI OS free — no account needed', action: 'chat' },
  { id: 'login',    img: '/start/login.png',     label: 'Sign In',    desc: 'Access your existing workspace',          action: 'login' },
  { id: 'purchase', img: '/start/purchase.png',  label: 'Purchase',   desc: 'Start your AI OS subscription',           action: 'purchase' },
  { id: 'help',     img: '/start/help.png',      label: 'Help',       desc: 'Talk to support — live AI concierge',     action: 'chat' },
  { id: 'settings', img: '/start/settings.png',  label: 'Settings',   desc: 'Configure your OS preferences',           action: 'settings' },
] as const;

// ─── OS Canvas — rendered inside ConciergePanel idleContent ──────────────────
// ─── QR Card — generates a scannable QR via data URL (no canvas ref issues) ──
function QRCard({
  url,
  label,
  sublabel,
  accentColor = '#008a3e',
  size = 120,
}: {
  url: string;
  label: string;
  sublabel?: string;
  accentColor?: string;
  size?: number;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: size * 2,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [url, size]);

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group">
      <div
        className="p-2.5 bg-white rounded-2xl overflow-hidden transition-all duration-200 group-hover:scale-105"
        style={{ boxShadow: `0 4px 20px rgba(0,0,0,0.08), 0 0 0 2px ${accentColor}20` }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.12), 0 0 0 2px ${accentColor}50`)}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.08), 0 0 0 2px ${accentColor}20`)}
      >
        {dataUrl ? (
          <img src={dataUrl} alt={label} style={{ width: size, height: size, display: 'block' }} />
        ) : (
          <div style={{ width: size, height: size }} className="flex items-center justify-center bg-slate-50 rounded-xl">
            <Loader2 size={20} className="animate-spin text-slate-300" />
          </div>
        )}
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>{label}</span>
        {sublabel && <span className="text-xs font-mono text-slate-500">{sublabel}</span>}
      </div>
    </a>
  );
}

// ─── White Apple-style OS overlay ────────────────────────────────────────────

function OSCanvas({
  phase,
  onStart,
  onMenuSelect,
  onLogin,
}: {
  phase: OSPhase;
  onStart: () => void;
  onMenuSelect: (action: string) => void;
  onLogin: () => void;
}) {
  const [isPoweringOn, setIsPoweringOn] = useState(false);

  const handlePower = () => {
    setIsPoweringOn(true);
    setTimeout(() => { onStart(); setIsPoweringOn(false); }, 700);
  };

  // OSCanvas renders ONLY in the chat content area.
  // The ConciergePanel owns its own header (visualizer) and footer (PTT) — we never touch those.
  return (
    <div className="w-full h-full flex items-center justify-center bg-white overflow-hidden px-4">
      {/* Subtle radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${BRAND.green}07 0%, transparent 70%)` }}
      />

        <AnimatePresence mode="wait">
          {/* ── Phase 1: Boot ── */}
          {phase === 'booting' && (
            <motion.div
              key="booting"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.03 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-10 text-center"
            >
              {/* Hero copy — QR-focused */}
              <div className="flex flex-col items-center gap-3">
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none" style={{ color: BRAND.navy }}>
                  SCAN A QR CODE.<br />
                  <span style={{ color: BRAND.green }}>MEET YOUR AI.</span>
                </h1>
                <p className="text-sm md:text-base text-slate-600 font-medium max-w-md">
                  Every QR code activates a live AI agent — voice-first, instant, configured for your business. No app. No wait.
                </p>
              </div>

              {/* Three QR cards + Login button */}
              <div className="flex flex-col items-center gap-6 w-full">
                <div className="flex flex-row items-center justify-center gap-8 md:gap-12">
                  {/* Demo QR */}
                  <QRCard
                    url={`${typeof window !== 'undefined' ? window.location.origin : ''}/agent/ai-biz-bots`}
                    label="Try a Demo"
                    sublabel="Scan · Talk to Nova"
                    accentColor={BRAND.green}
                    size={112}
                  />

                  {/* Login / Start button in the center */}
                  <button
                    onClick={handlePower}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div
                      className="relative w-28 h-28 md:w-32 md:h-32 rounded-full bg-white flex flex-col items-center justify-center transition-all duration-500"
                      style={{
                        border: `3px solid ${isPoweringOn ? BRAND.green : '#e2e8f0'}`,
                        boxShadow: isPoweringOn
                          ? `0 0 36px ${BRAND.green}40, 0 12px 40px rgba(0,0,0,0.10)`
                          : '0 6px 32px rgba(0,0,0,0.08)',
                      }}
                    >
                      {/* Slow spinning border ring */}
                      <div
                        className="absolute inset-[-8px] rounded-full border animate-[spin_12s_linear_infinite] transition-colors duration-500"
                        style={{ borderColor: isPoweringOn ? `${BRAND.green}40` : '#f1f5f9' }}
                      />
                      <Power
                        size={36}
                        className="transition-all duration-700 relative"
                        style={{ color: isPoweringOn ? BRAND.green : '#cbd5e1', transform: isPoweringOn ? 'rotate(90deg)' : 'none' }}
                      />
                      <span
                        className="mt-1 text-xs font-bold tracking-[0.35em] uppercase transition-colors duration-500 relative"
                        style={{ color: isPoweringOn ? BRAND.green : '#94a3b8' }}
                      >
                        {isPoweringOn ? 'Opening…' : 'Log In'}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Existing account</span>
                  </button>

                  {/* Sign-up / Create account QR */}
                  <QRCard
                    url={`${typeof window !== 'undefined' ? window.location.origin : ''}/agents`}
                    label="Create Account"
                    sublabel="Scan · Get started"
                    accentColor={BRAND.blue}
                    size={112}
                  />
                </div>

                <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                  {'>'} Kernel loaded · {'>'} Gemini 2.5 active · {'>'} Nova IDV ready
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Phase 2: Start menu ── */}
          {phase === 'ready' && (
            <motion.div
              key="startmenu"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex flex-col items-center gap-6 w-full"
            >
              <div className="flex flex-col items-center gap-1">
                <h2 className="text-2xl md:text-4xl font-black tracking-[0.15em] uppercase" style={{ color: BRAND.navy }}>AI OS</h2>
                <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">Select an option to continue</p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                {HOME_MENU.map((item, i) => {
                  const Icon = item.icon;
                  const isLogin = item.id === 'login';
                  const cardClass = "flex flex-col gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all duration-150 group cursor-pointer no-underline text-left";
                  return isLogin ? (
                    <motion.button
                      key={item.id}
                      type="button"
                      onClick={onLogin}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07, duration: 0.25 }}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className={cardClass}
                    >
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                        <Icon size={16} className="text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 leading-tight">{item.label}</p>
                        <p className="text-xs text-slate-500 leading-snug mt-0.5">{item.desc}</p>
                      </div>
                    </motion.button>
                  ) : (
                    <motion.a
                      key={item.id}
                      href={item.href}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07, duration: 0.25 }}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className={cardClass}
                    >
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                        <Icon size={16} className="text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 leading-tight">{item.label}</p>
                        <p className="text-xs text-slate-500 leading-snug mt-0.5">{item.desc}</p>
                      </div>
                    </motion.a>
                  );
                })}
              </div>

              <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                Gateway Global AI · Sovereign AI OS
              </p>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlatformHomePage() {
  const [, setLocation] = useLocation();
  const [osPhase, setOsPhase] = useState<OSPhase>('booting');
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  // ConciergePanel is always open (isOpen={true}) on this page — setPanelOpen is a scroll-to-top helper
  const [, setPanelOpen] = useState(true);
  const [isAuthed, setIsAuthed] = useState(() =>
    typeof window !== 'undefined' && !!localStorage.getItem('authToken')
  );

  // Gear icon handler: navigate to /platform when authenticated, else let
  // ConciergePanel's internal NovaGate handle sign-in in-canvas (pass undefined).
  const handleOpenSettings = useCallback(() => {
    setLocation('/platform');
  }, [setLocation]);

  // After NovaGate sign-in completes in-canvas, the token lands in localStorage.
  // Watch for it and redirect to /platform automatically.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if ((e.key === 'authToken' || e.key === 'gateway_auth_token') && e.newValue) {
        setIsAuthed(true);
        setLocation('/platform');
      }
    };
    window.addEventListener('storage', onStorage);
    // Also poll once per second for same-tab token writes (storage event only fires cross-tab)
    const interval = setInterval(() => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('gateway_auth_token');
      if (token && !isAuthed) {
        setIsAuthed(true);
        setLocation('/platform');
      }
    }, 1000);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, [isAuthed, setLocation]);

  useEffect(() => {
    fetch('/api/platform-products?siteConfigId=platform_landing')
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        setProducts(Array.isArray(data) && data.length > 0 ? data : []);
        setProductsLoading(false);
      })
      .catch(() => { setProducts([]); setProductsLoading(false); });
  }, []);

  const displayProducts = products.length > 0 ? products : [...CANONICAL_PRODUCTS];

  return (
    <div className="min-h-screen bg-[#050a14] flex flex-col platform-os-root">

      {/* ── ConciergePanel is ALWAYS mounted — sticky so header/footer stay visible on scroll ── */}
      <div className="relative w-full sticky top-0" style={{ height: '100svh', zIndex: 10 }}>
        <ConciergePanel
          business={PLATFORM_BUSINESS}
          agent={PLATFORM_AGENT}
          voiceConfig={VoiceClientFactory.getDefaultConfig('premium')}
          siteConfigId="platform_landing"
          isOpen={true}
          layoutMode="fullscreen"
          variant="sovereign"
          showOwnerControls={false}
          autoStartPttOnOpen={false}
          publicSlug={null}
          transferTitle="Try Gateway Global AI"
          transferDescription="Scan to experience the AI OS on your phone."
          transferUrl={typeof window !== 'undefined' ? window.location.href : '/'}
          onClose={() => {}}
          onCycleLayout={() => {}}
          onConnectionStatusChange={setConnectionStatus}
          onOpenSettings={isAuthed ? handleOpenSettings : undefined}
          zIndex={10}
          className="h-full"
        />

        {/* ── OS Canvas overlay — full white panel, dismissed on menu selection ── */}
        <AnimatePresence>
          {osPhase !== 'active' && (
            <motion.div
              key="os-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-x-0"
              style={{ zIndex: 20, top: 128, bottom: 110 }}
            >
              <OSCanvas
                phase={osPhase}
                onStart={() => setOsPhase('ready')}
                onMenuSelect={() => setOsPhase('active')}
                onLogin={() => setShowLoginOverlay(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Login overlay — NovaGate inline, stays inside the interface */}
        <AnimatePresence>
          {showLoginOverlay && (
            <motion.div
              key="login-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-x-0 bg-white flex flex-col overflow-hidden"
              style={{ zIndex: 30, top: 56, bottom: 110 }}
            >
              <NovaGate
                siteConfigId="platform_landing"
                businessName="Gateway Global AI"
                placeTypes={[]}
                mode="signin"
                surface="embedded"
                onVerified={() => setShowLoginOverlay(false)}
                onCancel={() => setShowLoginOverlay(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll-down hint — visible once past boot */}
        {osPhase === 'active' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3, duration: 1 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none z-20"
          >
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Scroll for services</span>
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
              className="w-4 h-4 flex items-center justify-center"
            >
              <svg viewBox="0 0 16 16" className="w-3 h-3 text-slate-600 fill-current">
                <path d="M8 10.94L2.53 5.47l1.06-1.06L8 8.82l4.41-4.41 1.06 1.06L8 10.94z" />
              </svg>
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* ── Products & Services section ── */}
      <section className="relative bg-[#050a14] border-t border-indigo-500/15 px-6 py-16">
        {/* Subtle top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-semibold uppercase tracking-wider mb-4">
              <Star size={10} className="fill-indigo-400 text-indigo-400" />
              Platform Services
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">
              Everything your business needs
            </h2>
            <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
              Voice AI, smart QR routing, dashboards, industry packs, and identity verification — all in one sovereign platform.
            </p>
          </motion.div>

          {/* Product grid — 2 cols mobile, 3 cols tablet, 5 cols desktop */}
          {productsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {displayProducts.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.06, ease: 'easeOut' }}
                >
                  <ProductCard
                    product={p}
                    isOwner={!!localStorage.getItem('authToken')}
                    onTalk={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      setPanelOpen(true);
                    }}
                    onImageUpdated={(id, url) => setProducts(prev => prev.map(x => x.id === id ? { ...x, imageUrl: url } : x))}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {/* Platform pricing summary */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-10 rounded-sui bg-slate-900/40 border border-indigo-500/15 backdrop-blur-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Platform Plan</p>
              <p className="text-white font-bold text-lg">$49<span className="text-slate-400 text-sm font-normal">/mo</span> + $50<span className="text-slate-400 text-sm font-normal">/mo Voice AI</span></p>
              <p className="text-slate-400 text-xs mt-0.5">200 voice minutes included · $0.25/min overage · Cancel anytime</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setPanelOpen(true); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-sui bg-slate-800 border border-slate-700 text-white text-sm font-medium hover:border-indigo-500/40 transition-colors"
              >
                <MessageSquare size={14} />
                Ask a question
              </button>
              <button
                type="button"
                onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setPanelOpen(true); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-sui bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors shadow-[0_0_20px_rgba(99,102,241,0.25)]"
              >
                <Mic size={14} />
                Try the AI
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800/60 px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <AIOSMark />
        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} Gateway Global AI · AI Business Infrastructure
        </p>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <a href="/agents" className="hover:text-slate-300 transition-colors">Get Started</a>
          <a href="/platform" className="hover:text-slate-300 transition-colors">Admin</a>
        </div>
      </footer>
    </div>
  );
}
