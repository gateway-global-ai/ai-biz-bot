import { useState, useEffect } from 'react';
import type { RouteComponentProps } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UIButton } from '@/ui/foundation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Bot, Plus, Pencil, Trash2, RefreshCw, Search, Volume2, Check, ImageIcon,
  Server, Zap, Cpu, Radio, ChevronLeft, Save, Eye, EyeOff,
  Fingerprint, Heart, ShieldCheck, Database, Lock, Sparkles
} from 'lucide-react';
import { ArchBarChart } from '@/ui/charts';
import type { Agent } from '@shared/schema';
import type { DiscScores, ArchProfile } from '@shared/schema';

import avatar1 from '@assets/freepik__melissa-model-as-a-superhuman-metal-android-smooth__8_1770156432895.png';
import avatar2 from '@assets/freepik__melissa-model-turned-into-a-futuristic-ai-robot-wi__8_1770156535941.png';
import avatar3 from '@assets/freepik__generate-9-different-angles-of-this-image-back-vie__8_1770156725733.png';
import avatar4 from '@assets/freepik__is-a-model-turned-into-a-futuristic-ai-robot-emily__8_1770156725735.png';
import avatar5 from '@assets/freepik__is-a-model-turned-into-a-futuristic-ai-robot-emily__8_1770156725736.png';

const AVATAR_OPTIONS = [
  { id: 'avatar1', name: 'Nova', src: avatar1, description: 'Cyber Warrior' },
  { id: 'avatar2', name: 'Phoenix', src: avatar2, description: 'Samurai Spirit' },
  { id: 'avatar3', name: 'Nexus', src: avatar3, description: 'Data Navigator' },
  { id: 'avatar4', name: 'Aurora', src: avatar4, description: 'Energy Flow' },
  { id: 'avatar5', name: 'Zenith', src: avatar5, description: 'Shadow Tech' },
];

const VOICES = [
  { id: 'kore', name: 'Kore', description: 'Warm & Professional' },
  { id: 'puck', name: 'Puck', description: 'Friendly & Upbeat' },
  { id: 'charon', name: 'Charon', description: 'Deep & Authoritative' },
  { id: 'fenrir', name: 'Fenrir', description: 'Calm & Reassuring' },
  { id: 'aoede', name: 'Aoede', description: 'Clear & Articulate' },
  { id: 'leda', name: 'Leda', description: 'Soft & Gentle' },
];

/** Operational modes: match server config/operationalModes.ts. UI-only (id, label, permissions, constraint). */
const OPERATIONAL_MODES_UI: Array<{ id: string; label: string; permissions: string; constraint: string }> = [
  { id: 'SAFE', label: 'Safe Mode', permissions: 'Discussion Only.', constraint: 'Cannot offer to perform tasks. Cannot prompt for or save Customer PII (Personally Identifiable Information).' },
  { id: 'CONCIERGE', label: 'Concierge Mode', permissions: 'Routing Only.', constraint: 'Can only assess user intent and route customers to provided internal destinations/agents.' },
  { id: 'RECEPTIONIST', label: 'Receptionist Mode', permissions: 'Intake & Data Collection.', constraint: 'Can take customer information and save inquiries/tickets for others to handle. Cannot resolve complex issues.' },
  { id: 'SALES', label: 'Sales Mode', permissions: 'Commerce Generation.', constraint: 'Can assist with locating products/services from a catalog, create an invoice, order, or fill a shopping cart. (No payment capture).' },
  { id: 'CASHIER', label: 'Cashier Mode', permissions: 'Payment Capture.', constraint: 'Has access to shopping cart info and customer details. Can accept payments or provide secure payment links.' },
  { id: 'CUSTOMER_SUPPORT', label: 'Customer Support Mode', permissions: 'Account Access & Resolution.', constraint: 'Requires active Customer Verification (OTP/Magic Link).' },
  { id: 'MANAGER', label: 'Manager Mode', permissions: 'Oversight & Approval.', constraint: 'Has access to customer data, chat logs, and guidelines. Can approve execute-with-approval decisions for other agents.' },
  { id: 'RESEARCH', label: 'Research Mode', permissions: 'Read-Only Discovery.', constraint: 'Restricted to internet/internal KB research. Cannot edit or modify external systems. Operates strictly in an isolated sandbox/owner folder.' },
  { id: 'CODING', label: 'Coding Mode', permissions: 'Write/Execute Access.', constraint: 'Can work on systems and coding in designated working folders. Can make changes and edits.' },
  { id: 'REVIEW', label: 'Review Mode', permissions: 'Read/Annotate.', constraint: 'Can review code/work previously done. Can comment, but strictly cannot modify, delete, or commit code changes.' },
];

