import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bot, Plus, Globe, MessageSquare, Settings, Trash2, Eye,
  Send, Loader2, ArrowLeft, ExternalLink, ChevronRight,
  Sparkles, Radio, Clock, Star, MapPin, Phone, RefreshCw
} from 'lucide-react';
import type { Agent, SiteConfig } from '@shared/schema';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function SiteList({
  sites,
  selectedId,
  onSelect,
  onCreateNew,
}: {
  sites: SiteConfig[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Your Sites</h3>
        <Button size="sm" variant="outline" onClick={onCreateNew} data-testid="button-create-site">
          <Plus className="w-4 h-4 mr-1" /> Add Site
        </Button>
      </div>
      {sites.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <Globe className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          <p className="text-sm">No sites configured yet.</p>
          <p className="text-xs text-slate-600 mt-1">Generate a website from the home page, then add it here.</p>
        </div>
      )}
      {sites.map((site) => {
        const placeData = site.placeData as any;
        return (
          <button
            key={site.id}
            onClick={() => onSelect(site.id)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selectedId === site.id
                ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            data-testid={`button-site-${site.id}`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                selectedId === site.id ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-400'
              }`}>
                <Globe className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{site.name}</p>
                {site.domain && <p className="text-xs text-slate-500 truncate">{site.domain}</p>}
                <div className="flex items-center gap-2 mt-1">
                  {site.chatbotEnabled ? (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Chat On</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500">Chat Off</Badge>
                  )}
                  {placeData?.rating && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-current" /> {placeData.rating}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AdminPanel({
  site,
  agents,
  onUpdate,
  isUpdating,
}: {
  site: SiteConfig;
  agents: Agent[];
  onUpdate: (updates: Partial<SiteConfig>) => void;
  isUpdating: boolean;
}) {
  const placeData = site.placeData as any;
  const [activeTab, setActiveTab] = useState<'settings' | 'agent' | 'chat' | 'logs'>('settings');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: site.greetingMessage || `Hi! I'm the AI assistant for ${site.name}. How can I help you?` }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: chatLogs = [], isLoading: logsLoading } = useQuery<any[]>({
    queryKey: ['/api/site-configs', site.id, 'chat-logs'],
    queryFn: () => fetch(`/api/site-configs/${site.id}/chat-logs`).then(r => r.json()),
    enabled: activeTab === 'logs',
  });

  const sendTestChat = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/website-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          businessName: placeData?.name || site.name,
          businessAddress: placeData?.formatted_address,
          businessPhone: placeData?.formatted_phone_number,
          history: chatMessages.slice(-10),
        }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response || 'No response.' }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to AI.' }]);
    }
    setChatLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [chatInput, chatLoading, chatMessages, placeData, site.name]);

  useEffect(() => {
    setChatMessages([
      { role: 'assistant', content: site.greetingMessage || `Hi! I'm the AI assistant for ${site.name}. How can I help you?` }
    ]);
  }, [site.id, site.greetingMessage, site.name]);

  const tabs = [
    { id: 'settings' as const, label: 'Settings', icon: Settings },
    { id: 'agent' as const, label: 'Agent', icon: Bot },
    { id: 'chat' as const, label: 'Test Chat', icon: MessageSquare },
    { id: 'logs' as const, label: 'Chat Logs', icon: Clock },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Globe className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white truncate">{site.name}</h2>
            {site.domain && (
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> {site.domain}/aibizbot
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'settings' && (
          <div className="space-y-5">
            <div>
              <Label className="text-slate-300 text-xs mb-1.5 block">Site Name</Label>
              <Input
                value={site.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                data-testid="input-site-name"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1.5 block">Domain</Label>
              <Input
                value={site.domain || ''}
                onChange={(e) => onUpdate({ domain: e.target.value })}
                placeholder="e.g. aibizbot.gatewayglobal.ai"
                className="bg-slate-800 border-slate-700 text-white"
                data-testid="input-site-domain"
              />
              <p className="text-[10px] text-slate-500 mt-1">The domain where this site will be hosted. Add /aibizbot to access admin.</p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-slate-300 text-sm">Chatbot Enabled</Label>
                <p className="text-[10px] text-slate-500">Show chat widget on customer website</p>
              </div>
              <Switch
                checked={site.chatbotEnabled ?? true}
                onCheckedChange={(checked) => onUpdate({ chatbotEnabled: checked })}
                data-testid="switch-chatbot-enabled"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-slate-300 text-sm">Voice Concierge</Label>
                <p className="text-[10px] text-slate-500">Enable voice AI on customer website</p>
              </div>
              <Switch
                checked={site.voiceConciergeEnabled ?? true}
                onCheckedChange={(checked) => onUpdate({ voiceConciergeEnabled: checked })}
                data-testid="switch-voice-enabled"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1.5 block">Greeting Message</Label>
              <Textarea
                value={site.greetingMessage || ''}
                onChange={(e) => onUpdate({ greetingMessage: e.target.value })}
                placeholder="Hi! I'm your AI assistant. How can I help?"
                className="bg-slate-800 border-slate-700 text-white resize-none"
                rows={3}
                data-testid="input-greeting"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1.5 block">Widget Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={site.widgetColor || '#2563eb'}
                  onChange={(e) => onUpdate({ widgetColor: e.target.value })}
                  className="w-10 h-10 rounded-md border border-slate-700 cursor-pointer bg-transparent"
                  data-testid="input-widget-color"
                />
                <span className="text-sm text-slate-400 font-mono">{site.widgetColor || '#2563eb'}</span>
              </div>
            </div>
            {placeData && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    Linked Business
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs text-slate-400">
                  <p className="text-white font-medium">{placeData.name}</p>
                  {placeData.formatted_address && <p>{placeData.formatted_address}</p>}
                  {placeData.formatted_phone_number && (
                    <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {placeData.formatted_phone_number}</p>
                  )}
                  {placeData.rating && (
                    <p className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> {placeData.rating} ({placeData.user_ratings_total} reviews)</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'agent' && (
          <div className="space-y-5">
            <div>
              <Label className="text-slate-300 text-xs mb-1.5 block">Assigned Agent</Label>
              <Select
                value={site.assignedAgentId || 'none'}
                onValueChange={(val) => onUpdate({ assignedAgentId: val === 'none' ? null : val })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white" data-testid="select-agent">
                  <SelectValue placeholder="Select an agent..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default (No Agent)</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name} {agent.status !== 'active' ? `(${agent.status})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500 mt-1">Assign an agent to control the AI personality and DISC profile for this site's chatbot.</p>
            </div>

            {site.assignedAgentId && agents.find(a => a.id === site.assignedAgentId) && (() => {
              const agent = agents.find(a => a.id === site.assignedAgentId)!;
              return (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                      <Bot className="w-4 h-4 text-indigo-400" />
                      Agent Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {agent.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{agent.name}</p>
                        <p className="text-xs text-slate-400">{agent.aiModelProvider || 'moonshot'} / {agent.aiModelId || 'default'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'D', value: agent.dominance, color: 'text-red-400' },
                        { label: 'I', value: agent.influence, color: 'text-yellow-400' },
                        { label: 'S', value: agent.steadiness, color: 'text-green-400' },
                        { label: 'C', value: agent.conscientiousness, color: 'text-blue-400' },
                      ].map(disc => (
                        <div key={disc.label} className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${disc.color}`}>{disc.label}</span>
                          <div className="flex-1 h-1.5 bg-slate-700 rounded-full">
                            <div className="h-full bg-slate-500 rounded-full" style={{ width: `${disc.value}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-500 w-6 text-right">{disc.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            <div>
              <Label className="text-slate-300 text-xs mb-1.5 block">System Prompt Override</Label>
              <Textarea
                value={site.systemPromptOverride || ''}
                onChange={(e) => onUpdate({ systemPromptOverride: e.target.value })}
                placeholder="Leave empty to use the assigned agent's default system prompt. Enter a custom prompt to override."
                className="bg-slate-800 border-slate-700 text-white resize-none"
                rows={6}
                data-testid="input-system-prompt"
              />
              <p className="text-[10px] text-slate-500 mt-1">Custom instructions for the AI on this site. Overrides the agent's default prompt if set.</p>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col h-full -m-4">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-xl text-sm bg-slate-800 text-slate-400 border border-slate-700 rounded-tl-none flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-slate-700 shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); sendTestChat(); }} className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Test your chatbot..."
                  className="bg-slate-800 border-slate-700 text-white flex-1"
                  disabled={chatLoading}
                  data-testid="input-test-chat"
                />
                <Button type="submit" size="icon" disabled={chatLoading || !chatInput.trim()} data-testid="button-send-test">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <p className="text-[10px] text-slate-500 mt-1.5 text-center">Test how the AI responds to customers on this site</p>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-3">
            {logsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-slate-800" />)}
              </div>
            ) : chatLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                <p className="text-sm">No chat conversations yet.</p>
                <p className="text-xs text-slate-600 mt-1">Visitor conversations will appear here.</p>
              </div>
            ) : (
              chatLogs.map((log: any, i: number) => (
                <div key={i} className={`p-3 rounded-lg border text-sm ${
                  log.role === 'user'
                    ? 'bg-slate-800/50 border-slate-700 text-slate-300'
                    : 'bg-indigo-500/5 border-indigo-500/10 text-slate-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {log.role === 'user' ? 'Visitor' : 'AI Bot'}
                    </Badge>
                    {log.createdAt && (
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs">{log.content}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {isUpdating && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      )}
    </div>
  );
}

function CreateSiteDialog({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (data: { name: string; domain?: string; placeId?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-white font-bold">New Site Configuration</h3>
          <p className="text-xs text-slate-400">Add a business website to manage</p>
        </div>
      </div>
      <div>
        <Label className="text-slate-300 text-xs mb-1.5 block">Business Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Joe's Coffee Shop"
          className="bg-slate-800 border-slate-700 text-white"
          data-testid="input-new-site-name"
        />
      </div>
      <div>
        <Label className="text-slate-300 text-xs mb-1.5 block">Domain (optional)</Label>
        <Input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="e.g. joescoffee.gatewayglobal.ai"
          className="bg-slate-800 border-slate-700 text-white"
          data-testid="input-new-site-domain"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1" data-testid="button-cancel-create">Cancel</Button>
        <Button onClick={() => onCreate({ name, domain: domain || undefined })} disabled={!name.trim()} className="flex-1" data-testid="button-confirm-create">
          <Plus className="w-4 h-4 mr-1" /> Create
        </Button>
      </div>
    </div>
  );
}

export default function AiBizBotAdmin() {
  const { toast } = useToast();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: sites = [], isLoading: sitesLoading } = useQuery<SiteConfig[]>({
    queryKey: ['/api/site-configs'],
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });

  const selectedSite = sites.find(s => s.id === selectedSiteId);

  useEffect(() => {
    if (sites.length > 0 && !selectedSiteId) {
      setSelectedSiteId(sites[0].id);
    }
  }, [sites, selectedSiteId]);

  const createMutation = useMutation({
    mutationFn: (data: { name: string; domain?: string; placeId?: string }) =>
      apiRequest('POST', '/api/site-configs', data),
    onSuccess: async (res) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ['/api/site-configs'] });
      setSelectedSiteId(created.id);
      setIsCreating(false);
      toast({ title: 'Site created' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SiteConfig> }) =>
      apiRequest('PATCH', `/api/site-configs/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/site-configs'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/site-configs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/site-configs'] });
      setSelectedSiteId(null);
      toast({ title: 'Site deleted' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const handleUpdate = useCallback((updates: Partial<SiteConfig>) => {
    if (!selectedSiteId) return;
    updateMutation.mutate({ id: selectedSiteId, updates });
  }, [selectedSiteId, updateMutation]);

  return (
    <div className="flex h-full bg-slate-950">
      <div className="w-72 border-r border-slate-800 bg-slate-900 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-bold text-white">AI Biz Bot</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Manage AI chatbots on your customer websites</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {sitesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-slate-800" />)}
            </div>
          ) : isCreating ? (
            <CreateSiteDialog
              onCancel={() => setIsCreating(false)}
              onCreate={(data) => createMutation.mutate(data)}
            />
          ) : (
            <SiteList
              sites={sites}
              selectedId={selectedSiteId}
              onSelect={setSelectedSiteId}
              onCreateNew={() => setIsCreating(true)}
            />
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {selectedSite ? (
          <div className="flex-1 flex flex-col relative">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-white font-semibold truncate">{selectedSite.name}</h2>
                {selectedSite.chatbotEnabled ? (
                  <Badge variant="secondary" className="shrink-0">
                    <Radio className="w-3 h-3 mr-1 text-green-400" /> Live
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0 text-slate-500">Disabled</Badge>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this site configuration?')) {
                      deleteMutation.mutate(selectedSite.id);
                    }
                  }}
                  className="text-red-400 hover:text-red-300"
                  data-testid="button-delete-site"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <AdminPanel
                site={selectedSite}
                agents={agents}
                onUpdate={handleUpdate}
                isUpdating={updateMutation.isPending}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Bot className="w-16 h-16 mx-auto mb-4 text-slate-700" />
              <h2 className="text-xl font-bold text-white mb-2">AI Biz Bot Admin</h2>
              <p className="text-slate-400 max-w-md">
                Select a site from the left panel to configure its AI chatbot, or create a new one.
              </p>
              <Button
                className="mt-6"
                onClick={() => setIsCreating(true)}
                data-testid="button-create-first-site"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Your First Site
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}