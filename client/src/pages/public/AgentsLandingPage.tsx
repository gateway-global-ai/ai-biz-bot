/**
 * AgentsLandingPage — public onboarding entry point at /agents
 *
 * The first screen someone sees when arriving via:
 *  - Telephony with no provisioned site config
 *  - Direct /agents URL
 *  - Any QR code pointing to the platform (not a specific business)
 *
 * Actions: Demo | Create Account | Sign In
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, ArrowRight, Phone, MessageSquare, Zap, Shield, Building2, QrCode } from 'lucide-react';
import { ConciergePanel } from '@/components/chat/ConciergePanel';
import { VoiceClientFactory } from '@/services/voice/VoiceClientFactory';
import AIOSMark from '@/components/public/AIOSMark';

const DEMO_BUSINESS = {
  id: 'platform_landing',
  placeId: '',
  name: 'Gateway Global AI',
  address: 'AI Business Infrastructure Platform',
  hours: '24/7',
  services: ['AI Voice Concierge', 'Business Automation', 'Lead Intelligence'],
  primaryColor: '#6366f1',
};

const DEMO_AGENT = {
  role: 'Platform Demo Agent',
  personality: 'Energetic, informative, and helpful',
  objectives: [
    'Show the power of AI Biz Bot voice technology',
    'Explain how to get started with a business account',
    'Answer questions about pricing, features, and setup',
  ],
  constraints: ['Keep demo under 3 minutes', 'Always invite them to create an account'],
};

type View = 'landing' | 'demo';

export default function AgentsLandingPage() {
  const [, setLocation] = useLocation();
  const [view, setView] = useState<View>('landing');

  const features = [
    { icon: <Phone size={18} />, label: 'Voice AI Concierge', desc: 'Answers calls 24/7 with a human-like voice agent' },
    { icon: <MessageSquare size={18} />, label: 'Smart Chat + PTT', desc: 'Push-to-talk and text chat in one unified interface' },
    { icon: <Zap size={18} />, label: 'Instant Lead Capture', desc: 'Qualifies and books inbound leads automatically' },
    { icon: <QrCode size={18} />, label: 'QR + Shareable Links', desc: 'One QR code connects customers to your AI agent' },
    { icon: <Shield size={18} />, label: 'NOVA Verified Identity', desc: 'OTP and biometric verification built in' },
    { icon: <Building2 size={18} />, label: 'Google Business Ready', desc: 'Auto-provisions from Google Maps data' },
  ];

  if (view === 'demo') {
    return (
      <div className="fixed inset-0 bg-[#0F172A] z-[100]">
        <ConciergePanel
          business={DEMO_BUSINESS}
          agent={DEMO_AGENT}
          voiceConfig={VoiceClientFactory.getDefaultConfig('premium')}
          isOpen={true}
          layoutMode="fullscreen"
          variant="sovereign"
          autoStartPttOnOpen={true}
          showOwnerControls={false}
          onClose={() => setView('landing')}
          onCycleLayout={() => {}}
          zIndex={100}
          transferTitle="Share This Demo"
          transferDescription="Send this AI experience to another device."
          transferUrl={typeof window !== 'undefined' ? `${window.location.origin}/agents` : '/agents'}
        />
        <button
          type="button"
          onClick={() => setView('landing')}
          className="absolute top-4 left-4 z-[110] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs hover:text-white hover:border-indigo-500/40 backdrop-blur-sm transition-colors"
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col overflow-auto">
      {/* Header */}
      <header className="shrink-0 px-6 py-4 flex items-center justify-between border-b border-slate-800/60">
        <AIOSMark />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLocation('/login')}
            className="px-4 py-2 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setLocation('/register')}
            className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-400 transition-colors"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="max-w-2xl w-full"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI Business Router — Now Live
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight mb-6">
            Your Business,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              Always Answering
            </span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl leading-relaxed mb-12 max-w-xl mx-auto">
            Deploy a voice AI agent for your business in minutes.
            Handles calls, captures leads, and books appointments — 24/7.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setView('demo')}
              className="group flex items-center justify-center gap-3 px-8 py-4 rounded-sui bg-slate-800/80 border border-indigo-500/30 text-white font-bold text-base hover:bg-indigo-500/10 hover:border-indigo-500/60 transition-all shadow-[0_0_30px_rgba(99,102,241,0.1)]"
            >
              <Bot size={20} className="text-indigo-400 group-hover:text-indigo-300 transition-colors" />
              Try the Demo
              <ArrowRight size={16} className="text-slate-500 group-hover:text-indigo-300 transition-colors group-hover:translate-x-0.5 transform" />
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLocation('/register')}
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-sui bg-indigo-500 text-white font-bold text-base hover:bg-indigo-400 transition-all shadow-[0_0_30px_rgba(99,102,241,0.25)]"
            >
              <Sparkles size={18} />
              Create Free Account
            </motion.button>
          </div>

          {/* Sign in link */}
          <p className="text-slate-500 text-sm">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setLocation('/login')}
              className="text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-2 transition-colors"
            >
              Sign in
            </button>
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          className="mt-20 w-full max-w-4xl"
        >
          <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest mb-8">What's included</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.06 }}
                className="flex items-start gap-3 p-4 rounded-sui bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400">
                  {f.icon}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight">{f.label}</p>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Pricing hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-16 flex flex-col sm:flex-row items-center gap-6 text-center"
        >
          {[
            { label: 'Base', price: '$49', period: '/mo', desc: 'Platform access' },
            { label: 'Voice AI', price: '$50', period: '/mo', desc: 'Comms package' },
            { label: 'Overage', price: '$0.25', period: '/min', desc: 'AI minutes' },
          ].map((tier, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">{tier.label}</span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-white text-2xl font-black">{tier.price}</span>
                <span className="text-slate-500 text-sm">{tier.period}</span>
              </div>
              <span className="text-slate-600 text-xs">{tier.desc}</span>
            </div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 px-6 py-4 border-t border-slate-800/60 flex items-center justify-center gap-6 text-xs text-slate-600">
        <span>© 2026 Gateway Global AI</span>
        <span>·</span>
        <button type="button" onClick={() => setLocation('/privacy')} className="hover:text-slate-400 transition-colors">Privacy</button>
        <span>·</span>
        <button type="button" onClick={() => setLocation('/terms')} className="hover:text-slate-400 transition-colors">Terms</button>
      </footer>
    </div>
  );
}
