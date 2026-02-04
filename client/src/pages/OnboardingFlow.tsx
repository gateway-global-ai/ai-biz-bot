import { useState, useEffect } from 'react';
import { Mic, Play, Pause, ArrowRight, ArrowLeft, Zap, Volume2, MessageSquare, Phone, CheckCircle2, Users, Bot, Heart, Brain, Shield, Target } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import gatewayLogoDark from '@assets/gatewayglobal_logo_dk_bg(_1770158396213.png';

type Variant = 'awakening' | 'proof';
type Step = 'name' | 'voice' | 'test';
type Emotion = 'calm' | 'engaged' | 'focused' | 'energized' | 'empathetic';
type Gender = 'male' | 'female' | 'neutral';

const MALE_VOICES = [
  { id: 'james', name: 'James', description: 'Warm & Professional', gender: 'male' as Gender, accent: 'American' },
  { id: 'marcus', name: 'Marcus', description: 'Calm & Analytical', gender: 'male' as Gender, accent: 'British' },
  { id: 'david', name: 'David', description: 'Energetic & Friendly', gender: 'male' as Gender, accent: 'American' },
  { id: 'liam', name: 'Liam', description: 'Direct & Confident', gender: 'male' as Gender, accent: 'Australian' },
  { id: 'ethan', name: 'Ethan', description: 'Empathetic & Patient', gender: 'male' as Gender, accent: 'Canadian' },
  { id: 'connor', name: 'Connor', description: 'Creative & Inspiring', gender: 'male' as Gender, accent: 'Irish' },
];

const FEMALE_VOICES = [
  { id: 'sophia', name: 'Sophia', description: 'Warm & Professional', gender: 'female' as Gender, accent: 'American' },
  { id: 'emma', name: 'Emma', description: 'Calm & Analytical', gender: 'female' as Gender, accent: 'British' },
  { id: 'olivia', name: 'Olivia', description: 'Energetic & Friendly', gender: 'female' as Gender, accent: 'American' },
  { id: 'charlotte', name: 'Charlotte', description: 'Direct & Confident', gender: 'female' as Gender, accent: 'Australian' },
  { id: 'amelia', name: 'Amelia', description: 'Empathetic & Patient', gender: 'female' as Gender, accent: 'Canadian' },
  { id: 'ava', name: 'Ava', description: 'Creative & Inspiring', gender: 'female' as Gender, accent: 'Irish' },
];

const NEUTRAL_VOICES = [
  { id: 'alex', name: 'Alex', description: 'Warm & Professional', gender: 'neutral' as Gender, accent: 'American' },
  { id: 'morgan', name: 'Morgan', description: 'Calm & Analytical', gender: 'neutral' as Gender, accent: 'British' },
  { id: 'sam', name: 'Sam', description: 'Energetic & Friendly', gender: 'neutral' as Gender, accent: 'American' },
  { id: 'jordan', name: 'Jordan', description: 'Direct & Confident', gender: 'neutral' as Gender, accent: 'Australian' },
  { id: 'casey', name: 'Casey', description: 'Empathetic & Patient', gender: 'neutral' as Gender, accent: 'Canadian' },
  { id: 'riley', name: 'Riley', description: 'Creative & Inspiring', gender: 'neutral' as Gender, accent: 'Irish' },
];

// Common name lists for gender detection
const MALE_NAMES = new Set([
  'james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas', 'charles',
  'christopher', 'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua',
  'kenneth', 'kevin', 'brian', 'george', 'timothy', 'ronald', 'edward', 'jason', 'jeffrey', 'ryan',
  'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon',
  'benjamin', 'samuel', 'raymond', 'gregory', 'frank', 'alexander', 'patrick', 'jack', 'dennis', 'jerry',
  'tyler', 'aaron', 'jose', 'adam', 'nathan', 'henry', 'douglas', 'zachary', 'peter', 'kyle',
  'noah', 'ethan', 'liam', 'mason', 'logan', 'lucas', 'aiden', 'jackson', 'sebastian', 'mateo',
  'max', 'marcus', 'connor', 'owen', 'luke', 'isaac', 'dylan', 'caleb', 'hunter', 'christian',
  'mike', 'bob', 'bill', 'jim', 'joe', 'tom', 'steve', 'dave', 'dan', 'matt', 'chris', 'nick', 'jake', 'ben', 'alex',
]);

