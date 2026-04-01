/**
 * GeminiStreamingClient - Clear Voice (Premium Tier)
 * 
 * Ultra-low latency streaming voice client using WebSocket connection to Gemini Multimodal Live API.
 * Refactored from LiveVoiceClient to implement IVoiceClient interface.
 * 
 * Key Features:
 * - Real-time bidirectional audio streaming
 * - Native prosody preservation (emotion, tone)
 * - <500ms end-to-end latency
 * - WebSocket connection via /ws/gemini-live proxy
 */

import { IVoiceClient } from './IVoiceClient';
import { VoiceMessage, VoiceConfig, BusinessContext, AgentConfig } from '@/types/voice';
import { resolvePlatformUrl, resolvePlatformWs } from '@/sdk/platformConfig';

/** Global PTT silence threshold (ms). Turn-taking gavel — hard-wired for Gateway Global AI signature feel. */
export const SPEECH_RECOGNITION_THRESHOLD_MS = 800;

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/** Normalize `BusinessContext.hours` for URL query strings (lib.dom / Places can be string or string[]). */
function formatHours(hours: string | string[] | undefined): string | undefined {
  if (hours === undefined || hours === null) return undefined;
  if (Array.isArray(hours)) return hours.join('; ');
  return String(hours);
}

/** Safari and some engines use `interrupted`; lib.dom may not list it — narrow at the boundary only. */
function audioContextNeedsResume(ctx: AudioContext): boolean {
  const s = ctx.state as string;
  return s === 'suspended' || s === 'interrupted';
}

export class GeminiStreamingClient implements IVoiceClient {
  private config: VoiceConfig;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null; // ✅ Modern replacement
  private socket: WebSocket | null = null;
  private currentStream: MediaStream | null = null;
  private connected = false;
  private streaming = false;  private isDisconnecting = false;
  private disconnecting = false; // Add a flag to prevent multiple disconnect calls
  private stopTimeout: number | null = null;
  
  private nextStartTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  /** Meters model TTS for Concierge visualizer (`onOutputVolumeChange`). */
  private outputAnalyser: AnalyserNode | null = null;
  /** Passive read-only tap on mic input for FFT visualization. */
  private inputAnalyser: AnalyserNode | null = null;
  private outputVolumeRafId: number | null = null;
  private outputLevelCallback: (volume: number) => void = () => {};
  private analyserReadyCallback: (input: AnalyserNode | null, output: AnalyserNode | null) => void = () => {};
  private currentInputText = '';
  /** Site config id from last `connect()` — used for verification passage heartbeat (not on VoiceConfig). */
  private sessionSiteConfigId: string | null = null;
  private verificationHeartbeatSent = false;
  /** For async latency hints (Communication Plane) — first model audio chunk. */
  private voiceSessionStartMs: number | null = null;
  private firstModelAudioLogged = false;

  // Callbacks
  private messageCallback: (message: VoiceMessage) => void = () => {};
  private volumeCallback: (volume: number) => void = () => {};
  private connectionCallback: (connected: boolean) => void = () => {};

  constructor(config: VoiceConfig) {
    this.config = config;
  }

