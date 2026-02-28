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
  private currentInputText = '';
  
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

    try {
      // resolvePlatformWs() returns an absolute wss:// URL when running as an
      // embedded SDK on a third-party domain; falls back to window.location.host
      // when running inside the main app so existing behaviour is unchanged.
      const wsUrl = resolvePlatformWs('/ws/gemini-live');
      
      console.log('[GeminiStreamingClient] Connecting to:', wsUrl);
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[GeminiStreamingClient] Connected to voice proxy, waiting for server ready signal...');
        
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
              response_modalities: ["audio"], // ✅ Fixed to lowercase for v1beta protocol
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
          // entryPointAgentId + entryPointMetaPrompt power the Contextual Snap —
          // the proxy compiles the master system instruction server-side.
          sessionContext: {
            siteConfigId: business.id,
            ...(business.entryPointAgentId ? { agentId: business.entryPointAgentId } : {}),
            ...(business.entryPointMetaPrompt ? { metaPrompt: business.entryPointMetaPrompt } : {}),
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

    if (this.socket) { 
      try { this.socket.close(); } catch(e) {}
    }
    this.currentStream?.getTracks().forEach(t => t.stop());
    this.activeSources.forEach(source => { 
      try { source.stop(); } catch(e) {} 
    });
    this.activeSources.clear();
    this.workletNode?.disconnect();
    this.inputSource?.disconnect();
    
    // #region agent log
    // Log state before trying to close to debug the race condition
    console.log('[GeminiStreamingClient] Disconnecting audio contexts', {
        inputState: this.inputAudioContext?.state,
        outputState: this.outputAudioContext?.state
    });
    // #endregion
    
    // Check state BEFORE attempting to close to prevent InvalidStateError
    if (this.inputAudioContext?.state !== 'closed') {
      try {
        await this.inputAudioContext.close();
      } catch (e) {
        console.warn('[GeminiStreamingClient] Error closing inputAudioContext:', e);
      }
    }
    if (this.outputAudioContext?.state !== 'closed') {
      try {
        await this.outputAudioContext.close();
      } catch (e) {
        console.warn('[GeminiStreamingClient] Error closing outputAudioContext:', e);
      }
    }
    
    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.socket = null;
    this.connected = false;
    this.streaming = false;
    this.currentInputText = '';
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

  onVolumeChange(callback: (volume: number) => void): void {
    this.volumeCallback = callback;
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
    if (this.inputAudioContext && (this.inputAudioContext.state === 'suspended' || this.inputAudioContext.state === 'interrupted')) {
      await this.inputAudioContext.resume();
    }
    if (this.outputAudioContext && (this.outputAudioContext.state === 'suspended' || this.outputAudioContext.state === 'interrupted')) {
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
    
    try {
      // ✅ Step 1: Load the AudioWorklet module (runs on background thread)
      // Resolve the worklet URL against the platform so it loads from the correct
      // origin when the SDK is embedded on a third-party site.
      await this.inputAudioContext.audioWorklet.addModule(
        resolvePlatformUrl('/clear-voice-processor.js')
      );
      
      // ✅ Step 2: Create the source from microphone
      this.inputSource = this.inputAudioContext.createMediaStreamSource(this.currentStream);
      
      // ✅ Step 3: Create the AudioWorklet node
      this.workletNode = new AudioWorkletNode(this.inputAudioContext, 'clear-voice-processor');

      // ✅ Step 4: Listen for audio data from the background thread
      this.workletNode.port.onmessage = (event) => {
        const { audioData, volume } = event.data;
        
        // Update volume visualizer
        this.volumeCallback(volume);

        // Send audio to server if streaming
        if (this.streaming && this.socket && this.socket.readyState === WebSocket.OPEN) {
          const pcmBlob = this.createPcmBlob(audioData);
          this.socket.send(JSON.stringify({
            type: 'audio',
            data: pcmBlob.data
          }));
        }
      };

      // ✅ Step 5: Connect the nodes (Microphone → Worklet → Output)
      this.inputSource.connect(this.workletNode);
      this.workletNode.connect(this.inputAudioContext.destination);
      
      console.log('[GeminiStreamingClient] 🟢 AudioWorklet initialized: PTT Hard-Wired at 800ms');
    } catch (err) {
      console.error('[GeminiStreamingClient] ❌ AudioWorklet failed, ensure clear-voice-processor.js is in /public:', err);
      throw err;
    }
  }

  private async handleMessage(message: any) {
    // Handle server ready signal
    if (message.type === 'server_ready') {
      console.log('[GeminiStreamingClient] Server is ready! Starting audio processing...');
      this.setupAudioProcessing();
      this.connected = true;
      this.connectionCallback(true);
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
          
          // Specifically route 'request_manual_input' to the UI
          this.messageCallback({
            type: 'response',
            text: '', 
            metadata: {
              tool_type: toolCall.name === 'request_manual_input' ? 'manual_input' : toolCall.name,
              call_id: toolCall.call_id || toolCall.callId,
              ...toolCall.args
            }
          });
          continue; // Skip audio processing if it's a tool call
        }

        const inlineData = part.inline_data || part.inlineData;
        if (inlineData?.data) {
          console.log("[GeminiStreamingClient] Playing model audio chunk");
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

      this.messageCallback({
        type: 'response',
        text: '',
        metadata: {
          tool_type: message.tool_type,
          ui_action: message.ui_action,
          audio_cue: message.audio_cue,
          ...message.data,
        }
      });
    }
  }

  private playAudio(base64Data: string) {
    if (!this.outputAudioContext) return;
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
    source.connect(this.outputAudioContext.destination);
    const startTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;
    this.activeSources.add(source);
    source.onended = () => this.activeSources.delete(source);
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
      if (business.hours) params.set('hours', business.hours);
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
    return `
      Identity: You are ${agent.role} for "${business.name}".
      Personality: ${agent.personality}.
      
      BUSINESS CONTEXT:
      - Name: ${business.name}
      - Address: ${business.address}
      ${business.hours ? `- Hours: ${business.hours}` : ''}
      ${business.services ? `- Services: ${business.services.join(', ')}` : ''}

      CORE GOAL:
      ${agent.objectives.join(' ')}
      
      CONSTRAINTS:
      ${agent.constraints.join(' ')}
      
      Keep responses natural and concise.
    `;
  }
}
