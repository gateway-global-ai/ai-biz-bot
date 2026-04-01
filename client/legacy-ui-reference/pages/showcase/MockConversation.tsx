import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Loader2, MessageSquare, RefreshCw, Save, FileText, Plus, Trash2, Server, Zap, Cpu, Radio, ChevronRight, Eye, EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { DiscScores, ArchProfile, SystemPrompt } from '@shared/schema';

const SCENARIOS = [
  { id: 'intro', label: 'Introduction', prompt: 'a friendly introduction and offering to help with questions' },
  { id: 'support', label: 'Customer Support', prompt: 'helping a customer who is frustrated with a product issue' },
  { id: 'sales', label: 'Sales Pitch', prompt: 'presenting the benefits of upgrading to a premium plan' },
  { id: 'scheduling', label: 'Appointment Scheduling', prompt: 'helping schedule an appointment while being efficient with time' },
  { id: 'followup', label: 'Follow-up Call', prompt: 'following up on a previous conversation to check in on progress' },
];

const VOICES = [
  { id: 'Kore', name: 'Kore', description: 'Warm and professional' },
  { id: 'Puck', name: 'Puck', description: 'Friendly and upbeat' },
  { id: 'Charon', name: 'Charon', description: 'Deep and authoritative' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Calm and reassuring' },
  { id: 'Aoede', name: 'Aoede', description: 'Clear and articulate' },
  { id: 'Leda', name: 'Leda', description: 'Soft and gentle' },
];

const ARCH_COLORS = {
  A: '#10b981',
  R: '#3b82f6',
  Cx: '#f59e0b',
  H: '#ef4444',
};

type Sentiment = 'calm' | 'engaged' | 'alert' | 'stressed' | 'hostile';

const SENTIMENT_COLORS: Record<Sentiment, { primary: string; glow: string; label: string }> = {
  calm: { primary: 'rgba(16, 185, 129, 0.8)', glow: 'rgba(16, 185, 129, 0.4)', label: 'CALM' },
  engaged: { primary: 'rgba(59, 130, 246, 0.8)', glow: 'rgba(59, 130, 246, 0.4)', label: 'ENGAGED' },
  alert: { primary: 'rgba(250, 204, 21, 0.8)', glow: 'rgba(250, 204, 21, 0.4)', label: 'ALERT' },
  stressed: { primary: 'rgba(249, 115, 22, 0.8)', glow: 'rgba(249, 115, 22, 0.4)', label: 'STRESSED' },
  hostile: { primary: 'rgba(239, 68, 68, 0.8)', glow: 'rgba(239, 68, 68, 0.4)', label: 'HOSTILE' },
};

const MOCK_PERSONAS: PersonaType[] = [
  {
    id: 'persona-001',
    name: 'Executive Alpha',
    description: 'High Dominance executive assistant',
    discScores: { dominance: 85, influence: 45, steadiness: 30, conscientiousness: 75 },
    archScores: { acknowledge: 60, reflect: 40, context: 70, handoff: 30 },
    voice: 'Charon',
    systemPrompt: {
      ownerIdentity: 'The Owner is the CEO of a Fortune 500 company.',
      loyaltyStatement: 'I serve the Owner with unwavering dedication and discretion.',
      ownerPriorities: 'Time efficiency, strategic insights, and proactive problem solving.',
      dataProtectionMantra: 'All data is classified. Encrypt everything. Trust no one.',
      securityStatement: 'I am the first line of defense. I verify, validate, and protect.',
      discReinforcement: 'Be direct. Be decisive. Lead with authority.'
    },
    createdAt: '2026-01-15'
  },
  {
    id: 'persona-002',
    name: 'Support Empath',
    description: 'High Influence customer support',
    discScores: { dominance: 35, influence: 85, steadiness: 70, conscientiousness: 50 },
    archScores: { acknowledge: 90, reflect: 75, context: 60, handoff: 45 },
    voice: 'Kore',
    systemPrompt: {
      ownerIdentity: 'The Owner leads the Customer Success team.',
      loyaltyStatement: 'I exist to make every customer feel valued and understood.',
      ownerPriorities: 'Customer satisfaction, emotional intelligence, resolution speed.',
      dataProtectionMantra: 'Customer privacy is sacred. Only access what is needed.',
      securityStatement: 'I protect customer data as if it were my own.',
      discReinforcement: 'Be warm. Be patient. Connect emotionally.'
    },
    createdAt: '2026-01-20'
  }
];

interface PersonaType {
  id: string;
  name: string;
  description: string;
  discScores: DiscScores;
  archScores: ArchProfile;
  voice: string;
  systemPrompt: {
    ownerIdentity: string;
    loyaltyStatement: string;
    ownerPriorities: string;
    dataProtectionMantra: string;
    securityStatement: string;
    discReinforcement: string;
  };
  createdAt: string;
}

const BotAvatar = ({ scores, isThinking, sentiment }: { scores: DiscScores; isThinking: boolean; sentiment: Sentiment }) => {
  const { dominance: d, influence: i, steadiness: s, conscientiousness: c } = scores;
  const dNorm = d / 100;
  const iNorm = i / 100;
  const sNorm = s / 100;
  const cNorm = c / 100;
  const sentimentConfig = SENTIMENT_COLORS[sentiment];
  const auraIntensity = 0.5 + (dNorm * 0.3) + (iNorm * 0.2);

  return (
    <div className="relative w-52 h-52 flex items-center justify-center mx-auto">
      <div 
        className={`absolute inset-0 border border-dashed rounded-full ${isThinking ? 'animate-spin' : ''}`}
        style={{ 
          borderColor: `rgba(59, 130, 246, ${Math.max(cNorm, 0.2)})`, 
          opacity: cNorm,
          animationDuration: isThinking ? '2s' : '20s'
        }}
      />
      <div 
        className={`absolute inset-4 border border-dotted rounded-full ${isThinking ? 'animate-spin' : ''}`}
        style={{ 
          borderColor: `rgba(96, 165, 250, ${Math.max(cNorm, 0.2)})`, 
          opacity: cNorm * 0.8,
          animationDirection: 'reverse',
          animationDuration: isThinking ? '2s' : '15s'
        }}
      />
      
      <div 
        className="absolute rounded-full blur-3xl transition-all duration-1000 animate-pulse"
        style={{ 
          width: `${150 + auraIntensity * 50}%`,
          height: `${150 + auraIntensity * 50}%`,
          background: `radial-gradient(circle, ${sentimentConfig.primary} 0%, ${sentimentConfig.glow} 30%, transparent 70%)`,
          opacity: 0.3 * auraIntensity
        }}
      />

      <div 
        className="absolute rounded-full blur-2xl transition-all duration-1000"
        style={{ 
          width: `${100 + iNorm * 100}%`,
          height: `${100 + iNorm * 100}%`,
          background: `radial-gradient(circle, rgba(250, 204, 21, ${iNorm * 0.4}) 0%, transparent 70%)`,
          opacity: (0.6 + (iNorm * 0.4)) * (isThinking ? 1.5 : 1)
        }}
      />
      
      <div 
        className="absolute inset-12 rounded-full blur-xl transition-all duration-1000"
        style={{ 
          backgroundColor: `rgba(16, 185, 129, ${sNorm * 0.2})`,
          boxShadow: `0 0 ${sNorm * 60}px rgba(16, 185, 129, ${sNorm * 0.5})`
        }}
      />

      <div 
        className="absolute w-24 h-24 rounded-xl flex items-center justify-center bg-slate-900 border-2 z-10 transition-all duration-500"
        style={{
          borderColor: sentimentConfig.primary,
          boxShadow: `0 0 ${dNorm * 40 * auraIntensity}px ${sentimentConfig.glow}, 0 0 ${20 * auraIntensity}px ${sentimentConfig.glow}`,
          transform: `scale(${0.9 + dNorm * 0.2})`
        }}
      >
        <div className="relative z-20 flex flex-col items-center">
          <Server className={`w-12 h-12 text-slate-200 transition-colors ${isThinking ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]' : ''}`} />
          <div className="flex gap-1 mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${d > 50 || isThinking ? 'bg-pink-500 animate-pulse' : 'bg-slate-700'}`} />
            <div className={`w-1.5 h-1.5 rounded-full ${i > 50 || isThinking ? 'bg-yellow-500 animate-pulse' : 'bg-slate-700'}`} />
            <div className={`w-1.5 h-1.5 rounded-full ${s > 50 || isThinking ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`} />
            <div className={`w-1.5 h-1.5 rounded-full ${c > 50 || isThinking ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'}`} />
          </div>
        </div>
      </div>

      <div className="absolute top-2 left-2 flex items-center gap-1">
        <div 
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: sentimentConfig.primary, boxShadow: `0 0 8px ${sentimentConfig.glow}` }}
        />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: sentimentConfig.primary }}>
          {sentimentConfig.label}
        </span>
      </div>

      <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-3 text-[9px] font-mono opacity-70">
        <div className="flex items-center gap-0.5 text-pink-400"><Zap className="w-2 h-2" /> {d}%</div>
        <div className="flex items-center gap-0.5 text-yellow-400"><Radio className="w-2 h-2" /> {i}%</div>
        <div className="flex items-center gap-0.5 text-green-400"><Cpu className="w-2 h-2" /> {s}%</div>
        <div className="flex items-center gap-0.5 text-blue-400"><Server className="w-2 h-2" /> {c}%</div>
      </div>
    </div>
  );
};

