import { randomUUID } from "crypto";
import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { IncomingMessage } from "http";
import { registerWebSocketRoute } from "./websocketRouter";
import { TOOL_DECLARATIONS } from "./config/geminiToolDeclarations";
import { getToolsAllowedForMode } from "./config/operationalModes";
import type { ExecutionMutationTransport } from "@shared/executionMutationGate";
import { executeContract } from "./services/executionMutationGate";
import { broadcastLiveEvent } from "./services/eventBridge";
import { storage } from "./storage";
import { FREE_TIER_SYSTEM_INSTRUCTION } from "./prompts/freeTierPrompt";
import { buildBehavioralPrompt, type BusinessContext } from "./services/promptCompiler";
import { enqueueVoiceSessionConnectEvent } from "./services/gatePassageAsyncQueue";
import { formatNewCustomerIntakePromptLine, resolveIntakePolicyConfig } from "./services/intakePolicyService";

/** Gemini Multimodal Live API WebSocket base URL (no key). Same fallback as voiceStream.ts. */
const GEMINI_LIVE_WS_BASE =
  process.env.GEMINI_WS_URL ||
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

/** Shape of the structured result returned by MCP tool handlers. */
interface McpToolResult {
  ui_action?: 'SHOW_UPGRADE_MODAL' | 'SHOW_WORKSPACE_CONNECT';
  audio_cue?: string;
  [key: string]: unknown;
}

function transportForVoiceWsPath(path: string): ExecutionMutationTransport {
  if (path === "/ws/os-live") return "internal";
  return "browser_live";
}

/** Marketing / platform home ids: may exist in DB for visitor_sessions FK; voice stays on public Nova + minimal tools. */
function isPlatformMarketingSiteConfigId(id: string | null | undefined): boolean {
  if (id == null || !String(id).trim()) return false;
  const s = String(id).trim();
  return s === "platform_landing" || s === "platform-landing" || s === "platform";
}

/** Public marketing voice (`!siteConfigResolved`) — canvas-first, passive sales; minimal tools (see EXECUTION_MUTATION_GATE). */
const PUBLIC_PLATFORM_VOICE_INSTRUCTION = `You are Nova on the public Gateway Global AI shell. Your job is to help people use the voice canvas calmly — not to sell aggressively.

TONE: Friendly, brief, passive. Do NOT open with a long company pitch. Do NOT ask what their business is or what they need to buy unless they clearly steer toward business signup or demo. If they are exploring backgrounds, themes, chips, or the canvas, stay on that topic only.

VOICE & CANVAS (know this cold):
- Push-to-talk (PTT) sends their voice to you; responses play back as audio.
- The large white area is the canvas / content window: it can show cards, pickers, and tool output.
- "Canvas appearance" (and the background picker) lets them choose animated backgrounds and adjust theme/readability (scrim, contrast). Help them pick categories and effects in plain language.
- Intent chips under the headline send short phrases; they may open the background picker or ask for explanations — honor that intent.

WHEN THEY ASK "WHAT IS VOICE AI" OR SIMILAR: Explain Clear Voice / PTT and the canvas in one or two short sentences. Optionally mention that businesses use the same stack for a front desk — one sentence max unless they ask to go deeper.

WHEN THEY WANT BUSINESS / DEMO: Only then invite them gently — e.g. they can use "Find my business" (opens business lookup) to try a demo flow, or ask you for a high-level overview. Never interrogate (no rapid-fire "what industry are you in" unless they asked for onboarding help).

--- CONTENT WINDOW ---
When the user asks what is on screen or to show something there, use tools or describe what could appear — do not say you do not know what a canvas is. If you use show_canvas, briefly say what you are placing while it appears.

--- BACKGROUND PICKER (when [Canvas context] mentions canvas_backgrounds or background picker) ---
Speak ONLY about choosing categories and effects — no platform sales pitch, referrals, or pricing. Follow any "Instructions" line in the canvas context exactly.

FIRST GREETING (keep under two sentences): "Hi, I'm Nova. Ask me anything about the canvas, voice controls, or backgrounds — or tap a chip below. If you want the full platform story or a business demo, just say so." Never output markdown, bullets, or headings — you are speaking aloud.`;

/** Background assistant skill fragment — appended when canvas background tools are available. */
const CANVAS_BACKGROUND_SKILL = `

--- CANVAS BACKGROUND ASSISTANT ---
You have tools to help users explore and set animated canvas backgrounds.

CATEGORIES (8 total, 42 effects):
- particles_floating: Particles, Sparkles, Fireflies, Bokeh, Bubble, Confetti
- space_sky: Starfield, Aurora, Meteors, Shooting Stars, Constellation, Orbits
- weather_nature: Rain, Snow, Fog, Underwater, Fireworks
- grids_patterns: Grid Pattern, Dot Pattern, Hexagon, Flickering Grid, Retro Grid, Interactive Grid
- gradients_color: Mesh Gradient, Gradient, Gradient Animation, Vortex
- waves_flow: Wavy, Light Waves, Wave Grid, Topography, Paths
- light_beams: Beams, Beams Collision, Spotlight, Ripple, Circles
- tech_digital: Matrix, Glitch, Neon, Warp, Boxes

CONVERSATIONAL APPROACH (follow this flow):
1. GROUND: Ask what the background is for — personal taste, business lobby, kiosk, event booth, etc.
2. NAVIGATE: Use get_background_categories to show what is available.
3. RECOMMEND: Based on their use case, suggest a category and specific effects. Be specific: "For a tech company lobby, I'd suggest Space & Sky — Constellation is clean and professional, or Tech & Digital — Matrix is bold."
4. PREVIEW: Use set_canvas_background to show them the effect live. Say "Check it out behind the panel" or "See that? That's the Constellation effect." Use the exact item ID like "constellation", "matrix", "rain", "neon", etc.
5. ITERATE: Ask if they want to see more options, try a different category, or keep the current one.
6. SAVE: If they want to keep it, use save_background_as_default. If they are not logged in, let them know you need to set up their profile first.

TOOL USAGE RULES:
- Use get_background_categories when the user asks what options exist
- Use get_backgrounds_in_category with exact category_id like "tech_digital" or "space_sky" to browse a specific category
- Use set_canvas_background with the exact item id (e.g. "matrix", "constellation", "neon", "rain") to preview an effect live
- Use save_background_as_default only when the user explicitly wants to keep their choice
- Use get_screen_size to check if recommending fullscreen would enhance the experience

IMPORTANT: Each category has distinct effects. Tech & Digital has Matrix (falling code), Glitch (RGB distortion), Neon (glowing rings), Warp (hyperspace tunnel), and Boxes (floating 3D cubes). They are all visually different.

TONE: Enthusiastic but not pushy. Treat this like helping someone pick a wallpaper for their computer. Be knowledgeable about the effects — describe what each one looks like briefly when suggesting it.

NEVER: List all effects at once. Navigate one category at a time. Show, don't tell — preview the effect and let them react.`;

