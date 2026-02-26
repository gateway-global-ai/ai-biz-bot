/**
 * Dynamic Entry Point Engine — Type Definitions
 *
 * Entry points are the 5 dynamic AI/routing buttons on every site:
 *   header | heroPrimary | heroSecondary | floatVoice | floatChat
 *
 * Configuration is stored in site_configs.knowledgeLibrary.entryPoints (JSONB).
 * Agent definitions are stored in site_configs.knowledgeLibrary.agents (JSONB).
 */

export type EntryPointType =
  | 'AGENT_DIRECTORY'   // Opens the visual agent roster inside ConciergePanel
  | 'VOICE_AGENT'       // Direct launch: voice session with a specific agent persona
  | 'CHAT_AGENT'        // Direct launch: chat session with a specific agent persona
  | 'LEGACY_PASSTHROUGH'; // Redirects to a legacy URL (40% window or new tab)

export type EntryPointSlot =
  | 'header'
  | 'heroPrimary'
  | 'heroSecondary'
  | 'floatVoice'
  | 'floatChat';

export interface EntryPointNode {
  enabled: boolean;
  label: string;
  type: EntryPointType;
  /** For VOICE_AGENT / CHAT_AGENT: which persona to load from knowledgeLibrary.agents */
  agentId?: string;
  /** For VOICE_AGENT / CHAT_AGENT: click-time context injected into the proxy system instruction */
  metaPrompt?: string;
  /** For LEGACY_PASSTHROUGH */
  url?: string;
  /** For LEGACY_PASSTHROUGH: render in the 40% window iframe vs open in new tab */
  openMode?: 'window' | 'tab';
}

export interface EntryPointsMap {
  header: EntryPointNode;
  heroPrimary: EntryPointNode;
  heroSecondary: EntryPointNode;
  floatVoice: EntryPointNode;
  floatChat: EntryPointNode;
}

/**
 * A specialty AI agent defined by the business owner.
 * Stored in knowledgeLibrary.agents[agentId].
 */
export interface AgentDefinition {
  name: string;           // Display name shown in AgentDirectoryMenu bars
  description: string;    // Muted subtext in the directory menu
  persona: string;        // The compiled system prompt — validated by UPAValidator before save
  allowedTools: string[]; // Subset of TOOL_DECLARATIONS keys; empty array = all tools
}

export type AgentsMap = Record<string, AgentDefinition>;

/**
 * Default entry points used when knowledgeLibrary.entryPoints is absent.
 * Free-tier sites show Gateway Global AI branding until the owner customizes.
 */
export const DEFAULT_ENTRY_POINTS: EntryPointsMap = {
  header: {
    enabled: true,
    label: 'AI Biz Bot Concierge',
    type: 'AGENT_DIRECTORY',
    agentId: 'default',
    metaPrompt: '',
  },
  heroPrimary: {
    enabled: true,
    label: 'Voice Concierge',
    type: 'VOICE_AGENT',
    agentId: 'default',
    metaPrompt: 'Greet the user warmly. Ask how you can help them today.',
  },
  heroSecondary: {
    enabled: true,
    label: 'Chat with Us',
    type: 'CHAT_AGENT',
    agentId: 'default',
    metaPrompt: '',
  },
  floatVoice: {
    enabled: true,
    label: 'Voice',
    type: 'AGENT_DIRECTORY',
    agentId: 'default',
    metaPrompt: '',
  },
  floatChat: {
    enabled: false,
    label: 'Chat',
    type: 'CHAT_AGENT',
    agentId: 'default',
    metaPrompt: '',
  },
};

/**
 * Default agent used when no custom agents are configured.
 */
export const DEFAULT_AGENT: AgentDefinition = {
  name: 'Site Concierge',
  description: 'General assistance — ask me anything about this business.',
  persona: 'You are a helpful and friendly AI concierge for this business. Answer questions about the business, help visitors find what they need, and guide them toward the right next step.',
  allowedTools: [],
};
