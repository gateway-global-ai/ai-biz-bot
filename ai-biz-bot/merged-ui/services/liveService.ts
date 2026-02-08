
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { BusinessData, AgentConfig } from '../types';

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
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sessionPromise: Promise<any> | null = null;
  private currentStream: MediaStream | null = null;
  private isConnected = false;
  private isStreaming = false;
  private stopTimeout: number | null = null;
  /** Timeouts that reset output volume after each TTS chunk; cleared in disconnect() to avoid stale state updates. */
  private outputVolumeTimeouts = new Set<number>();

  private nextStartTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  
  public onVolumeChange: (volume: number) => void = () => {};
  /** Called when TTS (model) audio is playing, so the UI can drive the visualizer for incoming AI voice. */
  public onOutputVolumeChange: (volume: number) => void = () => {};
  public onTranscriptionUpdate: (text: string, isFinal: boolean) => void = () => {};

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async resumeAudio() {
    if (this.inputAudioContext && this.inputAudioContext.state === 'suspended') {
      await this.inputAudioContext.resume();
    }
    if (this.outputAudioContext && this.outputAudioContext.state === 'suspended') {
      await this.outputAudioContext.resume();
    }
  }

  async connect(businessData: BusinessData, agentConfig: AgentConfig, voiceName: string = 'Zephyr') {
    if (this.isConnected) return;

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
      throw new Error("Microphone access is required for the voice concierge.");
    }

    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    this.nextStartTime = 0;
    
    const systemInstruction = `
      Identity: You are ${agentConfig.name}, a ${agentConfig.role} for "${businessData.name}".
      Context: This is a live voice interaction via Push-to-Talk.
      Instruction: Keep responses brief and natural. 
    `;

    let openResolve: () => void;
    let openReject: (err: unknown) => void;
    const openPromise = new Promise<void>((resolve, reject) => {
      openResolve = resolve;
      openReject = reject;
    });

    this.sessionPromise = this.client.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          console.log('Live session opened');
          this.isConnected = true;
          this.setupAudioProcessing();
          openResolve!();
        },
        onmessage: (msg: LiveServerMessage) => this.handleMessage(msg),
        onclose: () => {
          console.log('Live session closed');
          this.disconnect();
        },
        onerror: (err) => {
          console.error('Live session error', err);
          openReject!(err);
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
        },
        systemInstruction: systemInstruction,
        inputAudioTranscription: {},
      },
    });

    await openPromise;
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
      // Trailing buffer: continue streaming for 800ms after release to catch the end of audio processing
      this.stopTimeout = window.setTimeout(() => {
        this.isStreaming = false;
        this.stopTimeout = null;
      }, 800);
    }
  }

  public async sendText(text: string) {
    if (!this.sessionPromise) return;
    const session = await this.sessionPromise;
    session.send({
      content: {
        role: 'user',
        parts: [{ text }]
      }
    });
  }

  private handleMessage(message: LiveServerMessage) {
    if (message.serverContent?.interrupted) {
      this.activeSources.forEach(source => { try { source.stop(); } catch (e) {} });
      this.activeSources.clear();
      this.nextStartTime = this.outputAudioContext?.currentTime || 0;
      return;
    }

    if (message.serverContent?.inputTranscription) {
      const { text, isFinal } = message.serverContent.inputTranscription;
      if (text) {
        this.onTranscriptionUpdate(text, isFinal || false);
      }
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

    // Drive incoming-voice visualizer: compute RMS of this chunk and report it; decay after playback
    let sum = 0;
    for (let i = 0; i < frameCount; i++) {
      const s = channelData[i];
      sum += s * s;
    }
    const rms = Math.sqrt(sum / frameCount);
    this.onOutputVolumeChange(rms);
    const durationMs = (audioBuffer.duration * 1000) | 0;
    const timeoutId = window.setTimeout(() => {
      this.outputVolumeTimeouts.delete(timeoutId);
      if (this.isConnected) this.onOutputVolumeChange(0);
    }, durationMs);
    this.outputVolumeTimeouts.add(timeoutId);

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
    if (this.stopTimeout) {
      window.clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }
    this.outputVolumeTimeouts.forEach(id => window.clearTimeout(id));
    this.outputVolumeTimeouts.clear();
    if (this.sessionPromise) { this.sessionPromise.then((s: any) => s.close()); }
    this.currentStream?.getTracks().forEach(t => t.stop());
    this.activeSources.forEach(s => { try { s.stop(); } catch(e) {} });
    this.activeSources.clear();
    this.processor?.disconnect();
    this.inputSource?.disconnect();
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.sessionPromise = null;
    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.isConnected = false;
    this.isStreaming = false;
  }
}
