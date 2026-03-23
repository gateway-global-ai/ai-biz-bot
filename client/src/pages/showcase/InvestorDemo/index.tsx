/**
 * Investor Demonstration — Pathos Communications
 * Voice-Native AI Business Router: evolution, PTT, DiSC, Boardwalk Suites, Provisioning, Handover, S4.
 * Name + access code gate; viewers are recorded in investor_report_views.
 */
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  Menu,
  X,
  Mic,
  Radio,
  AlertTriangle,
  CheckCircle2,
  User,
  Loader2,
} from "lucide-react";
import { ProvisioningMatrixDiagram } from "./ProvisioningMatrixDiagram";
import { TelephonySummarySlide } from "./TelephonySummarySlide";
import { HandoverProtocolSlide } from "./HandoverProtocolSlide";
import { S4ArchitectureSlide } from "./S4ArchitectureSlide";
import { InvestorDemoFooter } from "./InvestorDemoFooter";
import gatewayLogo from "@assets/gatewaylogo_header_left_1770354860467.png";
import QuantumScene from "@/components/QuantumScene";
import { DiscRadar, ArchBreakdown } from "@/ui/charts";
import { Slider } from "@/components/ui/slider";
import type { DiscScores, ArchProfile } from "@shared/schema";

const scrollToSection = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

const API = "/api/investor-demo";

