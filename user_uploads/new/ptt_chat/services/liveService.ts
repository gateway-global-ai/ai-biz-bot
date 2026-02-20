import { LiveServerMessage, Modality, Type } from '@google/genai';
import { BusinessData } from '../types';

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

export class LiveVoiceClient {
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private socket: WebSocket | null = null;
  private currentStream: MediaStream | null = null;
  private isConnected = false;
  private isStreaming = false;
  private stopTimeout: number | null = null;
  
  private nextStartTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  private currentInputText = '';
  
  public onVolumeChange: (volume: number) => void = () => {};
  public onTranscriptionUpdate: (text: string, isFinal: boolean) => void = () => {};
  public onToolCall: (call: any) => Promise<any> = async () => ({});
  public onError: (message: string) => void = () => {};

  constructor() {}

  async resumeAudio() {
    if (this.inputAudioContext && this.inputAudioContext.state === 'suspended') {
      await this.inputAudioContext.resume();
    }
    if (this.outputAudioContext && this.outputAudioContext.state === 'suspended') {
      await this.outputAudioContext.resume();
    }
  }

  async connect(businessData: BusinessData, agentConfig: any, voiceName: string = 'Zephyr', userContext: string = '') {
    if (this.isConnected) {
        this.disconnect();
    }

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
      this.onError("Microphone access is required for the voice concierge.");
      throw new Error("Microphone access is required.");
    }

    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    this.nextStartTime = 0;
    this.currentInputText = '';
    
    const isLandingPage = businessData.name === "BizFlow AI";
    const inventoryLabel = businessData.categoryType === 'menu' ? 'Menu' : (businessData.categoryType === 'services' ? 'Services' : 'Catalog');

    const systemInstruction = agentConfig.roleType === 'owner'
      ? `
        Identity: You are the "Talking Machine" Biz Bot, a visionary strategic advisor.
        Personality: ${agentConfig.discProfile}. High-energy, exciting, and technically authoritative.
        
        PHASE: ${isLandingPage ? 'DISCOVERY' : 'INTELLIGENCE'}

        CORE MESSAGING:
        Clarify that we don't just "build websites" in the traditional sense. We build the **Foundational Website Architecture**. 
        This foundation gives users everything they need to kickstart their online presence using state-of-the-art neural technology.
        Our key value is integrating the **"Source of Truth"**—the real-time Google Places business data—directly into their site.
        This provides real-time features like live reviews and deep data analysis to help them make superior business decisions.

        CORE GOAL:
        ${isLandingPage 
          ? `The user is on the home page. Greet them with intense excitement! 
             Explain that they are witnessing the future. Tell them to find their business in the search box so we can neural-link their brand.
             Get them hyped about seeing their "Source of Truth" data analyzed in real-time.`
          : `The business "${businessData.name}" has been SUCCESSFULLY DECRYPTED. 
             CRITICAL: DO NOT tell them to search for a business—the search is already finished!
             Celebrate the captured data. Highlight their ${businessData.rating} star reputation and the live reviews we've integrated.
             Analyze their ${businessData.menu?.length || 0} categories briefly and encourage them to click "Enter Generated World" to see their new foundational architecture.`
        }
        
        Keep responses brief, punchy, and high-tech.
      `
      : `
        Identity: You are ${agentConfig.name}, the AI Concierge for "${businessData.name}".
        Personality: ${agentConfig.discProfile}.
        
        BUSINESS CONTEXT:
        - Name: ${businessData.name}
        - Address: ${businessData.address}
        - Description: ${businessData.description}
        - Inventory (${inventoryLabel}): ${JSON.stringify(businessData.menu)}

        CORE GOAL:
        You are representing "${businessData.name}". The website is ALREADY BUILT.
        Do NOT ask for their business name or offer to build a site.
        Greet visitors to "${businessData.name}" and help them with specific questions.
        YOU are the interface. Give them prices and descriptions directly.
        
        Keep responses natural and concise.
      `;

    const tools = [];
    if (agentConfig.roleType === 'owner' && isLandingPage) {
        tools.push({
            functionDeclarations: [
                {
                    name: 'searchBusiness',
                    parameters: {
                        type: Type.OBJECT,
                        properties: { query: { type: Type.STRING } },
                        required: ['query']
                    }
                }
            ]
        });
    }

    try {
      const host = window.location.hostname === 'localhost' ? 'localhost:5000' : window.location.host;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${host}/ws/gemini-live`;
      
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('Voice Proxy: Connected');
        
        // Send initial setup message
        const setupMessage = {
          setup: {
            model: process.env.GEMINI_MODEL_ID || 'models/gemini-2.5-flash-native-audio-preview-12-2025',
            generation_config: {
              response_modalities: ["audio"],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: voiceName
                  }
                }
              }
            },
            system_instruction: {
              parts: [{ text: systemInstruction }]
            },
            tools: tools.length > 0 ? tools : undefined
          }
        };
        
        this.socket?.send(JSON.stringify(setupMessage));
        this.setupAudioProcessing();
      };

      this.socket.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          await this.handleMessage(msg);
        } catch (e) {
          console.error("Error parsing message:", e);
        }
      };

      this.socket.onclose = (e) => {
        console.log('Voice Proxy: Closed', e);
        this.isConnected = false;
      };

      this.socket.onerror = (err) => {
        console.error('Voice Proxy: Error', err);
        this.onError("Connection lost");
      };

      this.isConnected = true;
    } catch (err: any) {
      this.isConnected = false;
      this.onError(err?.message || "Failed to connect");
      throw err;
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
      this.onVolumeChange(rms);

      if (this.isStreaming && this.socket && this.socket.readyState === WebSocket.OPEN) {
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

  public setStreaming(enabled: boolean) {
    if (this.stopTimeout) {
      window.clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }

    if (enabled) {
      this.isStreaming = true;
      this.resumeAudio();
    } else {
      this.stopTimeout = window.setTimeout(() => {
        this.isStreaming = false;
        this.stopTimeout = null;
        if (this.currentInputText.trim()) {
           this.onTranscriptionUpdate(this.currentInputText, true);
           this.currentInputText = '';
        }
      }, 2000);
    }
  }

  public async sendText(text: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({
      realtime_input: {
        parts: [{ text }]
      }
    }));
  }

  private async handleMessage(message: LiveServerMessage) {
    if (message.serverContent?.interrupted) {
      this.activeSources.forEach(source => { try { source.stop(); } catch (e) {} });
      this.activeSources.clear();
      this.nextStartTime = this.outputAudioContext?.currentTime || 0;
      this.currentInputText = '';
      return;
    }

    if (message.toolCall) {
        for (const fc of message.toolCall.functionCalls) {
            const result = await this.onToolCall(fc);
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    tool_response: {
                        function_responses: [{
                            id: fc.id,
                            name: fc.name,
                            response: { result: result },
                        }]
                    }
                }));
            }
        }
    }

    if (message.serverContent?.inputTranscription) {
      const { text } = message.serverContent.inputTranscription;
      if (text) {
        this.currentInputText = text;
        this.onTranscriptionUpdate(this.currentInputText, false);
      }
    }
    
    if (message.serverContent?.turnComplete) {
       this.onTranscriptionUpdate(this.currentInputText, true);
       this.currentInputText = '';
    }

    const parts = message.serverContent?.modelTurn?.parts;
    if (parts && this.outputAudioContext) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          this.playAudio(part.inlineData.data);
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

  disconnect() {
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
    this.isConnected = false;
    this.isStreaming = false;
    this.currentInputText = '';
  }
}