const FEMALE_NAMES = new Set([
  'mary', 'patricia', 'jennifer', 'linda', 'barbara', 'elizabeth', 'susan', 'jessica', 'sarah', 'karen',
  'lisa', 'nancy', 'betty', 'margaret', 'sandra', 'ashley', 'kimberly', 'emily', 'donna', 'michelle',
  'dorothy', 'carol', 'amanda', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon', 'laura', 'cynthia',
  'kathleen', 'amy', 'angela', 'shirley', 'anna', 'brenda', 'pamela', 'emma', 'nicole', 'helen',
  'samantha', 'katherine', 'christine', 'debra', 'rachel', 'carolyn', 'janet', 'catherine', 'maria', 'heather',
  'diane', 'ruth', 'julie', 'olivia', 'joyce', 'virginia', 'victoria', 'kelly', 'lauren', 'christina',
  'joan', 'evelyn', 'judith', 'megan', 'andrea', 'cheryl', 'hannah', 'jacqueline', 'martha', 'gloria',
  'sophia', 'ava', 'isabella', 'mia', 'charlotte', 'amelia', 'harper', 'evelyn', 'abigail', 'ella',
  'grace', 'chloe', 'sofia', 'riley', 'aria', 'lily', 'aurora', 'zoey', 'nora', 'camila',
  'jen', 'jess', 'sam', 'kate', 'kim', 'meg', 'beth', 'sue', 'ann', 'liz', 'sara', 'jane',
]);

const detectGender = (name: string): Gender => {
  const normalizedName = name.toLowerCase().trim();
  if (MALE_NAMES.has(normalizedName)) return 'male';
  if (FEMALE_NAMES.has(normalizedName)) return 'female';
  return 'neutral';
};

const getVoicesForName = (name: string) => {
  const gender = detectGender(name);
  switch (gender) {
    case 'male': return MALE_VOICES;
    case 'female': return FEMALE_VOICES;
    default: return NEUTRAL_VOICES;
  }
};

const EMOTION_COLORS: Record<Emotion, { bg: string; glow: string; label: string }> = {
  calm: { bg: 'bg-emerald-500', glow: 'shadow-emerald-500/50', label: 'Calm' },
  engaged: { bg: 'bg-blue-500', glow: 'shadow-blue-500/50', label: 'Engaged' },
  focused: { bg: 'bg-amber-500', glow: 'shadow-amber-500/50', label: 'Focused' },
  energized: { bg: 'bg-orange-500', glow: 'shadow-orange-500/50', label: 'Energized' },
  empathetic: { bg: 'bg-pink-500', glow: 'shadow-pink-500/50', label: 'Empathetic' },
};