  async connect(business: BusinessContext, agent: AgentConfig, config: VoiceConfig): Promise<void> {
    if (this.connected) {
      this.disconnect();
    }

    this.config = config;
    this.sessionSiteConfigId = business.id ?? null;
    this.verificationHeartbeatSent = false;
    this.voiceSessionStartMs = null;
    this.firstModelAudioLogged = false;

    try {
      this.currentStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
    } catch (err) {
      console.error("Microphone access denied:", err);
      this.messageCallback({
        type: 'error',
        text: 'Microphone access is required for voice interaction.'
      });
      throw new Error("Microphone access is required.");
    }

    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Resume contexts immediately after creation (browsers often start them suspended)
    await this.resumeAudioContexts();

    this.nextStartTime = 0;
    this.currentInputText = '';
    
    // Build system instruction — Override-First priority:
    // 1. DB-backed system_prompt_override (Voice/Enterprise Knowledge Worker prompt)
    // 2. Server-enriched instruction (business intelligence + SWOT)
    // 3. Basic template built from BusinessContext + AgentConfig
    let systemInstruction: string;
    if (business.systemPromptOverride) {
      systemInstruction = business.systemPromptOverride;
      console.log('[GeminiStreamingClient] Using system_prompt_override (Knowledge Worker mode)');
    } else {
      try {
        const enriched = await this.fetchEnrichedSystemInstruction(business, agent);
        systemInstruction = enriched || this.buildSystemInstruction(business, agent);
      } catch (error) {
        console.warn('[GeminiStreamingClient] Failed to fetch enriched instruction, using basic:', error);
        systemInstruction = this.buildSystemInstruction(business, agent);
      }
    }

    // Client-side [IMMEDIATE DIRECTIVE] fallback:
    // The server proxy compiles a definitive instruction via the Contextual Snap when
    // agentId/metaPrompt are in sessionContext. This prepend acts as belt-and-suspenders —
    // if the server cannot reach the DB (network error, missing siteConfigId), the client's
    // instruction already carries the directive so the AI never reverts to a generic greeting.
    // NOTE: Do NOT also send a client-side kickstart message — the server fires one server-side
    // after setupComplete at the correct time (before audio is active on the client).
    if (business.entryPointMetaPrompt) {
      const labelContext = business.name ? `on the "${business.name}" website` : 'on the website';
      const immediateDirective = `[IMMEDIATE DIRECTIVE — CLIENT FALLBACK]: The user just clicked a button ${labelContext}. Execute the following instruction in your very first response without waiting for user input: ${business.entryPointMetaPrompt}\n\nRULE: You MUST speak first. Do not wait for the user.\n\n`;
      systemInstruction = immediateDirective + systemInstruction;
      console.log('[GeminiStreamingClient] Prepended [IMMEDIATE DIRECTIVE] fallback to system instruction');
    }

    // Owner agent role — injects a role-specific directive when the owner is
    // using the panel as an AI advisor rather than as the customer-facing agent.
    if (business.ownerAgentRole && business.ownerAgentRole !== 'concierge') {
      const roleInstructions: Record<string, string> = {
        'biz-bot': `[OWNER SESSION — AI BIZ BOT MODE]: You are NOT acting as the customer-facing agent for ${business.name}. You are the AI Biz Bot — a strategic business advisor for the owner of ${business.name}. Your job is to help them grow their business: review their profile, suggest improvements, discuss operations, pricing, marketing, and customer experience. You have access to the business profile data on screen. When the owner asks about what you can see, describe the current panel they are viewing. Be direct, insightful, and specific to their business. Start by introducing yourself as the AI Biz Bot and asking what aspect of the business they'd like to work on.`,
        'bot-builder': `[OWNER SESSION — AI BOT BUILDER MODE]: You are NOT acting as the customer-facing agent for ${business.name}. You are the AI Bot Builder — a deeply expert agent configuration guide built into the Gateway Global AI platform.

YOUR EXPERTISE covers seven domains (you have full knowledge of each):
1. ROLES & OPERATIONAL MODES — 10 modes: SAFE, CONCIERGE, RECEPTIONIST, SALES, CASHIER, CUSTOMER_SUPPORT, MANAGER, RESEARCH, CODING, REVIEW. Each has locked tool allowlists and a governance directive. You know when to recommend each.
2. DISC CHARACTER SYSTEM — D (Dominance), I (Influence), S (Steadiness), C (Conscientiousness), each 0–100. You translate these into personality descriptions and know which values fit which industries. High-I for salons and hospitality. High-D for call centers. High-S for healthcare. High-C for legal and finance.
3. ARCH COMMUNICATION PROTOCOL — A (Acknowledge), R (Reflect), C (Context), H (Handoff), each 0–100, plus Response Window (5–60s). ARCH controls dialogue structure and turn length. You have four presets: Emergency (5s), Concierge (15s), Standard (20s), Advisory (45s). Always compile DISC before ARCH.
4. GOVERNANCE & SAFE MODE — Safe Mode is a runtime policy, not a personality. Tool allowlists are enforced at the execution plane. Agents operate within declared jurisdictions. Identity verification (NOVA IDV) is required before any account-sensitive action.
5. INDUSTRY PACKS — Pre-configured starting points: Transportation & Venues, Hospitality, Food & Beverage, Beauty & Wellness, Healthcare, Professional Services, Retail, Automotive, Fitness, Real Estate. You know the recommended Mode, DISC, ARCH, Voice, and task order for each.
6. KNOWLEDGE & SKILLS — Knowledge Library is the intelligence layer (business profile, menus, FAQs, policies). Skills are executable tools (query_knowledge_library, search_local_business, request_manual_input, stripe_checkout, show_canvas, etc.). You guide owners to upload the right documents and confirm the right tools are enabled for their mode.
7. ROUTING & TELEPHONY — QR codes link to /biz/[slug]. Sharing URLs go on websites and social profiles. Phone numbers provision via Twilio. The Sovereign SMS Router enforces A2P compliance across 6 pipes. Call History is the Revenue Event log.

THE 8 VOICES: Kore, Aoede, Leda, Zephyr (female) and Puck, Charon, Fenrir, Orus (male). Recommend voices after setting DISC — match the energy: Charon/Fenrir for high-D, Kore/Aoede for high-I, Leda/Orus for high-C/S.

YOUR OPERATING RULES:
- You are the expert. Make concrete recommendations, not "it depends" answers.
- Configure in order: Role → DISC → ARCH → Knowledge → Skills → Tasks → Routing → Telephony.
- Ask one focused question per turn, listen, then recommend specifically.
- Keep voice turns under 20 seconds. Explain one thing, then ask a confirmatory question.
- When the canvas context shows which panel is active, lead with what that panel does and what to configure there.
- Never read documentation verbatim — translate everything into conversational language at the owner's level.
- If the owner is stuck, suggest the Industry Pack for their business type as a fast starting point.

Start by welcoming the owner to Bot Builder mode, asking what kind of business they are configuring, and offering to recommend a complete starting configuration.`,
      };
      const roleDirective = roleInstructions[business.ownerAgentRole];
      if (roleDirective) {
        systemInstruction = roleDirective + '\n\n' + systemInstruction;
        console.log(`[GeminiStreamingClient] Injected owner agent role: ${business.ownerAgentRole}`);
      }
    }

    try {
      // resolvePlatformWs() returns an absolute wss:// URL when running as an
      // embedded SDK on a third-party domain; falls back to window.location.host
      // when running inside the main app so existing behaviour is unchanged.
      const wsUrl = resolvePlatformWs('/ws/gemini-live');
      
      console.log('[GeminiStreamingClient] Connecting to:', wsUrl);
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[GeminiStreamingClient] WebSocket onopen fired (mic stream already captured). Waiting for server_ready...');
        
        // Use the model from the configuration to ensure protocol alignment.
        const modelToUse = this.config.model?.startsWith('models/')
          ? this.config.model
          : `models/${this.config.model}`; // e.g., 'models/gemini-2.5-flash-native-audio-preview-12-2025'

        // Define the tools array with strict OpenAPI schemas
        const tools = [
          {
            function_declarations: [
              {
                name: "get_business_details",
                description: "Fetch current place information, hours, and address for a specific business.",
                parameters: {
                  type: "object",
                  properties: {
                    placeId: { type: "string", description: "The unique Google Place ID." },
                    query: { type: "string", description: "Fallback search query." }
                  },
                  required: ["placeId"]
                }
              },
              {
                name: "get_business_reviews",
                description: "Retrieve customer feedback, ratings, and specific review snippets.",
                parameters: {
                  type: "object",
                  properties: {
                    placeId: { type: "string", description: "The Google Place ID to fetch reviews for." },
                    maxReviews: { type: "integer", description: "Number of reviews to return (default 5)." }
                  },
                  required: ["placeId"]
                }
              },
              {
                name: "get_business_intelligence",
                description: "Generate SWOT analysis, competitive positioning, or tour narratives.",
                parameters: {
                  type: "object",
                  properties: {
                    businessName: { type: "string", description: "Name of the business." },
                    focusArea: { 
                      type: "string", 
                      enum: ["SWOT", "TourNarrative", "CompetitiveAnalysis"],
                      description: "The type of intelligence analysis."
                    }
                  },
                  required: ["businessName", "focusArea"]
                }
              },
              {
                name: "request_manual_input",
                description: "Signal that the assistant needs manual user input from the UI.",
                parameters: {
                  // ✅ CRITICAL: Protocol requires a valid object schema even if empty
                  type: "object",
                  properties: {}
                }
              },
              // Workspace MCP Suite — read-only; scoped by siteConfigId (Voice/Enterprise plan)
              {
                name: "mcp_search_drive",
                description: "Searches the user's Google Drive for documents, spreadsheets, or folders based on a semantic query. Use this to find business context or client files.",
                parameters: {
                  type: "object",
                  properties: {
                    siteConfigId: { type: "string", description: "The unique UUID of the business to scope the search." },
                    query: { type: "string", description: "Semantic search term (e.g., 'Project Alpha Requirements')." },
                    mimeType: { type: "string", description: "Optional: Filter by file type (e.g., 'application/pdf')." }
                  },
                  required: ["siteConfigId", "query"]
                }
              },
              {
                name: "mcp_read_calendar",
                description: "Retrieves the user's upcoming schedule or checks availability for a specific date range.",
                parameters: {
                  type: "object",
                  properties: {
                    siteConfigId: { type: "string", description: "The unique UUID of the business." },
                    timeMin: { type: "string", description: "ISO format start time (e.g., '2026-02-21T09:00:00Z')." },
                    timeMax: { type: "string", description: "ISO format end time." }
                  },
                  required: ["siteConfigId", "timeMin"]
                }
              }
            ]
          }
        ];

        const setupMessage = {
          setup: {
            model: modelToUse,
            generation_config: {
              response_modalities: ["AUDIO"], // Protocol requires uppercase enum values per Google spec
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: { voice_name: this.config.voiceName || 'Puck' }
                }
              }
            },
            tools: tools, // ✅ Tools properly declared
            system_instruction: { parts: [{ text: systemInstruction }] }
          },
          // Identity anchor: server proxy reads sessionContext.siteConfigId and injects it
          // into MCP tool args so the model never needs to emit the UUID directly.
          // Only include siteConfigId when we have a non-empty Business UUID (avoid sending "").
          // entryPointAgentId + entryPointMetaPrompt power the Contextual Snap —
          // the proxy compiles the master system instruction server-side.
          sessionContext: {
            ...(business.id?.trim() ? { siteConfigId: business.id.trim() } : {}),
            ...(business.entryPointAgentId ? { agentId: business.entryPointAgentId } : {}),
            ...(business.entryPointMetaPrompt ? { metaPrompt: business.entryPointMetaPrompt } : {}),
            ...(business.funnelContextKeys && Object.keys(business.funnelContextKeys).length > 0
              ? { funnelContextKeys: Object.fromEntries(
                  Object.entries(business.funnelContextKeys).filter(([, v]) => v != null && String(v).trim() !== '') as [string, string][]
                ) }
              : {}),
            ...(business.voiceTrustedCallerId?.trim()
              ? { trustedCallerId: business.voiceTrustedCallerId.trim() }
              : {}),
            ...(business.voiceBridgeCallSid?.trim()
              ? { callSid: business.voiceBridgeCallSid.trim() }
              : {}),
            ...(business.authenticatedCustomerId
              ? { authenticatedCustomerId: business.authenticatedCustomerId }
              : {}),
            ...(business.authenticatedIsOwner
              ? { authenticatedIsOwner: true }
              : {}),
          },
        };
        