export default function InvestorDemo() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [gateError, setGateError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [discScores, setDiscScores] = useState<DiscScores>({
    dominance: 50,
    influence: 50,
    steadiness: 50,
    conscientiousness: 50,
  });
  const [archProfile, setArchProfile] = useState<ArchProfile>({
    acknowledge: 75,
    reflect: 60,
    context: 50,
    handoff: 30,
  });

  const checkAccess = useCallback(async () => {
    try {
      const res = await fetch(`${API}/access`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      setHasAccess(res.ok && data.ok === true);
    } catch {
      setHasAccess(false);
    }
  }, []);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateError("");
    if (!name.trim() || !code.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), code: code.trim() }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGateError(data.error || "Access denied");
        return;
      }
      setHasAccess(true);
    } catch (err) {
      setGateError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (hasAccess === null) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-6">
        <motion.div
          className="w-full max-w-md rounded-sui bg-[#0B1120]/90 border border-[#3B82F6]/20 backdrop-blur-xl p-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-sui bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
              <User className="text-indigo-400" size={24} />
            </div>
            <h1 className="text-xl font-bold text-white">Investor Report Access</h1>
            <p className="text-slate-400 text-sm mt-2">
              Enter your name and access code to view the Technical Performance Report.
            </p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              className="w-full px-4 py-3 rounded-sui bg-slate-800/80 border border-slate-600 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              required
            />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Access code"
              className="w-full px-4 py-3 rounded-sui bg-slate-800/80 border border-slate-600 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              required
            />
            {gateError && (
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle size={14} /> {gateError}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-sui bg-indigo-500 hover:bg-indigo-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 selection:bg-[#3B82F6] selection:text-white font-sans">
      {/* Nav */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0B1120]/95 backdrop-blur-xl border-b border-[#3B82F6]/20 py-4"
            : "bg-transparent py-6"
        }`}
      >
        <div className="container mx-auto px-6 flex justify-between items-center">
          <button
            type="button"
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <img
              src={gatewayLogo}
              alt="Gateway Global AI"
              className="h-10 w-auto object-contain"
            />
          </button>
          <div className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-300">
            <button type="button" onClick={scrollToSection("hero")} className="hover:text-[#60A5FA] transition-colors">
              Client
            </button>
            <button type="button" onClick={scrollToSection("evolution")} className="hover:text-[#60A5FA] transition-colors">
              Evolution
            </button>
            <button type="button" onClick={scrollToSection("disc")} className="hover:text-[#60A5FA] transition-colors">
              Docs
            </button>
            <button type="button" onClick={scrollToSection("provisioning")} className="hover:text-[#60A5FA] transition-colors">
              Provisioning
            </button>
            <button type="button" onClick={scrollToSection("telephony")} className="hover:text-[#60A5FA] transition-colors">
              Telephony
            </button>
            <button type="button" onClick={scrollToSection("handover")} className="hover:text-[#60A5FA] transition-colors">
              Handover
            </button>
            <button type="button" onClick={scrollToSection("s4")} className="hover:text-[#60A5FA] transition-colors">
              S4
            </button>
          </div>
          <button
            type="button"
            className="md:hidden p-2 text-white"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-[#0B1120]/98 backdrop-blur-xl flex flex-col items-center justify-center gap-6 text-lg font-medium text-slate-200">
          {["hero", "evolution", "disc", "provisioning", "telephony", "handover", "s4"].map((id) => (
            <button key={id} type="button" onClick={() => { scrollToSection(id)({} as React.MouseEvent); closeMenu(); }}>
              {id.charAt(0).toUpperCase() + id.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Hero — Bold Claim */}
      <header id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0B1120]">
        <QuantumScene />
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#3B82F6]/10 via-transparent to-[#0B1120]" />
        <div className="relative z-10 container mx-auto px-6 text-center text-white">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 border border-[#3B82F6]/50 bg-[#3B82F6]/10 text-[#93C5FD] text-xs font-bold tracking-widest uppercase rounded-full backdrop-blur-md">
            PREPARED FOR: PATHOS COMMUNICATIONS PLC
          </div>
          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
            style={{ fontFamily: "'Outfit', sans-serif" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Voice‑Native AI <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3B82F6] to-[#0EA5E9]">
              Business Router
            </span>
          </motion.h1>
          <motion.p
            className="max-w-3xl mx-auto mb-8 text-lg md:text-xl text-[#EFF6FF] font-medium"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Gateway Global AI outperforms the competition—including leading models—by{" "}
            <span className="text-[#34D399] font-bold">80–90% in cost efficiency and quality</span>. It’s just better.
          </motion.p>
          <p className="text-sm text-slate-400 mb-10">
            Technical Architecture & Performance Benchmark Report — Independent Technical Review | 2026
          </p>
          <button
            type="button"
            onClick={scrollToSection("evolution")}
            className="group flex flex-col items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer mx-auto"
          >
            <span>EVOLUTION OF AI</span>
            <span className="p-3 border border-[#3B82F6]/40 rounded-full group-hover:bg-[#3B82F6]/20 group-hover:border-[#3B82F6] transition-all bg-[#0B1120]/80 backdrop-blur-sm">
              <ArrowDown size={18} />
            </span>
          </button>
        </div>
      </header>

      <main className="pb-48">
        {/* Evolution of AI — Problem: RTC without PTT */}
        <section id="evolution" className="py-24 bg-[#0B1120]/80 border-y border-[#3B82F6]/10">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="inline-block mb-3 text-xs font-bold tracking-widest text-amber-400 uppercase">
                Why basic voice AI fails
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                Evolution of AI: Open RTC vs Push‑to‑Talk
              </h2>
              <p className="text-slate-400">
                Always-on sockets with no PTT cause background noise, unintended triggers, and hallucination loops.
              </p>
            </div>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="p-6 rounded-sui bg-slate-800/60 border border-red-500/20 backdrop-blur-xl"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="flex items-center gap-2 mb-4 text-red-400">
                  <Radio size={20} />
                  <span className="font-bold uppercase text-sm">Basic voice AI (open RTC)</span>
                </div>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    Background noise triggers false inputs
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    No clear turn-taking; overlap and crosstalk
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    Higher latency and cost from continuous streaming
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    Hallucination loops when the model “hears” noise as speech
                  </li>
                </ul>
              </motion.div>
              <motion.div
                className="p-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="flex items-center gap-2 mb-4 text-emerald-400">
                  <Mic size={20} />
                  <span className="font-bold uppercase text-sm">Gateway Global AI (PTT)</span>
                </div>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                    Intentional input only; hold to record, release to send
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                    Structured turn-taking; sub‑150ms mouth‑to‑ear target
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                    Lower cost and latency; no always-on stream
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                    Secure PTT mode; transcription preview; no phantom triggers
                  </li>
                </ul>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* DiSC & ARCH Profiling — Real-Time Agent Control */}
        <section id="disc" className="py-24 bg-[#0B1120]/80 border-y border-[#3B82F6]/10">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-block mb-3 text-xs font-bold tracking-widest text-purple-400 uppercase">
                Behavioral alignment
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                DiSC & ARCH Profiling
              </h2>
              <p className="text-slate-400">
                Agent behavior and tone adapt dynamically per interaction using DiSC and ARCH profiles—no one-size-fits-all voice.
              </p>
            </div>
            <p className="text-center text-slate-400 text-sm mb-8 max-w-2xl mx-auto">
              Adjust sliders to see how agent behavior is controlled in real time. Profiles are persisted for production agents.
            </p>
            <motion.div
              className="max-w-5xl mx-auto rounded-sui bg-slate-900/40 border border-[#3B82F6]/20 backdrop-blur-xl p-6 md:p-8"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-xs font-medium text-slate-500 mb-6">Demo profile</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* DiSC */}
                <div>
                  <h3 className="text-sm font-bold text-slate-300 mb-4">DiSC Profile</h3>
                  <div className="space-y-4 mb-6">
                    {[
                      { key: "dominance" as const, label: "Dominance", color: "#ef4444" },
                      { key: "influence" as const, label: "Influence", color: "#f59e0b" },
                      { key: "steadiness" as const, label: "Steadiness", color: "#10b981" },
                      { key: "conscientiousness" as const, label: "Conscientiousness", color: "#3b82f6" },
                    ].map(({ key, label, color }) => (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>
                          <span className="text-xs font-mono font-bold" style={{ color }}>{discScores[key]}%</span>
                        </div>
                        <Slider
                          value={[discScores[key]]}
                          onValueChange={(v) => setDiscScores((prev) => ({ ...prev, [key]: v[0] ?? 50 }))}
                          max={100}
                          step={1}
                          className="text-slate-700"
                          aria-label={`${label} ${discScores[key]}%`}
                        />
                      </div>
                    ))}
                  </div>
                  <DiscRadar data={discScores} />
                </div>
                {/* ARCH */}
                <div>
                  <h3 className="text-sm font-bold text-slate-300 mb-4">ARCH Profile</h3>
                  <div className="space-y-4 mb-6">
                    {[
                      { key: "acknowledge" as const, label: "Acknowledge", color: "#10b981" },
                      { key: "reflect" as const, label: "Reflect", color: "#3b82f6" },
                      { key: "context" as const, label: "Context", color: "#f59e0b" },
                      { key: "handoff" as const, label: "Handoff", color: "#ef4444" },
                    ].map(({ key, label, color }) => (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>
                          <span className="text-xs font-mono font-bold" style={{ color }}>{archProfile[key]}%</span>
                        </div>
                        <Slider
                          value={[archProfile[key]]}
                          onValueChange={(v) => setArchProfile((prev) => ({ ...prev, [key]: v[0] ?? 50 }))}
                          max={100}
                          step={1}
                          className="text-slate-700"
                          aria-label={`${label} ${archProfile[key]}%`}
                        />
                      </div>
                    ))}
                  </div>
                  <ArchBreakdown data={archProfile} />
                </div>
              </div>
            </motion.div>
            <p className="text-center text-slate-500 text-sm mt-6 max-w-xl mx-auto">
              ARCH extends alignment to owner priorities and moral frameworks. System prompts are DB-backed and validated (UPA) before persistence.
            </p>
          </div>
        </section>

        {/* Teams/Agents Provisioning Matrix */}
        <section id="provisioning" className="py-24 bg-[#0B1120]/80 border-y border-[#3B82F6]/10">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-block mb-3 text-xs font-bold tracking-widest text-indigo-400 uppercase">
                Scale
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                Teams / Agents Provisioning Matrix
              </h2>
              <p className="text-slate-400">
                One business → one site_config; industry templates clone 6 specialized agents on signup. Concierge assigned as primary.
              </p>
            </div>
            <ProvisioningMatrixDiagram />
          </div>
        </section>

        {/* Telephony — New world: firewall-like management, PTT, migration, QoL */}
        <section id="telephony" className="py-24 bg-[#0B1120]/80 border-y border-[#3B82F6]/10">
          <div className="container mx-auto px-6">
            <TelephonySummarySlide />
          </div>
        </section>

        {/* Handover Protocol */}
        <section id="handover" className="py-24 bg-[#0B1120]/80 border-y border-[#3B82F6]/10">
          <div className="container mx-auto px-6">
            <HandoverProtocolSlide />
          </div>
        </section>

        {/* Platform Mission & S4 */}
        <section id="s4" className="py-24 bg-[#0B1120]/80 border-y border-[#3B82F6]/10">
          <div className="container mx-auto px-6">
            <S4ArchitectureSlide />
          </div>
        </section>
      </main>

      {/* Footer disabled for now — fix later */}
      {/* <InvestorDemoFooter /> */}
    </div>
  );
}
