import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { BusinessData } from '../types';

export class LiveVoiceClient {
  private client: GoogleGenAI;
  private audioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private session: any = null;
  private currentStream: MediaStream | null = null;
  private isConnected = false;
  
  public onVolumeChange: (volume: number) => void = () => {};

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async connect(businessData: BusinessData) {
    if (this.isConnected) return;

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Setup audio input
    this.currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const config = {
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: `You are a friendly and knowledgeable AI concierge for "${businessData.name}". 
        Your role is to greet visitors to the website verbally and answer their questions about the business.
        Business Details:
        - Address: ${businessData.address}
        - Description: ${businessData.description}
        - Hours: ${businessData.hours.join(', ')}
        
        Keep responses concise and conversational.`,
      },
    };

    const sessionPromise = this.client.live.connect({
      ...config,
      callbacks: {
        onopen: () => {
          console.log('Live session opened');
          this.startAudioInput(sessionPromise);
        },
        onmessage: (msg: LiveServerMessage) => this.handleMessage(msg),
        onclose: () => {
            console.log('Live session closed');
            this.disconnect();
        },
        onerror: (err) => console.error('Live session error', err),
      }
    });

    this.session = sessionPromise;
    this.isConnected = true;
  }

  private startAudioInput(sessionPromise: Promise<any>) {
    if (!this.audioContext || !this.currentStream) return;

    // Use specific sample rate for input to match typical mic requirements, then downsample/encode
    // Actually, we can just send the raw PCM and let the server handle or encode to the format expected.
    // The previous example showed 16kHz input. Let's create a separate 16k context for recording if needed
    // or just re-sample. Simplest is to follow the example's creating a blob.
    
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
      
      sessionPromise.then((session) => {
          session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(inputCtx.destination);
  }

  private handleMessage(message: LiveServerMessage) {
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && this.audioContext) {
      this.playAudio(audioData);
    }
  }

  private async playAudio(base64Data: string) {
    if (!this.audioContext) return;
    
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert PCM to AudioBuffer
    // The model returns raw PCM 24kHz usually.
    // We need to implement a simple PCM decoder or use the AudioContext decodeAudioData if it was a file,
    // but for raw PCM we construct the buffer manually.
    
    const float32Data = new Float32Array(bytes.length / 2);
    const dataView = new DataView(bytes.buffer);
    
    for (let i = 0; i < bytes.length / 2; i++) {
        // Little endian 16-bit PCM
        const int16 = dataView.getInt16(i * 2, true); 
        float32Data[i] = int16 / 32768.0;
    }

    const buffer = this.audioContext.createBuffer(1, float32Data.length, 24000);
    buffer.getChannelData(0).set(float32Data);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start();
  }

  private createPcmBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = Math.max(-1, Math.min(1, data[i])) * 32768;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    return {
      data: base64,
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  disconnect() {
    if (this.session) {
        this.session.then((s: any) => s.close());
    }
    this.currentStream?.getTracks().forEach(t => t.stop());
    this.processor?.disconnect();
    this.inputSource?.disconnect();
    this.audioContext?.close();
    
    this.session = null;
    this.audioContext = null;
    this.isConnected = false;
  }
}
