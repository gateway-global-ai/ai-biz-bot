/**
 * Telephony Panel Summary — Investor deck.
 * New world of telephony: manage phone lines like firewalls manage data.
 * PTT over telephone, migration to digital (QR, gatekeepers), less spam stress, more control.
 */
import React from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Mic,
  QrCode,
  UserCheck,
  Heart,
  Zap,
} from "lucide-react";

const BULLETS = [
  {
    icon: Shield,
    title: "Phone lines like firewalls manage data",
    color: "text-indigo-400 border-indigo-500/30",
    text: "We built a system to manage phone lines the way firewalls manage data—provisioning, allowlists, webhooks, and diagnostics in one control panel. Businesses get one trunk; every call and SMS flows through sovereign routing.",
  },
  {
    icon: Mic,
    title: "PTT beats realtime voice AI over the phone",
    color: "text-amber-400 border-amber-500/30",
    text: "Our Push-to-Talk technology works better than any realtime voice AI over the telephone. Intentional input, sub-150ms target, no open mics—fewer phantom triggers and lower cost than always-on streaming.",
  },
  {
    icon: QrCode,
    title: "Migrate from traditional telephony to digital",
    color: "text-emerald-400 border-emerald-500/30",
    text: "QR codes and personal gatekeepers help migrate people from traditional telephony into the digital era. One tap to reach the business; one place to control who gets through.",
  },
  {
    icon: UserCheck,
    title: "Personal gatekeepers reduce stress",
    color: "text-cyan-400 border-cyan-500/30",
    text: "Constant spam emails, texts, and phone calls degrade quality of life. We give users more control—who can call, when, and how they’re greeted—so they get their time back.",
  },
] as const;

export function TelephonySummarySlide() {
  return (
    <>
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="inline-block mb-3 text-xs font-bold tracking-widest text-indigo-400 uppercase">
          Infrastructure
        </span>
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
          A new world of telephony
        </h2>
        <p className="text-slate-400 mb-4">
          We manage phone lines the way firewalls manage data. Our PTT technology outperforms realtime voice AI over the telephone, and we help people move from traditional telephony to the digital era—with less spam and more control.
        </p>
        <p className="text-slate-500 text-sm">
          QR codes and personal gatekeepers reduce stress from constant spam; we give users more control and improve their quality of life.
        </p>
      </div>
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        {BULLETS.map(({ icon: Icon, title, color, text }) => (
          <div
            key={title}
            className={`p-6 rounded-sui bg-slate-900/40 border backdrop-blur-xl ${color}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Icon size={20} />
              <span className="font-bold text-white">{title}</span>
            </div>
            <p className="text-slate-400 text-sm">{text}</p>
          </div>
        ))}
      </motion.div>
      <motion.div
        className="max-w-2xl mx-auto p-6 rounded-sui bg-slate-800/60 border border-indigo-500/20 backdrop-blur-xl flex flex-wrap items-center justify-center gap-3"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <Zap className="text-amber-400" size={20} />
        <span className="text-slate-300">PTT over PSTN</span>
        <span className="text-slate-500">→</span>
        <Heart className="text-emerald-400" size={20} />
        <span className="text-emerald-400 font-medium">More control, better quality of life</span>
      </motion.div>
    </>
  );
}
