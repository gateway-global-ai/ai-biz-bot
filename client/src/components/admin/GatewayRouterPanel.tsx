/**
 * GatewayRouterPanel — The Visual Switchboard
 *
 * Spatially lays out the 5 Dynamic Entry Point nodes mirroring their
 * position on the live site (Header / Hero Primary + Secondary / Float Voice + Chat).
 * Each node is fully configurable: enable/disable, label, routing type, and
 * conditional inputs (agentId + metaPrompt for AI, URL + openMode for legacy).
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2, CheckCircle, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  EntryPointNode,
  EntryPointsMap,
  EntryPointType,
  AgentsMap,
  DEFAULT_ENTRY_POINTS,
} from '../../types/entryPoints';

interface GatewayRouterPanelProps {
  siteConfigId: string;
  knowledgeLibrary: unknown;
  onSaved?: () => void;
}

const ROUTING_OPTIONS: { value: EntryPointType; label: string; description: string }[] = [
  { value: 'AGENT_DIRECTORY', label: 'Open Agent Directory', description: 'Shows the multi-agent menu — user picks their specialist' },
  { value: 'VOICE_AGENT',     label: 'Direct: Voice AI',    description: 'Bypasses the menu — launches a specific voice agent instantly' },
  { value: 'CHAT_AGENT',      label: 'Direct: Chat AI',     description: 'Bypasses the menu — launches a specific chat agent instantly' },
  { value: 'LEGACY_PASSTHROUGH', label: 'Legacy Web Pass-Through', description: 'Redirects to an external URL (your old site, a store, a form)' },
];

interface NodeCardProps {
  slot: keyof EntryPointsMap;
  label: string;
  node: EntryPointNode;
  agents: AgentsMap;
  onChange: (slot: keyof EntryPointsMap, updated: EntryPointNode) => void;
}

const NodeCard: React.FC<NodeCardProps> = ({ slot, label, node, agents, onChange }) => {
  const update = (patch: Partial<EntryPointNode>) => onChange(slot, { ...node, ...patch });
  const agentIds = ['default', ...Object.keys(agents).filter(k => k !== 'default')];
  const agentOptions = agentIds.map(id => ({
    id,
    name: id === 'default' ? 'Default Concierge' : (agents[id]?.name ?? id),
  }));

  return (
    <motion.div
      whileHover={{ scale: 1.005 }}
      className={`rounded-[20px] border p-4 transition-all ${
        node.enabled
          ? 'bg-white/5 border-indigo-500/30'
          : 'bg-white/[0.02] border-slate-700/40'
      }`}
    >
      {/* Node header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white font-semibold text-sm">{label}</p>
          <p className="text-slate-500 text-xs font-mono">{slot}</p>
        </div>
        <button
          onClick={() => update({ enabled: !node.enabled })}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors"
        >
          {node.enabled
            ? <><ToggleRight className="w-5 h-5 text-emerald-500" /><span className="text-emerald-400">Active</span></>
            : <><ToggleLeft className="w-5 h-5 text-slate-600" /><span className="text-slate-500">Disabled</span></>
          }
        </button>
      </div>

      {node.enabled && (
        <div className="space-y-3">
          {/* Label */}
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Button Label</label>
            <input
              type="text"
              value={node.label}
              onChange={e => update({ label: e.target.value })}
              placeholder="e.g. Post Bail Now"
              className="w-full bg-slate-800/60 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
          </div>

          {/* Routing type */}
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Routing Destination</label>
            <select
              value={node.type}
              onChange={e => update({ type: e.target.value as EntryPointType })}
              className="w-full bg-slate-800/60 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              {ROUTING_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-slate-600 text-[10px] mt-1">
              {ROUTING_OPTIONS.find(o => o.value === node.type)?.description}
            </p>
          </div>

          {/* AI-type conditional inputs */}
          {(node.type === 'VOICE_AGENT' || node.type === 'CHAT_AGENT') && (
            <>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Agent</label>
                <select
                  value={node.agentId ?? 'default'}
                  onChange={e => update({ agentId: e.target.value })}
                  className="w-full bg-slate-800/60 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                >
                  {agentOptions.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Metaprompt Context</label>
                <textarea
                  rows={3}
                  value={node.metaPrompt ?? ''}
                  onChange={e => update({ metaPrompt: e.target.value })}
                  placeholder={`e.g. "The user clicked '${node.label}'. Ask for the inmate's full name immediately."`}
                  className="w-full bg-slate-800/60 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 resize-none"
                />
                <p className="text-slate-600 text-[10px] mt-1">Injected into the AI session at click time. The AI executes this in its first response.</p>
              </div>
            </>
          )}

          {/* Legacy passthrough conditional inputs */}
          {node.type === 'LEGACY_PASSTHROUGH' && (
            <>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Destination URL</label>
                <input
                  type="url"
                  value={node.url ?? ''}
                  onChange={e => update({ url: e.target.value })}
                  placeholder="https://your-legacy-site.com/forms"
                  className="w-full bg-slate-800/60 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Open In</label>
                <div className="flex gap-2">
                  {(['window', 'tab'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => update({ openMode: mode })}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                        (node.openMode ?? 'tab') === mode
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {mode === 'window' ? '40% Window' : 'New Tab'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};

export const GatewayRouterPanel: React.FC<GatewayRouterPanelProps> = ({
  siteConfigId,
  knowledgeLibrary,
  onSaved,
}) => {
  const kl = (knowledgeLibrary && typeof knowledgeLibrary === 'object')
    ? (knowledgeLibrary as Record<string, any>)
    : {};
  const storedEP = (kl.entryPoints ?? {}) as Partial<EntryPointsMap>;
  const agents: AgentsMap = (kl.agents ?? {}) as AgentsMap;

  const [nodes, setNodes] = useState<EntryPointsMap>({
    header:        { ...DEFAULT_ENTRY_POINTS.header,        ...(storedEP.header        ?? {}) },
    heroPrimary:   { ...DEFAULT_ENTRY_POINTS.heroPrimary,   ...(storedEP.heroPrimary   ?? {}) },
    heroSecondary: { ...DEFAULT_ENTRY_POINTS.heroSecondary, ...(storedEP.heroSecondary ?? {}) },
    floatVoice:    { ...DEFAULT_ENTRY_POINTS.floatVoice,    ...(storedEP.floatVoice    ?? {}) },
    floatChat:     { ...DEFAULT_ENTRY_POINTS.floatChat,     ...(storedEP.floatChat     ?? {}) },
  });

  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleNodeChange = (slot: keyof EntryPointsMap, updated: EntryPointNode) => {
    setNodes(prev => ({ ...prev, [slot]: updated }));
    setIsDirty(true);
    setSaving('idle');
  };

  const handleSave = async () => {
    setSaving('saving');
    try {
      const res = await fetch(`/api/site-configs/${siteConfigId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledgeLibrary: { ...kl, entryPoints: nodes },
        }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      setSaving('saved');
      setIsDirty(false);
      onSaved?.();
      setTimeout(() => setSaving('idle'), 3000);
    } catch (err) {
      console.error('[GatewayRouterPanel] Save error:', err);
      setSaving('error');
      setTimeout(() => setSaving('idle'), 4000);
    }
  };

  const NODE_CONFIGS: { slot: keyof EntryPointsMap; label: string }[] = [
    { slot: 'header',        label: 'Global Header Button' },
    { slot: 'heroPrimary',   label: 'Hero Primary Action' },
    { slot: 'heroSecondary', label: 'Hero Secondary Action' },
    { slot: 'floatVoice',    label: 'Floating Voice Button' },
    { slot: 'floatChat',     label: 'Floating Chat Button' },
  ];

  return (
    <div className="space-y-6">
      {/* Panel header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Gateway Router</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Configure every AI entry point on your site. Each node intercepts visitor traffic and routes it to the right specialist.
          </p>
        </div>
        <motion.button
          onClick={handleSave}
          disabled={!isDirty || saving === 'saving'}
          whileTap={{ scale: 0.97 }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            saving === 'saved'
              ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400'
              : saving === 'error'
              ? 'bg-rose-600/20 border border-rose-500/30 text-rose-400'
              : isDirty
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 animate-pulse'
              : 'bg-slate-800/60 border border-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {saving === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> :
           saving === 'saved'  ? <CheckCircle className="w-4 h-4" /> :
           saving === 'error'  ? <AlertCircle className="w-4 h-4" /> :
           <Save className="w-4 h-4" />}
          {saving === 'saving' ? 'Saving...' : saving === 'saved' ? 'Saved' : saving === 'error' ? 'Error' : 'Save Configuration'}
        </motion.button>
      </div>

      {/* ZONE 1 — Global Header Intercept */}
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[24px] border border-white/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
          <p className="text-slate-300 font-semibold text-sm uppercase tracking-wider">Zone 1 — Global Header Intercept</p>
        </div>
        <NodeCard slot="header" label={NODE_CONFIGS[0].label} node={nodes.header} agents={agents} onChange={handleNodeChange} />
      </div>

      {/* ZONE 2 — Hero Intent Actions */}
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[24px] border border-white/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
          <p className="text-slate-300 font-semibold text-sm uppercase tracking-wider">Zone 2 — Hero Intent Actions</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NodeCard slot="heroPrimary"   label={NODE_CONFIGS[1].label} node={nodes.heroPrimary}   agents={agents} onChange={handleNodeChange} />
          <NodeCard slot="heroSecondary" label={NODE_CONFIGS[2].label} node={nodes.heroSecondary} agents={agents} onChange={handleNodeChange} />
        </div>
      </div>

      {/* ZONE 3 — Persistent Floaters */}
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[24px] border border-white/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 bg-violet-500 rounded-full" />
          <p className="text-slate-300 font-semibold text-sm uppercase tracking-wider">Zone 3 — Persistent Floaters</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NodeCard slot="floatVoice" label={NODE_CONFIGS[3].label} node={nodes.floatVoice} agents={agents} onChange={handleNodeChange} />
          <NodeCard slot="floatChat"  label={NODE_CONFIGS[4].label} node={nodes.floatChat}  agents={agents} onChange={handleNodeChange} />
        </div>
      </div>
    </div>
  );
};
