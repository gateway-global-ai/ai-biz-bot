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
  private processor: ScriptProcessorNode | null = null;
  private socket: WebSocket | null = null;
  private currentStream: MediaStream | null = null;
  private connected = false;
  private streaming = false;
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
    
    // Build system instruction
    const systemInstruction = this.buildSystemInstruction(business, agent);

    try {
      // Use current host (Nginx will proxy to correct port)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/gemini-live`;
      
      console.log('[GeminiStreamingClient] Connecting to:', wsUrl);
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[GeminiStreamingClient] Connected to voice proxy, waiting for server ready signal...');
        
        // Send initial setup message - Using the correct model for bidiGenerateContent v1beta
        const setupMessage = {
          setup: {
            model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
            generation_config: {
              response_modalities: ["AUDIO"],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: 'Puck'
                  }
                }
              }
            },
            system_instruction: {
              parts: [{ text: systemInstruction }]
            }
          }
        };
        
        console.log('[GeminiStreamingClient] Sending setup with model:', setupMessage.setup.model);
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
        console.log('[GeminiStreamingClient] Connection closed', e);
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

  disconnect(): void {
    if (this.stopTimeout) window.clearTimeout(this.stopTimeout);
    if (this.socket) { 
      try { this.socket.close(); } catch(e) {}
    }
    this.currentStream?.getTracks().forEach(t => t.stop());
    this.activeSources.forEach(s => { try { s.stop(); } catch(e) {} });
    this.activeSources.clear();
    this.processor?.disconnect();
    this.inputSource?.disconnect();
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.socket = null;
    this.connected = false;
    this.streaming = false;
    this.currentInputText = '';
    this.connectionCallback(false);
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
      // Smart buffer: Base delay is 250ms for maximum responsiveness
      const baseDelay = this.config.bufferDelay || 250;
      
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

  private setupAudioProcessing() {
    if (!this.currentStream || !this.inputAudioContext) return;
    
    this.inputSource = this.inputAudioContext.createMediaStreamSource(this.currentStream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      
      // Scale RMS for visualizer (0.0 to 1.0 range usually, but can be higher)
      this.volumeCallback(rms);

      if (this.streaming && this.socket && this.socket.readyState === WebSocket.OPEN) {
        const pcmBlob = this.createPcmBlob(inputData);
        this.socket.send(JSON.stringify({
          type: 'audio',
          data: pcmBlob.data
        }));
      }
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
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
        const inlineData = part.inline_data || part.inlineData;
        if (inlineData?.data) {
          console.log("[GeminiStreamingClient] Playing model audio chunk");
          this.playAudio(inlineData.data);
        }
        if (part.text) {
          console.log("[GeminiStreamingClient] Model text response:", part.text);
          this.messageCallback({
            type: 'response',
            text: part.text
          });
        }
      }
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
