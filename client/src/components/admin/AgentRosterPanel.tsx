/**
 * AgentRosterPanel — DB agents (agents table) list for AiBizBotAdmin.
 * Structure: counts, search, group by subscription plan, assign to this business, create, edit, delete.
 * Uses GET/POST/PATCH/DELETE /api/agents. No hardcoded model IDs.
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Check,
  X,
  Users,
  Building2,
} from 'lucide-react';
import { LiveEmotionControl, type LiveEmotion } from '@/components/LiveEmotionControl';
import type { Agent, SiteConfig } from '@shared/schema';

const VOICES = [
  { id: 'kore', name: 'Kore' },
  { id: 'puck', name: 'Puck' },
  { id: 'charon', name: 'Charon' },
  { id: 'fenrir', name: 'Fenrir' },
  { id: 'aoede', name: 'Aoede' },
  { id: 'leda', name: 'Leda' },
];

const PLANS = ['free', 'pro', 'voice', 'enterprise'] as const;

interface AgentRosterPanelProps {
  siteConfigId: string;
  currentAssignedAgentId: string | null;
  onAssignAgent: (agentId: string | null) => void;
}

export function AgentRosterPanel({
  siteConfigId,
  currentAssignedAgentId,
  onAssignAgent,
}: AgentRosterPanelProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [groupByPlan, setGroupByPlan] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [editName, setEditName] = useState('');
  const [editSystemPrompt, setEditSystemPrompt] = useState('');
  const [editDefaultEmotion, setEditDefaultEmotion] = useState<LiveEmotion | null>(null);
  const [newName, setNewName] = useState('');
  const [newVoiceId, setNewVoiceId] = useState('kore');
  const [newStatus, setNewStatus] = useState<'active' | 'paused' | 'inactive'>('active');

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ['/api/agents', 'roster'],
    queryFn: () => fetch('/api/agents?excludeProvider=kimi').then((r) => r.json()),
  });

  const { data: sites = [] } = useQuery<SiteConfig[]>({
    queryKey: ['/api/site-configs'],
    queryFn: () => fetch('/api/site-configs').then((r) => r.json()),
  });

  const agentIdToPlans = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const s of sites) {
      const plan = (s as any).plan || 'free';
      const aid = (s as any).assignedAgentId;
      if (aid) {
        if (!m[aid]) m[aid] = [];
        if (!m[aid].includes(plan)) m[aid].push(plan);
      }
    }
    return m;
  }, [sites]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        a.name?.toLowerCase().includes(q) ||
        (a.roleType ?? '').toLowerCase().includes(q) ||
        (a.status ?? '').toLowerCase().includes(q)
    );
  }, [agents, search]);

  const byPlan = useMemo(() => {
    const g: Record<string, Agent[]> = { free: [], pro: [], voice: [], enterprise: [], unassigned: [] };
    for (const a of filtered) {
      const plans = agentIdToPlans[a.id];
      if (!plans || plans.length === 0) {
        g.unassigned.push(a);
        continue;
      }
      for (const p of plans) {
        if (PLANS.includes(p as any) && !g[p].some((x) => x.id === a.id)) {
          g[p].push(a);
        }
      }
    }
    return g;
  }, [filtered, agentIdToPlans]);

  const createMutation = useMutation({
    mutationFn: (data: { name: string; voiceId: string; voiceName: string; status: string }) =>
      apiRequest('POST', '/api/agents', {
        name: data.name,
        voiceId: data.voiceId,
        voiceName: VOICES.find((v) => v.id === data.voiceId)?.name ?? data.voiceId,
        status: data.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      setCreateOpen(false);
      setNewName('');
      toast({ title: 'Agent created' });
    },
    onError: (e: any) => toast({ title: 'Create failed', description: e.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Agent> }) =>
      apiRequest('PATCH', `/api/agents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      setEditing(null);
      toast({ title: 'Agent updated' });
    },
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      if (currentAssignedAgentId === editing?.id) onAssignAgent(null);
      setEditing(null);
      toast({ title: 'Agent deleted' });
    },
    onError: (e: any) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  const plansForAgent = (agentId: string) => agentIdToPlans[agentId] ?? [];

  const renderAgentRow = (agent: Agent) => {
    const plans = plansForAgent(agent.id);
    const isAssignedHere = currentAssignedAgentId === agent.id;
    return (
      <Card key={agent.id} className="bg-slate-800/60 border border-slate-600 border-indigo-500/20">
        <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-white text-sm truncate">{agent.name}</p>
              <p className="text-xs text-slate-300">
                {agent.roleType || '—'} · {agent.status}
                {plans.length > 0 && ` · ${plans.join(', ')}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isAssignedHere && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                onClick={() => onAssignAgent(agent.id)}
              >
                Assign here
              </Button>
            )}
            {isAssignedHere && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                Assigned
              </span>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-400"
              onClick={() => {
                setEditing(agent);
                setEditName(agent.name ?? '');
                setEditSystemPrompt(agent.systemPrompt ?? '');
                const emotion = (agent as Agent & { defaultEmotion?: string | null }).defaultEmotion;
                setEditDefaultEmotion(
                  emotion && ['calm', 'engaged', 'focused', 'energized', 'empathetic'].includes(emotion)
                    ? (emotion as LiveEmotion)
                    : null
                );
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-400 hover:text-red-400"
              onClick={() => {
                if (window.confirm(`Delete agent "${agent.name}"?`)) deleteMutation.mutate(agent.id);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          Agent roster
        </h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Database agents you can assign to this business. Create, edit, or assign below.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, role, status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={groupByPlan}
            onChange={(e) => setGroupByPlan(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800"
          />
          Group by plan
        </label>
        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-500"
          onClick={() => {
            setCreateOpen(true);
            setNewName('');
            setNewVoiceId('kore');
            setNewStatus('active');
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Create agent
        </Button>
      </div>

      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <span>{filtered.length} agent{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400 py-8">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading agents…</span>
        </div>
      ) : groupByPlan ? (
        <div className="space-y-4">
          {PLANS.map((plan) => {
            const list = byPlan[plan] ?? [];
            if (list.length === 0) return null;
            return (
              <div key={plan}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" />
                  {plan}
                </h3>
                <div className="space-y-2">
                  {list.map(renderAgentRow)}
                </div>
              </div>
            );
          })}
          {(byPlan.unassigned?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Not in a plan</h3>
              <div className="space-y-2">
                {(byPlan.unassigned ?? []).map(renderAgentRow)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(renderAgentRow)}
        </div>
      )}

      {createOpen && (
        <Card className="bg-slate-800/80 border border-slate-600 border-indigo-500/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-white">New agent</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setCreateOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-slate-400 text-xs">Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Agent name"
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Voice</Label>
              <Select value={newVoiceId} onValueChange={setNewVoiceId}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICES.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Status</Label>
              <Select value={newStatus} onValueChange={(v: any) => setNewStatus(v)}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
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
              size="sm"
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  name: newName.trim(),
                  voiceId: newVoiceId,
                  voiceName: VOICES.find((v) => v.id === newVoiceId)?.name ?? newVoiceId,
                  status: newStatus,
                })
              }
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Create
            </Button>
          </CardContent>
        </Card>
      )}

      {editing && (
        <Card className="bg-slate-800/80 border border-slate-600 border-indigo-500/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-white">Edit agent</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-slate-400 text-xs">Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">System prompt (used by chat/voice when this agent is assigned)</Label>
              <Textarea
                value={editSystemPrompt}
                onChange={(e) => setEditSystemPrompt(e.target.value)}
                placeholder="Main instruction for this agent"
                className="bg-slate-900 border-slate-700 text-white mt-1 min-h-[100px]"
              />
            </div>
            <div className="rounded-sui bg-slate-900/40 border border-indigo-500/20 p-4">
              <LiveEmotionControl
                value={editDefaultEmotion}
                onChange={setEditDefaultEmotion}
              />
            </div>
            <p className="text-[10px] text-slate-500">
              ConciergePanel loads site config via GET /api/site-configs/:id. Voice and chat use this agent&apos;s system prompt when the site&apos;s assigned agent is this one. Site-level system prompt override can override per business.
            </p>
            <Button
              size="sm"
              disabled={updateMutation.isPending}
              onClick={() => {
                updateMutation.mutate({
                  id: editing.id,
                  data: {
                    name: editName,
                    systemPrompt: editSystemPrompt || undefined,
                    defaultEmotion: editDefaultEmotion ?? undefined,
                  },
                });
              }}
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