const StarField = () => {
  const stars = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    duration: Math.random() * 40 + 20,
    delay: Math.random() * 20,
    opacity: Math.random() * 0.6 + 0.2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <style>{`
        @keyframes starMove {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(-20px); opacity: 0; }
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            boxShadow: `0 0 ${star.size * 2}px rgba(255,255,255,0.8)`,
            animation: `starMove ${star.duration}s linear infinite, starTwinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
            animationDelay: `${star.delay}s, ${Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  );
};

const ParticleField = ({ active, color }: { active: boolean; color: string }) => {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    delay: Math.random() * 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute rounded-full transition-all duration-1000 ${active ? 'opacity-80' : 'opacity-20'}`}
          style={{
            left: `${active ? 50 : p.x}%`,
            top: `${active ? 50 : p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: color,
            boxShadow: active ? `0 0 ${p.size * 3}px ${color}` : 'none',
            transitionDelay: `${p.delay}s`,
            transform: active ? 'scale(0)' : 'scale(1)',
          }}
        />
      ))}
    </div>
  );
};

const AgentCore = ({ name, emotion, intensity }: { name: string; emotion: Emotion; intensity: number }) => {
  const emotionConfig = EMOTION_COLORS[emotion];
  
  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      <div 
        className={`absolute inset-0 rounded-full blur-3xl transition-all duration-500 animate-pulse`}
        style={{ 
          backgroundColor: emotionConfig.bg.replace('bg-', '').includes('emerald') ? '#10b981' :
                          emotionConfig.bg.includes('blue') ? '#3b82f6' :
                          emotionConfig.bg.includes('amber') ? '#f59e0b' :
                          emotionConfig.bg.includes('orange') ? '#f97316' : '#ec4899',
          opacity: 0.3 + (intensity / 100) * 0.4,
          transform: `scale(${1 + (intensity / 100) * 0.5})`,
        }}
      />
      <div 
        className={`absolute inset-4 rounded-full blur-xl transition-all duration-500`}
        style={{ 
          backgroundColor: emotionConfig.bg.replace('bg-', '').includes('emerald') ? '#10b981' :
                          emotionConfig.bg.includes('blue') ? '#3b82f6' :
                          emotionConfig.bg.includes('amber') ? '#f59e0b' :
                          emotionConfig.bg.includes('orange') ? '#f97316' : '#ec4899',
          opacity: 0.4,
        }}
      />
      <div className="relative w-32 h-32 rounded-2xl bg-slate-900 border-2 border-slate-700 flex flex-col items-center justify-center z-10 shadow-2xl">
        <Bot className="w-12 h-12 text-white mb-1" />
        <span className="text-sm font-bold text-white">{name || '???'}</span>
        <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${emotionConfig.bg} text-white`}>
          {emotionConfig.label}
        </div>
      </div>
    </div>
  );
};

