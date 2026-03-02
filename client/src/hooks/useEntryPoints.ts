import { useMemo } from 'react';
import {
  EntryPointsMap,
  AgentsMap,
  AgentDefinition,
  DEFAULT_ENTRY_POINTS,
  DEFAULT_AGENT,
} from '../types/entryPoints';

/**
 * Parses knowledgeLibrary (JSONB from site_configs) and returns:
 *  - entryPoints: the 5 dynamic button configs (with defaults merged in)
 *  - agents: the map of specialty agent definitions
 *  - getAgent: helper to resolve an agentId to its AgentDefinition
 */
export function useEntryPoints(knowledgeLibrary: unknown): {
  entryPoints: EntryPointsMap;
  agents: AgentsMap;
  getAgent: (agentId?: string) => AgentDefinition;
} {
  return useMemo(() => {
    const kl = (knowledgeLibrary && typeof knowledgeLibrary === 'object')
      ? (knowledgeLibrary as Record<string, unknown>)
      : {};

    // Merge stored entryPoints with defaults — stored values win per slot
    const stored = (kl.entryPoints && typeof kl.entryPoints === 'object')
      ? (kl.entryPoints as Partial<EntryPointsMap>)
      : {};

    const entryPoints: EntryPointsMap = {
      header:        { ...DEFAULT_ENTRY_POINTS.header,        ...(stored.header        ?? {}) },
      heroPrimary:   { ...DEFAULT_ENTRY_POINTS.heroPrimary,   ...(stored.heroPrimary   ?? {}) },
      heroSecondary: { ...DEFAULT_ENTRY_POINTS.heroSecondary, ...(stored.heroSecondary ?? {}) },
      floatVoice:    { ...DEFAULT_ENTRY_POINTS.floatVoice,    ...(stored.floatVoice    ?? {}) },
      floatChat:     { ...DEFAULT_ENTRY_POINTS.floatChat,     ...(stored.floatChat     ?? {}) },
    };

    const agents: AgentsMap = (kl.agents && typeof kl.agents === 'object')
      ? (kl.agents as AgentsMap)
      : {};

    const getAgent = (agentId?: string): AgentDefinition => {
      if (!agentId || agentId === 'default') return DEFAULT_AGENT;
      return agents[agentId] ?? DEFAULT_AGENT;
    };

    return { entryPoints, agents, getAgent };
  }, [knowledgeLibrary]);
}
