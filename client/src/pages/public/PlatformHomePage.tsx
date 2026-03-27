/**
 * PlatformHomePage — Public entry at /
 *
 * Intent-first entry: Nova speaks, three clear action tiles, clean header.
 * No OS boot sequence, no start menus, no inline login overlays.
 */

import { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Mic, Sparkles, LogIn, TrendingUp, ShieldCheck, ExternalLink } from 'lucide-react';
import { ConciergePanel } from '@/components/chat/ConciergePanel';
import { VoiceClientFactory } from '@/services/voice/VoiceClientFactory';
import { BusinessContext, AgentConfig } from '@/types/voice';
import AIOSMark from '@/components/public/AIOSMark';
import { BRAND } from '@/config/brand';

// ─── Platform context — Nova is the public face ───────────────────────────────

const PLATFORM_BUSINESS: BusinessContext = {
  id: 'platform_landing',
  placeId: '',
  name: 'Gateway Global AI',
  address: 'AI Front Desk & customer communication',
  services: ['Missed-call recovery', 'QR-to-voice', 'Verified identity', 'Forms that complete with the customer'],
  primaryColor: '#6366f1',
  workspaceState: 'active',
  claimStatus: null,
  ownerId: null,
  plan: 'enterprise',
};

const PLATFORM_AGENT: AgentConfig = {
  role: 'AI Platform Concierge',
  personality: 'Warm, confident, and concise',
  objectives: [
    'Open with a single natural spoken greeting — no reasoning, no markdown, just speak',
    'Lead with AI Front Desk: fewer missed calls, less repetition for staff, customers get answers fast',
    'Offer a live demo, pricing, or sign-up — keep infrastructure language secondary',
    'Keep every response under 3 sentences when speaking',
  ],
  constraints: [
    'NEVER output markdown, bullet points, bold text, or headings — you are speaking aloud',
    'NEVER reason out loud or explain your thought process',
    'Opening line must be: "Hi, I\'m Nova, your Gateway Global AI concierge. We connect your business to an AI front desk that runs on voice, QR, and Google Workspace — deployed in minutes. Want a quick demo or help getting started?"',
  ],
};

// ─── Intent tiles ─────────────────────────────────────────────────────────────
// (kept for footer nav only)

// ─── Report summary stats ──────────────────────────────────────────────────────

const REPORT_STATS = [
  { value: '~95%', label: 'GenAI ROI Failure Rate', color: 'text-rose-400' },
  { value: '10–15%', label: 'Pilot-to-Production Rate', color: 'text-amber-400' },
  { value: '4 Pillars', label: 'Governed OS Architecture', color: 'text-cyan-400' },
] as const;

// ─── Idle canvas — Report summary slide ───────────────────────────────────────

function PlatformIdleCanvas() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-5 px-4 py-6 bg-white overflow-y-auto">

      {/* Logo mark */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <AIOSMark />
      </motion.div>

      {/* Report summary card — Jason Standard: glass, rounded-sui, sovereign palette */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
        whileHover={{ scale: 1.02, y: -2 }}
        style={{ transition: 'box-shadow 0.2s' }}
        className="w-full max-w-sm rounded-sui bg-slate-900/90 border border-indigo-500/20 backdrop-blur-xl shadow-2xl overflow-hidden"
      >
        {/* Card header */}
        <div className="px-4 pt-4 pb-3 border-b border-indigo-500/10 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/80 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_12px_rgba(99,102,241,0.4)]">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">
              System Design Manifesto v1.0
            </p>
            <h3 className="text-sm font-bold text-white leading-snug mt-0.5">
              The Governed AI OS
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Why Enterprise AI fails at scale — and the architecture required for predictable, governed autonomy.
            </p>
          </div>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-3 divide-x divide-indigo-500/10 border-b border-indigo-500/10">
          {REPORT_STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.06 }}
              className="px-2 py-3 text-center"
            >
              <div className={`text-lg font-extrabold leading-none ${stat.color}`}>{stat.value}</div>
              <div className="text-[9px] text-slate-500 mt-1 leading-tight">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Highlights */}
        <div className="px-4 py-3 space-y-1.5">
          {[
            'Two-Plane Runtime: Customer-Facing vs. Internal Worker',
            'YAML-defined agent policies — no prompt drift',
            'Schema-enforced outputs treated as API contracts',
          ].map((line, i) => (
            <motion.div
              key={line}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.07 }}
              className="flex items-start gap-2"
            >
              <TrendingUp size={11} className="text-emerald-400 mt-0.5 shrink-0" />
              <span className="text-xs text-slate-300 leading-snug">{line}</span>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.a
          href="/aios-report.html"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mx-4 mb-4 mt-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-sui bg-indigo-600 hover:bg-indigo-500 transition-colors no-underline shadow-[0_0_16px_rgba(99,102,241,0.35)]"
        >
          <span className="text-sm font-bold text-white">Read Full Report</span>
          <ExternalLink size={13} className="text-indigo-200" />
        </motion.a>
      </motion.div>

      {/* Secondary action tiles */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex gap-2 w-full max-w-sm"
      >
        <motion.a
          href="/buy"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-sui bg-slate-900 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors no-underline shadow-lg"
        >
          <Sparkles size={13} className="text-indigo-400" />
          <span className="text-xs font-semibold text-white">Get Started</span>
        </motion.a>
        <motion.a
          href="/business"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-sui bg-slate-900/60 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors no-underline"
        >
          <Mic size={13} className="text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200">Try Demo</span>
        </motion.a>
      </motion.div>

    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlatformHomePage() {
  const [, setLocation] = useLocation();
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const isAuthed = typeof window !== 'undefined' && (
    !!localStorage.getItem('authToken') || !!localStorage.getItem('gateway_auth_token')
  );

  const handleOpenSettings = useCallback(() => {
    setLocation('/platform');
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-[#050a14] flex flex-col">

      {/* ── Minimal fixed header ───────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 py-3 bg-[#050a14]/90 backdrop-blur-md border-b border-slate-800/60">
        <AIOSMark />
        <nav className="flex items-center gap-2">
          <a
            href="/login"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <LogIn size={14} />
            Log In
          </a>
          <a
            href="/buy"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-[0_0_16px_rgba(99,102,241,0.3)]"
          >
            Get Started
          </a>
        </nav>
      </header>

      {/* ── ConciergePanel — fullscreen, always mounted ─────────────────── */}
      <div className="relative w-full pt-[52px]" style={{ height: '100svh' }}>
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
          transferDescription="Scan to try the AI Front Desk on your phone."
          transferUrl={typeof window !== 'undefined' ? window.location.href : '/'}
          onClose={() => {}}
          onCycleLayout={() => {}}
          onConnectionStatusChange={setConnectionStatus}
          onOpenSettings={isAuthed ? handleOpenSettings : undefined}
          zIndex={10}
          className="h-full"
          idleContent={<PlatformIdleCanvas />}
        />
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/60 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#050a14]">
        <AIOSMark />
        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} Gateway Global AI · AI Front Desk &amp; customer communication
        </p>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <a href="/more-info" className="hover:text-slate-300 transition-colors">Platform</a>
          <a href="/buy" className="hover:text-slate-300 transition-colors">Pricing</a>
          <a href="/login" className="hover:text-slate-300 transition-colors">Log In</a>
        </div>
      </footer>
    </div>
  );
}
