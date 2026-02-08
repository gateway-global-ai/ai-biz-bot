/**
 * AI Biz Bot MCP Server
 *
 * Standardizes deployments of Gemini Voice AI into the chat interface and websites.
 * Provides tools to add components to the chat window and to websites, and to
 * manage voice/PTT configuration so all deployments use the same behavior.
 *
 * Run: npm run build && npm start
 * Port: MCP_PORT (default 3020)
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import type {
  ChatWindowComponent,
  ChatWindowComponentId,
  WebsiteComponent,
  WebsiteComponentId,
  VoicePttConfig,
  VoiceModuleRegistration,
} from './types.js';

// ---------------------------------------------------------------------------
// MCP Protocol Types
// ---------------------------------------------------------------------------
interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ---------------------------------------------------------------------------
// In-memory state (in production, replace with DB or config store)
// ---------------------------------------------------------------------------
const chatComponents: Map<ChatWindowComponentId, ChatWindowComponent> = new Map();
const websiteComponents: Map<WebsiteComponentId, WebsiteComponent> = new Map();
let voicePttConfig: VoicePttConfig = {
  defaultMode: 'ptt',
  editWindowMs: 1000,
  mobileDefaultPtt: true,
  listenOnlyOnPtt: true,
  pttReleaseBufferMs: 1200,
  interruptPolicy: 'smart',
};
const voiceModules: Map<string, VoiceModuleRegistration> = new Map();
const deploymentIdToChatComponents: Map<string, ChatWindowComponentId[]> = new Map();
const deploymentIdToWebsiteComponents: Map<string, WebsiteComponentId[]> = new Map();

// ---------------------------------------------------------------------------
// Default component catalog (from chat SDK + voice SDK)
// ---------------------------------------------------------------------------
function getDefaultChatComponents(): ChatWindowComponent[] {
  return [
    { id: 'header', name: 'Header', description: 'Chat header with bot name and close', slot: 'header', required: true, addedAt: new Date().toISOString() },
    { id: 'message_list', name: 'Message list', description: 'Scrollable list of user and assistant messages', slot: 'body', required: true, addedAt: new Date().toISOString() },
    { id: 'transcript_editor', name: 'Transcript editor', description: 'Real-time transcription with 1s edit window before auto-submit (PTT)', slot: 'body', required: false, addedAt: new Date().toISOString() },
    { id: 'voice_visualizer', name: 'Voice visualizer', description: 'Orb/bars/waveform for voice activity', slot: 'body', required: false, addedAt: new Date().toISOString() },
    { id: 'typing_indicator', name: 'Typing indicator', description: 'Dots or pulse while assistant is generating', slot: 'body', required: false, addedAt: new Date().toISOString() },
    { id: 'input_row', name: 'Input row', description: 'Text input and send button', slot: 'footer', required: true, addedAt: new Date().toISOString() },
    { id: 'voice_ptt_button', name: 'Voice PTT button', description: 'Push-to-talk: hold to speak, release to transcribe + 1s edit + submit', slot: 'footer', required: false, addedAt: new Date().toISOString() },
    { id: 'admin_controls', name: 'Admin controls', description: 'Voice model, system prompt, visitor settings (admin interface)', slot: 'sidebar', required: false, addedAt: new Date().toISOString() },
    { id: 'user_greeting', name: 'User greeting', description: 'Initial assistant message in chat', slot: 'body', required: false, addedAt: new Date().toISOString() },
  ];
}

function getDefaultWebsiteComponents(): WebsiteComponent[] {
  return [
    { id: 'floating_fab', name: 'Floating FAB', description: 'Floating action button to open chat', embedType: 'script', addedAt: new Date().toISOString() },
    { id: 'floating_widget', name: 'Floating widget', description: 'FAB + popup chat card (e.g. gateway-chat.js)', embedType: 'script', addedAt: new Date().toISOString() },
    { id: 'fixed_window', name: 'Fixed window', description: 'Chat in a fixed panel (not floating)', embedType: 'script', addedAt: new Date().toISOString() },
    { id: 'fullscreen_chat', name: 'Fullscreen chat', description: 'Full viewport chat (e.g. mobile)', embedType: 'script', addedAt: new Date().toISOString() },
    { id: 'embed_script', name: 'Embed script', description: 'Single script tag embed with data attributes', embedType: 'script', addedAt: new Date().toISOString() },
  ];
}

// Seed defaults once
getDefaultChatComponents().forEach((c) => chatComponents.set(c.id, c));
getDefaultWebsiteComponents().forEach((c) => websiteComponents.set(c.id, c));

// ---------------------------------------------------------------------------
// MCP Tools
// ---------------------------------------------------------------------------
const TOOLS: MCPTool[] = [
  {
    name: 'add_component_to_chat_window',
    description: 'Add a component to the chat window for a deployment. Use this to standardize which UI parts (message list, PTT button, transcript editor, admin controls) appear in the chat interface.',
    inputSchema: {
      type: 'object',
      properties: {
        deploymentId: { type: 'string', description: 'Deployment or bot identifier' },
        componentId: {
          type: 'string',
          enum: ['message_list', 'input_row', 'voice_ptt_button', 'typing_indicator', 'header', 'transcript_editor', 'voice_visualizer', 'admin_controls', 'user_greeting'],
          description: 'Component to add',
        },
        config: { type: 'object', description: 'Optional component-specific config' },
      },
      required: ['deploymentId', 'componentId'],
    },
  },
  {
    name: 'remove_component_from_chat_window',
    description: 'Remove a component from the chat window for a deployment.',
    inputSchema: {
      type: 'object',
      properties: {
        deploymentId: { type: 'string' },
        componentId: { type: 'string' },
      },
      required: ['deploymentId', 'componentId'],
    },
  },
  {
    name: 'list_chat_components',
    description: 'List components currently added to the chat window for a deployment, or list all available chat component types.',
    inputSchema: {
      type: 'object',
      properties: {
        deploymentId: { type: 'string', description: 'If provided, list components for this deployment; otherwise list available component types' },
      },
    },
  },
  {
    name: 'add_component_to_website',
    description: 'Add a website component (e.g. floating widget, fixed window, embed script) to a deployment. Standardizes how the chat/voice UI is embedded on sites.',
    inputSchema: {
      type: 'object',
      properties: {
        deploymentId: { type: 'string' },
        componentId: {
          type: 'string',
          enum: ['floating_widget', 'fixed_window', 'embed_script', 'fullscreen_chat', 'floating_fab'],
          description: 'Website component to add',
        },
        config: { type: 'object', description: 'e.g. position, theme, botId' },
      },
      required: ['deploymentId', 'componentId'],
    },
  },
  {
    name: 'remove_component_from_website',
    description: 'Remove a website component from a deployment.',
    inputSchema: {
      type: 'object',
      properties: {
        deploymentId: { type: 'string' },
        componentId: { type: 'string' },
      },
      required: ['deploymentId', 'componentId'],
    },
  },
  {
    name: 'list_website_components',
    description: 'List website components for a deployment, or list all available website component types.',
    inputSchema: {
      type: 'object',
      properties: {
        deploymentId: { type: 'string' },
      },
    },
  },
  {
    name: 'get_voice_ptt_config',
    description: 'Get the standard Push-To-Talk (PTT) configuration. PTT is the default for mobile: user holds to talk, transcript appears in chat, 1s edit window, then auto-submit. When AI responds, the system does not listen—only when user pushes PTT.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'set_voice_ptt_config',
    description: 'Set the voice PTT configuration (edit window ms, mobile default PTT, listen only on PTT, interrupt policy, etc.). Use this to standardize behavior across all deployments. See docs/GATEWAY_PTT_PROTOCOL.md.',
    inputSchema: {
      type: 'object',
      properties: {
        defaultMode: { type: 'string', enum: ['ptt', 'vad'] },
        editWindowMs: { type: 'number' },
        mobileDefaultPtt: { type: 'boolean' },
        listenOnlyOnPtt: { type: 'boolean' },
        pttReleaseBufferMs: { type: 'number' },
        interruptPolicy: { type: 'string', enum: ['always', 'never', 'smart'], description: 'When user PTTs during AI response: interrupt vs wait (smart = analyze and decide)' },
      },
    },
  },
  {
    name: 'register_voice_module',
    description: 'Register a voice module for the chat interface: either user (communication with business) or admin (voice controls, system prompt, communication with website visitors). Uses the fixed-window chat model.',
    inputSchema: {
      type: 'object',
      properties: {
        interface: { type: 'string', enum: ['user', 'admin'], description: 'User = visitor communication; Admin = voice/system prompt/visitor control' },
        layout: { type: 'string', enum: ['fixed_window'] },
        componentIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Chat component IDs to include in this module',
        },
      },
      required: ['interface', 'layout'],
    },
  },
  {
    name: 'list_voice_modules',
    description: 'List registered voice modules (user and admin interfaces).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_deployment_manifest',
    description: 'Get the full manifest for a deployment: chat components, website components, and voice PTT config. Use this to render the standardized chat + voice UI.',
    inputSchema: {
      type: 'object',
      properties: {
        deploymentId: { type: 'string' },
      },
      required: ['deploymentId'],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------
function handleAddComponentToChatWindow(args: Record<string, unknown>): unknown {
  const deploymentId = args.deploymentId as string;
  const componentId = args.componentId as ChatWindowComponentId;
  if (!chatComponents.has(componentId)) {
    return { success: false, error: `Unknown component: ${componentId}` };
  }
  const list = deploymentIdToChatComponents.get(deploymentId) ?? [];
  if (list.includes(componentId)) {
    return { success: true, deploymentId, componentId, message: 'Already added' };
  }
  list.push(componentId);
  deploymentIdToChatComponents.set(deploymentId, list);
  return { success: true, deploymentId, componentId, chatComponents: list };
}

function handleRemoveComponentFromChatWindow(args: Record<string, unknown>): unknown {
  const deploymentId = args.deploymentId as string;
  const componentId = args.componentId as ChatWindowComponentId;
  const list = deploymentIdToChatComponents.get(deploymentId);
  if (!list) return { success: true, deploymentId, componentId, chatComponents: [] };
  const next = list.filter((id) => id !== componentId);
  deploymentIdToChatComponents.set(deploymentId, next);
  return { success: true, deploymentId, componentId, chatComponents: next };
}

function handleListChatComponents(args: Record<string, unknown>): unknown {
  const deploymentId = args?.deploymentId as string | undefined;
  if (deploymentId) {
    const list = deploymentIdToChatComponents.get(deploymentId) ?? [];
    const components = list.map((id) => chatComponents.get(id)).filter(Boolean);
    return { deploymentId, components, available: Array.from(chatComponents.values()) };
  }
  return { available: Array.from(chatComponents.values()) };
}

function handleAddComponentToWebsite(args: Record<string, unknown>): unknown {
  const deploymentId = args.deploymentId as string;
  const componentId = args.componentId as WebsiteComponentId;
  if (!websiteComponents.has(componentId)) {
    return { success: false, error: `Unknown website component: ${componentId}` };
  }
  const list = deploymentIdToWebsiteComponents.get(deploymentId) ?? [];
  if (list.includes(componentId)) {
    return { success: true, deploymentId, componentId, message: 'Already added' };
  }
  list.push(componentId);
  deploymentIdToWebsiteComponents.set(deploymentId, list);
  return { success: true, deploymentId, componentId, websiteComponents: list };
}

function handleRemoveComponentFromWebsite(args: Record<string, unknown>): unknown {
  const deploymentId = args.deploymentId as string;
  const componentId = args.componentId as WebsiteComponentId;
  const list = deploymentIdToWebsiteComponents.get(deploymentId);
  if (!list) return { success: true, deploymentId, componentId, websiteComponents: [] };
  const next = list.filter((id) => id !== componentId);
  deploymentIdToWebsiteComponents.set(deploymentId, next);
  return { success: true, deploymentId, componentId, websiteComponents: next };
}

function handleListWebsiteComponents(args: Record<string, unknown>): unknown {
  const deploymentId = args?.deploymentId as string | undefined;
  if (deploymentId) {
    const list = deploymentIdToWebsiteComponents.get(deploymentId) ?? [];
    const components = list.map((id) => websiteComponents.get(id)).filter(Boolean);
    return { deploymentId, components, available: Array.from(websiteComponents.values()) };
  }
  return { available: Array.from(websiteComponents.values()) };
}

function handleGetVoicePttConfig(): unknown {
  return { ...voicePttConfig };
}

function handleSetVoicePttConfig(args: Record<string, unknown>): unknown {
  if (args.defaultMode !== undefined) voicePttConfig.defaultMode = args.defaultMode as 'ptt' | 'vad';
  if (args.editWindowMs !== undefined) voicePttConfig.editWindowMs = args.editWindowMs as number;
  if (args.mobileDefaultPtt !== undefined) voicePttConfig.mobileDefaultPtt = args.mobileDefaultPtt as boolean;
  if (args.listenOnlyOnPtt !== undefined) voicePttConfig.listenOnlyOnPtt = args.listenOnlyOnPtt as boolean;
  if (args.pttReleaseBufferMs !== undefined) voicePttConfig.pttReleaseBufferMs = args.pttReleaseBufferMs as number;
  if (args.interruptPolicy !== undefined) voicePttConfig.interruptPolicy = args.interruptPolicy as 'always' | 'never' | 'smart';
  return { ...voicePttConfig };
}

function handleRegisterVoiceModule(args: Record<string, unknown>): unknown {
  const id = uuidv4();
  const registration: VoiceModuleRegistration = {
    id,
    interface: args.interface as 'user' | 'admin',
    layout: (args.layout as 'fixed_window') || 'fixed_window',
    components: (args.componentIds as ChatWindowComponentId[]) ?? [],
    voicePttConfig: { ...voicePttConfig },
    addedAt: new Date().toISOString(),
  };
  voiceModules.set(id, registration);
  return { success: true, module: registration };
}

function handleListVoiceModules(): unknown {
  return { modules: Array.from(voiceModules.values()) };
}

function handleGetDeploymentManifest(args: Record<string, unknown>): unknown {
  const deploymentId = args.deploymentId as string;
  const chatIds = deploymentIdToChatComponents.get(deploymentId) ?? [];
  const webIds = deploymentIdToWebsiteComponents.get(deploymentId) ?? [];
  return {
    deploymentId,
    chatComponents: chatIds.map((id) => chatComponents.get(id)).filter(Boolean),
    websiteComponents: webIds.map((id) => websiteComponents.get(id)).filter(Boolean),
    voicePttConfig: { ...voicePttConfig },
  };
}

function handleToolCall(name: string, args: Record<string, unknown>): unknown {
  switch (name) {
    case 'add_component_to_chat_window':
      return handleAddComponentToChatWindow(args);
    case 'remove_component_from_chat_window':
      return handleRemoveComponentFromChatWindow(args);
    case 'list_chat_components':
      return handleListChatComponents(args);
    case 'add_component_to_website':
      return handleAddComponentToWebsite(args);
    case 'remove_component_from_website':
      return handleRemoveComponentFromWebsite(args);
    case 'list_website_components':
      return handleListWebsiteComponents(args);
    case 'get_voice_ptt_config':
      return handleGetVoicePttConfig();
    case 'set_voice_ptt_config':
      return handleSetVoicePttConfig(args);
    case 'register_voice_module':
      return handleRegisterVoiceModule(args);
    case 'list_voice_modules':
      return handleListVoiceModules();
    case 'get_deployment_manifest':
      return handleGetDeploymentManifest(args);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ---------------------------------------------------------------------------
// MCP message handler
// ---------------------------------------------------------------------------
function handleMCPMessage(message: MCPMessage): MCPMessage {
  const response: MCPMessage = { jsonrpc: '2.0', id: message.id };

  switch (message.method) {
    case 'initialize':
      response.result = {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'ai-biz-bot-mcp-server', version: '1.0.0' },
      };
      break;

    case 'tools/list':
      response.result = { tools: TOOLS };
      break;

    case 'tools/call': {
      const params = (message.params || {}) as { name?: string; arguments?: Record<string, unknown> };
      const name = params.name as string;
      const args = (params.arguments || {}) as Record<string, unknown>;
      const result = handleToolCall(name, args);
      response.result = { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      break;
    }

    default:
      response.error = { code: -32601, message: `Method not found: ${message.method}` };
  }

  return response;
}

// ---------------------------------------------------------------------------
// HTTP Server
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    server: 'ai-biz-bot-mcp-server',
    timestamp: new Date().toISOString(),
  });
});

app.get('/mcp/tools', (_req, res) => {
  res.json({ tools: TOOLS });
});

app.post('/mcp/message', (req, res) => {
  const message = req.body as MCPMessage;
  const response = handleMCPMessage(message);
  res.json(response);
});

// REST-style endpoints for convenience
app.get('/api/chat-components', (_req, res) => {
  res.json({ available: Array.from(chatComponents.values()) });
});
app.get('/api/website-components', (_req, res) => {
  res.json({ available: Array.from(websiteComponents.values()) });
});
app.get('/api/voice-ptt-config', (_req, res) => {
  res.json(voicePttConfig);
});
app.get('/api/deployments/:id/manifest', (req, res) => {
  const result = handleGetDeploymentManifest({ deploymentId: req.params.id });
  res.json(result);
});

const PORT = parseInt(process.env.MCP_PORT || '3020', 10);
app.listen(PORT, () => {
  console.log(`[AI Biz Bot MCP] Server running on http://localhost:${PORT}`);
  console.log(`[AI Biz Bot MCP] POST /mcp/message for MCP JSON-RPC`);
  console.log(`[AI Biz Bot MCP] GET /api/voice-ptt-config, /api/chat-components, /api/website-components`);
});

export { handleMCPMessage, handleToolCall, TOOLS, voicePttConfig };
