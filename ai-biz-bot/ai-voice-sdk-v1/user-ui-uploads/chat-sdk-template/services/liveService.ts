import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { BusinessData, AgentConfig } from '../types';

// Helper functions for base64 encoding/decoding as required by the API
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
  private client: GoogleGenAI;
  private audioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sessionPromise: Promise<any> | null = null;
  private currentStream: MediaStream | null = null;
  private isConnected = false;
  
  // Audio playback queue management
  private nextStartTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  
  public onVolumeChange: (volume: number) => void = () => {};

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async connect(businessData: BusinessData, agentConfig: AgentConfig) {
    if (this.isConnected) return;

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    this.nextStartTime = 0;
    
    // Setup audio input
    this.currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const systemInstruction = `
      Identity: You are ${agentConfig.name}, a ${agentConfig.role} for "${businessData.name}".
      Personality/DISC Profile: ${agentConfig.discProfile}.
      
      Instructions:
      ${agentConfig.basePrompt}

      Business Details:
      - Address: ${businessData.address}
      - Description: ${businessData.description}
      - Hours: ${businessData.hours.join(', ')}
      
      Keep responses concise and conversational.
    `;

    const config = {
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: systemInstruction,
      },
    };

    this.sessionPromise = this.client.live.connect({
      ...config,
      callbacks: {
        onopen: () => {
          console.log('Live session opened');
          this.startAudioInput();
        },
        onmessage: (msg: LiveServerMessage) => this.handleMessage(msg),
        onclose: () => {
            console.log('Live session closed');
            this.disconnect();
        },
        onerror: (err) => console.error('Live session error', err),
      }
    });

    this.isConnected = true;
  }

  private startAudioInput() {
    if (!this.audioContext || !this.currentStream || !this.sessionPromise) return;

    // Separate context for input at 16kHz as per API requirements
    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.inputSource = inputCtx.createMediaStreamSource(this.currentStream);
    this.processor = inputCtx.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolumeChange(rms);

      const pcmBlob = this.createPcmBlob(inputData);
      
      this.sessionPromise?.then((session) => {
          session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(inputCtx.destination);
  }

  private handleMessage(message: LiveServerMessage) {
    // 1. Handle Interruption: Stop current audio and reset queue
    if (message.serverContent?.interrupted) {
      this.activeSources.forEach(source => {
        try {
          source.stop();
        } catch (e) {
          // Source might already be stopped
        }
      });
      this.activeSources.clear();
      this.nextStartTime = this.audioContext?.currentTime || 0;
      return;
    }

    // 2. Process Audio Parts
    const parts = message.serverContent?.modelTurn?.parts;
    if (parts && this.audioContext) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          this.playAudio(part.inlineData.data);
        }
      }
    }
  }

  private playAudio(base64Data: string) {
    if (!this.audioContext) return;
    
    const bytes = decode(base64Data);
    const dataView = new DataView(bytes.buffer);
    const frameCount = bytes.length / 2; // 16-bit PCM
    const audioBuffer = this.audioContext.createBuffer(1, frameCount, 24000);
    const channelData = audioBuffer.getChannelData(0);

    for (let i = 0; i < frameCount; i++) {
      // API returns little-endian 16-bit PCM
      const int16 = dataView.getInt16(i * 2, true);
      channelData[i] = int16 / 32768.0;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    // Precise scheduling for gapless playback
    const startTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
    source.start(startTime);
    
    this.nextStartTime = startTime + audioBuffer.duration;
    this.activeSources.add(source);
    
    source.onended = () => {
      this.activeSources.delete(source);
    };
  }

  private createPcmBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = Math.max(-1, Math.min(1, data[i])) * 32767;
    }
    
    const base64 = encode(new Uint8Array(int16.buffer));

    return {
      data: base64,
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  disconnect() {
    if (this.sessionPromise) {
        this.sessionPromise.then((s: any) => s.close());
    }
    
    this.currentStream?.getTracks().forEach(t => t.stop());
    
    this.activeSources.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    this.activeSources.clear();

    this.processor?.disconnect();
    this.inputSource?.disconnect();
    this.audioContext?.close();
    
    this.sessionPromise = null;
    this.audioContext = null;
    this.isConnected = false;
    this.nextStartTime = 0;
  }
}