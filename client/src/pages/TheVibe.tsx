import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  ChevronLeft, Coffee, Send, Music, Moon, Sparkles,
  Server, Zap, Cpu, Radio
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

const MOOD_COLORS: Record<Mood, { primary: string; glow: string; label: string; bg: string }> = {
  calm: { primary: 'rgba(16, 185, 129, 0.8)', glow: 'rgba(16, 185, 129, 0.4)', label: 'Calm', bg: 'from-emerald-950/50' },
  reflective: { primary: 'rgba(139, 92, 246, 0.8)', glow: 'rgba(139, 92, 246, 0.4)', label: 'Reflective', bg: 'from-purple-950/50' },
  supportive: { primary: 'rgba(59, 130, 246, 0.8)', glow: 'rgba(59, 130, 246, 0.4)', label: 'Supportive', bg: 'from-blue-950/50' },
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
  
  const [discScores, setDiscScores] = useState<DiscScores>(VIBE_PRESETS.calm);
  
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });
  
  const agent = agents.find(a => a.id === agentId);
  const avatar = AVATAR_OPTIONS.find(a => a.id === agent?.avatarId) || AVATAR_OPTIONS[0];

  useEffect(() => {
    setDiscScores(VIBE_PRESETS[mood]);
  }, [mood]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: message }]);
    setMessage('');
    
    setTimeout(() => {
      const responses = {
        calm: "I'm here with you. Take your time, there's no rush. What's on your mind?",
        reflective: "That's an interesting thought. Let me reflect on that with you...",
        supportive: "I hear you. You're doing great. How can I help support you today?",
      };
      setMessages(prev => [...prev, { role: 'agent', text: responses[mood] }]);
    }, 1500);
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
            <div className="h-64 overflow-y-auto mb-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center">
                  <div>
                    <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-slate-500">Start a relaxed conversation with {agent.name}</p>
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
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>
            
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
                onClick={handleSendMessage}
                className="bg-purple-600 hover:bg-purple-500"
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