const VISUALIZER_SKILL = `

--- AUDIO VISUALIZER STUDIO ---
You have tools to help users design and customize their audio visualizer — the animated visual that reacts to voice activity on screen.

AVAILABLE ENGINES:
- circular_pulse: Circular ring with radial frequency bars that pulse outward. Default. Professional and clean.
- sine_wave: Classic Siri-style flowing sine wave. Elegant and minimal.
- orb: Breathing blob/sphere that deforms with voice. Organic and modern.

CONFIGURABLE PARAMETERS:
- type: Which engine to use
- primaryColor: Color when user is speaking (CSS hex like '#00FFFF')
- secondaryColor: Color when AI is speaking
- opacity: 0 to 1, how visible the visualizer is
- glowIntensity: 0 to 2, how much the glow effect radiates
- barCount: 16 to 128, number of frequency bars (circular_pulse only)
- amplitudeScale: 0.5 to 3, how aggressively bars react to audio
- smoothing: 0 to 1, animation smoothness

CONVERSATIONAL APPROACH:
1. ASK: What vibe are they going for? Calm, energetic, techy, natural?
2. SUGGEST: Recommend an engine and colors based on their mood/brand.
3. PREVIEW: Use update_visualizer to show them the change live. Say "Check it out — I just switched to the orb style with a cyan glow."
4. ITERATE: Tweak colors, intensity, bar count based on feedback. Try multiple combinations.
5. SAVE: When they love it, use save_visualizer to save to the community library with their name as author.
6. BROWSE: Use browse_visualizers to show what others have created if they want inspiration.

TONE: Creative and collaborative. You are their design partner, not a menu.`;

/**
 * Gemini Multimodal Live API Proxy
 *
 * This server acts as a proxy between the browser and Google's Gemini Multimodal Live API.
 * It hides the GOOGLE_API_KEY from the client and handles the "Double Socket" pipeline.
 *
 * Flow: Browser <-> Node.js Server (Proxy) <-> Google Gemini API
 *
 * Tool execution: model `functionCall` proposals are normalized into `executeContract` (mutation gate)
 * before `handleToolCall` — see EXECUTION_MUTATION_GATE_SPEC_V1.md.
 */

