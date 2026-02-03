import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { 
  ChevronLeft, FlaskConical, Save, Bot,
  Server, Zap, Cpu, Radio, Eye, EyeOff,
  Fingerprint, Heart, ShieldCheck, Database, Lock, Sparkles
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

const VOICES = [
  { id: 'kore', name: 'Kore', description: 'Warm & Professional' },
  { id: 'puck', name: 'Puck', description: 'Friendly & Upbeat' },
  { id: 'charon', name: 'Charon', description: 'Deep & Authoritative' },
  { id: 'fenrir', name: 'Fenrir', description: 'Calm & Reassuring' },
  { id: 'aoede', name: 'Aoede', description: 'Clear & Articulate' },
  { id: 'leda', name: 'Leda', description: 'Soft & Gentle' },
];

const ARCH_COLORS = {
  A: '#10b981',
  R: '#3b82f6',
  Cx: '#f59e0b',
  H: '#ef4444',
};

type Sentiment = 'calm' | 'engaged' | 'alert';

const SENTIMENT_COLORS: Record<Sentiment, { primary: string; glow: string }> = {
  calm: { primary: 'rgba(16, 185, 129, 0.8)', glow: 'rgba(16, 185, 129, 0.4)' },
  engaged: { primary: 'rgba(59, 130, 246, 0.8)', glow: 'rgba(59, 130, 246, 0.4)' },
  alert: { primary: 'rgba(250, 204, 21, 0.8)', glow: 'rgba(250, 204, 21, 0.4)' },
};

const BotAvatar = ({ scores }: { scores: DiscScores }) => {
  const { dominance: d, influence: i, steadiness: s, conscientiousness: c } = scores;
  const dNorm = d / 100;
  const iNorm = i / 100;
  const sNorm = s / 100;
  const cNorm = c / 100;

  return (
    <div className="relative w-36 h-36 flex items-center justify-center mx-auto">
      <div 
        className="absolute inset-0 border border-dashed rounded-full animate-spin"
        style={{ 
          borderColor: `rgba(59, 130, 246, ${Math.max(cNorm, 0.2)})`, 
          opacity: cNorm,
          animationDuration: '20s'
        }}
      />
      <div 
        className="absolute inset-3 border border-dotted rounded-full animate-spin"
        style={{ 
          borderColor: `rgba(96, 165, 250, ${Math.max(cNorm, 0.2)})`, 
          opacity: cNorm * 0.8,
          animationDirection: 'reverse',
          animationDuration: '15s'
        }}
      />
      
      <div 
        className="absolute rounded-full blur-2xl transition-all duration-1000"
        style={{ 
          width: `${100 + iNorm * 100}%`,
          height: `${100 + iNorm * 100}%`,
          background: `radial-gradient(circle, rgba(250, 204, 21, ${iNorm * 0.4}) 0%, transparent 70%)`,
          opacity: 0.6 + (iNorm * 0.4)
        }}
      />
      
      <div 
        className="absolute inset-8 rounded-full blur-xl transition-all duration-1000"
        style={{ 
          backgroundColor: `rgba(16, 185, 129, ${sNorm * 0.2})`,
          boxShadow: `0 0 ${sNorm * 60}px rgba(16, 185, 129, ${sNorm * 0.5})`
        }}
      />

      <div 
        className="absolute w-16 h-16 rounded-xl flex items-center justify-center bg-slate-900 border-2 z-10"
        style={{
          borderColor: `rgba(16, 185, 129, 0.8)`,
          boxShadow: `0 0 ${dNorm * 30}px rgba(16, 185, 129, 0.4)`,
          transform: `scale(${0.9 + dNorm * 0.2})`
        }}
      >
        <Server className="w-8 h-8 text-slate-200" />
        <div className="absolute -bottom-1 flex gap-0.5">
          <div className={`w-1 h-1 rounded-full ${d > 50 ? 'bg-pink-500 animate-pulse' : 'bg-slate-700'}`} />
          <div className={`w-1 h-1 rounded-full ${i > 50 ? 'bg-yellow-500 animate-pulse' : 'bg-slate-700'}`} />
          <div className={`w-1 h-1 rounded-full ${s > 50 ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`} />
          <div className={`w-1 h-1 rounded-full ${c > 50 ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'}`} />
        </div>
      </div>
    </div>
  );
};

const ArchBreakdown = ({ data }: { data: ArchProfile }) => {
  const barData = [
    { name: 'Acknowledge', value: data.acknowledge, color: ARCH_COLORS.A },
    { name: 'Reflect', value: data.reflect, color: ARCH_COLORS.R },
    { name: 'Context', value: data.context, color: ARCH_COLORS.Cx },
    { name: 'Handoff', value: data.handoff, color: ARCH_COLORS.H },
  ];

  return (
    <div className="h-28 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 15, top: 5, bottom: 0 }}>
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis dataKey="name" type="category" width={75} tick={{ fill: '#94a3b8', fontSize: 9 }} />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
            {barData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface SystemPromptState {
  ownerIdentity: string;
  loyaltyStatement: string;
  ownerPriorities: string;
  dataProtectionMantra: string;
  securityStatement: string;
  discReinforcement: string;
}

export default function TheLab() {
  const [, params] = useRoute('/agent/:agentId/lab');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const agentId = params?.agentId;
  
  const [showSystemPrompts, setShowSystemPrompts] = useState(true);
  
  const [discScores, setDiscScores] = useState<DiscScores>({
    dominance: 50,
    influence: 50,
    steadiness: 50,
    conscientiousness: 50,
  });
  
  const [archScores, setArchScores] = useState<ArchProfile>({
    acknowledge: 75,
    reflect: 60,
    context: 50,
    handoff: 30,
  });
  
  const [systemPrompt, setSystemPrompt] = useState<SystemPromptState>({
    ownerIdentity: '',
    loyaltyStatement: '',
    ownerPriorities: '',
    dataProtectionMantra: '',
    securityStatement: '',
    discReinforcement: '',
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });
  
  const agent = agents.find(a => a.id === agentId);
  const avatar = AVATAR_OPTIONS.find(a => a.id === agent?.avatarId) || AVATAR_OPTIONS[0];

  useEffect(() => {
    if (agent) {
      setDiscScores({
        dominance: agent.dominance || 50,
        influence: agent.influence || 50,
        steadiness: agent.steadiness || 50,
        conscientiousness: agent.conscientiousness || 50,
      });
    }
  }, [agent]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Agent> }) => 
      apiRequest('PATCH', `/api/agents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      toast({ title: 'Agent configuration saved!' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const saveConfig = () => {
    if (!agent) return;
    updateMutation.mutate({
      id: agent.id,
      data: {
        dominance: discScores.dominance,
        influence: discScores.influence,
        steadiness: discScores.steadiness,
        conscientiousness: discScores.conscientiousness,
      }
    });
  };

  const updateDisc = (key: keyof DiscScores, value: number[]) => {
    setDiscScores(prev => ({ ...prev, [key]: value[0] }));
  };

  const updateArch = (key: keyof ArchProfile, value: number[]) => {
    setArchScores(prev => ({ ...prev, [key]: value[0] }));
  };

  if (!agent) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <FlaskConical className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading The Lab...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950/30 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/agents')}
              className="text-slate-400 hover:text-white"
              data-testid="button-back"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-emerald-500/50">
              <img src={avatar.src} alt={agent.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{agent.name}</h1>
              <p className="text-xs text-slate-400">Fine Tuning Lab</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSystemPrompts(!showSystemPrompts)}
              className="border-slate-600"
              data-testid="button-toggle-prompts"
            >
              {showSystemPrompts ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showSystemPrompts ? 'Hide' : 'Show'} Prompts
            </Button>
            <Button 
              onClick={saveConfig}
              className="bg-emerald-600 hover:bg-emerald-500"
              data-testid="button-save-config"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-400" />
                Agent Visualizer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BotAvatar scores={discScores} />
              <div className="mt-4">
                <Label className="text-xs text-slate-400">Voice</Label>
                <Select value={agent.voiceId} onValueChange={() => {}}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 mt-1 h-9" data-testid="select-voice">
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
            <CardContent className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-pink-400">Dominance</span>
                  <span className="text-slate-300">{discScores.dominance}%</span>
                </div>
                <Slider
                  value={[discScores.dominance]}
                  onValueChange={(v) => updateDisc('dominance', v)}
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:bg-pink-500"
                  data-testid="slider-dominance"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-yellow-400">Influence</span>
                  <span className="text-slate-300">{discScores.influence}%</span>
                </div>
                <Slider
                  value={[discScores.influence]}
                  onValueChange={(v) => updateDisc('influence', v)}
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:bg-yellow-500"
                  data-testid="slider-influence"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-green-400">Steadiness</span>
                  <span className="text-slate-300">{discScores.steadiness}%</span>
                </div>
                <Slider
                  value={[discScores.steadiness]}
                  onValueChange={(v) => updateDisc('steadiness', v)}
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:bg-green-500"
                  data-testid="slider-steadiness"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-400">Conscientiousness</span>
                  <span className="text-slate-300">{discScores.conscientiousness}%</span>
                </div>
                <Slider
                  value={[discScores.conscientiousness]}
                  onValueChange={(v) => updateDisc('conscientiousness', v)}
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:bg-blue-500"
                  data-testid="slider-conscientiousness"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">ARCH Communication Model</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-400">Acknowledge</span>
                  <span className="text-slate-300">{archScores.acknowledge}%</span>
                </div>
                <Slider
                  value={[archScores.acknowledge]}
                  onValueChange={(v) => updateArch('acknowledge', v)}
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:bg-emerald-500"
                  data-testid="slider-acknowledge"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-400">Reflect</span>
                  <span className="text-slate-300">{archScores.reflect}%</span>
                </div>
                <Slider
                  value={[archScores.reflect]}
                  onValueChange={(v) => updateArch('reflect', v)}
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:bg-blue-500"
                  data-testid="slider-reflect"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-400">Context</span>
                  <span className="text-slate-300">{archScores.context}%</span>
                </div>
                <Slider
                  value={[archScores.context]}
                  onValueChange={(v) => updateArch('context', v)}
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:bg-amber-500"
                  data-testid="slider-context"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-red-400">Handoff</span>
                  <span className="text-slate-300">{archScores.handoff}%</span>
                </div>
                <Slider
                  value={[archScores.handoff]}
                  onValueChange={(v) => updateArch('handoff', v)}
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:bg-red-500"
                  data-testid="slider-handoff"
                />
              </div>
              <ArchBreakdown data={archScores} />
            </CardContent>
          </Card>
        </div>

        {showSystemPrompts && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              System Identity Prompts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-slate-900/80 border-pink-500/30">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-pink-400">
                    <Fingerprint className="w-4 h-4" />
                    Owner Identity
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Textarea
                    value={systemPrompt.ownerIdentity}
                    onChange={(e) => setSystemPrompt(p => ({ ...p, ownerIdentity: e.target.value }))}
                    placeholder="Define who the owner is..."
                    className="bg-slate-800 border-slate-700 text-sm min-h-[70px]"
                    data-testid="input-owner-identity"
                  />
                </CardContent>
              </Card>

              <Card className="bg-slate-900/80 border-amber-500/30">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-400">
                    <Database className="w-4 h-4" />
                    Data Protection Mantra
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Textarea
                    value={systemPrompt.dataProtectionMantra}
                    onChange={(e) => setSystemPrompt(p => ({ ...p, dataProtectionMantra: e.target.value }))}
                    placeholder="Data handling principles..."
                    className="bg-slate-800 border-slate-700 text-sm min-h-[70px]"
                    data-testid="input-data-protection"
                  />
                </CardContent>
              </Card>

              <Card className="bg-slate-900/80 border-red-500/30">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-400">
                    <Heart className="w-4 h-4" />
                    Statement of Loyalty
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Textarea
                    value={systemPrompt.loyaltyStatement}
                    onChange={(e) => setSystemPrompt(p => ({ ...p, loyaltyStatement: e.target.value }))}
                    placeholder="Loyalty principles..."
                    className="bg-slate-800 border-slate-700 text-sm min-h-[70px]"
                    data-testid="input-loyalty-statement"
                  />
                </CardContent>
              </Card>

              <Card className="bg-slate-900/80 border-cyan-500/30">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-cyan-400">
                    <ShieldCheck className="w-4 h-4" />
                    Systems Security Statement
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Textarea
                    value={systemPrompt.securityStatement}
                    onChange={(e) => setSystemPrompt(p => ({ ...p, securityStatement: e.target.value }))}
                    placeholder="Security protocols..."
                    className="bg-slate-800 border-slate-700 text-sm min-h-[70px]"
                    data-testid="input-security-statement"
                  />
                </CardContent>
              </Card>

              <Card className="bg-slate-900/80 border-yellow-500/30">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-400">
                    <Zap className="w-4 h-4" />
                    Owner Priorities
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Textarea
                    value={systemPrompt.ownerPriorities}
                    onChange={(e) => setSystemPrompt(p => ({ ...p, ownerPriorities: e.target.value }))}
                    placeholder="What matters most..."
                    className="bg-slate-800 border-slate-700 text-sm min-h-[70px]"
                    data-testid="input-owner-priorities"
                  />
                </CardContent>
              </Card>

              <Card className="bg-slate-900/80 border-purple-500/30">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-400">
                    <Sparkles className="w-4 h-4" />
                    DISC Reinforcement
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Textarea
                    value={systemPrompt.discReinforcement}
                    onChange={(e) => setSystemPrompt(p => ({ ...p, discReinforcement: e.target.value }))}
                    placeholder="Personality reinforcement..."
                    className="bg-slate-800 border-slate-700 text-sm min-h-[70px]"
                    data-testid="input-disc-reinforcement"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
