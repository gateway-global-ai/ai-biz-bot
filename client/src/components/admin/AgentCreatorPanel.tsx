/**
 * AgentCreatorPanel — Specialty Agent Creator
 *
 * Allows the business owner to build their "Digital Workforce Roster."
 * Each agent has a name, directory description, system persona, and an
 * optional tool allowlist. The "Deep Research" button auto-generates
 * a professional persona via the /api/generate-agent-persona route.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Save, Sparkles, Loader2, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, Bot,
} from 'lucide-react';
import { AgentDefinition, AgentsMap } from '../../types/entryPoints';
import { TOOL_NAMES } from '../../constants/toolNames';

interface AgentCreatorPanelProps {
  siteConfigId: string;
  knowledgeLibrary: unknown;
  onSaved?: (updatedAgents: AgentsMap) => void;
}

const generateSlug = (name: string): string =>
  `agent_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}_${Date.now().toString(36)}`;

interface AgentEditorProps {
  agentId: string;
  agent: AgentDefinition;
  onChange: (id: string, updated: AgentDefinition) => void;
  onDelete: (id: string) => void;
  siteConfigId: string;
}

const AgentEditor: React.FC<AgentEditorProps> = ({ agentId, agent, onChange, onDelete, siteConfigId }) => {
  const [expanded, setExpanded] = useState(agentId.startsWith('agent_new'));
  const [generating, setGenerating] = useState(false);
  const [targetRole, setTargetRole] = useState('');
  const [genError, setGenError] = useState<string | null>(null);

  const update = (patch: Partial<AgentDefinition>) =>
    onChange(agentId, { ...agent, ...patch });

  const handleDeepResearch = async () => {
    if (!targetRole.trim()) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch('/api/generate-agent-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteConfigId, targetRole: targetRole.trim() }),
      });
      if (!res.ok) throw new Error(`Generation failed: ${res.status}`);
      const data = await res.json();
      update({ persona: data.persona ?? '' });
    } catch (err: any) {
      setGenError(err.message ?? 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleTool = (toolName: string) => {
    const current = agent.allowedTools ?? [];
    const updated = current.includes(toolName)
      ? current.filter(t => t !== toolName)
      : [...current, toolName];
    update({ allowedTools: updated });
  };

  return (
    <motion.div
      layout
      className="bg-slate-900/40 border border-white/5 rounded-[20px] overflow-hidden"
    >
      {/* Agent card header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-sm">{agent.name || 'Unnamed Agent'}</p>
            <p className="text-slate-500 text-xs">{agent.description || 'No description yet'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(agentId); }}
            className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Delete agent"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-5 pb-5 space-y-4 border-t border-white/5"
          >
            <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Agent Name</label>
                <input
                  type="text"
                  value={agent.name}
                  onChange={e => update({ name: e.target.value })}
                  placeholder="e.g. 24/7 Bail Agent"
                  className="w-full bg-slate-800/60 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Menu Description</label>
                <input
                  type="text"
                  value={agent.description}
                  onChange={e => update({ description: e.target.value })}
                  placeholder="e.g. Get immediate help with warrants and posting bond"
                  className="w-full bg-slate-800/60 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Deep Research trigger */}
            <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <p className="text-indigo-300 font-semibold text-sm">Auto-Generate Persona via Deep Research</p>
              </div>
              <p className="text-slate-500 text-xs">
                Describe the role and the system will research your business, local laws, and industry SOPs to write a professional system prompt automatically.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  placeholder="e.g. Bail Bondsman, Catering Manager, HVAC Sales Agent"
                  className="flex-1 bg-slate-800/60 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                  onKeyDown={e => e.key === 'Enter' && handleDeepResearch()}
                />
                <button
                  onClick={handleDeepResearch}
                  disabled={generating || !targetRole.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generating ? 'Researching...' : 'Generate'}
                </button>
              </div>
              {genError && <p className="text-rose-400 text-xs">{genError}</p>}
            </div>

            {/* System Prompt */}
            <div>
              <label className="text-slate-400 text-xs mb-1 block">System Prompt (Persona)</label>
              <textarea
                rows={6}
                value={agent.persona}
                onChange={e => update({ persona: e.target.value })}
                placeholder="Describe this agent's role, personality, constraints, and knowledge in detail..."
                className="w-full bg-slate-800/60 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 resize-none font-mono"
              />
              <p className="text-slate-600 text-[10px] mt-1">
                This prompt is compiled with your site's Sovereign Knowledge by the proxy. Be specific and authoritative.
              </p>
            </div>

            {/* Tool allowlist */}
            {TOOL_NAMES.length > 0 && (
              <div>
                <label className="text-slate-400 text-xs mb-2 block">
                  Allowed Tools <span className="text-slate-600">(empty = all tools available)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {TOOL_NAMES.map(toolName => {
                    const active = (agent.allowedTools ?? []).includes(toolName);
                    return (
                      <button
                        key={toolName}
                        onClick={() => toggleTool(toolName)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          active
                            ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                            : 'bg-white/5 border-white/10 text-slate-500 hover:border-slate-500'
                        }`}
                      >
                        {toolName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const AgentCreatorPanel: React.FC<AgentCreatorPanelProps> = ({
  siteConfigId,
  knowledgeLibrary,
  onSaved,
}) => {
  const kl = (knowledgeLibrary && typeof knowledgeLibrary === 'object')
    ? (knowledgeLibrary as Record<string, any>)
    : {};

  const [agents, setAgents] = useState<AgentsMap>((kl.agents ?? {}) as AgentsMap);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleAgentChange = (id: string, updated: AgentDefinition) => {
    setAgents(prev => ({ ...prev, [id]: updated }));
    setIsDirty(true);
    setSaving('idle');
  };

  const handleDelete = (id: string) => {
    setAgents(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setIsDirty(true);
    setSaving('idle');
  };

  const handleAdd = () => {
    const id = generateSlug('new');
    setAgents(prev => ({
      ...prev,
      [id]: { name: '', description: '', persona: '', allowedTools: [] },
    }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving('saving');
    try {
      const res = await fetch(`/api/site-configs/${siteConfigId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledgeLibrary: { ...kl, agents },
        }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      setSaving('saved');
      setIsDirty(false);
      onSaved?.(agents);
      setTimeout(() => setSaving('idle'), 3000);
    } catch (err) {
      console.error('[AgentCreatorPanel] Save error:', err);
      setSaving('error');
      setTimeout(() => setSaving('idle'), 4000);
    }
  };

  const agentEntries = Object.entries(agents);

  return (
    <div className="space-y-6">
      {/* Panel header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Specialty Agents</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Build your Digital Workforce Roster. Each agent is a specialized AI employee with its own persona, knowledge, and tool access.
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
          {saving === 'saving' ? 'Saving...' : saving === 'saved' ? 'Saved' : saving === 'error' ? 'Error' : 'Save Agents'}
        </motion.button>
      </div>

      {/* Agent list */}
      <div className="space-y-3">
        <AnimatePresence>
          {agentEntries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 text-slate-600"
            >
              <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No specialty agents yet</p>
              <p className="text-sm mt-1">Add your first agent to start building your digital workforce.</p>
            </motion.div>
          ) : (
            agentEntries.map(([id, agent]) => (
              <AgentEditor
                key={id}
                agentId={id}
                agent={agent}
                onChange={handleAgentChange}
                onDelete={handleDelete}
                siteConfigId={siteConfigId}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Add agent button */}
      <button
        onClick={handleAdd}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/5 hover:border-indigo-500/50 transition-all text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        Add Specialty Agent
      </button>
    </div>
  );
};
