import { randomUUID } from "crypto";
import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { IncomingMessage } from "http";
import { registerWebSocketRoute } from "./websocketRouter";
import { TOOL_DECLARATIONS } from "./config/geminiToolDeclarations";
import { getToolsAllowedForMode } from "./config/operationalModes";
import { handleToolCall } from "./services/toolHandler";
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

/**
 * Gemini Multimodal Live API Proxy
 * 
 * This server acts as a proxy between the browser and Google's Gemini Multimodal Live API.
 * It hides the GOOGLE_API_KEY from the client and handles the "Double Socket" pipeline.
 * 
 * Flow: Browser <-> Node.js Server (Proxy) <-> Google Gemini API
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
    console.log(`[GeminiVoice] New client connected to Gemini Proxy from ${request.socket.remoteAddress}`);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[GeminiVoice] GEMINI_API_KEY is not set in environment variables");
      clientWs.close(1011, "Server configuration error: Missing API Key");
      return;
    }

    // Base URL for Gemini Multimodal Live API (env override or default v1beta endpoint)
    const wsBase = GEMINI_LIVE_WS_BASE;
    const googleUrl = `${wsBase}${wsBase.includes("?") ? "&" : "?"}key=${apiKey}`;

    console.log("[GeminiVoice] Attempting to connect to Google Gemini API...");
    
    const googleWs = new WebSocket(googleUrl);
    let messageQueue: Buffer[] = [];
    let isGoogleWsOpen = false;
    // Identity Anchor — captured from the client's setup sessionContext and injected
    // into every MCP tool call so the model never needs to emit the UUID itself.
    let sessionSiteConfigId: string | null = null;
    // Web session id for conversation_events (browser voice); PSTN uses callSid in voiceStream.
    let sessionId: string | null = null;
    // Contextual Snap — per-click agentId and metaPrompt from the Dynamic Entry Point Engine.
    let sessionAgentId: string | null = null;
    let sessionMetaPrompt: string | null = null;
    /** One-time transparency event per WebSocket (async flush — not on audio hot path). */
    let voiceConnectEventEnqueued = false;

    const processClientMessage = async (data: Buffer) => {
      // The client, GeminiStreamingClient, sends JSON strings. It does not send binary data.
      try {
        const messageString = data.toString();
        const message = JSON.parse(messageString);

        // Inject tools into setup message
        if (message.setup) {
          // Capture the siteConfigId from sessionContext (sent by GeminiStreamingClient).
          // This is the "Identity Anchor" — used to scope all MCP tool calls to the right tenant.
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
          // Contextual Snap: capture agentId and metaPrompt from the entry point click.
          if (message.sessionContext?.agentId) {
            sessionAgentId = message.sessionContext.agentId;
          }
          if (message.sessionContext?.metaPrompt) {
            sessionMetaPrompt = message.sessionContext.metaPrompt;
          }
          // Strip sessionContext before forwarding to Google — it is an internal field only.
          delete message.sessionContext;

          // --- ENV ENFORCEMENT: Lockdown the model ID ---
          // The model ID is sourced ONLY from the server environment to prevent client-side drift.
          const modelId = process.env.GEMINI_MODEL_ID;
          if (!modelId) {
            throw new Error("CRITICAL: GEMINI_MODEL_ID is not defined in environment variables. Connection aborted.");
          }
          message.setup.model = modelId; // Override any model sent by the client.

          // --- CONTEXTUAL SNAP: Compile master system instruction server-side ---
          // Load site config when we have sessionSiteConfigId to apply plan (free vs paid) and context.
          if (sessionSiteConfigId) {
            try {
              const siteConfig = await storage.getSiteConfigById(sessionSiteConfigId);
              if (siteConfig) {
                const plan = (siteConfig as { plan?: string }).plan ?? 'free';
                const rawKl = siteConfig.knowledgeLibrary;
                const kl = (rawKl && typeof rawKl === 'object' && !Array.isArray(rawKl)) ? (rawKl as Record<string, any>) : {};
                const agents = (kl.agents as Record<string, any>) ?? {};
                const agentDef = (sessionAgentId && sessionAgentId !== 'default')
                  ? (agents[sessionAgentId] ?? null)
                  : null;
                const systemPromptOverride = (siteConfig as { systemPromptOverride?: string | null }).systemPromptOverride;
                const assignedAgentId = (siteConfig as { assignedAgentId?: string | null }).assignedAgentId;
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
                    };
                    const compiledPersona = buildBehavioralPrompt(agent, businessContext);
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
                  let compiledInstruction = `${agentPersona}${sovereignTruths}${knowledgeBlockFromArray}${quickFactsBlock}${newCustomerIntakeBlock}${INTRODUCTION_PROTOCOL}${RUNTIME_POLICY}${LINKS_MENU}${PRICING_RULE}${FREE_TIER_SYSTEM_INSTRUCTION}`;
                  message.setup.system_instruction = { parts: [{ text: compiledInstruction }] };
                  message.setup.tools = [{ functionDeclarations: [] }];
                  console.log('[GeminiVoice] Contextual Snap applied: free tier (no tools), compiled persona');
                } else {
                  let snapAgent: Awaited<ReturnType<typeof storage.getAgent>> | undefined;
                  if (assignedAgentId) snapAgent = await storage.getAgent(assignedAgentId);

                  // Compute allowed tools first so system prompt matches tool list (avoid telling the model
                  // "only Maps + manual input" while get_hotel_inventory is enabled — that stalls the session).
                  const modeAllowlist = getToolsAllowedForMode(snapAgent?.operationalMode ?? null);
                  const agentAllowed: string[] = agentDef?.allowedTools ?? [];
                  const effectiveAllowed =
                    agentAllowed.length > 0
                      ? agentAllowed.filter((t) => modeAllowlist.includes(t))
                      : modeAllowlist;
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
                  message.setup.system_instruction = { parts: [{ text: compiledInstruction }] };
                  console.log(
                    `[GeminiVoice] Contextual Snap applied: agentId=${sessionAgentId}, metaPrompt=${!!sessionMetaPrompt}, hospitalityPms=${allowHospitality}, compiled persona`
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

          // #region agent log
          fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:58',message:'Processing setup message',data:{model:message.setup?.model,hasTools:!!message.setup?.tools},timestamp:Date.now(),hypothesisId:'H2,H5'})}).catch(()=>{});
          // #endregion

          // Inject full tool set if not already set by Contextual Snap (no allowedTools filter)
          // Live API expects tools: [ { functionDeclarations: [ ...all functions ] } ], not one object per function.
          if (!message.setup.tools || (Array.isArray(message.setup.tools) && message.setup.tools.length === 0) || !sessionAgentId) {
            const declarations = Object.values(TOOL_DECLARATIONS).map(tool => ({
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters
            }));
            if (declarations.length > 0) {
              message.setup.tools = [{ functionDeclarations: declarations }];
              console.log(`📤 [PROXY -> GOOGLE] Injecting ${declarations.length} tools into setup`);
            }
          }
          
          console.log('📤 [PROXY -> GOOGLE] Sending Setup:', JSON.stringify(message, null, 2));
          // #region agent log
          const toolCount = Array.isArray(message.setup.tools) ? message.setup.tools.length : 0;
          fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:73',message:'Setup message sent to Google',data:{model:message.setup?.model,toolCount},timestamp:Date.now(),hypothesisId:'H2,H5'})}).catch(()=>{});
          // #endregion
        }

        if (message.type === 'audio' && message.data) {
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
          googleWs.send(JSON.stringify(message)); // Send modified message with tools
        } else if (message.clientContent) {
          // Forward explicit clientContent turns from the client (e.g. text injection, manual kickstarts)
          googleWs.send(JSON.stringify(message));
        } else if (message.tool_response) {
          // Forward tool responses back to Google
          googleWs.send(JSON.stringify(message));
        } else {
          console.warn('[GeminiVoice] Received unknown message type from client:', messageString.slice(0, 200));
        }
      } catch (error) {
        console.error('[GeminiVoice] Error processing client message:', error, 'Raw data:', data.toString().slice(0, 200));
      }
    };

    // Handle connection to Google
    googleWs.on("open", () => {
      console.log("[GeminiVoice] ✅ Successfully connected to Google Gemini API");
      isGoogleWsOpen = true;
      
      // #region agent log
      fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:104',message:'Google WS opened',data:{queueSize:messageQueue.length,url:googleUrl.replace(/key=[^&]+/, 'key=REDACTED')},timestamp:Date.now(),hypothesisId:'H1,H2'})}).catch(()=>{});
      // #endregion
      
      // Process any messages that were queued (including the setup message)
      console.log(`[GeminiVoice] Processing ${messageQueue.length} queued messages.`);
      while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        if (msg) {
          processClientMessage(msg);
        }
      }

      // DON'T send server_ready yet - wait for setupComplete from Google
    });

    // Handle messages FROM Google -> TO Browser
    googleWs.on("message", async (data) => {
      try {
        const response = JSON.parse(data.toString());
        
        // Log the Setup Acknowledgement
        if (response.setupComplete) {
          console.log('✅ [GOOGLE] Setup Complete received. Session is officially active.');
          // #region agent log
          fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:96',message:'setupComplete received',data:{clientReady:clientWs.readyState===WebSocket.OPEN},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
          // #endregion

          // FIXER KICKSTART: If a metaPrompt is active, force Gemini to speak first
          // based on the button click context — zero-latency relevance, no "How can I help?"
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
            googleWs.send(JSON.stringify(kickstart));
            console.log(`[GeminiVoice] Fixer Kickstart fired for agentId=${sessionAgentId}`);
          }

          // NOW it's safe to tell the client to start audio
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: "server_ready", status: "ready" }));
          }
        } 
        // Handle function calls (tool invocations)
        else if (response.serverContent?.modelTurn?.parts) {
          const parts = response.serverContent.modelTurn.parts;
          for (const part of parts) {
            if (part.functionCall) {
              const functionCall = part.functionCall;

              // Security Interceptor: inject the session-level siteConfigId into site-anchored
              // tool args if missing, preventing the model from hallucinating a UUID.
              const SITE_ANCHORED_TOOLS = ['mcp_search_drive', 'mcp_read_calendar', 'get_hotel_inventory', 'fetch_city_warrants', 'vine_lookup_and_dispatch', 'get_booking_and_pricing_info', 'query_knowledge_library'];
              if (SITE_ANCHORED_TOOLS.includes(functionCall.name)) {
                const args = (functionCall.args as any) ?? {};
                if (!args.siteConfigId && sessionSiteConfigId) {
                  functionCall.args = { ...args, siteConfigId: sessionSiteConfigId };
                  console.log(`[GeminiVoice] Injected siteConfigId into ${functionCall.name} args`);
                }
              }

              const toolCallContext = sessionSiteConfigId ? { siteConfigId: sessionSiteConfigId } : undefined;
              try {
                const result = await handleToolCall(functionCall, toolCallContext);
                const fcArgs = (functionCall.args as any) ?? {};
                
                // Send function result back to Google
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
                console.log(`✅ [TOOL RESULT] ${functionCall.name} completed`);

                // Log conversation event for Cash Board (tool -> event type mapping)
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

                // Send tool metadata to client for UI rendering (for certain tools)
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
                    // Check if this business has a tour spec (e.g. Boardwalk Suites)
                    const businessName = (result as any)?.executive_summary 
                      ? fcArgs.business_name?.toLowerCase() || ''
                      : '';
                    const placeId = fcArgs.place_id || '';
                    
                    // Known tour mappings (could be moved to DB/config)
                    let tourYamlUrl: string | undefined;
                    // Boardwalk Suites Lafayette - specific place ID check
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
                    // Forward ui_action so the client can surface upgrade/connect modals.
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
              }
              
              // Don't forward function calls to client - we handle them server-side
              continue;
            }
            // Live transcript: broadcast text parts to dashboard (site-specific room)
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
          if (response.turnComplete && sessionSiteConfigId) {
            broadcastLiveEvent(sessionSiteConfigId, {
              type: "TRANSCRIPT_FINAL",
              data: { turnComplete: true, timestamp: new Date().toISOString() },
            });
          }
        }
        // Capture specific error messages from the Google backend
        else if (response.error) {
          console.error('❌ [GOOGLE ERROR]:', JSON.stringify(response.error, null, 2));
          // #region agent log
          fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:105',message:'Google error received',data:{error:response.error},timestamp:Date.now(),hypothesisId:'H1,H2,H5'})}).catch(()=>{});
          // #endregion
        }
        // Capture transcription or content responses
        else {
          console.log('📩 [GOOGLE DATA]:', JSON.stringify(response).substring(0, 100) + '...');
        }
        
        // Forward all messages to client
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data.toString());
        }
      } catch (e) {
        console.log('🔣 [GOOGLE RAW BINARY/TEXT]:', data.toString().substring(0, 200));
        // Forward raw data to client
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data.toString());
        }
      }
    });

    // Handle messages FROM Browser -> TO Google
    clientWs.on("message", (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        console.warn('[GeminiVoice] Received unexpected binary data from client. Ignoring.');
        return;
      }

      if (isGoogleWsOpen) {
        processClientMessage(data);
      } else {
        console.log('[GeminiVoice] Google WS not ready, queuing message from client.');
        // #region agent log
        fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:135',message:'Client message queued',data:{queueSize:messageQueue.length+1},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        messageQueue.push(data);
      }
    });

    // Error handling
    googleWs.on("error", (error) => {
      console.error("[GeminiVoice] ❌ Google WebSocket error:", error);
      console.error("[GeminiVoice] Error details:", {
        message: error.message,
        code: (error as any).code,
        type: error.constructor.name
      });
      // #region agent log
      fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:141',message:'Google WS error',data:{errMsg:error.message,errCode:(error as any).code},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
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
      
      // #region agent log
      fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:342',message:'Google WS closed',data:{code:code,reason:reason.toString()},timestamp:Date.now(),hypothesisId:'H1,H2,H5'})}).catch(()=>{});
      // #endregion

      if (code === 1011) { // Internal Error
        console.error('💡 DEBUG: A 1011 during setup usually means your JSON config is invalid or the model name is wrong.');
      } else if (code === 1008) { // Policy Violation
        console.error('💡 DEBUG: A 1008 policy violation often means the API key is restricted, billing is not enabled, or the model does not support the provided tools/config.');
      } else if (code === 1006) { // Abnormal Closure
        console.error('💡 DEBUG: A 1006 abnormal closure suggests a network issue or that the Google server terminated the connection unexpectedly.');
      } else if (code === 1005) {
        console.warn('💡 DEBUG: A 1005 close means the connection closed without a status code. This can happen at the end of a successful turn.');
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