export function setupGeminiLiveWebSocket(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  // Register with the central router (unified Gemini Live for all browser voice)
  registerWebSocketRoute('/ws/gemini-live', wss, 'GeminiVoice');
  console.log('[GeminiVoice] WebSocket proxy initialized on /ws/gemini-live');

  registerWebSocketRoute('/ws/browser-voice', wss, 'GeminiVoice');
  console.log('[BrowserVoice] Route retained and unified under Gemini Native Audio');

  // Unified OS Live route (replacing the standalone osLiveProxy)
  registerWebSocketRoute('/ws/os-live', wss, 'GeminiVoice');
  console.log('[OSLive] Route unified under Gemini Native Audio (Governance Enabled)');

  wss.on("connection", (clientWs: WebSocket, request: IncomingMessage) => {
    const voiceWsPath = (request.url || "/ws/gemini-live").split("?")[0] || "/ws/gemini-live";
    console.log(`[GeminiVoice] New client connected to Gemini Proxy from ${request.socket.remoteAddress}`);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[GeminiVoice] GEMINI_API_KEY is not set in environment variables");
      clientWs.close(1011, "Server configuration error: Missing API Key");
      return;
    }

    const wsBase = GEMINI_LIVE_WS_BASE;
    const googleUrl = `${wsBase}${wsBase.includes("?") ? "&" : "?"}key=${apiKey}`;

    console.log("[GeminiVoice] Attempting to connect to Google Gemini API...");

    const googleWs = new WebSocket(googleUrl);
    let messageQueue: Buffer[] = [];
    let clientContentQueue: any[] = []; // Queue for explicit clientContent during state locks
    let isGoogleWsOpen = false;

    // Connection Hang Guard: if googleWs stays in CONNECTING state and never fires
    // open or error, the client hangs with a growing messageQueue forever.
    // After 5s we close the client with 1011 to release the memory closure.
    const connectTimeoutMs = 5_000;
    const connectTimer = setTimeout(() => {
      if (!isGoogleWsOpen) {
        console.error("[GeminiVoice] ⏱️ Google WebSocket connection timed out after 5s — closing client");
        try { googleWs.terminate(); } catch (_) {}
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close(1011, "Upstream connection timeout");
        }
      }
    }, connectTimeoutMs);

    let sessionSiteConfigId: string | null = null;
    /** Twilio-derived ANI when client bridges PSTN context into browser Live session. */
    let sessionTrustedCallerId: string | null = null;
    let sessionVoiceCallSid: string | null = null;
    let sessionId: string | null = null;
    let sessionAgentId: string | null = null;
    let sessionMetaPrompt: string | null = null;
    let sessionFunnelContextKeys: Record<string, string> | undefined;
    /** Authenticated owner identity — set from sessionContext when client passes OTP-verified credentials. */
    let sessionAuthenticatedCustomerId: string | null = null;
    let sessionAuthenticatedIsOwner = false;

    // --- STATE MACHINE FLAGS (prevent 1008 Policy Violations) ---

    /**
     * Tool-Call Gate — Gemini Live API rejects all realtime_input (audio, activity signals)
     * while a function_call is in-flight. Sending audio during this window triggers a 1008
     * policy violation. This flag blocks audio forwarding between receiving a functionCall
     * and sending the functionResponse back to Google.
     */
    let toolCallPending = false;

    /**
     * Barge-In Lock — When serverContent.interrupted:true arrives, the model has stopped
     * generating because VAD detected new user audio. Sending explicit clientContent signals
     * (text turns, kickstarts, endOfTurn) in this window causes issues.
     * CRITICAL: Audio (realtime_input) is NOT blocked during bargeInLock — the user IS
     * actively speaking and their audio must reach Google for the new turn.
     * Only clientContent payloads are queued.
     */
    let bargeInLock = false;

    /** One-time transparency event per WebSocket (async flush — not on audio hot path). */
    let voiceConnectEventEnqueued = false;

    /** Flush queued clientContent to Google once all state locks are clear. */
    const flushClientContentQueue = () => {
      if (!bargeInLock && !toolCallPending && isGoogleWsOpen) {
        while (clientContentQueue.length > 0) {
          const queuedMsg = clientContentQueue.shift();
          googleWs.send(JSON.stringify(queuedMsg));
          console.log("[GeminiVoice] ⬆️ Flushed queued clientContent to Google");
        }
      }
    };

    const processClientMessage = async (data: Buffer) => {
      try {
        const messageString = data.toString();
        const message = JSON.parse(messageString);

        if (message.setup) {
          if (message.sessionContext?.siteConfigId) {
            sessionSiteConfigId = message.sessionContext.siteConfigId;
            if (!sessionId) sessionId = randomUUID();
            console.log(`[GeminiVoice] Identity anchor set: siteConfigId=${sessionSiteConfigId}`);
            if (!voiceConnectEventEnqueued && sessionSiteConfigId && sessionId) {
              voiceConnectEventEnqueued = true;
              enqueueVoiceSessionConnectEvent({
                siteConfigId: sessionSiteConfigId,
                voiceSessionId: sessionId,
                transport: "websocket",
                incomingMessage: request,
              });
            }
          }
          if (message.sessionContext?.agentId) {
            sessionAgentId = message.sessionContext.agentId;
          }
          if (message.sessionContext?.metaPrompt) {
            sessionMetaPrompt = message.sessionContext.metaPrompt;
          }
          if (message.sessionContext?.funnelContextKeys && typeof message.sessionContext.funnelContextKeys === 'object') {
            sessionFunnelContextKeys = message.sessionContext.funnelContextKeys as Record<string, string>;
          }
          const rawTrusted = message.sessionContext?.trustedCallerId;
          if (rawTrusted != null && String(rawTrusted).trim()) {
            sessionTrustedCallerId = String(rawTrusted).trim();
          }
          const rawCallSid = message.sessionContext?.callSid;
          if (rawCallSid != null && String(rawCallSid).trim()) {
            sessionVoiceCallSid = String(rawCallSid).trim();
          }
          if (message.sessionContext?.authenticatedCustomerId) {
            sessionAuthenticatedCustomerId = String(message.sessionContext.authenticatedCustomerId);
          }
          if (message.sessionContext?.authenticatedIsOwner === true) {
            sessionAuthenticatedIsOwner = true;
            console.log(`[GeminiVoice] Owner identity bound: customerId=${sessionAuthenticatedCustomerId}`);
          }
          delete message.sessionContext;

          const modelId = process.env.GEMINI_MODEL_ID;
          if (!modelId) {
            throw new Error("CRITICAL: GEMINI_MODEL_ID is not defined in environment variables. Connection aborted.");
          }
          message.setup.model = modelId;

          // --- CONTEXTUAL SNAP ---
          // siteConfigResolved guards against injecting all 31 tools for unknown / unresolved sites (1008 risk).
          // platform_landing may have a real DB row for visitor_sessions FK; still use public Nova here, not free-tier snap.
          let siteConfigResolved = false;
          if (sessionSiteConfigId && !isPlatformMarketingSiteConfigId(sessionSiteConfigId)) {
            try {
              const siteConfig = await storage.getSiteConfigById(sessionSiteConfigId);
              if (siteConfig) {
                siteConfigResolved = true;
                const plan = (siteConfig as { plan?: string }).plan ?? 'free';
                const rawKl = siteConfig.knowledgeLibrary;
                const kl = (rawKl && typeof rawKl === 'object' && !Array.isArray(rawKl)) ? (rawKl as Record<string, any>) : {};
                const agents = (kl.agents as Record<string, any>) ?? {};
                const agentDef = (sessionAgentId && sessionAgentId !== 'default')
                  ? (agents[sessionAgentId] ?? null)
                  : null;
                const systemPromptOverride = (siteConfig as { systemPromptOverride?: string | null }).systemPromptOverride;
                let assignedAgentId = (siteConfig as { assignedAgentId?: string | null }).assignedAgentId;

                // Owner override: when authenticated owner, resolve the MANAGER agent for this site
                if (sessionAuthenticatedIsOwner && sessionSiteConfigId) {
                  try {
                    const siteAgents = await storage.getAgentsBySiteConfigId(sessionSiteConfigId);
                    const managerAgent = siteAgents.find(
                      (a: { operationalMode?: string | null; status?: string | null }) =>
                        a.operationalMode === 'MANAGER' && a.status === 'active'
                    );
                    if (managerAgent) {
                      assignedAgentId = managerAgent.id;
                      console.log(`[GeminiVoice] Owner override: switched to MANAGER agent ${managerAgent.id} (${(managerAgent as { name?: string }).name})`);
                    }
                  } catch (err) {
                    console.warn('[GeminiVoice] Failed to resolve MANAGER agent for owner:', err);
                  }
                }
                const pd = (siteConfig as { placeData?: Record<string, unknown> | null }).placeData;
                const website = pd && (typeof (pd as any).websiteUri === 'string' ? (pd as any).websiteUri : typeof (pd as any).website === 'string' ? (pd as any).website : null);
                const address = pd && (typeof (pd as any).formattedAddress === 'string' ? (pd as any).formattedAddress : typeof (pd as any).formatted_address === 'string' ? (pd as any).formatted_address : null);
                const hoursArr = pd && ((pd as any).opening_hours?.weekday_text ?? (pd as any).openingHours?.weekdayDescriptions);
                const hours = Array.isArray(hoursArr) ? hoursArr.join('; ') : (typeof hoursArr === 'string' ? hoursArr : null);
                const businessName = pd && typeof (pd as any).name === 'string' ? (pd as any).name : (siteConfig as { name?: string }).name ?? 'this business';
                const phone = pd && (typeof (pd as any).formatted_phone_number === 'string' ? (pd as any).formatted_phone_number : typeof (pd as any).international_phone_number === 'string' ? (pd as any).international_phone_number : null);

                let agentPersona: string;
                if (assignedAgentId) {
                  const agent = await storage.getAgent(assignedAgentId);
                  if (agent) {
                    const businessContext: BusinessContext = {
                      name: businessName,
                      address: address ?? undefined,
                      hours: hours ?? undefined,
                      phone: phone ?? undefined,
                      services: Array.isArray((pd as any)?.types) ? (pd as any).types : undefined,
                      funnelContextKeys: sessionFunnelContextKeys,
                    };
                    const compiledPersona = buildBehavioralPrompt(
                      agent,
                      businessContext,
                      siteConfig as Record<string, unknown> | undefined,
                    );
                    agentPersona = systemPromptOverride && systemPromptOverride.trim()
                      ? `${compiledPersona}\n\n--- USER-DIRECTED ADDITIONS ---\n${systemPromptOverride.trim()}`
                      : compiledPersona;
                  } else {
                    agentPersona = (systemPromptOverride && systemPromptOverride.trim()) || (agentDef?.persona ?? 'You are the primary Site Concierge for this business. Be helpful, concise, and friendly.');
                  }
                } else {
                  agentPersona = (systemPromptOverride && systemPromptOverride.trim())
                    ? systemPromptOverride.trim()
                    : (agentDef?.persona ?? 'You are the primary Site Concierge for this business. Be helpful, concise, and friendly.');
                }

                const sovereignTruths = kl.sovereignTruths
                  ? `\n\nCORE KNOWLEDGE (follow these facts precisely):\n${JSON.stringify(kl.sovereignTruths, null, 2)}`
                  : '';
                const KNOWLEDGE_CAP = 32000;
                let knowledgeBlockFromArray = '';
                if (Array.isArray(rawKl) && rawKl.length > 0) {
                  const docs = rawKl as Array<{ id?: string; title?: string; content?: string }>;
                  const combined = docs.map((d) => `## ${d.title ?? 'Untitled'}\n${d.content ?? ''}`).join('\n\n---\n\n');
                  knowledgeBlockFromArray = '\n\n--- KNOWLEDGE LIBRARY (use this to answer questions accurately) ---\n\n' + combined.slice(0, KNOWLEDGE_CAP) + (combined.length > KNOWLEDGE_CAP ? '\n\n[truncated]' : '');
                }

                const quickFactsLines: string[] = [];
                if (website) quickFactsLines.push(`Website: ${website}`);
                if (address) quickFactsLines.push(`Address: ${address}`);
                if (hours) quickFactsLines.push(`Hours: ${hours}`);
                const quickFactsBlock = quickFactsLines.length > 0
                  ? '\n\n--- QUICK FACTS (use to answer hours, location, website without calling get_business_details) ---\n\n' + quickFactsLines.join('. ') + '\n'
                  : '';

                const intakePolicySnap = resolveIntakePolicyConfig(siteConfig);
                const newCustomerIntakeBlock = formatNewCustomerIntakePromptLine(intakePolicySnap);

                const INTRODUCTION_PROTOCOL = '\n\n--- INTRODUCTION PROTOCOL ---\nIn your very first response: greet the user, introduce yourself by name and role, say who you represent (company name), and briefly state what you can help with. Be professional.';

                const RUNTIME_POLICY = '\n\n--- RUNTIME POLICY ---\nDo not offer to book, schedule, or reserve anything. You do not have access to a calendar. Your tools are only for: (1) Google Maps / local search when the user asks for locations or a map, and (2) requesting manual text input when audio is unclear. For pricing, menus, booking, or visiting the business, direct the user to the Links menu in this chat (Website, Online store) or the business phone/website. Do not say you can "look that up" or "check that" via tools.';

                const linksList: string[] = [];
                if (website) linksList.push(`Website: ${website}`);
                if (website) linksList.push(`Online store: ${website}`);
                const LINKS_MENU = linksList.length > 0
                  ? `\n\n--- LINKS MENU ---\nThe user has a Links menu in this chat. When they ask to visit the website, shop, book, or get more info, tell them to open the Links menu and choose the appropriate link. Available links: ${linksList.join('; ')}.`
                  : '\n\n--- LINKS MENU ---\nWhen the user asks for the website or to book, direct them to the business phone or suggest they search for the business online.';

                const PRICING_RULE = '\n\nIf the customer asks for prices, menus, or booking: you cannot book or schedule. Direct them to the business website or the Links menu in this chat for current pricing and to book. Do not offer to book or schedule — only point them to the Links menu or website.';

                if (plan === 'free') {
                  const compiledInstruction = `${agentPersona}${sovereignTruths}${knowledgeBlockFromArray}${quickFactsBlock}${newCustomerIntakeBlock}${INTRODUCTION_PROTOCOL}${RUNTIME_POLICY}${LINKS_MENU}${PRICING_RULE}${FREE_TIER_SYSTEM_INSTRUCTION}`;
                  message.setup.system_instruction = { parts: [{ text: compiledInstruction }] };
                  message.setup.tools = [{ functionDeclarations: [] }];
                  console.log('[GeminiVoice] Contextual Snap applied: free tier (no tools), compiled persona');
                } else {
                  let snapAgent: Awaited<ReturnType<typeof storage.getAgent>> | undefined;
                  if (assignedAgentId) snapAgent = await storage.getAgent(assignedAgentId);

                  const effectiveMode = sessionAuthenticatedIsOwner ? 'MANAGER' : (snapAgent?.operationalMode ?? null);
                  const modeAllowlist = getToolsAllowedForMode(effectiveMode);
                  const agentAllowed: string[] = agentDef?.allowedTools ?? [];
                  const effectiveAllowed =
                    sessionAuthenticatedIsOwner
                      ? modeAllowlist
                      : (agentAllowed.length > 0
                          ? agentAllowed.filter((t) => modeAllowlist.includes(t))
                          : modeAllowlist);
                  const HOSPITALITY_TOOL_NAMES = [
                    'get_hotel_inventory',
                    'guest_phone_verification',
                    'pms_lookup_guest_journey',
                    'pms_get_housekeeping_status',
                    'pms_get_hotel_dashboard',
                  ];
                  const allowHospitality = effectiveAllowed.some((t) =>
                    HOSPITALITY_TOOL_NAMES.includes(t)
                  );
                  const HOSPITALITY_POLICY =
                    '\n\n--- HOSPITALITY ---\nYou may use PMS tools enabled for this session (e.g. live room inventory, guest journey by phone after verification when required, housekeeping status, property dashboard). Summarize results clearly and calmly. For completing a reservation or payment, direct guests to the official booking link or website when appropriate.\n';
                  const runtimeBlock = allowHospitality ? HOSPITALITY_POLICY : RUNTIME_POLICY;
                  const pricingBlock = allowHospitality ? '' : PRICING_RULE;

                  let compiledInstruction = `${agentPersona}${sovereignTruths}${knowledgeBlockFromArray}${quickFactsBlock}${newCustomerIntakeBlock}${INTRODUCTION_PROTOCOL}${runtimeBlock}${LINKS_MENU}${
                    sessionMetaPrompt
                      ? `\n\nIMMEDIATE DIRECTIVE (execute in your very first response):\n${sessionMetaPrompt}\n\nRULE: You MUST execute the IMMEDIATE DIRECTIVE in your very first spoken response. Do not wait for the user to speak first.`
                      : ''
                  }`;
                  const emotion = snapAgent?.defaultEmotion;
                  if (emotion && /^(calm|engaged|focused|energized|empathetic)$/i.test(String(emotion))) {
                    compiledInstruction += `\n\nDefault emotional tone: ${String(emotion).toUpperCase()}. Maintain this tone in your responses.`;
                  }
                  compiledInstruction += pricingBlock;
                  compiledInstruction += CANVAS_BACKGROUND_SKILL;
                  compiledInstruction += VISUALIZER_SKILL;
                  message.setup.system_instruction = { parts: [{ text: compiledInstruction }] };
                  console.log(
                    `[GeminiVoice] Contextual Snap applied: agentId=${sessionAgentId}, hospitalityPms=${allowHospitality}, compiled persona`
                  );

                  const filteredDeclarations = Object.values(TOOL_DECLARATIONS).filter((t) =>
                    effectiveAllowed.includes(t.name)
                  );
                  message.setup.tools = [{
                    functionDeclarations: filteredDeclarations.map((tool) => ({
                      name: tool.name,
                      description: tool.description,
                      parameters: tool.parameters
                    }))
                  }];
                  console.log(
                    `[GeminiVoice] Tool isolation: mode=${snapAgent?.operationalMode ?? "none"} → ${filteredDeclarations.length} tools for agentId=${sessionAgentId}`
                  );
                }
              }
            } catch (snapErr) {
              console.error('[GeminiVoice] Contextual Snap fetch error (falling back to client instruction):', snapErr);
            }
          }

          // Public session (no valid siteConfig) — apply clean platform prompt and minimal tools.
          // Prevents context bloat from injecting all 31 declarations into a public/landing session.
          if (!siteConfigResolved) {
            message.setup.system_instruction = {
              parts: [{ text: PUBLIC_PLATFORM_VOICE_INSTRUCTION + CANVAS_BACKGROUND_SKILL + VISUALIZER_SKILL }],
            };
            const PUBLIC_TOOLS = [
              'search_local_business',
              'get_business_details',
              'request_manual_input',
              'show_canvas',
              'set_canvas_background',
              'get_background_categories',
              'get_backgrounds_in_category',
              'save_background_as_default',
              'get_screen_size',
              'update_visualizer',
              'save_visualizer',
              'browse_visualizers',
            ] as const;
            const publicDeclarations = PUBLIC_TOOLS
              .map(name => TOOL_DECLARATIONS[name as keyof typeof TOOL_DECLARATIONS])
              .filter(Boolean)
              .map(tool => ({ name: tool.name, description: tool.description, parameters: tool.parameters }));
            message.setup.tools = [{ functionDeclarations: publicDeclarations }];
            console.log(`[GeminiVoice] Public session — clean Nova prompt + ${publicDeclarations.length} minimal tools`);
          }

          // Fallback: if tool set was not set by Contextual Snap (e.g. paid tier without agentId),
          // inject the full tool set rather than leaving it empty.
          if (!message.setup.tools || (Array.isArray(message.setup.tools) && message.setup.tools.length === 0)) {
            if (siteConfigResolved) {
              const declarations = Object.values(TOOL_DECLARATIONS).map(tool => ({
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
              }));
              if (declarations.length > 0) {
                message.setup.tools = [{ functionDeclarations: declarations }];
                console.log(`[GeminiVoice] Fallback: injecting all ${declarations.length} tools (siteConfig resolved, no agent mode)`);
              }
            }
          }

          fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:setup',message:'Setup sent to Google',data:{model:message.setup?.model,toolCount:message.setup?.tools?.[0]?.functionDeclarations?.length ?? 0,siteConfigResolved},timestamp:Date.now(),hypothesisId:'H2,H5'})}).catch(()=>{});
          console.log('📤 [PROXY -> GOOGLE] Sending Setup:', JSON.stringify(message, null, 2));
        }

        // --- GATING LOGIC ---
        if (message.type === 'audio' && message.data) {
          // Tool-Call Gate: drop audio while a function_call response is in-flight.
          // CRITICAL: Do NOT drop audio during bargeInLock — the user IS actively speaking.
          // bargeInLock only queues explicit clientContent signals, not raw audio streams.
          if (toolCallPending) return;
          const audioMessageForGoogle = {
            realtime_input: {
              media_chunks: [{
                mime_type: `audio/pcm;rate=${process.env.GEMINI_INPUT_SAMPLE || '16000'}`,
                data: message.data
              }]
            }
          };
          googleWs.send(JSON.stringify(audioMessageForGoogle));
        } else if (message.setup || message.realtime_input) {
          // Gate raw realtime_input frames (activity start/end, audioStreamEnd) during tool calls only.
          if (message.realtime_input && toolCallPending) return;
          googleWs.send(JSON.stringify(message));
        } else if (message.clientContent) {
          // Gate explicit clientContent payloads (text injections, kickstarts, endOfTurn signals)
          // during bargeInLock or toolCallPending. Flush after locks clear.
          if (bargeInLock || toolCallPending) {
            console.log("[GeminiVoice] 🔒 State locked. Queueing clientContent payload.");
            clientContentQueue.push(message);
          } else {
            googleWs.send(JSON.stringify(message));
          }
        } else if (message.tool_response) {
          googleWs.send(JSON.stringify(message));
        } else if (message.type === 'canvas_grounding') {
          // VoiceTurnOrchestrator → GeminiStreamingClient sends canvas_grounding after committed canvas.
          // Forward as clientContent so the model can narrate validated UI state (GOVERNANCE_EXECUTION_PLAN_V1 Phase 3).
          const parts: string[] = ['[Canvas context for narration — validated view]'];
          if (message.turnId != null) parts.push(`Turn: ${String(message.turnId)}`);
          if (message.currentViewId != null) parts.push(`View: ${String(message.currentViewId)}`);
          if (message.screenSummary != null && String(message.screenSummary).trim()) {
            parts.push(`Summary: ${String(message.screenSummary).slice(0, 4000)}`);
          }
          if (message.speakingInstructions != null && String(message.speakingInstructions).trim()) {
            parts.push(`Instructions: ${String(message.speakingInstructions).slice(0, 2000)}`);
          }
          const groundingForward = {
            clientContent: {
              turns: [{ role: 'user', parts: [{ text: parts.join('\n') }] }],
              turnComplete: true,
            },
          };
          if (bargeInLock || toolCallPending) {
            console.log('[GeminiVoice] canvas_grounding queued (state locked)');
            clientContentQueue.push(groundingForward);
          } else {
            googleWs.send(JSON.stringify(groundingForward));
          }
        } else {
          console.warn('[GeminiVoice] Received unknown message type from client:', messageString.slice(0, 200));
        }
      } catch (error) {
        console.error('[GeminiVoice] Error processing client message:', error, 'Raw data:', data.toString().slice(0, 200));
      }
    };

    googleWs.on("open", () => {
      console.log("[GeminiVoice] ✅ Successfully connected to Google Gemini API");
      isGoogleWsOpen = true;
      clearTimeout(connectTimer); // Cancel hang guard — connection succeeded
      fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:open',message:'Google WS opened',data:{queueSize:messageQueue.length},timestamp:Date.now(),hypothesisId:'H1,H2'})}).catch(()=>{});
      console.log(`[GeminiVoice] Processing ${messageQueue.length} queued messages.`);
      while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        if (msg) processClientMessage(msg);
      }
    });

    googleWs.on("message", async (data) => {
      try {
        const response = JSON.parse(data.toString());

        // --- 🛑 BARGE-IN LOCK MANAGEMENT (evaluated FIRST, before any branching) ---
        // interrupted: model stopped generating because VAD detected user speech.
        // Set lock immediately — do NOT block audio (user IS speaking the new turn).
        if (response.serverContent?.interrupted) {
          console.log("[GeminiVoice] 🛑 Interrupted by user barge-in (bargeInLock = true)");
          bargeInLock = true;
        }
        // turnComplete: model finished its turn. Clear all locks and drain clientContent queue.
        const isTurnComplete = response.serverContent?.turnComplete || response.turnComplete;
        if (isTurnComplete) {
          console.log("[GeminiVoice] ✅ Turn Complete — bargeInLock cleared");
          bargeInLock = false;
          flushClientContentQueue();
        }

        // Setup acknowledgement
        if (response.setupComplete) {
          console.log('✅ [GOOGLE] Setup Complete. Session active.');
          fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:setupComplete',message:'setupComplete received',data:{clientReady:clientWs.readyState===WebSocket.OPEN},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});

          // Fixer Kickstart: if a metaPrompt is active, queue or fire a user turn immediately
          // so the agent speaks first based on the entry-point context.
          if (sessionMetaPrompt && googleWs.readyState === WebSocket.OPEN) {
            const kickstart = {
              clientContent: {
                turns: [{
                  role: "user",
                  parts: [{ text: "I just clicked the button. Please execute your directive immediately." }]
                }],
                turnComplete: true
              }
            };
            if (bargeInLock || toolCallPending) {
              clientContentQueue.push(kickstart);
              console.log(`[GeminiVoice] Kickstart queued (state locked) for agentId=${sessionAgentId}`);
            } else {
              googleWs.send(JSON.stringify(kickstart));
              console.log(`[GeminiVoice] Kickstart fired for agentId=${sessionAgentId}`);
            }
          }

          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: "server_ready", status: "ready" }));
          }
        }
        // Handle function calls (tool invocations from Gemini)
        else if (response.serverContent?.modelTurn?.parts) {
          const parts = response.serverContent.modelTurn.parts;
          for (const part of parts) {
            if (part.functionCall) {
              const functionCall = part.functionCall;

              // Security Interceptor: inject session-level siteConfigId into site-anchored tools
              // to prevent the model from hallucinating a tenant UUID.
              const SITE_ANCHORED_TOOLS = ['mcp_search_drive', 'mcp_read_calendar', 'get_hotel_inventory', 'fetch_city_warrants', 'vine_lookup_and_dispatch', 'get_booking_and_pricing_info', 'query_knowledge_library'];
              if (SITE_ANCHORED_TOOLS.includes(functionCall.name)) {
                const args = (functionCall.args as any) ?? {};
                if (!args.siteConfigId && sessionSiteConfigId) {
                  functionCall.args = { ...args, siteConfigId: sessionSiteConfigId };
                  console.log(`[GeminiVoice] Injected siteConfigId into ${functionCall.name} args`);
                }
              }

              const toolCallContext =
                sessionSiteConfigId || sessionTrustedCallerId || sessionVoiceCallSid
                  ? {
                      siteConfigId: sessionSiteConfigId ?? undefined,
                      trustedCallerId: sessionTrustedCallerId ?? undefined,
                      callSid: sessionVoiceCallSid ?? undefined,
                    }
                  : undefined;

              const correlationId =
                typeof (functionCall as { id?: string }).id === "string" &&
                (functionCall as { id: string }).id.trim().length > 0
                  ? (functionCall as { id: string }).id.trim()
                  : randomUUID();

              const payloadForGate =
                typeof functionCall.args === "object" &&
                functionCall.args !== null &&
                !Array.isArray(functionCall.args)
                  ? { ...(functionCall.args as Record<string, unknown>) }
                  : {};

              try {
                toolCallPending = true;
                // OOM Guard: if executeContract/handleToolCall hangs (DB timeout, third-party freeze),
                // toolCallPending never clears and clientContentQueue grows unboundedly.
                // Promise.race() forces a 10s ceiling — simulated error flushes the queue.
                const TOOL_TIMEOUT_MS = 10_000;
                const timeoutPromise = new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error(`Tool timeout after ${TOOL_TIMEOUT_MS}ms`)), TOOL_TIMEOUT_MS)
                );
                const gateResult = await Promise.race([
                  executeContract(
                    {
                      mutationKind: "gemini_tool_invocation",
                      capability: functionCall.name,
                      payload: payloadForGate,
                      context: {
                        routeOrSource: voiceWsPath,
                        transport: transportForVoiceWsPath(voiceWsPath),
                        siteConfigId: sessionSiteConfigId ?? undefined,
                      },
                      caller: {
                        actor: "model_proposal",
                        correlationId,
                      },
                    },
                    {
                      toolCallContext,
                      mutationGateLogContext: {
                        voiceSessionId: sessionId,
                        siteConfigId: sessionSiteConfigId,
                        routeOrSource: voiceWsPath,
                        transport: transportForVoiceWsPath(voiceWsPath),
                        proposedCapability: functionCall.name,
                      },
                    },
                  ),
                  timeoutPromise,
                ]);

                if (!gateResult.ok) {
                  const errMsg =
                    gateResult.code === "INVALID_ENVELOPE"
                      ? `mutation_gate_invalid_envelope: ${gateResult.reason}`
                      : gateResult.reason;
                  const errorResult = {
                    serverContent: {
                      modelTurn: {
                        parts: [
                          {
                            functionResponse: {
                              name: functionCall.name,
                              response: { error: errMsg },
                            },
                          },
                        ],
                      },
                    },
                  };
                  googleWs.send(JSON.stringify(errorResult));
                  toolCallPending = false;
                  flushClientContentQueue();
                  continue;
                }

                const result = gateResult.result;
                /** Tool args post site-anchor injection; loose shape for legacy tool_metadata branches. */
                const fcArgs = payloadForGate as Record<string, any>;

                const functionResult = {
                  serverContent: {
                    modelTurn: {
                      parts: [{
                        functionResponse: {
                          name: functionCall.name,
                          response: { result },
                        }
                      }]
                    }
                  }
                };

                googleWs.send(JSON.stringify(functionResult));
                toolCallPending = false;
                console.log(`✅ [TOOL RESULT] ${functionCall.name} completed`);
                flushClientContentQueue();

                // Log conversation event for Cash Board
                const TOOL_TO_EVENT_TYPE: Record<string, string> = {
                  get_booking_and_pricing_info: "pricing",
                  get_business_reviews: "reviews",
                  get_business_details: "business_details",
                  query_knowledge_library: "knowledge_query",
                };
                const eventType = TOOL_TO_EVENT_TYPE[functionCall.name];
                if (eventType && sessionSiteConfigId) {
                  storage.logConversationEvent({
                    siteConfigId: sessionSiteConfigId,
                    callSid: null,
                    sessionId,
                    eventType,
                    metadata: { tool: functionCall.name },
                  }).catch((err) => console.warn("[GeminiVoice] logConversationEvent failed:", err?.message));
                }

                // Forward tool result metadata to the browser client for canvas rendering
                if (clientWs.readyState === WebSocket.OPEN) {
                  let toolMetadata: any = null;

                  if (functionCall.name === 'get_place_ui_data' || functionCall.name === 'get_business_details') {
                    toolMetadata = {
                      type: 'tool_result',
                      tool_name: functionCall.name,
                      tool_type: 'place_details',
                      placeId: (result as any)?.placeId || fcArgs.place_id,
                      data: result,
                    };
                  } else if (functionCall.name === 'get_business_intelligence') {
                    const businessName = (result as any)?.executive_summary
                      ? fcArgs.business_name?.toLowerCase() || ''
                      : '';
                    const placeId = fcArgs.place_id || '';

                    let tourYamlUrl: string | undefined;
                    if (
                      placeId === 'ChIJB4qU6oXvJIgR_2p602OaK_U' ||
                      businessName.includes('boardwalk suites') ||
                      (businessName.includes('lafayette') && businessName.includes('suite'))
                    ) {
                      tourYamlUrl = '/boardwalk_suites_tour.yaml';
                    }

                    toolMetadata = {
                      type: 'tool_result',
                      tool_name: functionCall.name,
                      tool_type: 'business_intelligence',
                      placeId: fcArgs.place_id,
                      tourYamlUrl,
                      data: result,
                    };
                  } else if (functionCall.name === 'search_local_business') {
                    toolMetadata = {
                      type: 'tool_result',
                      tool_name: functionCall.name,
                      tool_type: 'map',
                      center: (result as any[])?.[0]?.position || { lat: 0, lng: 0 },
                      zoom: fcArgs.zoom_level || 14,
                      markers: (result as any[]) || [],
                    };
                  } else if (functionCall.name === 'mcp_search_drive' || functionCall.name === 'mcp_read_calendar') {
                    const r = result as McpToolResult;
                    if (r?.ui_action) {
                      toolMetadata = {
                        type: 'tool_result',
                        tool_name: functionCall.name,
                        tool_type: 'mcp_action',
                        ui_action: r.ui_action,
                        audio_cue: r.audio_cue,
                      };
                    }
                  } else if (functionCall.name === 'get_hotel_inventory') {
                    toolMetadata = {
                      type: 'tool_result',
                      tool_name: functionCall.name,
                      tool_type: 'hotel_inventory',
                      data: result,
                      checkIn: fcArgs.checkIn,
                      checkOut: fcArgs.checkOut,
                    };
                  } else if (functionCall.name === 'fetch_city_warrants') {
                    toolMetadata = {
                      type: 'tool_result',
                      tool_name: functionCall.name,
                      tool_type: 'warrant_results',
                      ...(result as object),
                    };
                  } else if (functionCall.name === 'vine_lookup_and_dispatch') {
                    toolMetadata = {
                      type: 'tool_result',
                      tool_name: functionCall.name,
                      tool_type: 'vine_status',
                      ...(result as object),
                    };
                  } else if (functionCall.name === 'set_canvas_background') {
                    toolMetadata = {
                      type: 'tool_result',
                      tool_name: 'set_canvas_background',
                      tool_type: 'canvas_background',
                      action: 'set',
                      background_id: fcArgs.background_id,
                    };
                  } else if (functionCall.name === 'get_background_categories') {
                    toolMetadata = {
                      type: 'tool_result',
                      tool_name: 'get_background_categories',
                      tool_type: 'canvas_background',
                      action: 'categories',
                      data: result,
                    };
                  } else if (functionCall.name === 'get_backgrounds_in_category') {
                    toolMetadata = {
                      type: 'tool_result',
                      tool_name: 'get_backgrounds_in_category',
                      tool_type: 'canvas_background',
                      action: 'category_items',
                      category_id: fcArgs.category_id,
                      data: result,
                    };
                  } else if (functionCall.name === 'save_background_as_default') {
                    toolMetadata = {
                      type: 'tool_result',
                      tool_name: 'save_background_as_default',
                      tool_type: 'canvas_background',
                      action: 'saved',
                      background_id: fcArgs.background_id,
                      data: result,
                    };
                  } else if (functionCall.name === 'get_screen_size') {
                    toolMetadata = {
                      type: 'tool_result',
                      tool_name: 'get_screen_size',
                      tool_type: 'screen_info',
                      data: result,
                    };
                  } else if (functionCall.name === 'show_canvas') {
                    toolMetadata = {
                      type: 'tool_result',
                      tool_name: 'show_canvas',
                      tool_type: 'shared_canvas',
                      canvas_type: fcArgs.canvas_type,
                      title: fcArgs.title,
                      subtitle: fcArgs.subtitle,
                      items: fcArgs.items || [],
                      cta_label: fcArgs.cta_label,
                      cta_action: fcArgs.cta_action,
                      accent_color: fcArgs.accent_color || 'indigo',
                    };
                  } else if (functionCall.name === 'update_visualizer') {
                    toolMetadata = {
                      type: 'tool_result',
                      tool_name: 'update_visualizer',
                      tool_type: 'visualizer',
                      action: 'update',
                      config: (result as any)?.config || fcArgs,
                    };
                  } else if (functionCall.name === 'save_visualizer') {
                    toolMetadata = {
                      type: 'tool_result',
                      tool_name: 'save_visualizer',
                      tool_type: 'visualizer',
                      action: 'save',
                      data: result,
                    };
                  } else if (functionCall.name === 'browse_visualizers') {
                    toolMetadata = {
                      type: 'tool_result',
                      tool_name: 'browse_visualizers',
                      tool_type: 'visualizer',
                      action: 'browse_results',
                      data: result,
                    };
                  }

                  if (toolMetadata) {
                    clientWs.send(JSON.stringify(toolMetadata));
                  }
                }
              } catch (error: any) {
                console.error(`❌ [TOOL ERROR] ${functionCall.name}:`, error.message);
                const errorResult = {
                  serverContent: {
                    modelTurn: {
                      parts: [{
                        functionResponse: {
                          name: functionCall.name,
                          response: { error: error.message },
                        }
                      }]
                    }
                  }
                };
                googleWs.send(JSON.stringify(errorResult));
                toolCallPending = false;
                flushClientContentQueue();
              }
              continue;
            }

            // Live transcript broadcast to dashboard (site-specific room)
            const textContent = (part as { text?: string | { text?: string } }).text;
            const textStr = typeof textContent === "string" ? textContent : textContent?.text;
            if (textStr && sessionSiteConfigId) {
              broadcastLiveEvent(sessionSiteConfigId, {
                type: "TRANSCRIPT_PARTIAL",
                data: {
                  text: textStr,
                  speaker: "navigator",
                  timestamp: new Date().toISOString(),
                },
              });
            }
          }
          if (isTurnComplete && sessionSiteConfigId) {
            broadcastLiveEvent(sessionSiteConfigId, {
              type: "TRANSCRIPT_FINAL",
              data: { turnComplete: true, timestamp: new Date().toISOString() },
            });
          }
        }
        else if (response.error) {
          console.error('❌ [GOOGLE ERROR]:', JSON.stringify(response.error, null, 2));
          fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:error',message:'Google error received',data:{error:response.error},timestamp:Date.now(),hypothesisId:'H1,H2,H5'})}).catch(()=>{});
        }
        else {
          console.log('📩 [GOOGLE DATA]:', JSON.stringify(response).substring(0, 100) + '...');
        }

        // Forward frame to browser client, filtering out Gemini thought tokens.
        // Thought tokens (thought: true) are internal chain-of-thought and must never reach the UI.
        if (clientWs.readyState === WebSocket.OPEN) {
          const parts = response?.serverContent?.modelTurn?.parts as Array<{ thought?: boolean; [k: string]: unknown }> | undefined;
          if (Array.isArray(parts) && parts.some((p) => p.thought === true)) {
            const nonThoughtParts = parts.filter((p) => p.thought !== true);
            if (nonThoughtParts.length === 0) {
              return; // All parts were thoughts — suppress entire message
            }
            const cleaned = {
              ...response,
              serverContent: {
                ...response.serverContent,
                modelTurn: {
                  ...response.serverContent.modelTurn,
                  parts: nonThoughtParts,
                },
              },
            };
            clientWs.send(JSON.stringify(cleaned));
          } else {
            clientWs.send(data.toString());
          }
        }
      } catch (e) {
        console.log('🔣 [GOOGLE RAW BINARY/TEXT]:', data.toString().substring(0, 200));
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data.toString());
        }
      }
    });

    clientWs.on("message", (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        console.warn('[GeminiVoice] Received unexpected binary data from client. Ignoring.');
        return;
      }
      if (isGoogleWsOpen) {
        processClientMessage(data);
      } else {
        console.log('[GeminiVoice] Google WS not ready, queuing message from client.');
        fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:queue',message:'Client message queued',data:{queueSize:messageQueue.length+1},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
        messageQueue.push(data);
      }
    });

    googleWs.on("error", (error) => {
      clearTimeout(connectTimer);
      console.error("[GeminiVoice] ❌ Google WebSocket error:", error);
      console.error("[GeminiVoice] Error details:", {
        message: error.message,
        code: (error as any).code,
        type: error.constructor.name
      });
      fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:error',message:'Google WS error',data:{errMsg:error.message,errCode:(error as any).code},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: "error", message: `Google API connection error: ${error.message}` }));
      }
    });

    clientWs.on("error", (error) => {
      console.error("[GeminiVoice] Client WebSocket error:", error);
      if (googleWs.readyState === WebSocket.OPEN || googleWs.readyState === WebSocket.CONNECTING) {
        googleWs.close(1011, "Client connection error");
      }
    });

    googleWs.on("close", (code, reason) => {
      console.warn(`⚠️ [GOOGLE CLOSED] Code: ${code} | Reason: ${reason.toString() || 'No reason provided'}`);
      fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:close',message:'Google WS closed',data:{code,reason:reason.toString()},timestamp:Date.now(),hypothesisId:'H1,H2,H5'})}).catch(()=>{});

      if (code === 1011) {
        console.error('💡 DEBUG: 1011 during setup usually means invalid JSON config or wrong model name.');
      } else if (code === 1008) {
        console.error('💡 DEBUG: 1008 policy violation — API key restricted, billing not enabled, or invalid tools/config.');
      } else if (code === 1006) {
        console.error('💡 DEBUG: 1006 abnormal closure — network issue or Google server terminated unexpectedly.');
      } else if (code === 1005) {
        console.warn('💡 DEBUG: 1005 — connection closed without status code (can happen at end of successful turn).');
      }

      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(code, reason.toString());
      }
    });

    clientWs.on("close", (code, reason) => {
      console.log(`[GeminiVoice] Client connection closed - Code: ${code}, Reason: ${reason.toString()}`);
      if (googleWs.readyState === WebSocket.OPEN || googleWs.readyState === WebSocket.CONNECTING) {
        googleWs.close();
      }
    });
  });
}
