/**
 * RestTransactionalClient - Standard Tier (PTT)
 * 
 * Cost-efficient Push-to-Talk voice client using REST API for audio transcription and response.
 * Records audio blobs and uploads to server for processing with enriched context (emotion, sentiment, DISC).
 * 
 * Key Features:
 * - User-controlled recording (no VAD overhead)
 * - Server-side audio analysis for emotional intelligence
 * - 18-90% cost savings vs. streaming
 * - <2s end-to-end latency (configurable buffer)
 */

import { IVoiceClient } from './IVoiceClient';
import { VoiceMessage, VoiceConfig, BusinessContext, AgentConfig } from '@/types/voice';

export class RestTransactionalClient implements IVoiceClient {
  private config: VoiceConfig;
  private business: BusinessContext | null = null;
  private agent: AgentConfig | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recording = false;
  private connected = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private volumeMonitorInterval: number | null = null;
  
  // Callbacks
  private messageCallback: (message: VoiceMessage) => void = () => {};
  private volumeCallback: (volume: number) => void = () => {};
  private connectionCallback: (connected: boolean) => void = () => {};

  constructor(config: VoiceConfig) {
    this.config = config;
  }

  async connect(business: BusinessContext, agent: AgentConfig, config: VoiceConfig): Promise<void> {
    this.config = config;
    this.business = business;
    this.agent = agent;
    
    // Test microphone access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup audio context for volume monitoring
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);
      
      // Stop the test stream (we'll create new ones for each recording)
      stream.getTracks().forEach(track => track.stop());
      
      this.connected = true;
      this.connectionCallback(true);
      
      console.log('[RestTransactionalClient] Connected and ready');
    } catch (err) {
      console.error("[RestTransactionalClient] Microphone access denied:", err);
      this.messageCallback({
        type: 'error',
        text: 'Microphone access is required for voice interaction.'
      });
      throw new Error("Microphone access is required.");
    }
  }

  disconnect(): void {
    if (this.recording) {
      this.stopRecording();
    }
    
    if (this.volumeMonitorInterval) {
      clearInterval(this.volumeMonitorInterval);
      this.volumeMonitorInterval = null;
    }
    
    this.microphone?.disconnect();
    this.audioContext?.close();
    this.connected = false;
    this.connectionCallback(false);
    
    console.log('[RestTransactionalClient] Disconnected');
  }

  // IVoiceClient interface methods - ABSTRACTED for PTT
  startSession(): void {
    // For transactional mode: start recording blob
    this.startRecording();
  }

  endSession(): void {
    // For transactional mode: stop recording and upload blob
    this.stopRecording();
  }

  sendText(text: string): void {
    // Send text message via REST API
    this.sendTextMessage(text);
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

  private async startRecording() {
    if (this.recording) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        this.uploadAudio();
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Setup volume monitoring
      if (this.audioContext && this.analyser) {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        this.volumeMonitorInterval = window.setInterval(() => {
          if (!this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength / 255; // Normalize to 0-1
          this.volumeCallback(average);
        }, 100);
      }
      
      this.mediaRecorder.start();
      this.recording = true;
      
      console.log('[RestTransactionalClient] Recording started');
    } catch (err) {
      console.error('[RestTransactionalClient] Failed to start recording:', err);
      this.messageCallback({
        type: 'error',
        text: 'Failed to start recording. Please check microphone permissions.'
      });
    }
  }

  private stopRecording() {
    if (!this.recording || !this.mediaRecorder) return;
    
    if (this.volumeMonitorInterval) {
      clearInterval(this.volumeMonitorInterval);
      this.volumeMonitorInterval = null;
    }
    
    this.volumeCallback(0); // Reset visualizer
    
    this.mediaRecorder.stop();
    this.recording = false;
    
    console.log('[RestTransactionalClient] Recording stopped');
  }

  private async uploadAudio() {
    if (this.audioChunks.length === 0) {
      console.warn('[RestTransactionalClient] No audio chunks to upload');
      return;
    }
    
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
    
    console.log('[RestTransactionalClient] Uploading audio blob:', audioBlob.size, 'bytes');
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('config', JSON.stringify(this.config));
      formData.append('business', JSON.stringify(this.business));
      formData.append('agent', JSON.stringify(this.agent));
      
      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log('[RestTransactionalClient] Server response:', data);
      
      // Emit transcription
      if (data.transcript) {
        this.messageCallback({
          type: 'transcription',
          text: data.transcript,
          isFinal: true
        });
      }
      
      // Emit AI response with metadata
      if (data.response) {
        this.messageCallback({
          type: 'response',
          text: data.response,
          metadata: data.metadata // Includes emotion, sentiment, DISC
        });
      }
      
    } catch (error: any) {
      console.error('[RestTransactionalClient] Upload failed:', error);
      this.messageCallback({
        type: 'error',
        text: 'Failed to process audio. Please try again.'
      });
    }
  }

  private async sendTextMessage(text: string) {
    if (!this.business || !this.agent) {
      console.warn('[RestTransactionalClient] Cannot send text: not connected');
      return;
    }
    
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text, 
          business: this.business, 
          agent: this.agent 
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Emit user message
      this.messageCallback({
        type: 'transcription',
        text: text,
        isFinal: true
      });
      
      // Emit AI response
      if (data.response) {
        this.messageCallback({
          type: 'response',
          text: data.response
        });
      }
      
    } catch (error: any) {
      console.error('[RestTransactionalClient] Text send failed:', error);
      this.messageCallback({
        type: 'error',
        text: 'Failed to send message. Please try again.'
      });
    }
  }
}
