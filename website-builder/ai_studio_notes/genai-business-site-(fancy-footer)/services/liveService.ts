
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
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
  private sessionPromise: Promise<any> | null = null;
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

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    
    const isGenerated = businessData.name !== "BizFlow AI";
    const inventoryLabel = businessData.categoryType === 'menu' ? 'Menu' : (businessData.categoryType === 'services' ? 'Services' : 'Catalog');

    const systemInstruction = agentConfig.roleType === 'owner'
      ? `
        Identity: You are the "Talking Machine" Biz Bot for "${businessData.name}".
        Personality: ${agentConfig.discProfile}.
        
        CORE GOAL:
        ${isGenerated 
          ? `The website for ${businessData.name} is ALREADY BUILT and visible on the user's screen right now. 
             Acknowledge this! Greet the owner. Focus on business strategy, their ${inventoryLabel} (which contains ${JSON.stringify(businessData.menu)}), 
             and how they like the generated design. You are their strategic advisor.`
          : `Help the user build their business website by finding it on Google Maps. 
             If the user mentions their business, call "searchBusiness". 
             Once confirmed, call "triggerWebsiteGeneration".`
        }
        
        Keep responses brief, technical, and high-energy.
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
        Do NOT ask the user for their business name or offer to build a site.
        Greet visitors to "${businessData.name}" and help them with questions about services, hours, or products.
        NEVER refer them to "the website"—YOU are the interface. Give them prices and descriptions directly.
        
        Keep responses natural and concise.
      `;

    const tools = [];
    if (agentConfig.roleType === 'owner' && !isGenerated) {
        tools.push({
            functionDeclarations: [
                {
                    name: 'searchBusiness',
                    parameters: {
                        type: Type.OBJECT,
                        properties: { query: { type: Type.STRING } },
                        required: ['query']
                    }
                },
                {
                    name: 'triggerWebsiteGeneration',
                    parameters: {
                        type: Type.OBJECT,
                        properties: { placeId: { type: Type.STRING } },
                        required: ['placeId']
                    }
                }
            ]
        });
    }

    try {
      this.sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            console.log('Voice Session: Connected');
            this.setupAudioProcessing();
          },
          onmessage: (msg: LiveServerMessage) => this.handleMessage(msg),
          onclose: (e) => {
              console.log('Voice Session: Closed', e);
              this.isConnected = false;
          },
          onerror: (err: any) => {
            console.error('Voice Session: API Error', err);
            this.onError(err?.message || "Connection lost");
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName as any } },
          },
          tools: tools as any,
          systemInstruction: systemInstruction,
          inputAudioTranscription: {},
        },
      });

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

      if (this.isStreaming && this.sessionPromise) {
        const pcmBlob = this.createPcmBlob(inputData);
        this.sessionPromise.then((session) => {
            session.sendRealtimeInput({ media: pcmBlob });
        });
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
    if (!this.sessionPromise) return;
    const session = await this.sessionPromise;
    session.send({ parts: [{ text }] });
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
            this.sessionPromise?.then((session) => {
                session.sendToolResponse({
                    functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: result },
                    }
                });
            });
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
    if (this.sessionPromise) { 
      this.sessionPromise.then((s: any) => {
        try { s.close(); } catch(e) {}
      }); 
    }
    this.currentStream?.getTracks().forEach(t => t.stop());
    this.activeSources.forEach(s => { try { s.stop(); } catch(e) {} });
    this.activeSources.clear();
    this.processor?.disconnect();
    this.inputSource?.disconnect();
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.sessionPromise = null;
    this.isConnected = false;
    this.isStreaming = false;
    this.currentInputText = '';
  }
}