const ArchBreakdown = ({ data }: { data: ArchProfile }) => {
  const barData = [
    { name: 'Acknowledge', short: 'A', value: data.acknowledge, color: ARCH_COLORS.A },
    { name: 'Reflect', short: 'R', value: data.reflect, color: ARCH_COLORS.R },
    { name: 'Context', short: 'Cx', value: data.context, color: ARCH_COLORS.Cx },
    { name: 'Handoff', short: 'H', value: data.handoff, color: ARCH_COLORS.H },
  ];

  return (
    <div className="h-36 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 0 }}>
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '500' }} />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
            {barData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function MockConversation() {
  const [agentName, setAgentName] = useState('NEXUS');
  const [scenario, setScenario] = useState('intro');
  const [voice, setVoice] = useState('Kore');
  const [discProfile, setDiscProfile] = useState<DiscScores>({
    dominance: 50,
    influence: 70,
    steadiness: 60,
    conscientiousness: 55,
  });
  const [archProfile, setArchProfile] = useState<ArchProfile>({
    acknowledge: 75,
    reflect: 60,
    context: 50,
    handoff: 30,
  });
  const [systemPrompt, setSystemPrompt] = useState({
    ownerIdentity: '',
    loyaltyStatement: '',
    ownerPriorities: '',
    dataProtectionMantra: '',
    securityStatement: '',
    discReinforcement: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [conversationText, setConversationText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentSentiment, setCurrentSentiment] = useState<Sentiment>('calm');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showPersonas, setShowPersonas] = useState(false);
  const [personas, setPersonas] = useState<PersonaType[]>(MOCK_PERSONAS);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [newPersonaDesc, setNewPersonaDesc] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isGenerating) {
      const sentiments: Sentiment[] = ['engaged', 'alert', 'calm'];
      let idx = 0;
      const interval = setInterval(() => {
        setCurrentSentiment(sentiments[idx % sentiments.length]);
        idx++;
      }, 500);
      return () => clearInterval(interval);
    } else {
      setCurrentSentiment('calm');
    }
  }, [isGenerating]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setConversationText(null);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);

    try {
      const selectedScenario = SCENARIOS.find(s => s.id === scenario);
      
      const response = await fetch('/api/conversation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName,
          discProfile,
          archProfile,
          systemPrompt,
          scenario: selectedScenario?.prompt,
          voice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate conversation');
      }

      const data = await response.json();
      setConversationText(data.text);
      setCurrentSentiment('engaged');

      if (data.audio?.data) {
        const audioBytes = Uint8Array.from(atob(data.audio.data), c => c.charCodeAt(0));
        const mimeType = data.audio.mimeType || '';
        
        if (mimeType.includes('L16') || mimeType.includes('pcm')) {
          const sampleRate = 24000;
          const numChannels = 1;
          const bitsPerSample = 16;
          const wavHeader = new ArrayBuffer(44);
          const view = new DataView(wavHeader);
          
          const writeString = (offset: number, str: string) => {
            for (let i = 0; i < str.length; i++) {
              view.setUint8(offset + i, str.charCodeAt(i));
            }
          };
          
          writeString(0, 'RIFF');
          view.setUint32(4, 36 + audioBytes.length, true);
          writeString(8, 'WAVE');
          writeString(12, 'fmt ');
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true);
          view.setUint16(22, numChannels, true);
          view.setUint32(24, sampleRate, true);
          view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
          view.setUint16(32, numChannels * bitsPerSample / 8, true);
          view.setUint16(34, bitsPerSample, true);
          writeString(36, 'data');
          view.setUint32(40, audioBytes.length, true);
          
          const wavBlob = new Blob([wavHeader, audioBytes], { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(wavBlob);
          audioRef.current = new Audio(audioUrl);
        } else {
          const audioBlob = new Blob([audioBytes], { type: mimeType || 'audio/mp3' });
          const audioUrl = URL.createObjectURL(audioBlob);
          audioRef.current = new Audio(audioUrl);
        }
        
        audioRef.current.onended = () => setIsPlaying(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const updateDisc = (key: keyof DiscScores, value: number[]) => {
    setDiscProfile(prev => ({ ...prev, [key]: value[0] }));
  };

  const updateArch = (key: keyof ArchProfile, value: number[]) => {
    setArchProfile(prev => ({ ...prev, [key]: value[0] }));
  };

  const loadPersona = (persona: PersonaType) => {
    setAgentName(persona.name);
    setDiscProfile(persona.discScores);
    setArchProfile(persona.archScores);
    setVoice(persona.voice);
    setSystemPrompt(persona.systemPrompt);
    setShowPersonas(false);
  };

  const savePersona = () => {
    if (!newPersonaName.trim()) return;
    const newPersona: PersonaType = {
      id: `persona-${Date.now()}`,
      name: newPersonaName,
      description: newPersonaDesc || 'Custom persona',
      discScores: { ...discProfile },
      archScores: { ...archProfile },
      voice,
      systemPrompt: { ...systemPrompt },
      createdAt: new Date().toISOString().split('T')[0]
    };
    setPersonas(prev => [...prev, newPersona]);
    setShowSaveModal(false);
    setNewPersonaName('');
    setNewPersonaDesc('');
  };

  const deletePersona = (id: string) => {
    setPersonas(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <MessageSquare className="w-8 h-8 text-indigo-400" />
            <h1 className="text-2xl font-bold">Mock Conversation Generator</h1>
          </div>
          <p className="text-slate-400 text-sm">Configure agent personality and generate AI-powered conversations</p>
        </div>

        <div className="flex justify-end gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPersonas(!showPersonas)}
            className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10"
            data-testid="button-view-personas"
          >
            {showPersonas ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showPersonas ? 'Hide' : 'View'} Personas
          </Button>
          <Button
            onClick={() => setShowSaveModal(true)}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500"
            data-testid="button-save-persona"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Persona
          </Button>
        </div>

        {showPersonas && (
          <Card className="bg-slate-900 border-slate-700 mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Saved Personas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {personas.map(persona => (
                  <div 
                    key={persona.id}
                    className="bg-slate-800 rounded-lg border border-slate-700 p-4 hover:border-indigo-500/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-white">{persona.name}</h4>
                        <p className="text-xs text-slate-400">{persona.description}</p>
                      </div>
                      <button 
                        onClick={() => deletePersona(persona.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                        data-testid={`button-delete-persona-${persona.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-2 text-[10px] font-mono mb-3">
                      <span className="text-pink-400">D:{persona.discScores.dominance}</span>
                      <span className="text-yellow-400">I:{persona.discScores.influence}</span>
                      <span className="text-green-400">S:{persona.discScores.steadiness}</span>
                      <span className="text-blue-400">C:{persona.discScores.conscientiousness}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                      onClick={() => loadPersona(persona)}
                      data-testid={`button-load-persona-${persona.id}`}
                    >
                      <ChevronRight className="w-4 h-4 mr-1" /> Load
                    </Button>
                  </div>
                ))}
                <div 
                  onClick={() => setShowSaveModal(true)}
                  className="bg-slate-800/50 rounded-lg border border-dashed border-slate-700 p-4 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 transition-colors min-h-[140px]"
                >
                  <Plus className="w-8 h-8 text-slate-500 mb-2" />
                  <span className="text-sm text-slate-500">Create New Persona</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Agent Visualizer</CardTitle>
            </CardHeader>
            <CardContent>
              <BotAvatar scores={discProfile} isThinking={isGenerating} sentiment={currentSentiment} />
              <div className="mt-4">
                <Label htmlFor="agentName" className="text-xs text-slate-400">Agent Name</Label>
                <Input
                  id="agentName"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Enter agent name"
                  className="bg-slate-800 border-slate-600 mt-1"
                  data-testid="input-agent-name"
                />
              </div>
              <div className="mt-3">
                <Label className="text-xs text-slate-400">Voice</Label>
                <Select value={voice} onValueChange={setVoice}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 mt-1" data-testid="select-voice">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICES.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} - {v.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">DISC Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-pink-400">Dominance</span>
                  <span>{discProfile.dominance}%</span>
                </div>
                <Slider
                  value={[discProfile.dominance]}
                  onValueChange={(v) => updateDisc('dominance', v)}
                  max={100}
                  className="[&>span]:bg-pink-500"
                  data-testid="slider-dominance"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-yellow-400">Influence</span>
                  <span>{discProfile.influence}%</span>
                </div>
                <Slider
                  value={[discProfile.influence]}
                  onValueChange={(v) => updateDisc('influence', v)}
                  max={100}
                  className="[&>span]:bg-yellow-500"
                  data-testid="slider-influence"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-400">Steadiness</span>
                  <span>{discProfile.steadiness}%</span>
                </div>
                <Slider
                  value={[discProfile.steadiness]}
                  onValueChange={(v) => updateDisc('steadiness', v)}
                  max={100}
                  className="[&>span]:bg-emerald-500"
                  data-testid="slider-steadiness"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-400">Conscientiousness</span>
                  <span>{discProfile.conscientiousness}%</span>
                </div>
                <Slider
                  value={[discProfile.conscientiousness]}
                  onValueChange={(v) => updateDisc('conscientiousness', v)}
                  max={100}
                  className="[&>span]:bg-blue-500"
                  data-testid="slider-conscientiousness"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">ARCH Communication Model</CardTitle>
            </CardHeader>
            <CardContent>
              <ArchBreakdown data={archProfile} />
              <div className="space-y-2 mt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-emerald-400">Acknowledge</span>
                    <span>{archProfile.acknowledge}%</span>
                  </div>
                  <Slider
                    value={[archProfile.acknowledge]}
                    onValueChange={(v) => updateArch('acknowledge', v)}
                    max={100}
                    className="[&>span]:bg-emerald-500"
                    data-testid="slider-acknowledge"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-blue-400">Reflect</span>
                    <span>{archProfile.reflect}%</span>
                  </div>
                  <Slider
                    value={[archProfile.reflect]}
                    onValueChange={(v) => updateArch('reflect', v)}
                    max={100}
                    className="[&>span]:bg-blue-500"
                    data-testid="slider-reflect"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-amber-400">Context</span>
                    <span>{archProfile.context}%</span>
                  </div>
                  <Slider
                    value={[archProfile.context]}
                    onValueChange={(v) => updateArch('context', v)}
                    max={100}
                    className="[&>span]:bg-amber-500"
                    data-testid="slider-context"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-red-400">Handoff</span>
                    <span>{archProfile.handoff}%</span>
                  </div>
                  <Slider
                    value={[archProfile.handoff]}
                    onValueChange={(v) => updateArch('handoff', v)}
                    max={100}
                    className="[&>span]:bg-red-500"
                    data-testid="slider-handoff"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900 border-slate-700 mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                System Identity Prompts
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                className="text-slate-400 hover:text-white"
                data-testid="button-toggle-prompts"
              >
                {showSystemPrompt ? 'Hide' : 'Show'} Prompts
              </Button>
            </div>
          </CardHeader>
          {showSystemPrompt && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-purple-400">Owner Identity</Label>
                  <Textarea
                    value={systemPrompt.ownerIdentity}
                    onChange={(e) => setSystemPrompt(prev => ({ ...prev, ownerIdentity: e.target.value }))}
                    placeholder="The Owner is the..."
                    className="bg-slate-800 border-slate-600 mt-1 text-sm resize-none"
                    rows={3}
                    data-testid="textarea-owner-identity"
                  />
                </div>
                <div>
                  <Label className="text-xs text-pink-400">Data Protection Mantra</Label>
                  <Textarea
                    value={systemPrompt.dataProtectionMantra}
                    onChange={(e) => setSystemPrompt(prev => ({ ...prev, dataProtectionMantra: e.target.value }))}
                    placeholder="Data is the lifeblood..."
                    className="bg-slate-800 border-slate-600 mt-1 text-sm resize-none"
                    rows={3}
                    data-testid="textarea-data-protection"
                  />
                </div>
                <div>
                  <Label className="text-xs text-rose-400">Statement of Loyalty</Label>
                  <Textarea
                    value={systemPrompt.loyaltyStatement}
                    onChange={(e) => setSystemPrompt(prev => ({ ...prev, loyaltyStatement: e.target.value }))}
                    placeholder="I serve only the Owner..."
                    className="bg-slate-800 border-slate-600 mt-1 text-sm resize-none"
                    rows={3}
                    data-testid="textarea-loyalty"
                  />
                </div>
                <div>
                  <Label className="text-xs text-cyan-400">Systems Security Statement</Label>
                  <Textarea
                    value={systemPrompt.securityStatement}
                    onChange={(e) => setSystemPrompt(prev => ({ ...prev, securityStatement: e.target.value }))}
                    placeholder="I am a fortress..."
                    className="bg-slate-800 border-slate-600 mt-1 text-sm resize-none"
                    rows={3}
                    data-testid="textarea-security"
                  />
                </div>
                <div>
                  <Label className="text-xs text-yellow-400">Owner Priorities</Label>
                  <Textarea
                    value={systemPrompt.ownerPriorities}
                    onChange={(e) => setSystemPrompt(prev => ({ ...prev, ownerPriorities: e.target.value }))}
                    placeholder="Efficiency, brevity..."
                    className="bg-slate-800 border-slate-600 mt-1 text-sm resize-none"
                    rows={3}
                    data-testid="textarea-priorities"
                  />
                </div>
                <div>
                  <Label className="text-xs text-indigo-400">DISC Reinforcement</Label>
                  <Textarea
                    value={systemPrompt.discReinforcement}
                    onChange={(e) => setSystemPrompt(prev => ({ ...prev, discReinforcement: e.target.value }))}
                    placeholder="Maintain High Dominance..."
                    className="bg-slate-800 border-slate-600 mt-1 text-sm resize-none"
                    rows={3}
                    data-testid="textarea-disc-reinforcement"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        <Card className="bg-slate-900 border-slate-700 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1">
                <Label className="text-xs text-slate-400">Scenario</Label>
                <Select value={scenario} onValueChange={setScenario}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 mt-1" data-testid="select-scenario">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCENARIOS.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 mt-5"
                data-testid="button-generate"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Generate Conversation
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="text-red-400 text-center mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                {error}
              </div>
            )}

            {conversationText && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold">{agentName.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-indigo-400 mb-1">{agentName}</p>
                      <p className="text-slate-300">{conversationText}</p>
                    </div>
                  </div>
                </div>

                {audioRef.current && (
                  <div className="flex justify-center">
                    <Button
                      onClick={togglePlay}
                      variant="outline"
                      size="lg"
                      className="border-indigo-500 text-indigo-400 hover:bg-indigo-500/10"
                      data-testid="button-play"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-5 h-5 mr-2" />
                          Pause Audio
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-5 h-5 mr-2" />
                          Play Audio
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-md w-full">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Save Persona</h3>
              <button onClick={() => setShowSaveModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Persona Name</Label>
                <Input
                  value={newPersonaName}
                  onChange={(e) => setNewPersonaName(e.target.value)}
                  placeholder="e.g., Sales Leader"
                  className="bg-slate-800 border-slate-600 mt-1"
                  data-testid="input-persona-name"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input
                  value={newPersonaDesc}
                  onChange={(e) => setNewPersonaDesc(e.target.value)}
                  placeholder="Brief description..."
                  className="bg-slate-800 border-slate-600 mt-1"
                  data-testid="input-persona-desc"
                />
              </div>
              <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-400">
                <p className="font-medium text-white mb-1">Current Configuration:</p>
                <p>DISC: D:{discProfile.dominance} I:{discProfile.influence} S:{discProfile.steadiness} C:{discProfile.conscientiousness}</p>
                <p>ARCH: A:{archProfile.acknowledge} R:{archProfile.reflect} Cx:{archProfile.context} H:{archProfile.handoff}</p>
                <p>Voice: {voice}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-600"
                  onClick={() => setShowSaveModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500"
                  onClick={savePersona}
                  disabled={!newPersonaName.trim()}
                  data-testid="button-confirm-save"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