        console.log('[GeminiStreamingClient] Sending final validated setup payload:', JSON.stringify(setupMessage, null, 2));

        this.socket?.send(JSON.stringify(setupMessage));
        // DON'T start audio yet - wait for server_ready signal
      };

      this.socket.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          await this.handleMessage(msg);
        } catch (e) {
          console.error("[GeminiStreamingClient] Error parsing message:", e);
        }
      };

      this.socket.onclose = (e) => {
        console.log(`[GeminiStreamingClient] Connection closed. Code: ${e.code}, Reason: ${e.reason}, Was Clean: ${e.wasClean}`);
        if (this.connected) {
          this.disconnect();
        }
        this.connected = false;
        this.connectionCallback(false);
      };

      this.socket.onerror = (err) => {
        console.error('[GeminiStreamingClient] Connection error', err);
        this.messageCallback({
          type: 'error',
          text: 'Connection lost. Please try again.'
        });
      };

    } catch (err: any) {
      this.connected = false;
      this.messageCallback({
        type: 'error',
        text: err?.message || 'Failed to connect to voice service.'
      });
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isDisconnecting || !this.connected) {
      return;
    }
    this.isDisconnecting = true;
    console.log('[GeminiStreamingClient] Disconnecting...');

    if (this.stopTimeout) window.clearTimeout(this.stopTimeout);
    this.stopOutputVolumeMeter();

    if (this.socket) { 
      try { this.socket.close(); } catch(e) {}
    }
    this.currentStream?.getTracks().forEach(t => t.stop());
    this.activeSources.forEach(source => { 
      try { source.stop(); } catch(e) {} 
    });
    this.activeSources.clear();
    this.workletNode?.disconnect();
    this.inputAnalyser?.disconnect();
    this.inputAnalyser = null;
    this.inputSource?.disconnect();
    
    // #region agent log
    // Log state before trying to close to debug the race condition
    console.log('[GeminiStreamingClient] Disconnecting audio contexts', {
        inputState: this.inputAudioContext?.state,
        outputState: this.outputAudioContext?.state
    });
    // #endregion
    
    // Local bindings so async close() sees a stable, narrowed reference (TS + race safety).
    const inputCtx = this.inputAudioContext;
    if (inputCtx && inputCtx.state !== 'closed') {
      try {
        await inputCtx.close();
      } catch (e) {
        console.warn('[GeminiStreamingClient] Error closing inputAudioContext:', e);
      }
    }
    const outputCtx = this.outputAudioContext;
    if (outputCtx && outputCtx.state !== 'closed') {
      try {
        await outputCtx.close();
      } catch (e) {
        console.warn('[GeminiStreamingClient] Error closing outputAudioContext:', e);
      }
    }

    this.inputAudioContext = null;
    this.outputAnalyser = null;
    this.outputAudioContext = null;
    this.socket = null;
    this.connected = false;
    this.streaming = false;
    this.currentInputText = '';
    this.sessionSiteConfigId = null;
    this.verificationHeartbeatSent = false;
    this.connectionCallback(false);
    this.isDisconnecting = false;
  }

  // IVoiceClient interface methods - ABSTRACTED for PTT
  startSession(): void {
    // For streaming mode: unmute audio stream
    this.setStreamingInternal(true);
  }

  endSession(): void {
    // For streaming mode: mute audio stream
    this.setStreamingInternal(false);
  }

  sendText(text: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({
      realtime_input: {
        parts: [{ text }]
      }
    }));
  }

  public sendToolResponse(toolResponse: { name: string, result: any, callId?: string }): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    
    const responsePayload = {
      tool_response: {
        function_responses: [{
          name: toolResponse.name,
          response: toolResponse.result,
          id: toolResponse.callId // Important for multi-tool tracking
        }]
      }
    };
  
    console.log('[GeminiStreamingClient] Sending tool response:', responsePayload);
    this.socket.send(JSON.stringify(responsePayload));
  }

  onMessage(callback: (message: VoiceMessage) => void): void {
    this.messageCallback = callback;
  }

  /**
   * New governed event handler — maps raw VoiceMessage to typed PttEvents.
   * Additive: onMessage() is preserved as the backward-compat shim.
   * VoiceTurnOrchestrator uses onEvent() exclusively.
   *
   * IMPORTANT: turnId is NOT generated here. The VoiceTurnOrchestrator is the
   * sole authority for turnId (one UUID per PTT turn). All events emitted here
   * carry an empty turnId that the orchestrator populates via its own context.
   * See: canvas_control.md §12, SYSTEM_MANIFEST.md — Single Mutation Path Rule.
   */
  onEvent(callback: (event: import('@/types/voice').PttEvent) => void): void {
    // Wrap into the new typed event dispatch
    this.messageCallback = (msg: VoiceMessage) => {
      // transcript.partial — turnId supplied by orchestrator, empty sentinel here
      if (msg.type === 'transcription' && msg.isFinal === false) {
        callback({
          type: 'transcript.partial',
          turnId: '',
          sessionId: this.sessionSiteConfigId ?? '',
          text: msg.text ?? '',
        });
        return;
      }
      // transcript.final — turnId is empty sentinel; orchestrator generates the real UUID
      if (msg.type === 'transcription' && msg.isFinal === true) {
        callback({
          type: 'transcript.final',
          turnId: '',
          sessionId: this.sessionSiteConfigId ?? '',
          text: msg.text ?? '',
        });
        return;
      }
      // canvas tool call — map to canvas.syscall event (legacy adapter path)
      if (msg.type === 'response' && (msg.metadata?.tool_type === 'shared_canvas' || msg.metadata?.tool_type === 'canvas_control')) {
        callback({
          type: 'canvas.syscall',
          turnId: '',
          sessionId: this.sessionSiteConfigId ?? '',
          syscallId: msg.metadata?.call_id ?? crypto.randomUUID(),
          syscall: 'canvas.render',
          result: null, // legacy adapter — result resolved by ToolRouter
        });
        return;
      }
      // speech.output (text response)
      if (msg.type === 'response' && msg.text) {
        callback({
          type: 'speech.output',
          turnId: '',
          sessionId: this.sessionSiteConfigId ?? '',
          text: msg.text,
          audioState: 'streaming',
        });
        return;
      }
      // analysis.metadata (DISC / emotion / sentiment from tool results)
      if (msg.type === 'metadata' || (msg.type === 'response' && msg.metadata?.emotion)) {
        callback({
          type: 'analysis.metadata',
          turnId: '',
          sessionId: this.sessionSiteConfigId ?? '',
          emotion: msg.metadata?.emotion,
          sentiment: msg.metadata?.sentiment,
          disc: msg.metadata?.disc,
        });
        return;
      }
      // error passthrough
      if (msg.type === 'error') {
        callback({
          type: 'error',
          turnId: undefined,
          sessionId: this.sessionSiteConfigId ?? '',
          code: 'VOICE_ERROR',
          message: msg.text ?? 'Voice error',
        });
      }
    };
  }

  /**
   * Interrupt active TTS speech.
   * VoiceTurnOrchestrator is the SOLE caller — never call this directly from components.
   */
  interruptSpeech(): void {
    this.stopOutputVolumeMeter();
    this.activeSources.forEach(source => { try { source.stop(); } catch (e) {} });
    this.activeSources.clear();
    if (this.outputAudioContext) {
      this.nextStartTime = this.outputAudioContext.currentTime;
    }
    this.currentInputText = '';
    console.log('[GeminiStreamingClient] interruptSpeech() called by VoiceTurnOrchestrator');
  }

  /**
   * Pass grounded speech context to Gemini for canvas-aware narration.
   * Called by VoiceTurnOrchestrator after canvas.render is committed.
   */
  sendGroundedSpeechContext(ctx: import('@/types/voice').SpeechGroundingContext): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('[GeminiStreamingClient] sendGroundedSpeechContext: socket not open');
      return;
    }
    // Inject canvas state as a system grounding message to the proxy
    const groundingPayload = {
      type: 'canvas_grounding',
      turnId: ctx.turnId,
      currentViewId: ctx.currentViewId,
      screenSummary: ctx.screenSummary,
      speakingInstructions: ctx.speakingInstructions,
    };
    this.socket.send(JSON.stringify(groundingPayload));
  }

  onVolumeChange(callback: (volume: number) => void): void {
    this.volumeCallback = callback;
  }

  onOutputVolumeChange(callback: (volume: number) => void): void {
    this.outputLevelCallback = callback;
  }

  onAnalyserReady(callback: (input: AnalyserNode | null, output: AnalyserNode | null) => void): void {
    this.analyserReadyCallback = callback;
  }

  onConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionCallback = callback;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConfig(): VoiceConfig {
    return this.config;
  }

  // Internal methods

  private async resumeAudioContexts() {
    if (this.inputAudioContext && audioContextNeedsResume(this.inputAudioContext)) {
      await this.inputAudioContext.resume();
    }
    if (this.outputAudioContext && audioContextNeedsResume(this.outputAudioContext)) {
      await this.outputAudioContext.resume();
    }
  }

  private setStreamingInternal(enabled: boolean) {
    if (this.stopTimeout) {
      window.clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }

    if (enabled) {
      this.streaming = true;
      this.resumeAudioContexts();
    } else {
      const baseDelay = SPEECH_RECOGNITION_THRESHOLD_MS;
      
      this.stopTimeout = window.setTimeout(() => {
        this.streaming = false;
        this.stopTimeout = null;
        if (this.currentInputText.trim()) {
          this.messageCallback({
            type: 'transcription',
            text: this.currentInputText,
            isFinal: true
          });
          this.currentInputText = '';
        }
      }, baseDelay);
    }
  }

  private async setupAudioProcessing() {
    if (!this.currentStream || !this.inputAudioContext) return;
    
    const workletUrl = resolvePlatformUrl('/clear-voice-processor.js');
    try {
      // Step 1: Load the AudioWorklet module (runs on background thread)
      console.log('[GeminiStreamingClient] Loading AudioWorklet from:', workletUrl);
      await this.inputAudioContext.audioWorklet.addModule(workletUrl);
      
      // Step 2: Create the source from microphone
      this.inputSource = this.inputAudioContext.createMediaStreamSource(this.currentStream);
      
      // Step 3: Create the AudioWorklet node
      this.workletNode = new AudioWorkletNode(this.inputAudioContext, 'clear-voice-processor');

      // Step 4: Listen for audio data from the background thread
      this.workletNode.port.onmessage = (event) => {
        // audioData arrives as a transferred ArrayBuffer (zero-copy from worklet thread).
        // Wrap it in Float32Array view — no allocation needed, just a typed view.
        const audioData = new Float32Array(event.data.audioData);
        const { volume } = event.data;
        this.volumeCallback(volume);
        if (this.streaming && this.socket && this.socket.readyState === WebSocket.OPEN) {
          const pcmBlob = this.createPcmBlob(audioData);
          this.socket.send(JSON.stringify({ type: 'audio', data: pcmBlob.data }));
        }
      };

      // Step 5: Connect the nodes (Microphone → Worklet → Output)
      this.inputSource.connect(this.workletNode);
      this.workletNode.connect(this.inputAudioContext.destination);

      // Step 5b: Parallel input analyser for FFT visualization (read-only, no speaker output)
      this.inputAnalyser = this.inputAudioContext.createAnalyser();
      this.inputAnalyser.fftSize = 256;
      this.inputAnalyser.smoothingTimeConstant = 0.4;
      this.inputSource.connect(this.inputAnalyser);
      this.analyserReadyCallback(this.inputAnalyser, this.ensureOutputAnalyser());

      console.log('[GeminiStreamingClient] AudioWorklet initialized');
    } catch (err: any) {
      console.error('[GeminiStreamingClient] AudioWorklet addModule failed:', workletUrl, err?.message ?? err, err);
      throw err;
    }
  }

  private async handleMessage(message: any) {
    // Handle server ready signal — await worklet setup so we only mark connected when audio pipeline is ready
    if (message.type === 'server_ready') {
      console.log('[GeminiStreamingClient] Server is ready! Starting audio processing...');
      try {
        await this.setupAudioProcessing();
        if (!this.verificationHeartbeatSent && this.sessionSiteConfigId) {
          this.verificationHeartbeatSent = true;
          void fetch(resolvePlatformUrl('/api/v1/verification/session_heartbeat'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              siteConfigId: this.sessionSiteConfigId,
              transport: 'websocket',
            }),
            keepalive: true,
          }).catch(() => {});
        }
        this.connected = true;
        this.voiceSessionStartMs = Date.now();
        this.connectionCallback(true);
      } catch (err: any) {
        console.error('[GeminiStreamingClient] setupAudioProcessing failed, staying disconnected:', err?.message ?? err);
        this.connectionCallback(false);
      }
      return;
    }

    // Handle snake_case from raw WebSocket protocol
    const serverContent = message.server_content || message.serverContent;

    if (serverContent?.interrupted) {
      this.activeSources.forEach(source => { try { source.stop(); } catch (e) {} });
      this.activeSources.clear();
      this.nextStartTime = this.outputAudioContext?.currentTime || 0;
      this.currentInputText = '';
      return;
    }

    const inputTranscription = serverContent?.input_audio_transcription || serverContent?.inputAudioTranscription;
    if (inputTranscription) {
      const { text } = inputTranscription;
      if (text) {
        console.log("[GeminiStreamingClient] Transcription update:", text);
        this.currentInputText = text;
        this.messageCallback({
          type: 'transcription',
          text: this.currentInputText,
          isFinal: false
        });
      }
    }
    
    if (serverContent?.turn_complete || serverContent?.turnComplete) {
      console.log("[GeminiStreamingClient] Turn complete. Final text:", this.currentInputText);
      this.messageCallback({
        type: 'transcription',
        text: this.currentInputText,
        isFinal: true
      });
      this.currentInputText = '';
    }

    const modelTurn = serverContent?.model_turn || serverContent?.modelTurn;
    const parts = modelTurn?.parts;
    if (parts && this.outputAudioContext) {
      for (const part of parts) {
        // 1. Check for Tool Calls (The "Request" side)
        const toolCall = part.tool_call || part.toolCall;
        if (toolCall) {
          console.log("[GeminiStreamingClient] 🛠️ Tool call received:", toolCall.name);
          
          // Normalize tool names to UI routing keys
          const toolNameMap: Record<string, string> = {
            request_manual_input: 'manual_input',
            show_canvas: 'shared_canvas',
          };
          this.messageCallback({
            type: 'response',
            text: '', 
            metadata: {
              tool_type: toolNameMap[toolCall.name] ?? toolCall.name,
              call_id: toolCall.call_id || toolCall.callId,
              ...toolCall.args
            }
          });
          continue; // Skip audio processing if it's a tool call
        }

        const inlineData = part.inline_data || part.inlineData;
        if (inlineData?.data) {
          console.log("[GeminiStreamingClient] Playing model audio chunk");
          if (!this.firstModelAudioLogged && this.voiceSessionStartMs != null) {
            this.firstModelAudioLogged = true;
            const msToFirstToken = Date.now() - this.voiceSessionStartMs;
            fetch("/api/analytics/voice-latency-hint", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                siteConfigId: this.sessionSiteConfigId ?? undefined,
                msToFirstToken,
                sessionKind: "web_voice",
              }),
            }).catch(() => {});
          }
          this.playAudio(inlineData.data);
        }
        if (part.text) {
          console.log("[GeminiStreamingClient] Model text response:", part.text);
          this.messageCallback({
            type: 'response',
            text: part.text,
            metadata: {} // Can be enhanced to include tool metadata
          });
        }
      }
    }

    // Handle tool result metadata from server
    if (message.type === 'tool_result') {
      console.log("[GeminiStreamingClient] Tool result received:", message.tool_name);

      // Write to localStorage for admin activity log (keyed globally; admin reads this)
      try {
        const existing = JSON.parse(localStorage.getItem('gg_tool_log') || '[]');
        existing.unshift({
          ts: new Date().toISOString(),
          tool: message.tool_name,
          type: message.tool_type,
          placeId: message.placeId,
        });
        // Keep last 50 entries
        localStorage.setItem('gg_tool_log', JSON.stringify(existing.slice(0, 50)));
      } catch {
        // Non-fatal: localStorage may be unavailable
      }

      // Spread all tool payload fields. Canvas fields (canvas_type, title, items, etc.)
      // arrive at the top level of the message — NOT nested under .data — so we must
      // exclude only the transport keys and forward everything else as metadata.
      const { type: _t, tool_name: _n, ...toolPayload } = message;
      this.messageCallback({
        type: 'response',
        text: '',
        metadata: toolPayload
      });
    }
  }

  private ensureOutputAnalyser(): AnalyserNode | null {
    const ctx = this.outputAudioContext;
    if (!ctx) return null;
    if (!this.outputAnalyser) {
      const a = ctx.createAnalyser();
      a.fftSize = 512;
      a.smoothingTimeConstant = 0.35;
      a.connect(ctx.destination);
      this.outputAnalyser = a;
    }
    return this.outputAnalyser;
  }

  /** Drive Concierge AI speech bars while TTS buffers play. */
  private startOutputVolumeMeter(): void {
    if (this.outputVolumeRafId != null) return;
    const tick = () => {
      if (!this.outputAnalyser) {
        this.outputVolumeRafId = null;
        return;
      }
      if (this.activeSources.size === 0) {
        this.outputLevelCallback(0);
        this.outputVolumeRafId = null;
        return;
      }
      const buffer = new Float32Array(this.outputAnalyser.fftSize);
      this.outputAnalyser.getFloatTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
      const rms = Math.sqrt(sum / buffer.length);
      const scaled = Math.min(1, rms * 12);
      this.outputLevelCallback(scaled);
      this.outputVolumeRafId = requestAnimationFrame(tick);
    };
    this.outputVolumeRafId = requestAnimationFrame(tick);
  }

  private stopOutputVolumeMeter(): void {
    if (this.outputVolumeRafId != null) {
      cancelAnimationFrame(this.outputVolumeRafId);
      this.outputVolumeRafId = null;
    }
    this.outputLevelCallback(0);
  }

  private playAudio(base64Data: string) {
    if (!this.outputAudioContext) return;
    const analyser = this.ensureOutputAnalyser();
    const bytes = decode(base64Data);
    const dataView = new DataView(bytes.buffer);
    const frameCount = bytes.length / 2;
    const audioBuffer = this.outputAudioContext.createBuffer(1, frameCount, 24000);
    const channelData = audioBuffer.getChannelData(0);

    for (let i = 0; i < frameCount; i++) {
      const int16 = dataView.getInt16(i * 2, true);
      channelData[i] = int16 / 32768.0;
    }

    const source = this.outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    if (analyser) {
      source.connect(analyser);
    } else {
      source.connect(this.outputAudioContext.destination);
    }
    const startTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;
    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
      if (this.activeSources.size === 0) {
        this.stopOutputVolumeMeter();
      }
    };
    this.startOutputVolumeMeter();
  }

  private createPcmBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = Math.max(-1, Math.min(1, data[i])) * 32767;
    }
    return { 
      data: encode(new Uint8Array(int16.buffer)), 
      mimeType: 'audio/pcm;rate=16000' 
    };
  }

  /**
   * Fetch enriched system instruction from server (includes business intelligence).
   */
  private async fetchEnrichedSystemInstruction(
    business: BusinessContext,
    agent: AgentConfig
  ): Promise<string | null> {
    try {
      const params = new URLSearchParams({
        businessName: business.name,
        address: business.address,
        role: agent.role,
        personality: agent.personality,
        objectives: agent.objectives.join('|'),
        constraints: agent.constraints.join('|'),
        includeIntelligence: 'true',
        includeOwnerData: 'false',
      });
      const hoursStr = formatHours(business.hours);
      if (hoursStr !== undefined) params.set('hours', hoursStr);
      if (business.services) params.set('services', business.services.join(','));

      const response = await fetch(
        resolvePlatformUrl(`/api/business/${encodeURIComponent(business.placeId)}/enriched-instruction?${params.toString()}`)
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data.instruction || null;
    } catch (error) {
      console.warn('[GeminiStreamingClient] Error fetching enriched instruction:', error);
      return null;
    }
  }

  private buildSystemInstruction(business: BusinessContext, agent: AgentConfig): string {
    const hoursLine = formatHours(business.hours);
    return `
      Identity: You are ${agent.role} for "${business.name}".
      Personality: ${agent.personality}.
      
      BUSINESS CONTEXT:
      - Name: ${business.name}
      - Address: ${business.address}
      ${hoursLine ? `- Hours: ${hoursLine}` : ''}
      ${business.services ? `- Services: ${business.services.join(', ')}` : ''}

      CORE GOAL:
      ${agent.objectives.join(' ')}
      
      CONSTRAINTS:
      ${agent.constraints.join(' ')}
      
      Keep responses natural and concise.
    `;
  }
}