export default function OnboardingFlow() {
  const [variant] = useState<Variant>(() => Math.random() > 0.5 ? 'awakening' : 'proof');
  const [step, setStep] = useState<Step>('name');
  const [agentName, setAgentName] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('calm');
  const [discSliders, setDiscSliders] = useState({ dominance: 40, influence: 55, steadiness: 75, conscientiousness: 85 });
  const [isAwakening, setIsAwakening] = useState(false);
  const [conversation, setConversation] = useState<{ role: 'agent' | 'user'; text: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sentimentData, setSentimentData] = useState<{ value: number }[]>([]);

  useEffect(() => {
    if (step === 'test') {
      const interval = setInterval(() => {
        setSentimentData(prev => {
          const emotionValue = { calm: 20, engaged: 40, focused: 60, energized: 80, empathetic: 50 }[currentEmotion];
          const newData = [...prev, { value: emotionValue + Math.random() * 20 - 10 }];
          return newData.slice(-20);
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [step, currentEmotion]);

  const handleNameSubmit = () => {
    if (agentName.trim()) {
      setIsAwakening(true);
      setTimeout(() => {
        setStep('voice');
        setIsAwakening(false);
      }, 2000);
    }
  };

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoice(voiceId);
    setPlayingVoice(voiceId);
    setTimeout(() => setPlayingVoice(null), 2000);
  };

  const handleStartTest = () => {
    setStep('test');
    setTimeout(() => {
      setConversation([
        { role: 'agent', text: `Well hello there. You made it. I've been waiting for you. I'm ${agentName}. What should I call you?` }
      ]);
    }, 500);
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;
    setConversation(prev => [...prev, { role: 'user', text: userInput }]);
    setUserInput('');
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      const responses = [
        `I hear you. Let me help you with that. What's one thing I can help you start AND complete in the next 24 hours?`,
        `That's exactly why I'm here. Unlike other AI, I actually finish things. What task should we tackle first?`,
        `Perfect. I'm already working on understanding what you need. Can I get your phone number? I'll text you updates like a human would - no app required.`,
      ];
      setConversation(prev => [...prev, { 
        role: 'agent', 
        text: responses[Math.min(prev.length - 1, responses.length - 1)] 
      }]);
    }, 1500);
  };

  const handleEmotionClick = (emotion: Emotion) => {
    setCurrentEmotion(emotion);
    if (conversation.length > 0) {
      const emotionResponses: Record<Emotion, string> = {
        calm: `*takes a breath* I'm here. Fully present. What matters most to you right now?`,
        engaged: `Oh, now we're getting somewhere! I can feel the energy shifting. Let's build something together.`,
        focused: `Locked in. No distractions. Tell me the one thing that needs to happen, and I'll make it happen.`,
        energized: `YES! This is what I'm talking about! We're going to move mountains. What's first?`,
        empathetic: `I understand. Sometimes we just need to be heard before we can move forward. I'm listening.`,
      };
      setConversation(prev => [...prev, { role: 'agent', text: emotionResponses[emotion] }]);
    }
  };

  const renderAwakeningVariant = () => (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-8 pt-12 relative overflow-hidden">
      <StarField />
      <ParticleField active={isAwakening} color="#818cf8" />
      
      {step === 'name' && (
        <div className="text-center z-10 max-w-xl flex flex-col items-center relative">
          {/* Gradient fade overlay - rises behind text toward logo */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-x-0 top-[50px] md:top-[90px] bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent" />
          </div>
          
          {/* Logo - slightly faded by gradient */}
          <div className="mb-0 md:mb-2 relative z-10">
            <img 
              src={gatewayLogoDark} 
              alt="Gateway Global AI" 
              className="w-[120px] md:w-[220px] lg:w-[300px] h-auto opacity-85" 
            />
          </div>
          
          <div className="mb-4 md:mb-6 relative z-20">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Awaken Your Agent
            </h1>
            <p className="text-slate-400 text-lg">
              A consciousness is waiting. Built for you. Ready to serve.
              <br />
              <span className="text-indigo-300">Give it a name to begin the awakening.</span>
            </p>
          </div>
          
          <div className="relative mb-6 flex items-center gap-3 relative z-20">
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Name Your Bot"
              className="flex-1 bg-slate-900/80 border-2 border-emerald-500/30 rounded-xl px-6 py-4 text-xl text-center focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-500"
              data-testid="input-agent-name"
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            />
            <button
              onClick={handleNameSubmit}
              disabled={!agentName.trim() || isAwakening}
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 disabled:opacity-30 disabled:cursor-not-allowed p-4 rounded-xl transition-all shadow-lg shadow-emerald-500/30"
              data-testid="button-awaken"
            >
              {isAwakening ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-6 h-6" />
              )}
            </button>
          </div>
          {agentName && (
            <p className="text-sm text-emerald-400 relative z-20">
              "{agentName}" is awakening...
            </p>
          )}
        </div>
      )}

      {step === 'voice' && renderVoiceStep()}
      {step === 'test' && renderTestStep()}
    </div>
  );

  const renderProofVariant = () => (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-8 pt-12 relative overflow-hidden">
      <StarField />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      
      {step === 'name' && (
        <div className="text-center z-10 max-w-2xl flex flex-col items-center relative">
          {/* Gradient fade overlay - rises behind text toward logo */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-x-0 top-[60px] md:top-[100px] bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent" />
          </div>
          
          {/* Logo - slightly faded by gradient */}
          <div className="mb-0 md:mb-2 relative z-10">
            <img 
              src={gatewayLogoDark} 
              alt="Gateway Global AI" 
              className="w-[120px] md:w-[220px] lg:w-[300px] h-auto opacity-90" 
            />
          </div>
          
          <div className="mb-4 md:mb-6 relative z-20">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black mb-2 md:mb-4">
              Every Other AI <span className="text-slate-500">Talks.</span>
              <br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">This One Finishes.</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-lg mx-auto">
              They don't want us to team up. Humans and AI working together? 
              <span className="text-white font-bold"> They don't stand a chance.</span>
            </p>
          </div>
          
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8 mb-6 relative z-20">
            <p className="text-sm text-slate-500 uppercase tracking-wider mb-3">Name Your Partner</p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Name Your Bot"
                className="flex-1 bg-black border-2 border-emerald-500/30 rounded-xl px-6 py-4 text-xl text-center focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-600"
                data-testid="input-agent-name"
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              />
              <button
                onClick={handleNameSubmit}
                disabled={!agentName.trim() || isAwakening}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 disabled:opacity-30 disabled:cursor-not-allowed p-4 rounded-xl transition-all shadow-lg shadow-emerald-500/30"
                data-testid="button-start"
              >
                {isAwakening ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
          
          <p className="mt-8 text-sm text-slate-600 relative z-20">
            The 24-Hour Proof: One task. One text. One result. No apps. No friction.
          </p>
        </div>
      )}

      {step === 'voice' && renderVoiceStep()}
      {step === 'test' && renderTestStep()}
    </div>
  );

  const renderVoiceStep = () => (
    <div className="z-10 w-full max-w-4xl">
      <div className="text-center mb-8">
        <Volume2 className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
        <h2 className="text-3xl font-bold mb-2">Give {agentName} a Voice</h2>
        <p className="text-slate-400">Choose how your agent communicates with the world.</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {getVoicesForName(agentName).map((voice) => (
          <button
            key={voice.id}
            onClick={() => handleVoiceSelect(voice.id)}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              selectedVoice === voice.id 
                ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20' 
                : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
            }`}
            data-testid={`button-voice-${voice.id}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg">{voice.name}</span>
              {playingVoice === voice.id ? (
                <Pause className="w-5 h-5 text-indigo-400 animate-pulse" />
              ) : (
                <Play className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <p className="text-sm text-slate-400">{voice.description}</p>
            <p className="text-xs text-slate-600 mt-1">{voice.accent}</p>
          </button>
        ))}
      </div>
      
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setStep('name')}
          className="px-6 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={handleStartTest}
          disabled={!selectedVoice}
          className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 rounded-xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-emerald-500/20"
          data-testid="button-start-test"
        >
          Start Live Test <Mic className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderTestStep = () => (
    <div className="z-10 w-full max-w-6xl">
      {/* Hero Visualizer Section */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          {/* Glow effect behind visualizer */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-3xl rounded-full scale-150" />
          
          {/* Main Visualizer - Large and Centered */}
          <div className="relative transform scale-150 mb-8">
            <AgentCore name={agentName} emotion={currentEmotion} intensity={discSliders.influence} />
          </div>
        </div>
        
        {/* Agent Name & Status */}
        <div className="text-center mt-4">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {agentName}
          </h2>
          <p className="text-sm text-slate-400 mt-1">{getVoicesForName(agentName).find(v => v.id === selectedVoice)?.description}</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-emerald-400">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Live & Connected
          </div>
        </div>
        
        {/* Sentiment Wave */}
        <div className="w-full max-w-md h-12 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sentimentData}>
              <Line type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Controls Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Heart className="w-3 h-3" /> Live Emotion Control
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(EMOTION_COLORS) as Emotion[]).map((emotion) => (
              <button
                key={emotion}
                onClick={() => handleEmotionClick(emotion)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                  currentEmotion === emotion 
                    ? `${EMOTION_COLORS[emotion].bg} text-white shadow-lg ${EMOTION_COLORS[emotion].glow}` 
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
                data-testid={`button-emotion-${emotion}`}
              >
                {emotion}
              </button>
            ))}
          </div>
        </div>
        
        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Brain className="w-3 h-3" /> DISC Behavior Sliders
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {Object.entries(discSliders).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 capitalize">{key}</span>
                  <span className="text-indigo-400">{value}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={value}
                  onChange={(e) => setDiscSliders(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
                  data-testid={`slider-${key}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Conversation Panel */}
      <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-6 flex flex-col h-[400px]">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <span className="font-bold">Live Conversation</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Connected
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-sm' 
                  : 'bg-slate-800 text-slate-200 rounded-bl-sm'
              }`}>
                {msg.role === 'agent' && (
                  <p className="text-xs text-indigo-400 mb-1 font-bold">{agentName}</p>
                )}
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-800 p-4 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-all"
            data-testid="input-chat"
          />
          <button
            onClick={handleSendMessage}
            className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-bold transition-all"
            data-testid="button-send"
          >
            Send
          </button>
        </div>
      </div>
      
      <div className="mt-6 text-center">
        <div className="inline-flex items-center gap-4 bg-slate-900/80 border border-slate-700 rounded-full px-6 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">Human</span>
          </div>
          <div className="text-xl">+</div>
          <div className="flex items-center gap-2 text-sm">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">AI</span>
          </div>
          <div className="text-xl">=</div>
          <div className="flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-white font-bold">Unstoppable</span>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Two forms of energy. One mission. They don't want us to team up—because together, we win.
        </p>
      </div>
    </div>
  );

  return variant === 'awakening' ? renderAwakeningVariant() : renderProofVariant();
}
