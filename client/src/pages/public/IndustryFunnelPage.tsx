/**
 * IndustryFunnelPage — /industry/:slug
 *
 * Deterministic renderer for structured FunnelPayload data.
 * The route is 100% data-driven — adding a new vertical requires zero new React code.
 *
 * 7 Canonical Sections:
 *   1. Hero
 *   2. Pain Points
 *   3. Live Demo Test Drive
 *   4. Sample Questions Preview
 *   5. Activation Tools
 *   6. Offer + Guarantee
 *   7. Trust Signals + Footer CTA
 *
 * The "Test Drive" CTA wire: clicking it navigates to /demo?industry=<slug>&business=<name>
 * which passes the conversationWorkflow into the Concierge's system prompt.
 */

import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneOff, AlertTriangle, DollarSign, Clock, TrendingUp, Thermometer,
  RefreshCw, CalendarX, VoicemailIcon, Mic, Star, Shield, Zap,
  CheckCircle2, ArrowRight, Loader2, ChevronDown,
} from "lucide-react";
import type { FunnelPayload } from "@shared/industryFunnelTemplates/FunnelPayload";
import { BRAND } from "@/config/brand";

// ── Icon resolver ─────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  PhoneOff, AlertTriangle, DollarSign, Clock, TrendingUp, Thermometer,
  RefreshCw, CalendarX, VoicemailIcon, Mic, Star, Shield, Zap, CheckCircle2,
};

function DynIcon({ name, className }: { name?: string; className?: string }) {
  const C = name ? (ICON_MAP[name] ?? Zap) : Zap;
  return <C className={className} />;
}

