import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { IncomingMessage } from "http";
import { registerWebSocketRoute } from "./websocketRouter";
import { TOOL_DECLARATIONS } from "./config/geminiToolDeclarations";
import { handleToolCall } from "./services/toolHandler";
import { broadcastLiveEvent } from "./services/eventBridge";
import { storage } from "./storage";

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

  wss.on("connection", (clientWs: WebSocket, request: IncomingMessage) => {
    console.log(`[GeminiVoice] New client connected to Gemini Proxy from ${request.socket.remoteAddress}`);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[GeminiVoice] GEMINI_API_KEY is not set in environment variables");
      clientWs.close(1011, "Server configuration error: Missing API Key");
      return;
    }

    if (!process.env.GEMINI_WS_URL) {
      console.error("[GeminiVoice] GEMINI_WS_URL is not set in environment variables");
      clientWs.close(1011, "Server configuration error: Missing WebSocket URL");
      return;
    }

    // The URL for the Gemini Multimodal Live API
    const googleUrl = `${process.env.GEMINI_WS_URL}?key=${apiKey}`;

    console.log("[GeminiVoice] Attempting to connect to Google Gemini API...");
    
    const googleWs = new WebSocket(googleUrl);
    let messageQueue: Buffer[] = [];
    let isGoogleWsOpen = false;
    // Identity Anchor — captured from the client's setup sessionContext and injected
    // into every MCP tool call so the model never needs to emit the UUID itself.
    let sessionSiteConfigId: string | null = null;
    // Contextual Snap — per-click agentId and metaPrompt from the Dynamic Entry Point Engine.
    let sessionAgentId: string | null = null;
    let sessionMetaPrompt: string | null = null;

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
            console.log(`[GeminiVoice] Identity anchor set: siteConfigId=${sessionSiteConfigId}`);
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
          // Priority: agentPersona + sovereignTruths + metaPrompt → overrides client instruction.
          if (sessionSiteConfigId && (sessionAgentId || sessionMetaPrompt)) {
            try {
              const siteConfig = await storage.getSiteConfigById(sessionSiteConfigId);
              if (siteConfig) {
                const kl = (siteConfig.knowledgeLibrary as Record<string, any>) ?? {};
                const agents = (kl.agents as Record<string, any>) ?? {};

                // Resolve agent persona — fallback to default concierge description
                const agentDef = (sessionAgentId && sessionAgentId !== 'default')
                  ? (agents[sessionAgentId] ?? null)
                  : null;
                const agentPersona = agentDef?.persona
                  ?? 'You are the primary Site Concierge for this business. Be helpful, concise, and friendly.';

                // Extract sovereign truths for grounding
                const sovereignTruths = kl.sovereignTruths
                  ? `\n\nCORE KNOWLEDGE (follow these facts precisely):\n${JSON.stringify(kl.sovereignTruths, null, 2)}`
                  : '';

                // Resolve allowed tools — empty means all tools remain injected
                const allowedTools: string[] = agentDef?.allowedTools ?? [];

                // Compile the master instruction
                const compiledInstruction = `${agentPersona}${sovereignTruths}${
                  sessionMetaPrompt
                    ? `\n\nIMMEDIATE DIRECTIVE (execute in your very first response):\n${sessionMetaPrompt}\n\nRULE: You MUST execute the IMMEDIATE DIRECTIVE in your very first spoken response. Do not wait for the user to speak first.`
                    : ''
                }`;

                // Override the system_instruction with the compiled version
                message.setup.system_instruction = { parts: [{ text: compiledInstruction }] };
                console.log(`[GeminiVoice] Contextual Snap applied: agentId=${sessionAgentId}, metaPrompt=${!!sessionMetaPrompt}`);

                // Filter tools to the agent's allowlist (empty allowedTools = keep all)
                if (allowedTools.length > 0) {
                  const filteredDeclarations = Object.values(TOOL_DECLARATIONS).filter(
                    t => allowedTools.includes(t.name)
                  );
                  const filteredTools = filteredDeclarations.map(tool => ({
                    functionDeclarations: [{ name: tool.name, description: tool.description, parameters: tool.parameters }]
                  }));
                  if (filteredTools.length > 0) {
                    message.setup.tools = filteredTools;
                    console.log(`[GeminiVoice] Tool isolation: ${filteredTools.length}/${Object.keys(TOOL_DECLARATIONS).length} tools active for agentId=${sessionAgentId}`);
                  }
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
          if (!message.setup.tools || (Array.isArray(message.setup.tools) && message.setup.tools.length === 0) || !sessionAgentId) {
            const tools = Object.values(TOOL_DECLARATIONS).map(tool => ({
              functionDeclarations: [{
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
              }]
            }));
            if (tools.length > 0) {
              message.setup.tools = tools;
              console.log(`📤 [PROXY -> GOOGLE] Injecting ${tools.length} tools into setup`);
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
                mime_type: 'audio/pcm;rate=16000', 
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
              const SITE_ANCHORED_TOOLS = ['mcp_search_drive', 'mcp_read_calendar', 'get_hotel_inventory', 'fetch_city_warrants', 'vine_lookup_and_dispatch'];
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