const VERIFICATION_LEVELS = [
  { value: 'otp', label: 'OTP' },
  { value: 'magic_link', label: 'Magic Link' },
  { value: 'biometric', label: 'Biometric' },
];

/** Operational modes: match server config/operationalModes.ts. UI-only (id, label, permissions, constraint). */
const OPERATIONAL_MODES_UI: Array<{ id: string; label: string; permissions: string; constraint: string }> = [
  { id: 'SAFE', label: 'Safe Mode', permissions: 'Discussion Only.', constraint: 'Cannot offer to perform tasks. Cannot prompt for or save Customer PII (Personally Identifiable Information).' },
  { id: 'CONCIERGE', label: 'Concierge Mode', permissions: 'Routing Only.', constraint: 'Can only assess user intent and route customers to provided internal destinations/agents.' },
  { id: 'RECEPTIONIST', label: 'Receptionist Mode', permissions: 'Intake & Data Collection.', constraint: 'Can take customer information and save inquiries/tickets for others to handle. Cannot resolve complex issues.' },
  { id: 'SALES', label: 'Sales Mode', permissions: 'Commerce Generation.', constraint: 'Can assist with locating products/services from a catalog, create an invoice, order, or fill a shopping cart. (No payment capture).' },
  { id: 'CASHIER', label: 'Cashier Mode', permissions: 'Payment Capture.', constraint: 'Has access to shopping cart info and customer details. Can accept payments or provide secure payment links.' },
  { id: 'CUSTOMER_SUPPORT', label: 'Customer Support Mode', permissions: 'Account Access & Resolution.', constraint: 'Requires active Customer Verification (OTP/Magic Link).' },
  { id: 'MANAGER', label: 'Manager Mode', permissions: 'Oversight & Approval.', constraint: 'Has access to customer data, chat logs, and guidelines. Can approve execute-with-approval decisions for other agents.' },
  { id: 'RESEARCH', label: 'Research Mode', permissions: 'Read-Only Discovery.', constraint: 'Restricted to internet/internal KB research. Cannot edit or modify external systems. Operates strictly in an isolated sandbox/owner folder.' },
  { id: 'CODING', label: 'Coding Mode', permissions: 'Write/Execute Access.', constraint: 'Can work on systems and coding in designated working folders. Can make changes and edits.' },
  { id: 'REVIEW', label: 'Review Mode', permissions: 'Read/Annotate.', constraint: 'Can review code/work previously done. Can comment, but strictly cannot modify, delete, or commit code changes.' },
];

const VERIFICATION_LEVELS = [
  { value: 'otp', label: 'OTP' },
  { value: 'magic_link', label: 'Magic Link' },
  { value: 'biometric', label: 'Biometric' },
];

type Sentiment = 'calm' | 'engaged' | 'alert';

const SENTIMENT_COLORS: Record<Sentiment, { primary: string; glow: string; label: string }> = {
  calm: { primary: 'rgba(16, 185, 129, 0.8)', glow: 'rgba(16, 185, 129, 0.4)', label: 'CALM' },
  engaged: { primary: 'rgba(59, 130, 246, 0.8)', glow: 'rgba(59, 130, 246, 0.4)', label: 'ENGAGED' },
  alert: { primary: 'rgba(250, 204, 21, 0.8)', glow: 'rgba(250, 204, 21, 0.4)', label: 'ALERT' },
};

