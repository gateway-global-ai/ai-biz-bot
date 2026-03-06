/**
 * Handover Protocol — DB-backed system prompts, no 1006 loops, no instruction drift.
 */
import React from "react";
import { motion } from "framer-motion";
import { Database, ShieldCheck, Volume2, AlertCircle } from "lucide-react";

export function HandoverProtocolSlide() {
  return (
    <>
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="inline-block mb-3 text-xs font-bold tracking-widest text-indigo-400 uppercase">
          Stability
        </span>
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
          Handover Protocol
        </h2>
        <p className="text-slate-400">
          System prompts are database artifacts. No UI state as source of truth. Prevents WebSocket 1006 loops and instruction drift.
        </p>
      </div>
      <motion.div
        className="max-w-3xl mx-auto space-y-6"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="p-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl flex items-start gap-4">
          <Database className="text-indigo-400 shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-bold text-white mb-2">Source of truth</h3>
            <p className="text-slate-400 text-sm">
              System prompts live in <code className="text-slate-300">site_configs</code> (or equivalent). ConciergePanel fetches via <code className="text-slate-300">GET /api/site-configs/:id</code>. Never build or hardcode prompts in the client.
            </p>
          </div>
        </div>
        <div className="p-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl flex items-start gap-4">
          <ShieldCheck className="text-emerald-400 shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-bold text-white mb-2">Validation first</h3>
            <p className="text-slate-400 text-sm">
              Every prompt or config saved to site_configs must pass <code className="text-slate-300">UPAValidator.validate()</code> before persistence.
            </p>
          </div>
        </div>
        <div className="p-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl flex items-start gap-4">
          <Volume2 className="text-cyan-400 shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-bold text-white mb-2">Audio safety</h3>
            <p className="text-slate-400 text-sm">
              Before calling <code className="text-slate-300">inputAudioContext.close()</code>, check <code className="text-slate-300">state !== 'closed'</code>. Clean up AudioContext on disconnect or unmount to avoid InvalidStateError.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
          <AlertCircle size={14} />
          <span>No routing or voice logic from external ZIPs is merged; handover rules are platform invariants.</span>
        </div>
      </motion.div>
    </>
  );
}
