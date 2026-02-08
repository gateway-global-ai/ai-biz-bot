import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { LogEntry, ChatMessage } from '../types';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';
import { normalizeVoiceForLiveApi } from '../config/modelVoiceConfig';

// Input audio sample rate for the model
const INPUT_SAMPLE_RATE = 16000;
// Output audio sample rate from the model
const OUTPUT_SAMPLE_RATE = 24000;

export interface LiveConfig {
  temperature: number;
  topP: number;
  topK: number;
}

export const useLiveApi = (model: string, voice: string, systemInstruction: string, config: LiveConfig) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isError, setIsError] = useState(false);
  const [volume, setVolume] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  
  // Refs for audio context and processing
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Refs for managing transcription assembly
  const currentInputText = useRef('');
  const currentOutputText = useRef('');
  
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs((prev) => [
      { timestamp: new Date().toLocaleTimeString(), type, message },
      ...prev.slice(0, 99)
    ]);
  }, []);

  const sendText = useCallback((text: string) => {
    if (sessionRef.current && text.trim()) {
      addLog('message', `Committed turn: ${text}`);
      sessionRef.current.send({ parts: [{ text }] });
    }
  }, [addLog]);

  const disconnect = useCallback(() => {
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    if (sessionRef.current && typeof sessionRef.current.close === 'function') {
        sessionRef.current.close();
    }
    sessionRef.current = null;

    setIsConnected(false);
    addLog('info', 'Disconnected from Gemini Live API');
    setVolume(0);
  }, [addLog]);

  const connect = useCallback(async () => {
    if (isConnected) return;
    setIsError(false);
    setChatHistory([]);
    currentInputText.current = '';
    currentOutputText.current = '';

    try {
      addLog('info', 'Initializing audio contexts...');
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      
      outputNodeRef.current = outputAudioContextRef.current.createGain();
      outputNodeRef.current.connect(outputAudioContextRef.current.destination);

      nextStartTimeRef.current = 0;

      addLog('info', 'Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      addLog('info', `Connecting to ${model}...`);

      const sessionPromise = ai.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            addLog('info', 'Connection established.');
            setIsConnected(true);

            if (!inputAudioContextRef.current || !streamRef.current) return;

            const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Simple volume calculation
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(1, rms * 5));

              // ONLY send audio if NOT muted
              if (!isMutedRef.current) {
                const pcmBlob = createBlob(inputData);
                sessionPromise.then(session => {
                   session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
            
            inputSourceRef.current = source;
            processorRef.current = scriptProcessor;
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle User Input Transcription
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              if (text) {
                currentInputText.current += text;
                setChatHistory(prev => {
                  const latest = prev[prev.length - 1];
                  if (latest && latest.role === 'user' && latest.isStreaming) {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1] = { 
                      ...latest, 
                      text: currentInputText.current 
                    };
                    return newHistory;
                  }
                  return [...prev, { 
                    role: 'user', 
                    text: currentInputText.current, 
                    timestamp: new Date().toLocaleTimeString(), 
                    isStreaming: true 
                  }];
                });
              }
            }

            // Handle Model Output Transcription
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              if (text) {
                currentOutputText.current += text;
                setChatHistory(prev => {
                  const latest = prev[prev.length - 1];
                  if (latest && latest.role === 'model' && latest.isStreaming) {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1] = { 
                      ...latest, 
                      text: currentOutputText.current 
                    };
                    return newHistory;
                  }
                  return [...prev, { 
                    role: 'model', 
                    text: currentOutputText.current, 
                    timestamp: new Date().toLocaleTimeString(), 
                    isStreaming: true 
                  }];
                });
              }
            }

            // Handle Turn Completion
            if (message.serverContent?.turnComplete) {
              setChatHistory(prev => prev.map(m => ({ ...m, isStreaming: false })));
              currentInputText.current = '';
              currentOutputText.current = '';
              addLog('info', 'Turn finalized.');
            }

            // Handle Audio Data
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current && outputNodeRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                ctx,
                OUTPUT_SAMPLE_RATE,
                1
              );

              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNodeRef.current);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
              addLog('info', 'Model interrupted.');
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('WebSocket Error:', e);
            addLog('error', 'Communication error with Gemini service.');
            setIsError(true);
            disconnect();
          },
          onclose: (e) => {
            addLog('info', `Connection closed: ${e.reason || 'No reason provided'}`);
            disconnect();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {}, 
          outputAudioTranscription: {}, 
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: normalizeVoiceForLiveApi(voice) } }
          },
          systemInstruction: systemInstruction,
          generationConfig: {
            temperature: config.temperature,
            topP: config.topP,
            topK: config.topK,
          }
        }
      });

      sessionPromise.then(session => {
        sessionRef.current = session;
      });

    } catch (err) {
      console.error('Connect Error:', err);
      addLog('error', `Failed to initialize session: ${err instanceof Error ? err.message : String(err)}`);
      setIsError(true);
      disconnect();
    }
  }, [model, voice, systemInstruction, config.temperature, config.topP, config.topK, isConnected, addLog, disconnect]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isError,
    volume,
    logs,
    chatHistory,
    isMuted,
    setIsMuted,
    connect,
    disconnect,
    sendText,
  };
};