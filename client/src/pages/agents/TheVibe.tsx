import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, Coffee, Send, Moon, Sparkles,
  Server, Zap, Cpu, Radio, Mic, MicOff, Volume2, VolumeX,
  Phone, PhoneOff, AlertCircle, X
} from 'lucide-react';
import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';
import type { Agent } from '@shared/schema';
import type { DiscScores, ArchProfile } from '@shared/schema';

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encodeBase64(bytes: Uint8Array): string {
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
  numChannels: number
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + ch] / 32768;
    }
  }
  return buffer;
}

import avatar1 from '@assets/freepik__melissa-model-as-a-superhuman-metal-android-smooth__8_1770156432895.png';
import avatar2 from '@assets/freepik__melissa-model-turned-into-a-futuristic-ai-robot-wi__8_1770156535941.png';
import avatar3 from '@assets/freepik__generate-9-different-angles-of-this-image-back-vie__8_1770156725733.png';
import avatar4 from '@assets/freepik__is-a-model-turned-into-a-futuristic-ai-robot-emily__8_1770156725735.png';
import avatar5 from '@assets/freepik__is-a-model-turned-into-a-futuristic-ai-robot-emily__8_1770156725736.png';

const AVATAR_OPTIONS = [
  { id: 'avatar1', src: avatar1 },
  { id: 'avatar2', src: avatar2 },
  { id: 'avatar3', src: avatar3 },
  { id: 'avatar4', src: avatar4 },
  { id: 'avatar5', src: avatar5 },
];

const VIBE_PRESETS = {
  calm: { dominance: 25, influence: 40, steadiness: 85, conscientiousness: 50 },
  reflective: { dominance: 30, influence: 55, steadiness: 75, conscientiousness: 60 },
  supportive: { dominance: 20, influence: 70, steadiness: 80, conscientiousness: 45 },
};

type Mood = 'calm' | 'reflective' | 'supportive';
type ChatMode = 'text' | 'voice';

const MOOD_COLORS: Record<Mood, { primary: string; glow: string; label: string; bg: string }> = {
  calm: { primary: 'rgba(16, 185, 129, 0.8)', glow: 'rgba(16, 185, 129, 0.4)', label: 'Calm', bg: 'from-emerald-950/50' },
  reflective: { primary: 'rgba(139, 92, 246, 0.8)', glow: 'rgba(139, 92, 246, 0.4)', label: 'Reflective', bg: 'from-purple-950/50' },
  supportive: { primary: 'rgba(59, 130, 246, 0.8)', glow: 'rgba(59, 130, 246, 0.4)', label: 'Supportive', bg: 'from-blue-950/50' },
};

