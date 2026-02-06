
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { DiscProfile, ArchProfile, BrandAwareness, Message, AgentConfig, SavedSession, VisualContext } from './types';
import { INITIAL_CONFIG, COLORS } from './constants';
import { Slider } from './components/Slider';
import { DiscRadar, ArchBreakdown } from './components/Charts';
import { AIBrowser } from './components/AIBrowser';
import { TelephonyPanel } from './components/TelephonyPanel';
import { DeveloperPage } from './components/DeveloperPage';
import { BusinessPage } from './components/BusinessPage';
import { NeuralTelemetryDashboard } from './components/NeuralTelemetryDashboard';
import { generateAgentResponse, generatePersonaFromPrompt } from './services/geminiService';
import { 
  Settings, MessageSquare, BrainCircuit, Activity, Send, Trash2, Cpu, Globe, MapPin, 
  Clock, Search, ShieldAlert, BadgeCheck, X, Sparkles, Loader2, Mic, MicOff, 
  Volume2, VolumeX, Wrench, AlertTriangle, History, MessageSquarePlus, 
  ChevronRight, Phone, Share2, Twitter, Linkedin, Facebook, MessageCircle, Copy, Check,
  User, Building2, Rocket, Play, Square, Code, Briefcase
} from 'lucide-react';

// --- Audio Helper Functions ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const AudioVisualizer: React.FC<{ analyser: AnalyserNode | null; isActive: boolean }> = ({ analyser, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current || !analyser || !isActive) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    let animationId: number;
    
    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(1, '#ec4899');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    draw();
    return () => cancelAnimationFrame(animationId);
  }, [analyser, isActive]);
  
  return <canvas ref={canvasRef} width={600} height={120} className="w-full max-w-xl h-24 rounded-2xl opacity-80" />;
};

// Voice Metadata for Selection
const VOICE_OPTIONS = [
  { name: 'Puck', gender: 'Male', color: 'blue' },
  { name: 'Charon', gender: 'Male', color: 'blue' },
  { name: 'Kore', gender: 'Female', color: 'pink' },
  { name: 'Fenrir', gender: 'Male', color: 'blue' },
  { name: 'Zephyr', gender: 'Female', color: 'pink' },
] as const;

