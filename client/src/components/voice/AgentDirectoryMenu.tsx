import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Bot, Headphones, MessageSquare, Sparkles } from 'lucide-react';
import { AgentsMap, AgentDefinition, DEFAULT_AGENT } from '../../types/entryPoints';

interface AgentDirectoryMenuProps {
  agents: AgentsMap;
  onSelectAgent: (agentId: string, agent: AgentDefinition) => void;
  /** Optional header override */
  header?: string;
}

const AGENT_COLORS = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-sky-500 to-blue-600',
  'from-violet-500 to-indigo-600',
];

const AGENT_ICONS = [Bot, Headphones, MessageSquare, Sparkles, Bot, Headphones];

export const AgentDirectoryMenu: React.FC<AgentDirectoryMenuProps> = ({
  agents,
  onSelectAgent,
  header = 'Who would you like to speak with?',
}) => {
  // Build the agent list — always include "default" as the first entry
  const agentEntries: [string, AgentDefinition][] = [
    ['default', DEFAULT_AGENT],
    ...Object.entries(agents).filter(([id]) => id !== 'default'),
  ];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="px-5 pt-4 pb-3 border-b border-white/5"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider">Agent Directory</span>
        </div>
        <p className="text-white font-bold text-base leading-snug">{header}</p>
        <p className="text-slate-400 text-xs mt-0.5">Select a specialist to begin your session</p>
      </motion.div>

      {/* Agent Bars */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2">
        <AnimatePresence>
          {agentEntries.map(([agentId, agent], idx) => {
            const colorClass = AGENT_COLORS[idx % AGENT_COLORS.length];
            const Icon = AGENT_ICONS[idx % AGENT_ICONS.length];

            return (
              <motion.button
                key={agentId}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25, delay: idx * 0.06 }}
                whileHover={{ scale: 1.015, backgroundColor: 'rgba(255,255,255,0.08)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectAgent(agentId, agent)}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all text-left group"
              >
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm leading-tight truncate">
                    {agent.name}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5 leading-snug line-clamp-2">
                    {agent.description}
                  </p>
                </div>

                {/* Arrow */}
                <ChevronRight className="flex-shrink-0 w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="px-5 py-3 border-t border-white/5 text-center"
      >
        <p className="text-slate-600 text-xs">
          Powered by <span className="text-indigo-500/70 font-medium">Sovereign OS</span>
        </p>
      </motion.div>
    </div>
  );
};
