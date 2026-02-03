import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Bot, Plus, Pencil, Trash2, RefreshCw, Search, Volume2, Check, ImageIcon } from 'lucide-react';
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

export default function AgentManager() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Agent>>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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

  const { data: agents = [], isLoading, refetch } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newAgent) => apiRequest('POST', '/api/agents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      setIsCreateOpen(false);
      setNewAgent({ name: '', voiceId: 'kore', voiceName: 'Kore', status: 'active', dominance: 50, influence: 50, steadiness: 50, conscientiousness: 50, avatarId: 'avatar1' });
      toast({ title: 'Agent created successfully' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Agent> }) => 
      apiRequest('PATCH', `/api/agents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      setEditingId(null);
      toast({ title: 'Agent updated successfully' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      toast({ title: 'Agent deleted successfully' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

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

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Bot className="w-8 h-8 text-indigo-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Agent Manager</h1>
              <p className="text-slate-400">Manage your AI agents</p>
            </div>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-500" data-testid="button-add-agent">
                <Plus className="w-4 h-4 mr-2" /> Add New Agent
              </Button>
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
              <Button variant="outline" onClick={() => refetch()} className="border-slate-600" data-testid="button-refresh-agents">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
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
                      <th className="text-left p-4 text-sm font-medium text-slate-400">DISC Profile</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgents.map((agent) => {
                      const agentAvatar = getAvatarById(agent.avatarId);
                      return (
                      <tr key={agent.id} className="border-t border-slate-800 hover:bg-slate-800/30" data-testid={`row-agent-${agent.id}`}>
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
                              <SelectTrigger className="bg-slate-800 border-slate-600 h-8">
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
                              <SelectTrigger className="bg-slate-800 border-slate-600 h-8">
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
                          <div className="flex gap-1 text-xs">
                            <span className="text-red-400">D:{agent.dominance}</span>
                            <span className="text-yellow-400">I:{agent.influence}</span>
                            <span className="text-green-400">S:{agent.steadiness}</span>
                            <span className="text-blue-400">C:{agent.conscientiousness}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            {editingId === agent.id ? (
                              <>
                                <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-500">
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEdit} className="border-slate-600">
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => startEditing(agent)}
                                  className="border-slate-600"
                                  data-testid={`button-edit-agent-${agent.id}`}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => deleteMutation.mutate(agent.id)}
                                  className="border-red-600/50 text-red-400 hover:bg-red-600/10"
                                  data-testid={`button-delete-agent-${agent.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
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
