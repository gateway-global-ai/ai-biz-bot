/**
 * PlatformHomePage — The AI OS entry point at /
 *
 * Renders the Gateway Global AI ConciergePanel as the primary chat interface.
 * Below the panel, fetches and displays platform products/services from the DB.
 *
 * The `platform_landing` site config is resolved server-side without a DB record
 * via the route guard in siteConfigRoutes.ts.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, MessageSquare, QrCode, Mic, Phone, ChevronRight, Loader2, Star } from 'lucide-react';
import { ConciergePanel } from '@/components/chat/ConciergePanel';
import { VoiceClientFactory } from '@/services/voice/VoiceClientFactory';
import { BusinessContext, AgentConfig } from '@/types/voice';
import AIOSMark from '@/components/public/AIOSMark';

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
  personality: 'Energetic, knowledgeable, and helpful — ready to demo the platform',
  objectives: [
    'Show the power of Gateway Global AI voice technology',
    'Answer questions about pricing, features, and setup',
    'Guide visitors to create an account or book a demo',
  ],
  constraints: [
    'Keep demo interactions under 3 minutes',
    'Always invite the visitor to create an account or speak to sales',
  ],
};

// ─── Fallback products (shown when DB returns empty) ─────────────────────────

const FALLBACK_PRODUCTS = [
  {
    id: 'fp-1',
    name: 'AI Voice Concierge',
    description: 'A 24/7 voice AI agent that answers calls, captures leads, and books appointments automatically.',
    price: 50,
    priceUnit: '/mo',
    type: 'service',
    icon: <Mic size={20} className="text-indigo-400" />,
  },
  {
    id: 'fp-2',
    name: 'Smart QR Router',
    description: 'QR codes that route customers directly to your AI agent with full scan analytics.',
    price: 0,
    priceUnit: 'included',
    type: 'product',
    icon: <QrCode size={20} className="text-emerald-400" />,
  },
  {
    id: 'fp-3',
    name: 'SMS Automation',
    description: 'A2P-compliant SMS campaigns with opt-in management and intent-based routing.',
    price: 49,
    priceUnit: '/mo',
    type: 'service',
    icon: <MessageSquare size={20} className="text-violet-400" />,
  },
  {
    id: 'fp-4',
    name: 'Phone Number Provisioning',
    description: 'Dedicated Twilio numbers provisioned per agent with caller ID and call tracking.',
    price: 5,
    priceUnit: '/number/mo',
    type: 'service',
    icon: <Phone size={20} className="text-sky-400" />,
  },
];

// ─── Type badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    service: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
    product: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    subscription: 'bg-violet-500/15 border-violet-500/30 text-violet-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${map[type] ?? map.service}`}>
      {type}
    </span>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onTalk,
}: {
  product: any;
  onTalk: () => void;
}) {
  const isFallback = product.id?.startsWith('fp-');
  const priceLabel = product.priceUnit === 'included'
    ? 'Included'
    : product.price != null
      ? `$${product.price}${product.priceUnit ?? '/mo'}`
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={{ scale: 1.015, y: -2 }}
      className="relative flex flex-col gap-3 p-5 rounded-sui bg-slate-900/50 border border-indigo-500/15 backdrop-blur-xl shadow-lg hover:border-indigo-500/35 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shrink-0">
          {isFallback && product.icon ? product.icon : <Zap size={18} className="text-indigo-400" />}
        </div>
        <TypeBadge type={product.type ?? 'service'} />
      </div>

      <div className="flex-1">
        <h3 className="text-white font-bold text-sm leading-snug mb-1">{product.name}</h3>
        {product.description && (
          <p className="text-slate-400 text-xs leading-relaxed">{product.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-700/40">
        {priceLabel && (
          <span className="font-mono text-sm font-bold text-emerald-400">{priceLabel}</span>
        )}
        <button
          type="button"
          onClick={onTalk}
          className="flex items-center gap-1 text-xs text-indigo-300 hover:text-white font-medium transition-colors ml-auto"
        >
          Talk to us
          <ChevronRight size={12} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlatformHomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    fetch('/api/platform-products?siteConfigId=platform_landing')
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        setProducts(Array.isArray(data) && data.length > 0 ? data : []);
        setProductsLoading(false);
      })
      .catch(() => { setProducts([]); setProductsLoading(false); });
  }, []);

  const displayProducts = products.length > 0 ? products : FALLBACK_PRODUCTS;

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col">
      {/* ── Primary AI OS — fullscreen ConciergePanel ── */}
      <div className="relative w-full" style={{ height: '100svh' }}>
        <ConciergePanel
          business={PLATFORM_BUSINESS}
          agent={PLATFORM_AGENT}
          voiceConfig={VoiceClientFactory.getDefaultConfig('premium')}
          siteConfigId="platform_landing"
          isOpen={panelOpen}
          layoutMode="fullscreen"
          variant="sovereign"
          showOwnerControls={false}
          autoStartPttOnOpen={false}
          publicSlug={null}
          transferTitle="Try Gateway Global AI"
          transferDescription="Scan to experience the AI OS on your phone."
          transferUrl={typeof window !== 'undefined' ? window.location.href : '/'}
          onClose={() => setPanelOpen(false)}
          onCycleLayout={() => {}}
          zIndex={10}
          className="h-full"
        />

        {/* Scroll-down hint — only visible when panel is open */}
        {panelOpen && (
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
      <section className="relative bg-[#0F172A] border-t border-slate-800/60 px-6 py-16">
        {/* Subtle top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

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
              Voice AI, smart routing, SMS automation, and telephony — all in one sovereign platform.
            </p>
          </motion.div>

          {/* Product grid */}
          {productsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    onTalk={() => {
                      // Scroll back up to panel and open it
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      setPanelOpen(true);
                    }}
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