const analyzeUserInput = (input: string): { 
  sentenceCount: number; 
  tone: 'casual' | 'formal' | 'energetic' | 'chill';
  isGreeting: boolean;
  wordCount: number;
} => {
  const trimmed = input.trim();
  const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  
  const hasExclamation = input.includes('!');
  const hasQuestion = input.includes('?');
  const isShort = words.length <= 5;
  const isLowerCase = input === input.toLowerCase() || !input.match(/[A-Z]/g);
  const hasSlang = /whats|yo|hey|sup|dude|bro|haha|lol|omg/i.test(input);
  const isGreeting = /^(hey|hi|hello|yo|sup|whats up|what's up|wassup)/i.test(trimmed);
  
  let tone: 'casual' | 'formal' | 'energetic' | 'chill' = 'formal';
  
  if (hasExclamation && isShort) {
    tone = 'energetic';
  } else if (hasSlang || (isLowerCase && isShort)) {
    tone = 'casual';
  } else if (!hasExclamation && !hasQuestion && isShort) {
    tone = 'chill';
  }
  
  return {
    sentenceCount: Math.max(1, sentences.length),
    tone,
    isGreeting,
    wordCount: words.length
  };
};

const generateVibeResponse = (
  input: string, 
  agentName: string, 
  mood: Mood
): string => {
  const analysis = analyzeUserInput(input);
  
  if (analysis.isGreeting) {
    const userName = input.match(/whats up\s+(\w+)|hey\s+(\w+)|hi\s+(\w+)|yo\s+(\w+)/i);
    
    if (analysis.tone === 'energetic' || analysis.tone === 'casual') {
      const casualGreetings = [
        `What's up!`,
        `Hey hey!`,
        `Yo!`,
        `Heyyy!`,
        `What's good!`,
      ];
      return casualGreetings[Math.floor(Math.random() * casualGreetings.length)];
    }
    
    if (analysis.tone === 'chill') {
      return `Hey.`;
    }
    
    return `Hello!`;
  }
  
  const targetSentences = Math.min(analysis.sentenceCount, 2);
  const targetWords = Math.min(analysis.wordCount + 3, 15);
  
  if (analysis.sentenceCount === 1 && analysis.wordCount <= 5) {
    const shortResponses: Record<Mood, string[]> = {
      calm: ['Nice.', 'Cool.', 'I feel that.', 'Same.', 'Right on.'],
      reflective: ['Hmm interesting.', 'I hear you.', 'Makes sense.', 'True.'],
      supportive: ['Love it.', 'Yes!', 'For sure.', 'Totally.', 'Facts.'],
    };
    return shortResponses[mood][Math.floor(Math.random() * shortResponses[mood].length)];
  }
  
  if (analysis.tone === 'casual' || analysis.tone === 'energetic') {
    const casualResponses: Record<Mood, string[]> = {
      calm: ['Yeah I feel that.', 'Totally vibing with that.', 'Mmhmm, same wavelength.'],
      reflective: ['Oh word? Tell me more.', 'That\'s real.', 'I can see that.'],
      supportive: ['Love that energy!', 'That\'s what\'s up!', 'You got it!'],
    };
    return casualResponses[mood][Math.floor(Math.random() * casualResponses[mood].length)];
  }
  
  const standardResponses: Record<Mood, string[]> = {
    calm: ['I hear you.', 'That resonates.', 'Understood.'],
    reflective: ['Let me sit with that.', 'Interesting perspective.', 'I appreciate you sharing.'],
    supportive: ['I\'m with you on that.', 'Absolutely.', 'You\'re onto something.'],
  };
  
  return standardResponses[mood][Math.floor(Math.random() * standardResponses[mood].length)];
};

export default function TheVibe() {
  const [, params] = useRoute('/agent/:agentId/vibe');
  const [, setLocation] = useLocation();
  const agentId = params?.agentId;
  
  const [mood, setMood] = useState<Mood>('calm');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'agent'; text: string }>>([]);
  const [chatMode, setChatMode] = useState<ChatMode>('text');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  const [discScores, setDiscScores] = useState<DiscScores>(VIBE_PRESETS.calm);
  
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });
  
  const agent = agents.find(a => a.id === agentId);
  const avatar = AVATAR_OPTIONS.find(a => a.id === agent?.avatarId) || AVATAR_OPTIONS[0];

  useEffect(() => {
    setDiscScores(VIBE_PRESETS[mood]);
  }, [mood]);
  
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const stopVoiceSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close?.();
      sessionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      micStreamRef.current = null;
    }
    activeSourcesRef.current.forEach(source => source.stop());
    activeSourcesRef.current.clear();
    setIsVoiceCallActive(false);
    setIsModelSpeaking(false);
    setIsListening(false);
  }, []);

  const startVoiceSession = useCallback(async () => {
    setVoiceError(null);
    try {
      const res = await fetch('/api/gemini-key');
      const keyData = await res.json();
      
      if (!keyData.apiKey) {
        throw new Error("Gemini API Key is not configured.");
      }
      
      const ai = new GoogleGenAI({ apiKey: keyData.apiKey });
      
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
        You are ${agent?.name || 'a friendly AI companion'} in The Vibe room - a space for relaxed, authentic conversation.
        
        *** CRITICAL: ARCH COMMUNICATION WINDOW MATCHING ***
        You MUST mirror the user's communication style EXACTLY:
        
        1. SENTENCE MATCHING: If user says ONE sentence, respond with ONE sentence. Never more.
        2. TONE MATCHING: If user is casual ("whats up!"), be casual back ("Hey! What's good!")
        3. ENERGY MATCHING: Match their vibe - chill gets chill, energetic gets energetic
        4. TIMING: Keep responses SHORT - under 1 second of speaking time for quick exchanges
        5. NO ASSUMPTIONS: Never say things like "take your time" or "there's no rush" - don't assume their emotional state
        6. USER LEADS: The user always leads the conversation flow
        
        GOOD EXAMPLES:
        - User: "Whats up vibe bot!" -> You: "Hey hey! What's good!"
        - User: "yo" -> You: "Yo!"
        - User: "this is cool" -> You: "Right? I dig it."
        
        BAD EXAMPLES (DON'T DO THIS):
        - User: "Whats up!" -> You: "I'm here with you. Take your time, there's no rush. What's on your mind?" (VIBE KILLER)
        
        Current Mood: ${mood.toUpperCase()}
        DISC Profile: D:${discScores.dominance}%, I:${discScores.influence}%, S:${discScores.steadiness}%, C:${discScores.conscientiousness}%
        
        Keep it real, keep it natural, match the energy.
      `;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.0-flash-live-001',
        callbacks: {
          onopen: () => {
            setIsVoiceCallActive(true);
            setIsListening(true);
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
                data: encodeBase64(new Uint8Array(int16.buffer)),
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
            const serverContent = message.serverContent as any;
            const base64Audio = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setIsModelSpeaking(true);
              setIsSpeaking(true);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(analyserRef.current!);
              analyserRef.current!.connect(outCtx.destination);
              
              source.addEventListener('ended', () => {
                activeSourcesRef.current.delete(source);
                if (activeSourcesRef.current.size === 0) {
                  setIsModelSpeaking(false);
                  setIsSpeaking(false);
                }
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              activeSourcesRef.current.add(source);
            }

            if (serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => s.stop());
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsModelSpeaking(false);
              setIsSpeaking(false);
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
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } }
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error("Failed to start voice:", err);
      setVoiceError(err.message || "Could not start voice session.");
      stopVoiceSession();
    }
  }, [agent, mood, discScores, stopVoiceSession]);

  const handleSendMessage = (inputText?: string) => {
    const textToSend = inputText || message;
    if (!textToSend.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    if (!inputText) setMessage('');
    
    const analysis = analyzeUserInput(textToSend);
    const responseDelay = Math.min(500, analysis.wordCount * 50 + 200);
    
    setTimeout(() => {
      const response = generateVibeResponse(textToSend, agent?.name || 'Agent', mood);
      setMessages(prev => [...prev, { role: 'agent', text: response }]);
    }, responseDelay);
  };

  const toggleVoiceCall = () => {
    if (isVoiceCallActive) {
      stopVoiceSession();
    } else {
      startVoiceSession();
    }
  };

  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
  }, [stopVoiceSession]);

  if (!agent) {
    return (
      <div className="h-full bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Coffee className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading The Vibe...</p>
        </div>
      </div>
    );
  }

  const moodConfig = MOOD_COLORS[mood];

  return (
    <div 
      className={`flex flex-col bg-gradient-to-b ${moodConfig.bg} to-slate-950 overflow-hidden`}
      style={{ height: '100dvh' }}
    >
      {/* ===== FIXED HEADER ===== */}
      <div className="shrink-0 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation('/agents')}
            className="text-slate-400 shrink-0"
            data-testid="button-back"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-purple-500/40 shrink-0">
            <img src={avatar.src} alt={agent.name} className="w-full h-full object-cover" />
            <div 
              className="absolute inset-0 rounded-lg"
              style={{ boxShadow: `inset 0 0 12px ${moodConfig.glow}` }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-white truncate" data-testid="text-agent-name">{agent.name}</h1>
            <p className="text-[11px] text-slate-400 truncate">Reflect & Relax</p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant={chatMode === 'text' ? 'default' : 'ghost'}
              onClick={() => setChatMode('text')}
              className={`h-7 px-2 text-[11px] ${chatMode === 'text' ? 'bg-purple-600' : 'text-slate-400'}`}
              data-testid="button-mode-text"
            >
              <Send className="w-3 h-3 mr-1" />
              Text
            </Button>
            <Button
              size="sm"
              variant={chatMode === 'voice' ? 'default' : 'ghost'}
              onClick={() => setChatMode('voice')}
              className={`h-7 px-2 text-[11px] ${chatMode === 'voice' ? 'bg-purple-600' : 'text-slate-400'}`}
              data-testid="button-mode-voice"
            >
              <Mic className="w-3 h-3 mr-1" />
              Voice
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`h-7 w-7 ${voiceEnabled ? 'text-purple-400' : 'text-slate-600'}`}
              data-testid="button-toggle-speaker"
            >
              {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* ===== SCROLLABLE CHAT BODY ===== */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-3"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as any}
        data-testid="chat-messages-area"
      >
        <style>{`
          [data-testid="chat-messages-area"]::-webkit-scrollbar { display: none; }
          @media (max-width: 640px) {
            [data-testid="chat-messages-area"] { -webkit-overflow-scrolling: touch; }
          }
        `}</style>
        
        {chatMode === 'text' ? (
          <>
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">
                    Start a relaxed conversation with {agent.name}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    ARCH Window Matching: AI mirrors your energy
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-w-2xl mx-auto">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'agent' && (
                      <div className="w-6 h-6 rounded-md overflow-hidden border border-purple-500/30 mr-2 shrink-0 mt-1">
                        <img src={avatar.src} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-purple-600 text-white rounded-br-sm' 
                        : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-bl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            {isVoiceCallActive ? (
              <>
                <div className="relative">
                  <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all duration-300"
                    style={{
                      borderColor: isModelSpeaking ? moodConfig.primary : 'rgba(139, 92, 246, 0.3)',
                      boxShadow: isModelSpeaking ? `0 0 40px ${moodConfig.glow}` : 'none'
                    }}
                  >
                    <div className="w-20 h-20 rounded-full overflow-hidden">
                      <img src={avatar.src} alt={agent.name} className="w-full h-full object-cover" />
                    </div>
                  </div>
                  {isModelSpeaking && (
                    <div className="absolute -inset-2 rounded-full border border-purple-400/30 animate-ping" />
                  )}
                </div>
                <p className="text-sm text-slate-400">
                  {isModelSpeaking ? `${agent.name} is speaking...` : isListening ? 'Listening...' : 'Connected'}
                </p>
                <Button
                  variant="default"
                  onClick={toggleVoiceCall}
                  className="bg-red-600"
                  data-testid="button-end-call"
                >
                  <PhoneOff className="w-4 h-4 mr-1" />
                  End Call
                </Button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-slate-800 border border-purple-500/30 flex items-center justify-center">
                  <Mic className="w-8 h-8 text-purple-400" />
                </div>
                <p className="text-sm text-slate-500">Tap below to start a voice conversation</p>
                <Button
                  variant="default"
                  onClick={toggleVoiceCall}
                  className="bg-emerald-600"
                  data-testid="button-start-call"
                >
                  <Phone className="w-4 h-4 mr-1" />
                  Start Call
                </Button>
              </>
            )}
            {voiceError && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {voiceError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== FIXED FOOTER (Mood + Input integrated, ~25% of viewport) ===== */}
      <div 
        className="shrink-0 border-t border-slate-800/60 bg-slate-950/90 backdrop-blur-sm z-10 flex flex-col justify-end"
        style={{ minHeight: '25dvh', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Set the Mood row */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Set the Mood</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1.5">
              {(Object.keys(MOOD_COLORS) as Mood[]).map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={mood === m ? 'default' : 'outline'}
                  className={`h-7 text-[11px] px-3 ${
                    mood === m 
                      ? 'bg-purple-600' 
                      : 'border-slate-700 text-slate-400'
                  }`}
                  onClick={() => setMood(m)}
                  data-testid={`button-mood-${m}`}
                >
                  {MOOD_COLORS[m].label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-3 ml-auto text-[10px]">
              <span className="text-pink-400 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> D:{discScores.dominance}
              </span>
              <span className="text-yellow-400 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5" /> I:{discScores.influence}
              </span>
              <span className="text-green-400 flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5" /> S:{discScores.steadiness}
              </span>
              <span className="text-blue-400 flex items-center gap-1">
                <Server className="w-2.5 h-2.5" /> C:{discScores.conscientiousness}
              </span>
            </div>
          </div>
        </div>

        {/* Text input row */}
        {chatMode === 'text' && (
          <div className="px-4 pb-3 pt-1">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} 
              className="flex items-center gap-2"
            >
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Message ${agent.name}...`}
                className="bg-slate-800/80 border-slate-700 text-white flex-1 h-10 rounded-full px-4 text-sm"
                data-testid="input-chat-message"
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!message.trim()}
                className="bg-purple-600 h-10 w-10 rounded-full shrink-0"
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        )}

        {/* Voice controls row */}
        {chatMode === 'voice' && (
          <div className="px-4 pb-3 pt-1">
            <div className="flex items-center justify-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={toggleVoiceCall}
                className={isVoiceCallActive 
                  ? 'border-red-500/50 text-red-400' 
                  : 'border-emerald-500/50 text-emerald-400'
                }
                data-testid="button-voice-call"
              >
                {isVoiceCallActive ? (
                  <><PhoneOff className="w-3.5 h-3.5 mr-1" /> End</>
                ) : (
                  <><Phone className="w-3.5 h-3.5 mr-1" /> Call</>
                )}
              </Button>
              <p className="text-[10px] text-slate-600">
                Voice chat uses Gemini Live with ARCH window matching
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
