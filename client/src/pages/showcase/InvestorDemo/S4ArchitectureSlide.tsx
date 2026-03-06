/**
 * Platform Mission & S4 Architecture — Security, Stability, Speed, Structure.
 */
import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Cpu, Zap, Database, Phone, TrendingUp } from "lucide-react";

const PILLARS = [
  {
    id: "security",
    title: "Security",
    icon: ShieldCheck,
    color: "text-emerald-400 border-emerald-500/30",
    rule: "Zero-PII footprint. Identity via NOVA Sovereign IDV (OTP, Biometrics, Magic Link). Never store raw PII in transit.",
  },
  {
    id: "stability",
    title: "Stability",
    icon: Cpu,
    color: "text-blue-400 border-blue-500/30",
    rule: "685KB Kernel stateless and lean. No zombie WebSockets. Clean up sessions on disconnect.",
  },
  {
    id: "speed",
    title: "Speed",
    icon: Zap,
    color: "text-amber-400 border-amber-500/30",
    rule: "Clear Voice PTT priority lane. Mouth-to-ear target sub-150ms via native multimodal. No middleware that degrades voice latency.",
  },
  {
    id: "structure",
    title: "Structure",
    icon: Database,
    color: "text-purple-400 border-purple-500/30",
    rule: "Everything is a Sovereign Session. Usage at millisecond precision for telecom-grade billing.",
  },
] as const;

export function S4ArchitectureSlide() {
  return (
    <>
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="inline-block mb-3 text-xs font-bold tracking-widest text-indigo-400 uppercase">
          Platform mission
        </span>
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
          S4 Architecture
        </h2>
        <p className="text-slate-400 mb-4">
          We build AI Business Routers, not chatbots. Customer Interaction Infrastructure for mid-market operators.
        </p>
        <p className="text-slate-500 text-sm">
          Base $49/mo · Comms $50/mo · $0.25/min overage. Revenue events: Bookings, Sales, Leads from inbound PSTN.
        </p>
      </div>
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        {PILLARS.map(({ id, title, icon: Icon, color, rule }) => (
          <div
            key={id}
            className={`p-6 rounded-sui bg-slate-900/40 border backdrop-blur-xl ${color}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Icon size={20} />
              <span className="font-bold text-white">{title}</span>
            </div>
            <p className="text-slate-400 text-sm">{rule}</p>
          </div>
        ))}
      </motion.div>
      <motion.div
        className="max-w-2xl mx-auto p-6 rounded-sui bg-slate-800/60 border border-indigo-500/20 backdrop-blur-xl flex flex-wrap items-center justify-center gap-3"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <Phone className="text-indigo-400" size={20} />
        <span className="text-slate-300">Inbound PSTN calls</span>
        <span className="text-slate-500">→</span>
        <TrendingUp className="text-emerald-400" size={20} />
        <span className="text-emerald-400 font-medium">Revenue events (Bookings, Sales, Leads)</span>
      </motion.div>
    </>
  );
}