const App: React.FC = () => {
  const [view, setView] = useState<'app' | 'developers' | 'business' | 'telemetry'>('app');
  const [config, setConfig] = useState<AgentConfig>(INITIAL_CONFIG);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false); 
  const [personaPrompt, setPersonaPrompt] = useState('');
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTelephony, setShowTelephony] = useState(false);
  const [showShareOverlay, setShowShareOverlay] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // AI Browser State
  const [visualContext, setVisualContext] = useState<VisualContext | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);
  
  // Session History Management
  const [sessions, setSessions] = useState<SavedSession[]>(() => {
    try {
      const saved = localStorage.getItem('agent_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Voice State
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  
  // Preview Voice State
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const previewAudioContextRef = useRef<AudioContext | null>(null);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);

  // Check for shared agent in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedSetup = params.get('agent');
    if (sharedSetup) {
      try {
        const decoded = JSON.parse(atob(sharedSetup));
        setConfig(decoded);
        setIsConfigured(true);
        setMessages([{ role: 'agent', content: `Hello! I am ${decoded.name} from ${decoded.companyName || 'your team'}. I've been shared with you via deep-link. How can I help?` }]);
      } catch (e) {
        console.error("Failed to decode shared agent", e);
      }
    }
  }, []);

  // 30 Second Share Pop-up Logic
  useEffect(() => {
    let timer: number;
    if (isConfigured && messages.length > 1) {
      const hasSeenShare = sessionStorage.getItem('has_seen_share_overlay');
      if (!hasSeenShare) {
        timer = window.setTimeout(() => {
          setShowShareOverlay(true);
          sessionStorage.setItem('has_seen_share_overlay', 'true');
        }, 30000);
      }
    }
    return () => clearTimeout(timer);
  }, [isConfigured, messages.length]);

  useEffect(() => {
    localStorage.setItem('agent_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveCurrentSession = useCallback(() => {
    if (!isConfigured) return;

    const sessionData: SavedSession = {
      id: currentSessionId || Date.now().toString(),
      config: config,
      messages: messages,
      timestamp: Date.now(),
      lastMessagePreview: messages.length > 0 ? messages[messages.length - 1].content.slice(0, 60) + '...' : 'No messages'
    };

    setSessions(prev => {
      const exists = prev.findIndex(s => s.id === sessionData.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = sessionData;
        return updated.sort((a, b) => b.timestamp - a.timestamp);
      }
      return [sessionData, ...prev].sort((a, b) => b.timestamp - a.timestamp);
    });

    if (!currentSessionId) {
      setCurrentSessionId(sessionData.id);
    }
  }, [config, messages, isConfigured, currentSessionId]);

  const handleNewChat = useCallback(() => {
    saveCurrentSession();
    stopVoiceSession();
    setIsConfigured(false);
    setIsFinalizing(false);
    setMessages([]);
    setPersonaPrompt('');
    setConfig(INITIAL_CONFIG);
    setCurrentSessionId(null);
    setShowHistory(false);
    setShowBrowser(false);
    setShowTelephony(false);
    setVisualContext(null);
    window.history.pushState({}, '', window.location.pathname);
  }, [saveCurrentSession]);
  
  const handleLoadSession = (session: SavedSession) => {
    saveCurrentSession();
    stopVoiceSession();
    const loadedConfig = {
      ...session.config,
      telephony: session.config.telephony || INITIAL_CONFIG.telephony
    };
    setConfig(loadedConfig);
    setMessages(session.messages);
    setIsConfigured(true);
    setCurrentSessionId(session.id);
    setShowHistory(false);
    
    const lastMsg = session.messages[session.messages.length - 1];
    if (lastMsg?.visualContext?.activate) {
      setVisualContext(lastMsg.visualContext);
      setShowBrowser(true);
    } else {
      setShowBrowser(false);
    }
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      handleNewChat();
    }
  };

  const stopVoiceSession = useCallback(() => {
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) { console.error("Error closing session", e) }
      sessionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    activeSourcesRef.current.forEach(source => source.stop());
    activeSourcesRef.current.clear();
    setIsVoiceActive(false);
    setIsModelSpeaking(false);
  }, []);

  const playVoicePreview = async (voiceName: string) => {
    // Stop any existing playback
    if (previewAudioContextRef.current) {
      await previewAudioContextRef.current.close();
    }
    setPreviewingVoice(voiceName);

    try {
      if (!process.env.API_KEY) throw new Error("No API Key");

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Hi, My name is ${config.name} and I am ready to shape shift into my role. If you like what you see, you can click on the share button in the chat window and send me to your favorite social media site or someone you know.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName }
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio returned");

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      previewAudioContextRef.current = ctx;

      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setPreviewingVoice(null);
        previewAudioContextRef.current = null;
      };
      source.start();

    } catch (e) {
      console.error("Preview error", e);
      setPreviewingVoice(null);
    }
  };

  const selectVoice = (voiceName: string) => {
    // If clicking same voice that is playing, stop it
    if (previewingVoice === voiceName) {
      previewAudioContextRef.current?.close();
      setPreviewingVoice(null);
      return;
    }
    
    // Set voice in config
    setConfig(prev => ({ ...prev, voiceName: voiceName as any }));
    
    // Play preview
    playVoicePreview(voiceName);
  };

  const startVoiceSession = useCallback(async () => {
    setVoiceError(null);
    try {
      if (!process.env.API_KEY) {
        throw new Error("API Key is missing.");
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const outCtx = audioContextRef.current;
      if (outCtx.state === 'suspended') await outCtx.resume();
      
      if (!analyserRef.current) {
        analyserRef.current = outCtx.createAnalyser();
        analyserRef.current.fftSize = 256;
      }
      
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error("Microphone permission denied:", err);
        setVoiceError("Microphone access denied. Please check your browser permissions.");
        return;
      }
      
      micStreamRef.current = stream;

      const systemInstruction = `
        You are an AI assistant in a voice-first real-time interaction.
        NAME: ${config.name}
        COMPANY: ${config.companyName || 'Not specified'}
        ROLE: ${config.roleDescription}
        DISC: D:${config.disc.dominance}%, I:${config.disc.influence}%, S:${config.disc.steadiness}%, C:${config.disc.conscientiousness}%
        BRAND: BD:${config.brand.businessDetails}%, EN:${config.brand.enthusiasm}%, EV:${config.brand.environment}%, EX:${config.brand.experience}%, PA:${config.brand.pay}%
        COMMUNICATION (ARCH): Acknowledge: ${config.arch.acknowledge}%, Reflect: ${config.arch.reflect}%, Context: ${config.arch.context}%, Handoff: ${config.arch.handoff}%
        GROUNDING: Focus level ${config.groundingFocus}%
        AVAILABLE TOOLS: ${config.tools.join(', ')}
        
        Keep responses concise as this is a spoken conversation. Match the behavioral profile in your tone and content.
      `;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsVoiceActive(true);
            const inCtx = new AudioContext({ sampleRate: 16000 });
            const source = inCtx.createMediaStreamSource(stream);
            const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
              }).catch(e => console.error("Session send error:", e));
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsModelSpeaking(true);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(analyserRef.current!);
              analyserRef.current!.connect(outCtx.destination);
              
              source.addEventListener('ended', () => {
                activeSourcesRef.current.delete(source);
                if (activeSourcesRef.current.size === 0) setIsModelSpeaking(false);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              activeSourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => s.stop());
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsModelSpeaking(false);
            }
          },
          onclose: () => {
            stopVoiceSession();
          },
          onerror: (e) => {
            console.error("Live API Error:", e);
            setVoiceError("Connection error. Please try again.");
            stopVoiceSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName || 'Zephyr' } }
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error("Failed to start voice:", err);
      setVoiceError(err.message || "Could not start voice session.");
      stopVoiceSession();
    }
  }, [config, stopVoiceSession]);

  const handleGeneratePersona = async () => {
    if (!personaPrompt.trim() || isGeneratingPersona) return;
    setIsGeneratingPersona(true);
    try {
      const generatedConfig = await generatePersonaFromPrompt(personaPrompt);
      setConfig({ ...generatedConfig, voiceName: 'Zephyr', telephony: INITIAL_CONFIG.telephony });
      setIsFinalizing(true); 
    } catch (err) {
      alert("Failed to generate persona. Please try again.");
    } finally {
      setIsGeneratingPersona(false);
    }
  };

  const finalizeAndLaunch = () => {
    // Clean up any preview audio before launching
    if (previewAudioContextRef.current) {
      previewAudioContextRef.current.close();
      setPreviewingVoice(null);
    }
    setIsConfigured(true);
    setIsFinalizing(false);
    setCurrentSessionId(Date.now().toString());
  };

  const updateDisc = (key: keyof DiscProfile, val: number) => {
    setConfig(prev => ({ ...prev, disc: { ...prev.disc, [key]: val } }));
  };

  const updateArch = (key: keyof ArchProfile, val: number) => {
    setConfig(prev => ({ ...prev, arch: { ...prev.arch, [key]: val } }));
  };

  const updateBrand = (key: keyof BrandAwareness, val: number) => {
    setConfig(prev => ({ ...prev, brand: { ...prev.brand, [key]: val } }));
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;
    if (isVoiceActive) stopVoiceSession();

    const userMessage: Message = { role: 'user', content: inputValue };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await generateAgentResponse(
        inputValue,
        config.disc,
        config.arch,
        config.brand,
        config.groundingFocus,
        messages.slice(-6),
        config.tools
      );

      const partCounts = {
        a: response.analysis.acknowledge.split(/\s+/).filter(Boolean).length,
        r: response.analysis.reflect.split(/\s+/).filter(Boolean).length,
        cx: response.analysis.context.split(/\s+/).filter(Boolean).length,
        h: response.analysis.handoff.split(/\s+/).filter(Boolean).length,
      };
      const totalWords = partCounts.a + partCounts.r + partCounts.cx + partCounts.h;
      
      const realArch: ArchProfile = {
        acknowledge: totalWords ? Math.round((partCounts.a / totalWords) * 100) : 0,
        reflect: totalWords ? Math.round((partCounts.r / totalWords) * 100) : 0,
        context: totalWords ? Math.round((partCounts.cx / totalWords) * 100) : 0,
        handoff: totalWords ? Math.round((partCounts.h / totalWords) * 100) : 0,
      };

      const agentMessage: Message = {
        role: 'agent',
        content: response.text,
        analysis: { arch: realArch, wordCount: totalWords, grounding: response.analysis.grounding },
        visualContext: response.visualContext
      };

      setMessages(prev => [...prev, agentMessage]);

      if (response.visualContext?.activate) {
        setVisualContext(response.visualContext);
        setShowBrowser(true);
      }
      
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'agent', content: "I encountered an error processing that request." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAgentUpdate = (updates: Partial<AgentConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const toggleBrowser = () => {
    if (!showBrowser) {
        if (!visualContext) {
            setVisualContext({
                activate: true,
                mode: 'browser',
                query: '',
                content: []
            });
        }
        setShowBrowser(true);
    } else {
        setShowBrowser(false);
    }
  };

  const generateShareUrl = () => {
    const encoded = btoa(JSON.stringify(config));
    return `${window.location.origin}${window.location.pathname}?agent=${encoded}`;
  };

  const handleCopyLink = () => {
    const url = generateShareUrl();
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const shareToSocial = (platform: string) => {
    const url = generateShareUrl();
    const text = `Check out my custom AI agent, ${config.name}!`;
    let shareUrl = '';
    
    switch(platform) {
      case 'twitter': shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`; break;
      case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`; break;
      case 'linkedin': shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`; break;
      case 'whatsapp': shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`; break;
    }
    window.open(shareUrl, '_blank');
  };

  // --- View: Developer Landing Page ---
  if (view === 'developers') {
    return <DeveloperPage onBack={() => setView('app')} />;
  }
  
  // --- View: Business Landing Page ---
  if (view === 'business') {
    return <BusinessPage onBack={() => setView('app')} />;
  }

  // --- View: Telemetry Dashboard ---
  if (view === 'telemetry') {
    return <NeuralTelemetryDashboard onBack={() => setView('app')} />;
  }

  // --- View: Initial Prompt ---
  if (!isConfigured && !isFinalizing) {
    return (
      <div className="h-[100dvh] bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-3xl opacity-30" />
        </div>
        
         <div className="absolute top-6 right-6 z-20 flex gap-4">
           <button 
             onClick={() => setView('business')}
             className="px-4 py-3 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm font-bold flex items-center gap-2 group"
           >
             <Briefcase className="w-4 h-4 group-hover:text-blue-400 transition-colors" />
             For Business
           </button>
           <button 
             onClick={() => setView('developers')}
             className="px-4 py-3 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm font-bold flex items-center gap-2 group"
           >
             <Code className="w-4 h-4 group-hover:text-emerald-400 transition-colors" />
             For Developers
           </button>
           <button 
             onClick={() => setView('telemetry')}
             className="px-4 py-3 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm font-bold flex items-center gap-2 group"
           >
             <Activity className="w-4 h-4 group-hover:text-amber-400 transition-colors" />
             Telemetry
           </button>
           <button onClick={() => setShowHistory(true)} className="p-3 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
             <History className="w-6 h-6" />
           </button>
         </div>

        <div className="w-full max-w-4xl space-y-10 animate-in fade-in zoom-in duration-700 relative z-10">
          <div className="text-center space-y-6">
            <div className="flex justify-center mb-4">
              <img 
                src="https://storage.cloud.google.com/travel-api-assets/Logos%20(Transparent)/gatewayglobal_logo_dk_bg.png" 
                alt="Gateway Global" 
                className="w-64 h-auto object-contain" 
              />
            </div>
            <div>
              <h1 className="text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-200 via-white to-violet-200 pb-2 whitespace-nowrap">
                Almost Human AI
              </h1>
              <p className="text-2xl text-slate-400 font-light mt-2">Who can I be for you today?</p>
            </div>
          </div>
          
          <div className="relative group">
            <textarea
              value={personaPrompt}
              onChange={(e) => setPersonaPrompt(e.target.value)}
              placeholder="e.g. A supportive customer success manager for a boutique skincare brand..."
              className="w-full h-48 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all text-xl shadow-2xl resize-none leading-relaxed"
            />
          </div>

          <button
            onClick={handleGeneratePersona}
            disabled={!personaPrompt.trim() || isGeneratingPersona}
            className="w-full py-5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-xl transition-all shadow-xl shadow-violet-900/20 flex items-center justify-center gap-4"
          >
            {isGeneratingPersona ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="animate-pulse">Analyzing Persona...</span>
              </>
            ) : (
              <>Create Agent <Send className="w-5 h-5" /></>
            )}
          </button>
        </div>
      </div>
    );
  }

  // --- View: Finalize (Step 2) ---
  if (isFinalizing) {
    return (
      <div className="h-[100dvh] bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl opacity-40" />
          <div className="absolute bottom-[10%] right-[20%] w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-3xl opacity-30" />
        </div>

        <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500 max-h-screen overflow-y-auto scrollbar-thin">
           <div className="text-center mb-10">
             <div className="w-16 h-16 bg-violet-600/20 border border-violet-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BadgeCheck className="w-8 h-8 text-violet-400" />
             </div>
             <h2 className="text-3xl font-black text-white">Fine-tune Agent</h2>
             <p className="text-slate-400 text-sm mt-2">Personalize the identity of your generated agent.</p>
           </div>

           <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <User className="w-3 h-3" /> Agent Name
                </label>
                <input 
                  type="text"
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Building2 className="w-3 h-3" /> Company Name
                </label>
                <input 
                  type="text"
                  value={config.companyName || ''}
                  onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                  placeholder="e.g. Gateway Global"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Volume2 className="w-3 h-3" /> Select Voice (Click to Preview)
                </label>
                <div className="grid grid-cols-2 gap-3">
                   {VOICE_OPTIONS.map((voice) => {
                      const isSelected = config.voiceName === voice.name;
                      const isPlaying = previewingVoice === voice.name;
                      const baseColor = voice.color === 'blue' ? 'text-cyan-400' : 'text-pink-400';
                      const bgClass = voice.color === 'blue' 
                          ? (isSelected ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-slate-900 border-slate-800 hover:border-cyan-500/30') 
                          : (isSelected ? 'bg-pink-500/20 border-pink-500/50' : 'bg-slate-900 border-slate-800 hover:border-pink-500/30');

                      return (
                        <button
                          key={voice.name}
                          onClick={() => selectVoice(voice.name)}
                          className={`relative p-4 rounded-xl border transition-all flex items-center gap-3 ${bgClass}`}
                        >
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${voice.color === 'blue' ? 'border-cyan-500/30 bg-cyan-950' : 'border-pink-500/30 bg-pink-950'}`}>
                              {isPlaying ? <Loader2 className={`w-4 h-4 animate-spin ${baseColor}`} /> : <Play className={`w-4 h-4 ${baseColor} fill-current`} />}
                           </div>
                           <div className="text-left">
                              <div className={`text-sm font-bold ${baseColor}`}>{voice.name}</div>
                              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{voice.gender}</div>
                           </div>
                           {isSelected && !isPlaying && (
                             <div className="absolute top-2 right-2">
                               <div className={`w-2 h-2 rounded-full ${voice.color === 'blue' ? 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]'}`} />
                             </div>
                           )}
                        </button>
                      );
                   })}
                </div>
              </div>
           </div>

           <div className="mt-10 pt-8 border-t border-slate-800 flex gap-4">
              <button 
                onClick={() => {
                   if (previewAudioContextRef.current) previewAudioContextRef.current.close();
                   setIsFinalizing(false);
                }}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all"
              >
                Back
              </button>
              <button 
                onClick={finalizeAndLaunch}
                className="flex-[2] py-4 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white rounded-2xl font-bold shadow-xl shadow-violet-900/20 flex items-center justify-center gap-2 transition-all"
              >
                Launch Agent <Rocket className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>
    );
  }

  // --- View: Main Dashboard ---
  return (
    <div className="h-[100dvh] flex bg-slate-950 overflow-hidden text-slate-200">
      
      {/* Settings Sidebar (Left) */}
      <aside className={`fixed inset-y-0 left-0 w-full md:w-80 bg-slate-900 border-r border-slate-800 z-50 transform transition-transform duration-300 ease-in-out ${showSettings ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
            <div className="flex items-center gap-2">
              <Cpu className="text-violet-400 w-5 h-5" />
              <span className="font-bold text-sm tracking-tight uppercase">Agent DNA</span>
            </div>
            <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-slate-800 rounded"><X className="w-5 h-5 text-slate-400" /></button>
          </div>
           <div className="flex-1 overflow-y-auto p-5 space-y-8 scrollbar-thin">
            <section className="space-y-4">
               <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-slate-500" />
                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Active Capabilities</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {config.tools && config.tools.length > 0 ? config.tools.map((tool, i) => (
                  <div key={i} className="px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg text-[10px] font-bold text-violet-300 uppercase tracking-wide flex items-center gap-1.5">
                    {tool.toLowerCase().includes('search') ? <Search className="w-3 h-3" /> : 
                     tool.toLowerCase().includes('place') ? <MapPin className="w-3 h-3" /> : 
                     <Settings className="w-3 h-3" />}
                    {tool}
                  </div>
                )) : <div className="text-xs text-slate-600 italic">No external tools assigned</div>}
              </div>
            </section>
            <div className="border-t border-slate-800/50" />
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-slate-500" />
                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Cognitive Profile</h2>
              </div>
              <DiscRadar data={config.disc} />
              <div className="grid grid-cols-1 gap-3">
                <Slider label="Dominance" value={config.disc.dominance} onChange={(v) => updateDisc('dominance', v)} color={COLORS.D} />
                <Slider label="Influence" value={config.disc.influence} onChange={(v) => updateDisc('influence', v)} color={COLORS.I} />
                <Slider label="Steadiness" value={config.disc.steadiness} onChange={(v) => updateDisc('steadiness', v)} color={COLORS.S} />
                <Slider label="Conscientious" value={config.disc.conscientiousness} onChange={(v) => updateDisc('conscientiousness', v)} color={COLORS.C} />
              </div>
            </section>
            <div className="border-t border-slate-800/50" />
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-slate-500" />
                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Brand Awareness</h2>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Slider label="Business Details" value={config.brand.businessDetails} onChange={(v) => updateBrand('businessDetails', v)} color={COLORS.BD} />
                <Slider label="Enthusiasm" value={config.brand.enthusiasm} onChange={(v) => updateBrand('enthusiasm', v)} color={COLORS.EN} />
                <Slider label="Environment" value={config.brand.environment} onChange={(v) => updateBrand('environment', v)} color={COLORS.EV} />
                <Slider label="Experience" value={config.brand.experience} onChange={(v) => updateBrand('experience', v)} color={COLORS.EX} />
                <Slider label="Pay" value={config.brand.pay} onChange={(v) => updateBrand('pay', v)} color={COLORS.PA} />
              </div>
            </section>
            <div className="border-t border-slate-800/50" />
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-500" />
                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Communication</h2>
              </div>
              <ArchBreakdown data={config.arch} />
              <div className="grid grid-cols-1 gap-3">
                <Slider label="Acknowledge" value={config.arch.acknowledge} onChange={(v) => updateArch('acknowledge', v)} color={COLORS.A} />
                <Slider label="Reflect" value={config.arch.reflect} onChange={(v) => updateArch('reflect', v)} color={COLORS.R} />
                <Slider label="Context" value={config.arch.context} onChange={(v) => updateArch('context', v)} color={COLORS.Cx} />
                <Slider label="Handoff" value={config.arch.handoff} onChange={(v) => updateArch('handoff', v)} color={COLORS.H} />
              </div>
            </section>
          </div>
        </div>
      </aside>

      {/* History Sidebar (Right) */}
       <aside className={`fixed inset-y-0 right-0 w-full md:w-80 bg-slate-900 border-l border-slate-800 z-50 transform transition-transform duration-300 ease-in-out ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
           <div className="h-full flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h2 className="font-bold text-slate-200">Session History</h2>
              <button onClick={() => setShowHistory(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {sessions.length === 0 ? (
                <div className="text-center text-slate-500 mt-10">No history found.</div>
              ) : (
                sessions.map(s => (
                  <div key={s.id} onClick={() => handleLoadSession(s)} className={`p-4 rounded-xl border cursor-pointer group transition-all ${currentSessionId === s.id ? 'bg-violet-900/20 border-violet-500/50' : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/50 hover:border-violet-500/30'}`}>
                    <div className="flex justify-between items-start mb-2">
                       <h3 className={`font-bold text-sm truncate pr-2 ${currentSessionId === s.id ? 'text-violet-300' : 'text-slate-300'}`}>{s.config.name}</h3>
                       <span className="text-[10px] text-slate-500 whitespace-nowrap">{new Date(s.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{s.lastMessagePreview}</p>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-700/50">
                       <span className="text-[10px] uppercase font-bold text-slate-600">{s.messages.length} msgs</span>
                       <button onClick={(e) => handleDeleteSession(e, s.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors">
                         <Trash2 className="w-3.5 h-3.5" />
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>
           </div>
         </aside>

      {/* Main Interface */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="px-6 py-4 bg-slate-900/40 backdrop-blur-md border-b border-slate-800/50 flex justify-between items-center sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setShowSettings(true)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors">
              <Settings className="w-5 h-5 text-violet-400" />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-100 truncate">{config.name} {config.companyName && <span className="text-slate-500 font-normal ml-1">@ {config.companyName}</span>}</h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${isVoiceActive ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest whitespace-nowrap">
                  {isVoiceActive ? 'Voice Session Active' : 'Idle'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
             <button 
              onClick={isVoiceActive ? stopVoiceSession : startVoiceSession}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl border transition-all ${isVoiceActive ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-violet-600 border-violet-500 text-white'}`}
            >
              {isVoiceActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span className="text-xs font-bold uppercase hidden md:inline">{isVoiceActive ? 'Stop Voice' : 'Start Voice'}</span>
            </button>
            
            <div className="h-8 w-px bg-slate-800 mx-1 md:mx-2 hidden sm:block" />

            <button onClick={toggleBrowser} className={`p-2 rounded-lg transition-all ${showBrowser ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-violet-400 hover:bg-slate-800'}`}>
              <Globe className="w-5 h-5" />
            </button>

            <button onClick={() => setShowTelephony(!showTelephony)} className={`p-2 rounded-lg transition-all hidden sm:block ${showTelephony ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-blue-400 hover:bg-slate-800'}`}>
              <Phone className="w-5 h-5" />
            </button>

            <button onClick={() => setShowShareOverlay(true)} className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-all">
              <Share2 className="w-5 h-5" />
            </button>
            
            <button onClick={handleNewChat} className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-all">
              <MessageSquarePlus className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden relative">
          <div className={`flex flex-col relative transition-all duration-500 ${showBrowser ? 'hidden md:flex md:w-[45%]' : 'w-full'}`}>
             {isVoiceActive && !showBrowser ? (
              <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 space-y-12 animate-in fade-in duration-500">
                <div className="relative group">
                  <div className={`absolute -inset-8 bg-violet-600/20 rounded-full blur-2xl transition-all duration-1000 ${isModelSpeaking ? 'scale-150 opacity-100' : 'scale-100 opacity-50'}`} />
                  <div className={`relative w-48 h-48 rounded-full border-4 border-slate-800 flex items-center justify-center bg-slate-900 transition-transform duration-500 ${isModelSpeaking ? 'scale-110' : 'scale-100'}`}>
                     {isModelSpeaking ? <Volume2 className="w-16 h-16 text-violet-400 animate-pulse" /> : <Mic className="w-16 h-16 text-slate-600" />}
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight text-white">{isModelSpeaking ? 'Agent Speaking...' : 'Listening...'}</h3>
                  <p className="text-slate-400 text-sm max-w-sm">Natural voice interaction active. Speaker: {config.voiceName}</p>
                </div>
                <AudioVisualizer analyser={analyserRef.current} isActive={isVoiceActive} />
                <button onClick={stopVoiceSession} className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold shadow-lg shadow-red-900/20 transition-all flex items-center gap-2">
                  <X className="w-5 h-5" /> End Conversation
                </button>
              </div>
            ) : null}

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 scrollbar-thin">
              {voiceError && <div className="mx-6 mt-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400 text-sm"><AlertTriangle className="w-5 h-5 shrink-0" />{voiceError}</div>}
              {messages.length === 0 && !isVoiceActive && !voiceError && <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-6"><MessageSquare className="w-16 h-16" /><div><h3 className="text-2xl font-bold tracking-tight">Interactive Simulation</h3><p className="max-w-md mt-2">Start a voice session or chat manually below.</p></div></div>}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                  <div className={`${showBrowser ? 'max-w-full' : 'max-w-[85%] sm:max-w-[80%]'} space-y-3`}>
                    <div className={`p-4 md:p-5 rounded-3xl ${msg.role === 'user' ? 'bg-violet-600 text-white rounded-tr-none shadow-xl' : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700 shadow-lg'}`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.analysis && !showBrowser && (
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/50 text-[9px]"><div className="grid grid-cols-4 gap-4">{Object.entries(msg.analysis.arch).map(([key, val]) => (<div key={key} className="space-y-1"><div className="flex justify-between font-mono"><span className="capitalize text-slate-500">{key[0]}</span><span className="text-slate-300 font-bold">{val}%</span></div><div className="h-0.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full" style={{ width: `${val}%`, backgroundColor: COLORS[key === 'acknowledge' ? 'A' : key === 'reflect' ? 'R' : key === 'context' ? 'Cx' : 'H' as keyof typeof COLORS] }} /></div></div>))}</div></div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && <div className="flex justify-start"><div className="bg-slate-800 p-4 rounded-3xl rounded-tl-none border border-slate-700 animate-pulse"><div className="flex gap-1.5"><div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" /><div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" /><div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" /></div></div></div>}
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-8 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent relative z-10">
              <div className="max-w-4xl mx-auto relative group flex gap-2 md:gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Message agent..."
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl px-4 md:px-6 py-3 md:py-4 pr-16 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all shadow-2xl backdrop-blur-sm"
                  />
                  <button onClick={handleSendMessage} disabled={!inputValue.trim() || isTyping} className="absolute right-2 md:right-3 top-2 md:top-3 p-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl transition-all"><Send className="w-5 h-5" /></button>
                </div>
                <button onClick={startVoiceSession} className="p-3 md:p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-violet-400 rounded-2xl transition-all shadow-xl"><Mic className="w-6 h-6" /></button>
              </div>
            </div>
          </div>
          
          {showBrowser && visualContext && (
            <div className="w-full md:w-[55%] h-full relative z-10 border-l border-slate-800 bg-slate-900 md:bg-transparent">
               <AIBrowser context={visualContext} onClose={() => setShowBrowser(false)} />
            </div>
          )}

          {showTelephony && (
            <div className="absolute inset-0 z-30 bg-slate-950 animate-in fade-in duration-300">
               <TelephonyPanel agent={config} onUpdate={handleAgentUpdate} onBack={() => setShowTelephony(false)} />
            </div>
          )}
        </div>
      </main>

      {/* Share Overlay */}
      {showShareOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden text-center space-y-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-violet-600/20 blur-3xl rounded-full" />
            <button onClick={() => setShowShareOverlay(false)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            <div className="space-y-4 relative z-10">
              <div className="w-20 h-20 bg-gradient-to-tr from-violet-600 to-emerald-500 rounded-3xl mx-auto flex items-center justify-center shadow-xl mb-6"><Share2 className="w-10 h-10 text-white" /></div>
              <h2 className="text-3xl font-black text-white tracking-tight">Share Your Agent!</h2>
              <p className="text-slate-400 leading-relaxed">You've created a unique behavioral profile for <span className="text-violet-400 font-bold">{config.name}</span>. Send it to a friend!</p>
            </div>
            <div className="grid grid-cols-4 gap-4 relative z-10">
              <button onClick={() => shareToSocial('twitter')} className="flex flex-col items-center gap-2 group"><div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center group-hover:bg-slate-700 transition-all border border-slate-700 group-hover:border-violet-500/50"><Twitter className="w-6 h-6 text-slate-300 group-hover:text-sky-400" /></div><span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Twitter</span></button>
              <button onClick={() => shareToSocial('linkedin')} className="flex flex-col items-center gap-2 group"><div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center group-hover:bg-slate-700 transition-all border border-slate-700 group-hover:border-violet-500/50"><Linkedin className="w-6 h-6 text-slate-300 group-hover:text-blue-500" /></div><span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">LinkedIn</span></button>
              <button onClick={() => shareToSocial('whatsapp')} className="flex flex-col items-center gap-2 group"><div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center group-hover:bg-slate-700 transition-all border border-slate-700 group-hover:border-violet-500/50"><MessageCircle className="w-6 h-6 text-slate-300 group-hover:text-emerald-500" /></div><span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">WhatsApp</span></button>
              <button onClick={() => shareToSocial('facebook')} className="flex flex-col items-center gap-2 group"><div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center group-hover:bg-slate-700 transition-all border border-slate-700 group-hover:border-violet-500/50"><Facebook className="w-6 h-6 text-slate-300 group-hover:text-indigo-500" /></div><span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Facebook</span></button>
            </div>
            <div className="pt-4 border-t border-slate-800 relative z-10">
              <button onClick={handleCopyLink} className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl flex items-center justify-center gap-3 transition-all border border-slate-700 font-bold group">{copySuccess ? <><Check className="w-5 h-5 text-emerald-500" /><span className="text-emerald-500">Copied!</span></> : <><Copy className="w-5 h-5 text-slate-400 group-hover:text-violet-400" /><span>Copy Unique Link</span></>}</button>
            </div>
          </div>
        </div>
      )}

      {(showSettings || showHistory) && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => { setShowSettings(false); setShowHistory(false); }} />}
    </div>
  );
};

export default App;
