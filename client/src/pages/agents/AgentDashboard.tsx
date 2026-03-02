import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useLocation, useSearch } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Bot, Plus, Check, ImageIcon, Coffee, Briefcase, FlaskConical,
  Sparkles, Volume2, MoreVertical, Pencil, Trash2, GraduationCap, Phone,
  Share2, Copy, ExternalLink, MessageCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Agent } from '@shared/schema';

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

function parseSiteConfigId(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const id = params.get('siteConfigId');
  return id && id !== 'undefined' && id !== '' ? id : null;
}

export default function AgentDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const siteConfigId = parseSiteConfigId(search ?? '');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [copiedAgentId, setCopiedAgentId] = useState<string | null>(null);
  const [newAgent, setNewAgent] = useState({
    name: '',
    voiceId: 'kore',
    voiceName: 'Kore',
    status: 'active',
    dominance: 50,
    influence: 50,
    steadiness: 50,
    conscientiousness: 50,
    avatarId: 'avatar1',
  });

  const { data: agentsAll = [], isLoading: loadingAll } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
    enabled: !siteConfigId,
  });
  const { data: agentsSiteResponse, isLoading: loadingSite } = useQuery<{ agents?: Agent[] } | Agent[]>({
    queryKey: ['/api/site-configs', siteConfigId!, 'agents'],
    enabled: !!siteConfigId,
  });
  const agentsSite = Array.isArray(agentsSiteResponse) ? agentsSiteResponse : (agentsSiteResponse?.agents ?? []);
  const agents = siteConfigId ? agentsSite : agentsAll;
  const isLoading = siteConfigId ? loadingSite : loadingAll;

  const invalidateAgentQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
    if (siteConfigId) {
      queryClient.invalidateQueries({ queryKey: ['/api/site-configs', siteConfigId, 'agents'] });
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof newAgent) => apiRequest('POST', '/api/agents', data),
    onSuccess: () => {
      invalidateAgentQueries();
      setIsCreateOpen(false);
      setNewAgent({ name: '', voiceId: 'kore', voiceName: 'Kore', status: 'active', dominance: 50, influence: 50, steadiness: 50, conscientiousness: 50, avatarId: 'avatar1' });
      toast({ title: 'Agent created successfully' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/agents/${id}`),
    onSuccess: () => {
      invalidateAgentQueries();
      toast({ title: 'Agent deleted' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Agent> }) => 
      apiRequest('PATCH', `/api/agents/${id}`, data),
    onSuccess: () => {
      invalidateAgentQueries();
      setEditingAgent(null);
      toast({ title: 'Agent updated successfully' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const copyAgentChatLink = (agentId: string) => {
    const chatUrl = `${window.location.origin}/chat/${agentId}`;
    navigator.clipboard.writeText(chatUrl);
    setCopiedAgentId(agentId);
    toast({ title: 'Chat link copied to clipboard!' });
    setTimeout(() => setCopiedAgentId(null), 2000);
  };

  const openAgentChat = (agentId: string) => {
    window.open(`/chat/${agentId}`, '_blank');
  };

  const getAvatarById = (avatarId: string | null | undefined) => {
    return AVATAR_OPTIONS.find(a => a.id === avatarId) || AVATAR_OPTIONS[0];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500';
      case 'paused': return 'bg-amber-500';
      case 'inactive': return 'bg-slate-500';
      default: return 'bg-slate-500';
    }
  };

  const navigateToEnvironment = (agentId: string, environment: string) => {
    setLocation(`/agent/${agentId}/${environment}`);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-indigo-500" />
            <h1 className="text-3xl font-bold text-slate-900">Agent Dashboard</h1>
          </div>
          <p className="text-slate-500">Create, configure, and interact with your AI agents</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => {
              const avatar = getAvatarById(agent.avatarId);
              return (
                <Card 
                  key={agent.id}
                  className="bg-white/40 backdrop-blur-md border-white/20 shadow-xl overflow-hidden group hover:border-indigo-300 transition-all duration-300"
                  data-testid={`card-agent-${agent.id}`}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={avatar.src} 
                      alt={agent.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
                    
                    <div className="absolute top-3 right-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 bg-white/80 hover:bg-white"
                            data-testid={`button-agent-menu-${agent.id}`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border-slate-200">
                          <DropdownMenuItem 
                            className="text-slate-700 hover:text-slate-900 cursor-pointer"
                            onClick={() => setEditingAgent(agent)}
                            data-testid={`button-edit-agent-${agent.id}`}
                          >
                            <Pencil className="w-4 h-4 mr-2" /> Edit Agent
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-slate-700 hover:text-slate-900 cursor-pointer"
                            onClick={() => navigateToEnvironment(agent.id, 'lab')}
                          >
                            <FlaskConical className="w-4 h-4 mr-2" /> Fine Tune
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-blue-400 hover:text-blue-300 cursor-pointer"
                            onClick={() => setLocation(`/agent/${agent.id}/telephony`)}
                            data-testid={`button-telephony-agent-${agent.id}`}
                          >
                            <Phone className="w-4 h-4 mr-2" /> Telephony
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-400 hover:text-red-300 cursor-pointer"
                            onClick={() => deleteMutation.mutate(agent.id)}
                            data-testid={`button-delete-agent-${agent.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)} animate-pulse`} />
                      <span className="text-xs text-slate-300 font-medium capitalize">{agent.status}</span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-xl font-bold text-white mb-1">{agent.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Volume2 className="w-3 h-3" />
                        <span>{agent.voiceName}</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-pink-400">D:{agent.dominance}</span>
                        <span className="text-yellow-400">I:{agent.influence}</span>
                        <span className="text-green-400">S:{agent.steadiness}</span>
                        <span className="text-blue-400">C:{agent.conscientiousness}</span>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    {((agent as Agent & { coreFocusPreview?: string }).coreFocusPreview || agent.systemPrompt) && (
                      <div className="mb-4 p-3 bg-slate-100 rounded-lg border border-slate-200">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Core Focus</div>
                        <p className="text-sm text-slate-700 line-clamp-3">
                          {(agent as Agent & { coreFocusPreview?: string }).coreFocusPreview || agent.systemPrompt}
                        </p>
                      </div>
                    )}
                    <div className="mb-4 p-3 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-purple-400" />
                          <span className="text-sm font-medium text-slate-900" data-testid={`text-chat-link-label-${agent.id}`}>Public Chat Link</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => copyAgentChatLink(agent.id)}
                            data-testid={`button-copy-link-${agent.id}`}
                          >
                            {copiedAgentId === agent.id ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-purple-300" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openAgentChat(agent.id)}
                            data-testid={`button-open-chat-${agent.id}`}
                          >
                            <ExternalLink className="w-4 h-4 text-purple-300" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={`${window.location.origin}/chat/${agent.id}`}
                          readOnly
                          className="text-xs bg-white/60 border-slate-200 text-slate-600 font-mono"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          data-testid={`input-chat-url-${agent.id}`}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400"
                        onClick={() => navigateToEnvironment(agent.id, 'vibe')}
                        data-testid={`button-vibe-${agent.id}`}
                      >
                        <Coffee className="w-4 h-4 mr-3" />
                        <div className="text-left">
                          <div className="font-medium">The Vibe</div>
                          <div className="text-xs text-slate-500">Reflect & Relax</div>
                        </div>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="w-full justify-start border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                        onClick={() => navigateToEnvironment(agent.id, 'office')}
                        data-testid={`button-office-${agent.id}`}
                      >
                        <Briefcase className="w-4 h-4 mr-3" />
                        <div className="text-left">
                          <div className="font-medium">The Office</div>
                          <div className="text-xs text-slate-500">Collab on Projects</div>
                        </div>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="w-full justify-start border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400"
                        onClick={() => navigateToEnvironment(agent.id, 'lab')}
                        data-testid={`button-lab-${agent.id}`}
                      >
                        <FlaskConical className="w-4 h-4 mr-3" />
                        <div className="text-left">
                          <div className="font-medium">The Lab</div>
                          <div className="text-xs text-slate-500">Fine Tuning</div>
                        </div>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="w-full justify-start border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
                        onClick={() => navigateToEnvironment(agent.id, 'classroom')}
                        data-testid={`button-classroom-${agent.id}`}
                      >
                        <GraduationCap className="w-4 h-4 mr-3" />
                        <div className="text-left">
                          <div className="font-medium">The Classroom</div>
                          <div className="text-xs text-slate-500">Learn Something New</div>
                        </div>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {!siteConfigId && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Card 
                  className="bg-white/20 backdrop-blur-md border-2 border-dashed border-slate-300 hover:border-indigo-400 cursor-pointer transition-all duration-300 min-h-[380px] flex items-center justify-center"
                  data-testid="card-add-agent"
                >
                  <div className="text-center p-6">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Plus className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Create New Agent</h3>
                    <p className="text-sm text-slate-500">Add a new AI agent to your team</p>
                  </div>
                </Card>
              </DialogTrigger>
              <DialogContent className="bg-white border-slate-200 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-slate-900 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-indigo-500" />
                    Create New Agent
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm text-slate-500 mb-2 block flex items-center gap-2">
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
                              : 'border-slate-200 hover:border-slate-400'
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-500 mb-1 block">Agent Name</label>
                      <Input 
                        value={newAgent.name}
                        onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                        placeholder="Give your agent a name"
                        className="bg-white/60 border-slate-200"
                        data-testid="input-agent-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-500 mb-1 block">Voice</label>
                      <Select 
                        value={newAgent.voiceId} 
                        onValueChange={(value) => {
                          const voice = VOICES.find(v => v.id === value);
                          setNewAgent({ ...newAgent, voiceId: value, voiceName: voice?.name || value });
                        }}
                      >
                        <SelectTrigger className="bg-white/60 border-slate-200" data-testid="select-agent-voice">
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
                  </div>
                  <Button 
                    onClick={() => createMutation.mutate(newAgent)} 
                    disabled={!newAgent.name || createMutation.isPending}
                    className="w-full bg-indigo-600 hover:bg-indigo-500"
                    data-testid="button-create-agent"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Agent'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            )}
          </div>
        )}

        {/* Edit Agent Dialog */}
        <Dialog open={!!editingAgent} onOpenChange={(open) => !open && setEditingAgent(null)}>
          <DialogContent className="bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-900">Edit Agent</DialogTitle>
            </DialogHeader>
            {editingAgent && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-500 block mb-2">Agent Name</label>
                  <Input
                    data-testid="input-edit-agent-name"
                    value={editingAgent.name}
                    onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                    className="bg-white/60 border-slate-200"
                    placeholder="Enter agent name"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-500 block mb-2">Avatar</label>
                  <div className="grid grid-cols-5 gap-2">
                    {AVATAR_OPTIONS.map(avatar => (
                      <button
                        key={avatar.id}
                        onClick={() => setEditingAgent({ ...editingAgent, avatarId: avatar.id })}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          editingAgent.avatarId === avatar.id ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-slate-200'
                        }`}
                      >
                        <img src={avatar.src} alt={avatar.name} className="w-full h-full object-cover" />
                        {editingAgent.avatarId === avatar.id && (
                          <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                            <Check className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-500 block mb-2">Voice</label>
                  <Select
                    value={editingAgent.voiceId}
                    onValueChange={(v) => {
                      const voice = VOICES.find(voice => voice.id === v);
                      setEditingAgent({ ...editingAgent, voiceId: v, voiceName: voice?.name || v });
                    }}
                  >
                    <SelectTrigger className="bg-white/60 border-slate-200" data-testid="select-edit-agent-voice">
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
                <div>
                  <label className="text-sm text-slate-500 block mb-2">Status</label>
                  <Select
                    value={editingAgent.status}
                    onValueChange={(v) => setEditingAgent({ ...editingAgent, status: v })}
                  >
                    <SelectTrigger className="bg-white/60 border-slate-200" data-testid="select-edit-agent-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditingAgent(null)}
                    className="flex-1 border-slate-200"
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => updateMutation.mutate({ 
                      id: editingAgent.id, 
                      data: { 
                        name: editingAgent.name, 
                        avatarId: editingAgent.avatarId,
                        voiceId: editingAgent.voiceId,
                        voiceName: editingAgent.voiceName,
                        status: editingAgent.status,
                      } 
                    })}
                    disabled={!editingAgent.name || updateMutation.isPending}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500"
                    data-testid="button-save-agent"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
