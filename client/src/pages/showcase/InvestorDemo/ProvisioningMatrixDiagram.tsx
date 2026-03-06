/**
 * Teams/Agents Provisioning Matrix — visual for investor deck.
 * Schema: site_configs (one per business), agents (N per site_config_id), industry_agent_templates (blueprints).
 */
import React from "react";
import { motion } from "framer-motion";
import { Database, Users, Layers, ArrowRight, CheckCircle } from "lucide-react";

export function ProvisioningMatrixDiagram() {
  return (
    <motion.div
      className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="p-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-4 text-indigo-400">
          <Database size={20} />
          <span className="font-bold text-sm uppercase">Site Configs</span>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          One per business. Holds <code className="text-slate-300">assignedAgentId</code> (primary Concierge) and knowledge config. Does not store the full team.
        </p>
        <div className="text-xs text-slate-500 font-mono">assignedAgentId → Concierge</div>
      </div>
      <div className="p-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-4 text-emerald-400">
          <Users size={20} />
          <span className="font-bold text-sm uppercase">Agents Table</span>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          One row per AI agent per site: roleType, name, voice config, DiSC profile, model settings. Status: active / paused / inactive.
        </p>
        <div className="text-xs text-emerald-400/80">Same site_config_id = one team</div>
      </div>
      <div className="p-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-4 text-cyan-400">
          <Layers size={20} />
          <span className="font-bold text-sm uppercase">Industry Templates</span>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          Blueprints: one row per (industryGroup × archetype). Used to clone typically 6 agents on business signup.
        </p>
        <div className="flex items-center gap-1 text-xs text-cyan-400/80">
          <CheckCircle size={12} /> provisionAgentsForBusiness()
        </div>
      </div>
      <div className="lg:col-span-3 p-6 rounded-sui bg-slate-800/60 border border-indigo-500/20 backdrop-blur-xl flex flex-wrap items-center justify-center gap-4 text-sm">
        <span className="text-slate-400">Flow:</span>
        <span className="text-slate-300">placeTypes</span>
        <ArrowRight size={16} className="text-slate-500" />
        <span className="text-indigo-400">industryGroup</span>
        <ArrowRight size={16} className="text-slate-500" />
        <span className="text-slate-300">Load 6 templates</span>
        <ArrowRight size={16} className="text-slate-500" />
        <span className="text-emerald-400">Create agent rows</span>
        <ArrowRight size={16} className="text-slate-500" />
        <span className="text-slate-300">Set assignedAgentId = Concierge</span>
      </div>
    </motion.div>
  );
}