const BotAvatar = ({ scores, sentiment }: { scores: DiscScores; sentiment: Sentiment }) => {
  const { dominance: d, influence: i, steadiness: s, conscientiousness: c } = scores;
  const dNorm = d / 100;
  const iNorm = i / 100;
  const sNorm = s / 100;
  const cNorm = c / 100;
  const sentimentConfig = SENTIMENT_COLORS[sentiment];
  const auraIntensity = 0.5 + (dNorm * 0.3) + (iNorm * 0.2);

  return (
    <div className="relative w-44 h-44 flex items-center justify-center mx-auto">
      <div 
        className="absolute inset-0 border border-dashed rounded-full animate-spin"
        style={{ 
          borderColor: `rgba(59, 130, 246, ${Math.max(cNorm, 0.2)})`, 
          opacity: cNorm,
          animationDuration: '20s'
        }}
      />
      <div 
        className="absolute inset-4 border border-dotted rounded-full animate-spin"
        style={{ 
          borderColor: `rgba(96, 165, 250, ${Math.max(cNorm, 0.2)})`, 
          opacity: cNorm * 0.8,
          animationDirection: 'reverse',
          animationDuration: '15s'
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
          opacity: 0.6 + (iNorm * 0.4)
        }}
      />
      
      <div 
        className="absolute inset-10 rounded-full blur-xl transition-all duration-1000"
        style={{ 
          backgroundColor: `rgba(16, 185, 129, ${sNorm * 0.2})`,
          boxShadow: `0 0 ${sNorm * 60}px rgba(16, 185, 129, ${sNorm * 0.5})`
        }}
      />

      <div 
        className="absolute w-20 h-20 rounded-xl flex items-center justify-center bg-slate-900 border-2 z-10 transition-all duration-500"
        style={{
          borderColor: sentimentConfig.primary,
          boxShadow: `0 0 ${dNorm * 40 * auraIntensity}px ${sentimentConfig.glow}, 0 0 ${20 * auraIntensity}px ${sentimentConfig.glow}`,
          transform: `scale(${0.9 + dNorm * 0.2})`
        }}
      >
        <div className="relative z-20 flex flex-col items-center">
          <Server className="w-10 h-10 text-slate-200" />
          <div className="flex gap-1 mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${d > 50 ? 'bg-pink-500 animate-pulse' : 'bg-slate-700'}`} />
            <div className={`w-1.5 h-1.5 rounded-full ${i > 50 ? 'bg-yellow-500 animate-pulse' : 'bg-slate-700'}`} />
            <div className={`w-1.5 h-1.5 rounded-full ${s > 50 ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`} />
            <div className={`w-1.5 h-1.5 rounded-full ${c > 50 ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'}`} />
          </div>
        </div>
      </div>

      <div className="absolute top-1 left-1 flex items-center gap-1">
        <div 
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: sentimentConfig.primary, boxShadow: `0 0 8px ${sentimentConfig.glow}` }}
        />
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: sentimentConfig.primary }}>
          {sentimentConfig.label}
        </span>
      </div>

      <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-2 text-[8px] font-mono opacity-70">
        <div className="flex items-center gap-0.5 text-pink-400"><Zap className="w-2 h-2" /> {d}%</div>
        <div className="flex items-center gap-0.5 text-yellow-400"><Radio className="w-2 h-2" /> {i}%</div>
        <div className="flex items-center gap-0.5 text-green-400"><Cpu className="w-2 h-2" /> {s}%</div>
        <div className="flex items-center gap-0.5 text-blue-400"><Server className="w-2 h-2" /> {c}%</div>
      </div>
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

type AgentManagerProps = RouteComponentProps & { siteConfigId?: string };