// ── Section fade-in wrapper ───────────────────────────────────────────────────
function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function IndustryFunnelPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();

  const [funnel, setFunnel] = useState<FunnelPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessLocation, setBusinessLocation] = useState("");
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/industry-funnels/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Not found: ${slug}`);
        return r.json();
      })
      .then((data) => setFunnel(data.funnel))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (error || !funnel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] text-white gap-4">
        <p className="text-slate-400 text-lg">Vertical not found.</p>
        <button
          onClick={() => navigate("/")}
          className="text-emerald-400 underline text-sm"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const handleTestDrive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return;
    setDemoSubmitted(true);
    const params = new URLSearchParams({
      industry: funnel.slug,
      business: businessName.trim(),
      location: businessLocation.trim(),
    });
    navigate(`/demo?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans">

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f172a]/90 border-b border-indigo-500/15 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-white font-bold text-base tracking-tight">
            Gateway Global AI
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-emerald-400 font-medium px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10">
              {funnel.hero.eyebrow ?? funnel.vertical}
            </span>
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Log In
            </button>
            <button
              onClick={() => navigate("/buy")}
              className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-full font-medium transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Section 1: Hero ── */}
      <section className="relative pt-32 pb-20 px-5 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-block text-xs font-semibold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 rounded-full mb-6 tracking-wide uppercase"
          >
            {funnel.hero.eyebrow}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6"
          >
            {funnel.hero.headline}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto mb-10"
          >
            {funnel.hero.subheadline}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <a
              href="#test-drive"
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-4 rounded-full text-base transition-all hover:shadow-[0_0_24px_rgba(16,185,129,0.4)] active:scale-95"
            >
              <Mic className="w-5 h-5" />
              {funnel.hero.ctaLabel}
            </a>
            {funnel.hero.secondaryCtaLabel && (
              <a
                href="#pain-points"
                className="flex items-center justify-center gap-2 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-medium px-8 py-4 rounded-full text-base transition-colors"
              >
                {funnel.hero.secondaryCtaLabel}
                <ChevronDown className="w-4 h-4" />
              </a>
            )}
          </motion.div>

          {/* Anti-Platform hook */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-12 max-w-2xl mx-auto p-5 rounded-2xl border border-indigo-500/20 bg-slate-900/40 backdrop-blur-xl text-left"
          >
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300 leading-relaxed italic">{funnel.sovereigntyHook}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Section 2: Pain Points ── */}
      <Section id="pain-points" className="py-20 px-5 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              The Invisible Bleed
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Every one of these is happening right now, quietly, in your business.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {funnel.painPoints.map((pp, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="p-6 rounded-2xl bg-slate-900/60 border border-indigo-500/15 backdrop-blur-xl"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                    <DynIcon name={pp.icon} className="w-5 h-5 text-red-400" />
                  </div>
                  <h3 className="font-bold text-white text-base leading-snug">{pp.headline}</h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{pp.body}</p>
                {pp.stat && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <span className="text-xs font-mono text-amber-400/80 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                      {pp.stat}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Section 3: Test Drive ── */}
      <Section id="test-drive" className="py-24 px-5">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-block text-xs font-semibold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 rounded-full mb-4 tracking-wide uppercase">
              Live Demo
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Hear Your AI Answer a Call
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              {funnel.demoInput.supportText}
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="p-8 rounded-2xl bg-slate-900/60 border border-indigo-500/20 backdrop-blur-xl shadow-2xl"
          >
            <form onSubmit={handleTestDrive} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Your Business Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={funnel.demoInput.namePlaceholder}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  City, State
                </label>
                <input
                  type="text"
                  value={businessLocation}
                  onChange={(e) => setBusinessLocation(e.target.value)}
                  placeholder={funnel.demoInput.locationPlaceholder}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={!businessName.trim() || demoSubmitted}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl text-base transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95"
              >
                {demoSubmitted ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Loading your AI...</>
                ) : (
                  <><Mic className="w-5 h-5" /> {funnel.demoInput.ctaLabel}</>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </Section>

      {/* ── Section 4: Sample Questions ── */}
      <Section className="py-20 px-5 bg-slate-900/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              What Your AI Handles on Day One
            </h2>
            <p className="text-slate-400 text-base max-w-lg mx-auto">
              Real questions your customers ask. Real answers your AI delivers — instantly, every time.
            </p>
          </div>

          <div className="space-y-4">
            {funnel.sampleQuestions.map((sq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-xl"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-slate-400 font-mono">Q</span>
                  </div>
                  <p className="text-slate-200 text-sm font-medium leading-relaxed">{sq.question}</p>
                </div>
                <div className="flex items-start gap-3 ml-10">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-emerald-300/80 text-sm leading-relaxed italic">{sq.preview}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Section 5: Activation Tools ── */}
      <Section className="py-20 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {funnel.activationTools.headline}
          </h2>
          <div className="mt-8 space-y-3">
            {funnel.activationTools.bullets.map((bullet, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/50 border border-emerald-500/15 text-left"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-slate-200 text-sm leading-relaxed">{bullet}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Section 6: Offer ── */}
      <Section className="py-20 px-5 bg-gradient-to-b from-indigo-950/20 to-transparent">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Simple Pricing. No Surprises.
            </h2>
            <p className="text-slate-400 text-base">
              {funnel.offer.free}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Base tier */}
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="p-6 rounded-2xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-xl"
            >
              <p className="text-sm text-slate-400 mb-1">Platform</p>
              <p className="text-2xl font-bold text-white mb-3">$49 <span className="text-sm font-normal text-slate-400">/mo</span></p>
              <p className="text-sm text-slate-300">{funnel.offer.base}</p>
            </motion.div>

            {/* Pack tier */}
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="p-6 rounded-2xl bg-indigo-900/30 border border-indigo-500/30 backdrop-blur-xl shadow-[0_0_24px_rgba(99,102,241,0.15)]"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-indigo-300">Platform + Comms</p>
                <span className="text-xs text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">Popular</span>
              </div>
              <p className="text-2xl font-bold text-white mb-3">$99 <span className="text-sm font-normal text-indigo-300">/mo</span></p>
              <p className="text-sm text-slate-300">{funnel.offer.pack}</p>
            </motion.div>
          </div>

          {funnel.offer.guarantee && (
            <p className="text-center text-sm text-slate-500 mt-5 italic">{funnel.offer.guarantee}</p>
          )}

          <div className="mt-8 flex justify-center">
            <a
              href="#test-drive"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-4 rounded-full text-base transition-all hover:shadow-[0_0_24px_rgba(16,185,129,0.4)] active:scale-95"
            >
              <Mic className="w-5 h-5" />
              {funnel.hero.ctaLabel}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </Section>

      {/* ── Section 7: Trust Signals + Footer CTA ── */}
      <Section className="py-20 px-5 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">
            What You Can Expect in the First 30 Days
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
            {funnel.trustSignals.map((ts, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
                className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/40 flex items-start gap-3"
              >
                <Star className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-200 text-sm leading-relaxed">{ts.text}</p>
                  {ts.source && <p className="text-slate-500 text-xs mt-1">{ts.source}</p>}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Final CTA */}
          <div className="text-center p-10 rounded-2xl bg-slate-900/60 border border-indigo-500/20 backdrop-blur-xl">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Ready to Own Every Customer Call?
            </h3>
            <p className="text-slate-400 text-base mb-7 max-w-md mx-auto">
              No platform fees. No contracts. No middleman. Your business, your data, your relationships.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="#test-drive"
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-4 rounded-full text-base transition-all hover:shadow-[0_0_24px_rgba(16,185,129,0.4)] active:scale-95"
              >
                <Mic className="w-5 h-5" />
                {funnel.hero.ctaLabel}
              </a>
              <button
                onClick={() => navigate("/buy")}
                className="flex items-center justify-center gap-2 border border-indigo-500/40 hover:border-indigo-500/70 text-indigo-300 hover:text-white font-medium px-8 py-4 rounded-full text-base transition-colors"
              >
                Get Started — $49/mo
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="py-10 px-5 border-t border-slate-800/50 text-center">
        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} Gateway Global AI · All customer data is owned by you, not us.
        </p>
      </footer>

    </div>
  );
}
