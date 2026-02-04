import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  ChevronLeft, Coffee, Send, Music, Moon, Sparkles,
  Server, Zap, Cpu, Radio, Mic, MicOff, Volume2, VolumeX,
  Phone, PhoneOff
} from 'lucide-react';
import type { Agent } from '@shared/schema';
import type { DiscScores, ArchProfile } from '@shared/schema';

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
    const name = userName?.[1] || userName?.[2] || userName?.[3] || userName?.[4] || '';
    
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

const BotAvatar = ({ scores, mood }: { scores: DiscScores; mood: Mood }) => {
  const { dominance: d, influence: i, steadiness: s, conscientiousness: c } = scores;
  const dNorm = d / 100;
  const iNorm = i / 100;
  const sNorm = s / 100;
  const cNorm = c / 100;
  const moodConfig = MOOD_COLORS[mood];

  return (
    <div className="relative w-32 h-32 flex items-center justify-center mx-auto pointer-events-none">
      <div 
        className="absolute inset-0 border border-dashed rounded-full animate-spin pointer-events-none"
        style={{ 
          borderColor: `rgba(139, 92, 246, ${Math.max(cNorm, 0.2)})`, 
          opacity: cNorm,
          animationDuration: '25s'
        }}
      />
      
      <div 
        className="absolute rounded-full blur-3xl transition-all duration-1000 animate-pulse pointer-events-none"
        style={{ 
          width: '200%',
          height: '200%',
          background: `radial-gradient(circle, ${moodConfig.primary} 0%, ${moodConfig.glow} 30%, transparent 70%)`,
          opacity: 0.4
        }}
      />

      <div 
        className="absolute w-16 h-16 rounded-xl flex items-center justify-center bg-slate-900 border-2 z-10"
        style={{
          borderColor: moodConfig.primary,
          boxShadow: `0 0 30px ${moodConfig.glow}`
        }}
      >
        <Server className="w-8 h-8 text-slate-200" />
      </div>
    </div>
  );
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
  
  const recognitionRef = useRef<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
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

  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.volume = 0.9;
    
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => 
      v.name.includes('Samantha') || 
      v.name.includes('Victoria') || 
      v.name.includes('Karen') ||
      v.name.includes('female') ||
      v.name.includes('Female')
    ) || voices[0];
    if (femaleVoice) utterance.voice = femaleVoice;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

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
      
      if (chatMode === 'voice' || isVoiceCallActive) {
        speakText(response);
      }
    }, responseDelay);
  };

  const startVoiceRecognition = () => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleSendMessage(transcript);
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleVoiceCall = () => {
    if (isVoiceCallActive) {
      setIsVoiceCallActive(false);
      stopVoiceRecognition();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } else {
      setIsVoiceCallActive(true);
      setChatMode('voice');
    }
  };

  if (!agent) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Coffee className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading The Vibe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b ${MOOD_COLORS[mood].bg} to-slate-950`}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/agents')}
            className="text-slate-400 hover:text-white"
            data-testid="button-back"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-purple-400" />
            <span className="text-purple-300 font-medium">The Vibe</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="relative w-24 h-24 mx-auto mb-4 rounded-xl overflow-hidden border-2 border-purple-500/50">
            <img src={avatar.src} alt={agent.name} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{agent.name}</h1>
          <p className="text-slate-400">Reflect & Relax</p>
        </div>

        <Card className="bg-slate-900/80 border-purple-500/30 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <Moon className="w-4 h-4 text-purple-400" />
              Set the Mood
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {(Object.keys(MOOD_COLORS) as Mood[]).map((m) => (
                <Button
                  key={m}
                  variant={mood === m ? 'default' : 'outline'}
                  className={mood === m 
                    ? 'bg-purple-600 hover:bg-purple-500' 
                    : 'border-slate-600 text-slate-300'
                  }
                  onClick={() => setMood(m)}
                  data-testid={`button-mood-${m}`}
                >
                  {MOOD_COLORS[m].label}
                </Button>
              ))}
            </div>
            
            <div className="mt-4 flex items-center gap-6">
              <BotAvatar scores={discScores} mood={mood} />
              <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-pink-400" />
                  <span className="text-slate-400">Dominance</span>
                  <span className="text-white ml-auto">{discScores.dominance}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Radio className="w-3 h-3 text-yellow-400" />
                  <span className="text-slate-400">Influence</span>
                  <span className="text-white ml-auto">{discScores.influence}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-3 h-3 text-green-400" />
                  <span className="text-slate-400">Steadiness</span>
                  <span className="text-white ml-auto">{discScores.steadiness}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Server className="w-3 h-3 text-blue-400" />
                  <span className="text-slate-400">Conscientiousness</span>
                  <span className="text-white ml-auto">{discScores.conscientiousness}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={chatMode === 'text' ? 'default' : 'outline'}
                  onClick={() => setChatMode('text')}
                  className={chatMode === 'text' ? 'bg-purple-600' : 'border-slate-600'}
                  data-testid="button-mode-text"
                >
                  <Send className="w-3 h-3 mr-1" />
                  Text
                </Button>
                <Button
                  size="sm"
                  variant={chatMode === 'voice' ? 'default' : 'outline'}
                  onClick={() => setChatMode('voice')}
                  className={chatMode === 'voice' ? 'bg-purple-600' : 'border-slate-600'}
                  data-testid="button-mode-voice"
                >
                  <Mic className="w-3 h-3 mr-1" />
                  Voice
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={voiceEnabled ? 'text-purple-400' : 'text-slate-500'}
                  data-testid="button-toggle-speaker"
                  title={voiceEnabled ? 'Mute agent voice' : 'Unmute agent voice'}
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant={isVoiceCallActive ? 'destructive' : 'default'}
                  onClick={toggleVoiceCall}
                  className={isVoiceCallActive ? '' : 'bg-green-600 hover:bg-green-500'}
                  data-testid="button-voice-call"
                >
                  {isVoiceCallActive ? (
                    <><PhoneOff className="w-3 h-3 mr-1" /> End Call</>
                  ) : (
                    <><Phone className="w-3 h-3 mr-1" /> Call</>
                  )}
                </Button>
              </div>
            </div>
            
            <div 
              ref={chatContainerRef}
              className="h-64 overflow-y-auto mb-4 space-y-3"
            >
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center">
                  <div>
                    <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-slate-500">
                      {chatMode === 'voice' 
                        ? `Tap the mic to start vibing with ${agent.name}` 
                        : `Start a relaxed conversation with ${agent.name}`
                      }
                    </p>
                    <p className="text-xs text-slate-600 mt-2">
                      ARCH Window Matching: AI mirrors your energy
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                        msg.role === 'user' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{msg.text}</span>
                        {msg.role === 'agent' && isSpeaking && idx === messages.length - 1 && (
                          <div className="flex items-center gap-0.5">
                            <div className="w-1 h-2 bg-purple-400 rounded-full animate-pulse" />
                            <div className="w-1 h-3 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                            <div className="w-1 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {chatMode === 'text' && !isVoiceCallActive ? (
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="What's on your mind?"
                  className="bg-slate-800 border-slate-600"
                  data-testid="input-message"
                />
                <Button 
                  onClick={() => handleSendMessage()}
                  className="bg-purple-600 hover:bg-purple-500"
                  data-testid="button-send"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isListening 
                      ? 'bg-red-500 animate-pulse scale-110' 
                      : 'bg-purple-600 hover:bg-purple-500 hover:scale-105'
                  }`}
                  data-testid="button-mic"
                >
                  {isListening ? (
                    <MicOff className="w-6 h-6 text-white" />
                  ) : (
                    <Mic className="w-6 h-6 text-white" />
                  )}
                </button>
                <p className="text-xs text-slate-500">
                  {isListening ? 'Listening... tap to stop' : 'Tap to speak'}
                </p>
                {isVoiceCallActive && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Voice call active
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