export default function AgentManager({ siteConfigId, params: _params }: AgentManagerProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Agent>>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showSystemPrompts, setShowSystemPrompts] = useState(true);
  const [sentiment, setSentiment] = useState<Sentiment>('calm');
  
  const [agentDisc, setAgentDisc] = useState<DiscScores>({
    dominance: 50,
    influence: 50,
    steadiness: 50,
    conscientiousness: 50,
  });
  
  const [agentArch, setAgentArch] = useState<ArchProfile>({
    acknowledge: 75,
    reflect: 60,
    context: 50,
    handoff: 30,
  });

  const [operationalMode, setOperationalMode] = useState<string>('SAFE');
  const [verificationLevel, setVerificationLevel] = useState<string>('');
  
  const [systemPrompt, setSystemPrompt] = useState<SystemPromptState>({
    ownerIdentity: '',
    loyaltyStatement: '',
    ownerPriorities: '',
    dataProtectionMantra: '',
    securityStatement: '',
    discReinforcement: '',
  });

  const [newAgent, setNewAgent] = useState({
    name: '',
    voiceId: 'kore',
    voiceName: 'Kore',
    status: 'active',
    visibility: 'private',
    dominance: 50,
    influence: 50,
    steadiness: 50,
    conscientiousness: 50,
    avatarId: 'avatar1',
    siteConfigId: siteConfigId, // Initialize with prop
  });

  const { data: agents = [], isLoading, refetch } = useQuery<Agent[]>({
    queryKey: [siteConfigId ? `/api/agents?siteConfigId=${siteConfigId}` : '/api/agents'],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newAgent) => apiRequest('POST', '/api/agents', { ...data, siteConfigId }), // Ensure siteConfigId is sent
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [siteConfigId ? `/api/agents?siteConfigId=${siteConfigId}` : '/api/agents'] });
      setIsCreateOpen(false);
      setNewAgent({ name: '', voiceId: 'kore', voiceName: 'Kore', status: 'active', visibility: 'private', dominance: 50, influence: 50, steadiness: 50, conscientiousness: 50, avatarId: 'avatar1', siteConfigId });
      toast({ title: 'Agent created successfully' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Agent> }) => 
      apiRequest('PATCH', `/api/agents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [siteConfigId ? `/api/agents?siteConfigId=${siteConfigId}` : '/api/agents'] });
      setEditingId(null);
      toast({ title: 'Agent updated successfully' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [siteConfigId ? `/api/agents?siteConfigId=${siteConfigId}` : '/api/agents'] });
      if (selectedAgent) setSelectedAgent(null);
      toast({ title: 'Agent deleted successfully' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  useEffect(() => {
    if (selectedAgent) {
      setAgentDisc({
        dominance: selectedAgent.dominance || 50,
        influence: selectedAgent.influence || 50,
        steadiness: selectedAgent.steadiness || 50,
        conscientiousness: selectedAgent.conscientiousness || 50,
      });
      setOperationalMode((selectedAgent as { operationalMode?: string }).operationalMode ?? 'SAFE');
      setVerificationLevel((selectedAgent as { verificationLevel?: string }).verificationLevel ?? '');
    }
  }, [selectedAgent]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSentiment(prev => {
        const sentiments: Sentiment[] = ['calm', 'engaged', 'alert'];
        const idx = sentiments.indexOf(prev);
        return sentiments[(idx + 1) % sentiments.length];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.voiceName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startEditing = (agent: Agent) => {
    setEditingId(agent.id);
    setEditData({ ...agent });
  };

  const saveEdit = () => {
    if (editingId && editData) {
      updateMutation.mutate({ id: editingId, data: editData });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const selectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setAgentDisc({
      dominance: agent.dominance || 50,
      influence: agent.influence || 50,
      steadiness: agent.steadiness || 50,
      conscientiousness: agent.conscientiousness || 50,
    });
    setOperationalMode((agent as { operationalMode?: string }).operationalMode ?? 'SAFE');
    setVerificationLevel((agent as { verificationLevel?: string }).verificationLevel ?? '');
  };

  const saveAgentConfig = () => {
    if (!selectedAgent) return;
    
    updateMutation.mutate({
      id: selectedAgent.id,
      data: {
        dominance: agentDisc.dominance,
        influence: agentDisc.influence,
        steadiness: agentDisc.steadiness,
        conscientiousness: agentDisc.conscientiousness,
        operationalMode,
        verificationLevel: verificationLevel || undefined,
      }
    });
    
    toast({ title: 'Agent configuration saved!' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>;
      case 'paused': return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Paused</Badge>;
      case 'inactive': return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Inactive</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getAvatarById = (avatarId: string | null | undefined) => {
    return AVATAR_OPTIONS.find(a => a.id === avatarId) || AVATAR_OPTIONS[0];
  };

  const updateDisc = (key: keyof DiscScores, value: number[]) => {
    setAgentDisc(prev => ({ ...prev, [key]: value[0] }));
  };

  const updateArch = (key: keyof ArchProfile, value: number[]) => {
    setAgentArch(prev => ({ ...prev, [key]: value[0] }));
  };

  if (selectedAgent) {
    const agentAvatar = getAvatarById(selectedAgent.avatarId);
    
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <UIButton 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedAgent(null)}
                className="text-slate-400 hover:text-white"
                data-testid="button-back-to-agents"
              >
                <ChevronLeft className="w-6 h-6" />
              </UIButton>
              <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-indigo-500">
                <img src={agentAvatar.src} alt={agentAvatar.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{selectedAgent.name}</h1>
                <p className="text-slate-400 text-sm">Configure personality & system prompts</p>
              </div>
            </div>
            <div className="flex gap-2">
              <UIButton
                variant="outline"
                size="sm"
                onClick={() => setShowSystemPrompts(!showSystemPrompts)}
                className="border-slate-600"
                data-testid="button-toggle-prompts"
              >
                {showSystemPrompts ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showSystemPrompts ? 'Hide' : 'Show'} System Prompts
              </UIButton>
              <UIButton 
                onClick={saveAgentConfig}
                className="bg-indigo-600 hover:bg-indigo-500"
                data-testid="button-save-agent-config"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </UIButton>
            </div>
          </div>

          {/* Operational Mode & Permissions — foundational template, top of config */}
          <Card className="bg-slate-900 border-slate-700 mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                Operational Mode & Permissions
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Select primary mode. Defines system constraint and which tools the agent can use.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-2">
                {OPERATIONAL_MODES_UI.map((mode) => (
                  <label
                    key={mode.id}
                    className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      operationalMode === mode.id
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-slate-600 bg-slate-800/50 hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="operationalMode"
                      value={mode.id}
                      checked={operationalMode === mode.id}
                      onChange={() => setOperationalMode(mode.id)}
                      className="mt-1 rounded-full border-slate-500 text-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-white">{mode.label}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Permissions: {mode.permissions}</p>
                      <p className="text-xs text-slate-500 mt-1">System Constraint: {mode.constraint}</p>
                    </div>
                  </label>
                ))}
              </div>
              {operationalMode === 'CUSTOMER_SUPPORT' && (
                <div className="pt-2 border-t border-slate-700">
                  <Label className="text-xs text-slate-400">Required Verification Level</Label>
                  <Select value={verificationLevel || '_default'} onValueChange={(v) => setVerificationLevel(v === '_default' ? '' : v)}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 mt-1 w-48">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_default">Select level</SelectItem>
                      {VERIFICATION_LEVELS.map((v) => (
                        <SelectItem key={v.value} value={v.value}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  Agent Visualizer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BotAvatar scores={agentDisc} sentiment={sentiment} />
                <div className="mt-4 space-y-3">
                  <div>
                    <Label className="text-xs text-slate-400">Voice</Label>
                    <Select value={selectedAgent.voiceId} onValueChange={() => {}}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 mt-1" data-testid="select-agent-voice">
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
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Status</span>
                    {getStatusBadge(selectedAgent.status)}
                  </div>
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
                    <span className="text-slate-300">{agentDisc.dominance}%</span>
                  </div>
                  <Slider
                    value={[agentDisc.dominance]}
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
                    <span className="text-slate-300">{agentDisc.influence}%</span>
                  </div>
                  <Slider
                    value={[agentDisc.influence]}
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
                    <span className="text-slate-300">{agentDisc.steadiness}%</span>
                  </div>
                  <Slider
                    value={[agentDisc.steadiness]}
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
                    <span className="text-slate-300">{agentDisc.conscientiousness}%</span>
                  </div>
                  <Slider
                    value={[agentDisc.conscientiousness]}
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
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-emerald-400">Acknowledge</span>
                    <span className="text-slate-300">{agentArch.acknowledge}%</span>
                  </div>
                  <Slider
                    value={[agentArch.acknowledge]}
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
                    <span className="text-slate-300">{agentArch.reflect}%</span>
                  </div>
                  <Slider
                    value={[agentArch.acknowledge]}
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
                    <span className="text-slate-300">{agentArch.context}%</span>
                  </div>
                  <Slider
                    value={[agentArch.context]}
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
                    <span className="text-slate-300">{agentArch.handoff}%</span>
                  </div>
                  <Slider
                    value={[agentArch.handoff]}
                    onValueChange={(v) => updateArch('handoff', v)}
                    max={100}
                    step={1}
                    className="[&_[role=slider]]:bg-red-500"
                    data-testid="slider-handoff"
                  />
                </div>
                <ArchBarChart data={agentArch} variant="compact" />
              </CardContent>
            </Card>
          </div>

          {showSystemPrompts && (
            <div className="mt-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
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
                      className="bg-slate-800 border-slate-700 text-sm min-h-[80px]"
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
                      className="bg-slate-800 border-slate-700 text-sm min-h-[80px]"
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
                      className="bg-slate-800 border-slate-700 text-sm min-h-[80px]"
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
                      className="bg-slate-800 border-slate-700 text-sm min-h-[80px]"
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
                      className="bg-slate-800 border-slate-700 text-sm min-h-[80px]"
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
                      className="bg-slate-800 border-slate-700 text-sm min-h-[80px]"
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

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Bot className="w-8 h-8 text-indigo-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Agent Manager</h1>
              <p className="text-slate-400">Click on an agent to configure personality</p>
            </div>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <UIButton className="bg-indigo-600 hover:bg-indigo-500" data-testid="button-add-agent">
                <Plus className="w-4 h-4 mr-2" /> Add New Agent
              </UIButton>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Agent</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Choose Your Agent Avatar
                  </label>
                  <div className="grid grid-cols-5 gap-3">
                    {AVATAR_OPTIONS.map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => setNewAgent({ ...newAgent, avatarId: avatar.id })}
                        className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                          newAgent.avatarId === avatar.id 
                            ? 'border-indigo-500 ring-2 ring-indigo-500/50' 
                            : 'border-slate-700 hover:border-slate-500'
                        }`}
                        data-testid={`avatar-option-${avatar.id}`}
                      >
                        <img 
                          src={avatar.src} 
                          alt={avatar.name}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                          <span className="text-xs text-white font-medium">{avatar.name}</span>
                        </div>
                        {newAgent.avatarId === avatar.id && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">This avatar will appear as a backdrop in chat screens</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Agent Name</label>
                    <Input 
                      value={newAgent.name}
                      onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                      placeholder="Enter agent name"
                      className="bg-slate-800 border-slate-600"
                      data-testid="input-agent-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Voice</label>
                    <Select 
                      value={newAgent.voiceId} 
                      onValueChange={(value) => {
                        const voices: Record<string, string> = { kore: 'Kore', puck: 'Puck', charon: 'Charon', fenrir: 'Fenrir', aoede: 'Aoede', leda: 'Leda' };
                        setNewAgent({ ...newAgent, voiceId: value, voiceName: voices[value] || value });
                      }}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-agent-voice">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kore">Kore - Warm & Professional</SelectItem>
                        <SelectItem value="puck">Puck - Friendly & Upbeat</SelectItem>
                        <SelectItem value="charon">Charon - Deep & Authoritative</SelectItem>
                        <SelectItem value="fenrir">Fenrir - Calm & Reassuring</SelectItem>
                        <SelectItem value="aoede">Aoede - Clear & Articulate</SelectItem>
                        <SelectItem value="leda">Leda - Soft & Gentle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Status</label>
                  <Select value={newAgent.status} onValueChange={(value) => setNewAgent({ ...newAgent, status: value })}>
                    <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-agent-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Visibility</label>
                  <Select value={newAgent.visibility} onValueChange={(value) => setNewAgent({ ...newAgent, visibility: value })}>
                    <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-agent-visibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <UIButton 
                  onClick={() => createMutation.mutate(newAgent)} 
                  disabled={!newAgent.name || createMutation.isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-500"
                  data-testid="button-create-agent"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Agent'}
                </UIButton>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-slate-900/80 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search agents..."
                  className="pl-10 bg-slate-800 border-slate-600"
                  data-testid="input-search-agents"
                />
              </div>
              <UIButton variant="outline" onClick={() => refetch()} className="border-slate-600" data-testid="button-refresh-agents">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </UIButton>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No agents found. Create your first agent to get started!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Avatar</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Agent Name</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Voice</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Visibility</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">DISC Profile</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgents.map((agent) => {
                      const agentAvatar = getAvatarById(agent.avatarId);
                      return (
                      <tr 
                        key={agent.id} 
                        className="border-t border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors" 
                        data-testid={`row-agent-${agent.id}`}
                        onClick={() => selectAgent(agent)}
                      >
                        <td className="p-4">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-700">
                            <img 
                              src={agentAvatar.src} 
                              alt={agentAvatar.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </td>
                        <td className="p-4">
                          {editingId === agent.id ? (
                            <Input 
                              value={editData.name || ''} 
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              className="bg-slate-800 border-slate-600 h-8"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{agent.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {editingId === agent.id ? (
                            <Select 
                              value={editData.voiceId || agent.voiceId} 
                              onValueChange={(value) => {
                                const voices: Record<string, string> = { kore: 'Kore', puck: 'Puck', charon: 'Charon', fenrir: 'Fenrir', aoede: 'Aoede', leda: 'Leda' };
                                setEditData({ ...editData, voiceId: value, voiceName: voices[value] || value });
                              }}
                            >
                              <SelectTrigger className="bg-slate-800 border-slate-600 h-8" onClick={(e) => e.stopPropagation()}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kore">Kore</SelectItem>
                                <SelectItem value="puck">Puck</SelectItem>
                                <SelectItem value="charon">Charon</SelectItem>
                                <SelectItem value="fenrir">Fenrir</SelectItem>
                                <SelectItem value="aoede">Aoede</SelectItem>
                                <SelectItem value="leda">Leda</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-2 text-slate-300">
                              <Volume2 className="w-4 h-4 text-slate-500" />
                              {agent.voiceName}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {editingId === agent.id ? (
                            <Select 
                              value={editData.status || agent.status} 
                              onValueChange={(value) => setEditData({ ...editData, status: value })}
                            >
                              <SelectTrigger className="bg-slate-800 border-slate-600 h-8" onClick={(e) => e.stopPropagation()}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="paused">Paused</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            getStatusBadge(agent.status)
                          )}
                        </td>
                        <td className="p-4">
                          {editingId === agent.id ? (
                            <Select 
                              value={editData.visibility || (agent as any).visibility || 'private'} 
                              onValueChange={(value) => setEditData({ ...editData, visibility: value })}
                            >
                              <SelectTrigger className="bg-slate-800 border-slate-600 h-8" onClick={(e) => e.stopPropagation()}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="private">Private</SelectItem>
                                <SelectItem value="internal">Internal</SelectItem>
                                <SelectItem value="public">Public</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-600 capitalize">{(agent as any).visibility || 'private'}</Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1 text-xs">
                            <span className="text-red-400">D:{agent.dominance}</span>
                            <span className="text-yellow-400">I:{agent.influence}</span>
                            <span className="text-green-400">S:{agent.steadiness}</span>
                            <span className="text-blue-400">C:{agent.conscientiousness}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {editingId === agent.id ? (
                              <>
                                <UIButton size="sm" onClick={saveEdit} disabled={updateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-500">
                                  Save
                                </UIButton>
                                <UIButton size="sm" variant="outline" onClick={cancelEdit} className="border-slate-600">
                                  Cancel
                                </UIButton>
                              </>
                            ) : (
                              <>
                                <UIButton 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={(e) => { e.stopPropagation(); startEditing(agent); }}
                                  className="border-slate-600"
                                  data-testid={`button-edit-agent-${agent.id}`}
                                >
                                  <Pencil className="w-3 h-3" />
                                </UIButton>
                                <UIButton 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(agent.id); }}
                                  className="border-red-600/50 text-red-400 hover:bg-red-600/10"
                                  data-testid={`button-delete-agent-${agent.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </UIButton>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
