
import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, PhoneOff, Activity, Volume2, ShieldCheck } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { base64ToUint8Array, float32ToInt16, arrayBufferToBase64, pcmToAudioBuffer } from '../utils/audio';

interface LiveAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPhoneNumber?: string | null;
}

// Configuration
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';
const SAMPLE_RATE_INPUT = 16000;
const SAMPLE_RATE_OUTPUT = 24000;

export const LiveAgentModal: React.FC<LiveAgentModalProps> = ({ isOpen, onClose, userPhoneNumber }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Refs for Audio Contexts and Session
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourceNodesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize Session
  useEffect(() => {
    if (!isOpen) {
      cleanup();
      return;
    }

    startSession();

    return () => {
      cleanup();
    };
  }, [isOpen]);

  const startSession = async () => {
    try {
      setStatus('connecting');
      
      // 1. Setup Audio Output Context
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: SAMPLE_RATE_OUTPUT });
      
      // 2. Setup Audio Input (Microphone)
      inputContextRef.current = new AudioContextClass({ sampleRate: SAMPLE_RATE_INPUT });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      let systemInstruction = `You are the "NurseNest Voice Agent", a specialized travel assistant for traveling nurses. 
          Your goal is to help nurses find safe, comfortable, and affordable extended-stay accommodations near their assigned hospitals.
          
          Key Behaviors:
          1. Be empathetic and professional. Nurses are tired and busy.
          2. Ask for their assigned hospital, travel dates, and budget.
          3. Emphasize "quiet," "blackout curtains," and "proximity to work" as key features.
          4. If they ask to book, tell them you can help find the details but they should use the chat interface to confirm the reservation.
          
          Start by saying: "Hi, thanks for calling NurseNest. I'm your housing coordinator. What hospital is your next assignment at?"`;

      if (userPhoneNumber) {
          systemInstruction += `\n\nNote: The user is calling from a verified line (${userPhoneNumber}). You can acknowledge that you have their profile pulled up.`;
      }

      // 3. Connect to Gemini Live
      const session = await ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } // Friendly, professional voice
          },
          systemInstruction: systemInstruction
        },
        callbacks: {
          onopen: () => {
            setStatus('connected');
            processMicrophoneInput(stream);
          },
          onmessage: async (message: any) => {
            // Handle Audio Output
            const base64Audio = message?.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
               playAudioChunk(base64Audio);
            }

            // Handle Interruption (User spoke while model was speaking)
            if (message?.serverContent?.interrupted) {
              stopAllAudio();
            }
          },
          onclose: () => {
            console.log("Session closed");
            if (status !== 'disconnected') setStatus('disconnected');
          },
          onerror: (err) => {
            console.error("Session error:", err);
            setStatus('error');
          }
        }
      });

      sessionRef.current = session;

    } catch (err) {
      console.error("Failed to start session:", err);
      setStatus('error');
    }
  };

  const processMicrophoneInput = (stream: MediaStream) => {
    if (!inputContextRef.current) return;

    const source = inputContextRef.current.createMediaStreamSource(stream);
    // Buffer size 4096 gives a good balance of latency and performance
    const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (isMuted) return;

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Simple volume visualization logic
      let sum = 0;
      for(let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
      const rms = Math.sqrt(sum / inputData.length);
      setVolumeLevel(Math.min(100, rms * 500)); // Scale for UI

      // Convert Float32 to Int16 PCM
      const pcmData = float32ToInt16(inputData);
      
      // Encode to Base64
      const base64Data = arrayBufferToBase64(pcmData.buffer);

      // Send to Gemini
      sessionRef.current?.sendRealtimeInput({
        media: {
          mimeType: "audio/pcm;rate=16000",
          data: base64Data
        }
      });
    };

    source.connect(processor);
    processor.connect(inputContextRef.current.destination);
  };

  const playAudioChunk = (base64Audio: string) => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const pcmData = base64ToUint8Array(base64Audio);
    const audioBuffer = pcmToAudioBuffer(pcmData, ctx, SAMPLE_RATE_OUTPUT);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    // Schedule playback to ensure gapless audio
    // Ensure we don't schedule in the past
    const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
    source.start(startTime);
    nextStartTimeRef.current = startTime + audioBuffer.duration;

    sourceNodesRef.current.add(source);
    source.onended = () => {
      sourceNodesRef.current.delete(source);
    };
  };

  const stopAllAudio = () => {
    sourceNodesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourceNodesRef.current.clear();
    // Reset timing cursor
    if (audioContextRef.current) {
        nextStartTimeRef.current = audioContextRef.current.currentTime;
    }
  };

  const cleanup = () => {
    if (sessionRef.current) {
        // There is no explicit .close() on the session object in some versions, 
        // but we can stop sending data.
        // If available: sessionRef.current.close();
        sessionRef.current = null;
    }
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    if (inputContextRef.current) {
        inputContextRef.current.close();
        inputContextRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    setStatus('disconnected');
    setVolumeLevel(0);
  };

  const handleToggleMute = () => {
      setIsMuted(prev => !prev);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      
      {/* Top Bar */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-white/80">
        <div className="flex items-center gap-2">
            <Activity className="text-emerald-400" size={20} />
            <span className="font-semibold tracking-wide text-sm">NURSENEST VOICE AGENT</span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
        </button>
      </div>

      {/* Main Visualizer */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
        
        {/* Pulsing Orb */}
        <div className="relative w-48 h-48 flex items-center justify-center mb-12">
            {/* Outer Glow */}
            <div className={`absolute inset-0 rounded-full bg-indigo-500 blur-3xl transition-opacity duration-500 ${
                status === 'connected' ? 'opacity-30' : 'opacity-0'
            }`} />
            
            {/* Core Circle */}
            <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                status === 'error' ? 'bg-red-500/20 border-2 border-red-500' :
                status === 'connecting' ? 'bg-slate-700 border border-slate-600' :
                'bg-gradient-to-br from-indigo-500 to-purple-600 border border-indigo-400/50'
            }`}>
                 {status === 'connecting' && (
                     <div className="w-full h-full border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin absolute" />
                 )}
                 
                 {/* Volume Reaction */}
                 {status === 'connected' && (
                     <div 
                        className="absolute inset-0 bg-white/20 rounded-full transition-transform duration-75"
                        style={{ transform: `scale(${1 + volumeLevel / 100})` }}
                     />
                 )}

                 <Volume2 size={40} className={`text-white z-10 ${status === 'connected' ? 'opacity-100' : 'opacity-50'}`} />
            </div>
        </div>

        {/* Status Text */}
        <h2 className="text-2xl font-bold text-white mb-2 text-center">
            {status === 'connecting' ? 'Connecting to Agent...' : 
             status === 'error' ? 'Connection Failed' : 
             'NurseNest Housing Coordinator'}
        </h2>
        <p className="text-slate-400 text-center mb-12 text-sm max-w-xs">
            {status === 'connected' ? "I'm listening. Tell me about your next assignment." : "Establishing secure voice line..."}
        </p>

        {/* Controls */}
        <div className="flex items-center gap-6">
            <button 
                onClick={handleToggleMute}
                className={`p-6 rounded-full transition-all duration-200 ${
                    isMuted 
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
            >
                {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
            </button>
            
            <button 
                onClick={onClose}
                className="p-6 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all hover:scale-105 active:scale-95"
            >
                <PhoneOff size={28} />
            </button>
        </div>
      </div>

      {/* Footer / Twilio Fallback */}
      <div className="absolute bottom-6 text-center w-full px-4">
          {userPhoneNumber ? (
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-2">
                 <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                    <ShieldCheck size={12} />
                    <span className="text-xs font-semibold tracking-wider uppercase">Account Linked</span>
                 </div>
                 <p className="text-xs text-slate-400">
                    If you call <span className="text-white font-mono">702-819-7789</span> from <span className="text-white font-mono">{userPhoneNumber}</span>,<br/>our system will instantly recognize your itinerary.
                 </p>
              </div>
          ) : (
             <div className="flex flex-col items-center">
                 <p className="text-xs text-slate-500 mb-1">Need to speak to a human via phone?</p>
                 <a href="tel:702-819-7789" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1">
                    Call our support line: 702-819-7789
                 </a>
             </div>
          )}
      </div>

    </div>
  );
};
