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
  Bot, Plus, Globe, MessageSquare, Settings, Trash2,
  Send, Loader2, ExternalLink, Code, Copy, Check,
  Sparkles, Clock, Star, MapPin, Phone, Zap,
  ShoppingCart, Headphones, Palette, BookOpen, UserPlus
} from 'lucide-react';
import type { Agent, SiteConfig, BotTemplate } from '@shared/schema';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const TEMPLATE_ICONS: Record<string, any> = {
  ShoppingCart,
  Headphones,
  Sparkles,
  Palette,
  Bot,
};

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  addedAt: string;
}

interface DemoLeadRow {
  id: string;
  phone: string | null;
  name: string | null;
  businessName: string;
  businessAddress: string | null;
  placeId: string | null;
  status: string;
  magicTokenUsed: boolean | null;
  demoStartedAt: string | null;
  demoReadyAt: string | null;
  createdAt: string | null;
  demoUrl: string;
  siteId: string | null;
}

function KnowledgeLibraryTab({
  siteId,
  docs,
  onUpdate,
}: {
  siteId: string;
  docs: KnowledgeDoc[];
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const addDoc = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: 'Title and content required', variant: 'destructive' });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/site-configs/${siteId}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      setTitle('');
      setContent('');
      onUpdate();
      toast({ title: 'Document added to knowledge library' });
    } catch (e: any) {
      toast({ title: 'Failed to add', description: e.message, variant: 'destructive' });
    }
    setAdding(false);
  };

  const deleteDoc = async (docId: string) => {
    setDeletingId(docId);
    try {
      const res = await fetch(`/api/site-configs/${siteId}/knowledge/${docId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      onUpdate();
      toast({ title: 'Document removed' });
    } catch (e: any) {
      toast({ title: 'Failed to remove', variant: 'destructive' });
    }
    setDeletingId(null);
  };

  return (
    <div className="space-y-5">
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
        <p className="text-sm text-slate-300 mb-3">
          Upload or paste content to train your site&apos;s AI. The chatbot will use this knowledge to answer questions. You can add research docs, menus, FAQs, or anything that helps the agent sound expert about your business.
        </p>
        <div className="space-y-3">
          <div>
            <Label className="text-slate-300 text-xs mb-1 block">Document title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Blueberry Hill AI training guide"
              className="bg-slate-800 border-slate-700 text-white"
              data-testid="input-knowledge-title"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-xs mb-1 block">Content (markdown or plain text)</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or type content the AI should use to answer questions..."
              className="min-h-[160px] bg-slate-800 border-slate-700 text-white font-mono text-sm"
              data-testid="textarea-knowledge-content"
            />
          </div>
          <Button onClick={addDoc} disabled={adding} size="sm" data-testid="button-knowledge-add">
            {adding ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <BookOpen className="w-4 h-4 mr-1" />}
            Add to library
          </Button>
        </div>
      </div>
      <div>
        <Label className="text-slate-300 text-xs mb-2 block">Documents in library ({docs.length})</Label>
        {docs.length === 0 ? (
          <p className="text-slate-500 text-sm">No documents yet. Add one above to train the agent.</p>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-white truncate">{d.title}</p>
                  <p className="text-xs text-slate-500 truncate">{d.content.length > 80 ? d.content.slice(0, 80) + '…' : d.content}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                  onClick={() => deleteDoc(d.id)}
                  disabled={deletingId === d.id}
                  data-testid={`button-knowledge-delete-${d.id}`}
                >
                  {deletingId === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DemoLeadsSidebar({
  leads,
  onSelectSite,
  selectedSiteId,
}: {
  leads: DemoLeadRow[];
  onSelectSite: (siteId: string) => void;
  selectedSiteId: string | null;
}) {
  if (leads.length === 0) return null;
  return (
    <div className="space-y-2 mb-6">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
        <UserPlus className="w-3.5 h-3.5" />
        Customers &amp; Demos
      </h3>
      <p className="text-[10px] text-slate-500 mb-2">New signups with demo links</p>
      <ul className="space-y-2 max-h-48 overflow-y-auto">
        {leads.slice(0, 20).map((lead) => (
          <li
            key={lead.id}
            className="p-2.5 rounded-lg border border-slate-700 bg-slate-800/50 text-left"
          >
            <p className="font-medium text-xs text-white truncate">{lead.businessName}</p>
            {lead.phone && <p className="text-[10px] text-slate-500 truncate">{lead.phone}</p>}
            <p className="text-[10px] text-slate-500 mt-0.5">
              {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '—'}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <a
                href={lead.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300"
              >
                <ExternalLink className="w-3 h-3" /> Open demo
              </a>
              {lead.siteId && (
                <button
                  type="button"
                  onClick={() => onSelectSite(lead.siteId!)}
                  className={`inline-flex items-center gap-1 text-[10px] ${selectedSiteId === lead.siteId ? 'text-indigo-300' : 'text-slate-500 hover:text-slate-400'}`}
                >
                  <Globe className="w-3 h-3" /> View site
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {leads.length > 20 && (
        <p className="text-[10px] text-slate-500">Showing 20 of {leads.length}</p>
      )}
    </div>
  );
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
                  {site.modelProvider && site.modelProvider !== 'kimi' && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-400 border-emerald-400/30">{site.modelProvider}</Badge>
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
  templates,
  onUpdate,
  isUpdating,
}: {
  site: SiteConfig;
  agents: Agent[];
  templates: BotTemplate[];
  onUpdate: (updates: Partial<SiteConfig>) => void;
  isUpdating: boolean;
}) {
  const placeData = site.placeData as any;
  const [activeTab, setActiveTab] = useState<'settings' | 'agent' | 'chat' | 'logs' | 'embed' | 'knowledge'>('settings');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: site.greetingMessage || `Hi! I'm the AI assistant for ${site.name}. How can I help you?` }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [embedCopied, setEmbedCopied] = useState(false);

  const { data: chatLogs = [], isLoading: logsLoading } = useQuery<any[]>({
    queryKey: ['/api/site-configs', site.id, 'chat-logs'],
    queryFn: () => fetch(`/api/site-configs/${site.id}/chat-logs`).then(r => r.json()),
    enabled: activeTab === 'logs',
  });

  const { data: knowledgeDocs = [], refetch: refetchKnowledge } = useQuery<{ id: string; title: string; content: string; addedAt: string }[]>({
    queryKey: ['/api/site-configs', site.id, 'knowledge'],
    queryFn: () => fetch(`/api/site-configs/${site.id}/knowledge`).then(r => r.json()),
    enabled: activeTab === 'knowledge',
  });

  const { data: providers = [] } = useQuery<{ provider: string; model: string }[]>({
    queryKey: ['/api/gateway/providers'],
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
          siteConfigId: site.id,
          visitorId: 'admin-test',
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
  }, [chatInput, chatLoading, chatMessages, placeData, site.name, site.id]);

  useEffect(() => {
    setChatMessages([
      { role: 'assistant', content: site.greetingMessage || `Hi! I'm the AI assistant for ${site.name}. How can I help you?` }
    ]);
  }, [site.id, site.greetingMessage, site.name]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const embedCode = `<script src="${baseUrl}/embed.js" data-bot-id="${site.id}" defer></script>`;

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  const applyTemplate = (template: BotTemplate) => {
    const uiConfig = template.defaultUiConfig as any;
    const knownProviders = ['kimi', 'gemini', 'openai', 'anthropic'];
    const model = template.defaultModel || 'kimi';
    const isProvider = knownProviders.includes(model);
    onUpdate({
      botTemplateId: template.id,
      systemPromptOverride: template.defaultSystemPrompt,
      modelProvider: isProvider ? model : 'kimi',
      modelName: isProvider ? null : model,
      widgetColor: uiConfig?.primaryColor || site.widgetColor,
      greetingMessage: uiConfig?.greetingMessage || site.greetingMessage,
      placeholderText: uiConfig?.placeholderText || site.placeholderText,
    });
  };

  const tabs = [
    { id: 'settings' as const, label: 'Settings', icon: Settings },
    { id: 'agent' as const, label: 'Agent', icon: Bot },
    { id: 'knowledge' as const, label: 'Knowledge', icon: BookOpen },
    { id: 'chat' as const, label: 'Test Chat', icon: MessageSquare },
    { id: 'logs' as const, label: 'Logs', icon: Clock },
    { id: 'embed' as const, label: 'Embed', icon: Code },
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
                <ExternalLink className="w-3 h-3" /> {site.domain}
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
              <Label className="text-slate-300 text-xs mb-1.5 block">AI Model Provider</Label>
              <Select
                value={site.modelProvider || 'kimi'}
                onValueChange={(val) => onUpdate({ modelProvider: val })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white" data-testid="select-model-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kimi">Kimi (Moonshot)</SelectItem>
                  <SelectItem value="gemini">Gemini (Google)</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500 mt-1">Select the AI provider. Automatic fallback to other providers if primary fails.</p>
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1.5 block">Model Name (optional)</Label>
              <Input
                value={site.modelName || ''}
                onChange={(e) => onUpdate({ modelName: e.target.value || null })}
                placeholder="Leave empty for default model"
                className="bg-slate-800 border-slate-700 text-white"
                data-testid="input-model-name"
              />
              <p className="text-[10px] text-slate-500 mt-1">Override the default model. e.g. kimi-k2.5, gemini-2.0-flash</p>
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

        {activeTab === 'knowledge' && (
          <KnowledgeLibraryTab siteId={site.id} docs={knowledgeDocs} onUpdate={refetchKnowledge} />
        )}

        {activeTab === 'agent' && (
          <div className="space-y-5">
            {templates.length > 0 && (
              <div>
                <Label className="text-slate-300 text-xs mb-2 block">Bot Templates</Label>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map((template) => {
                    const IconComp = TEMPLATE_ICONS[template.icon || 'Bot'] || Bot;
                    const isSelected = site.botTemplateId === template.id;
                    return (
                      <button
                        key={template.id}
                        onClick={() => applyTemplate(template)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          isSelected
                            ? 'bg-indigo-500/10 border-indigo-500/30'
                            : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                        }`}
                        data-testid={`button-template-${template.id}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <IconComp className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
                          <span className={`text-xs font-medium ${isSelected ? 'text-indigo-300' : 'text-slate-300'}`}>{template.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-2">{template.description}</p>
                        {isSelected && (
                          <Badge variant="secondary" className="text-[10px] mt-1.5">Active</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">Click a template to apply its system prompt, model, and widget settings.</p>
              </div>
            )}

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
              <p className="text-[10px] text-slate-500 mt-1">Assign an agent to control the AI personality and DISC profile.</p>
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
              <p className="text-[10px] text-slate-500 mt-1">Custom instructions for the AI on this site.</p>
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
              <p className="text-[10px] text-slate-500 mt-1.5 text-center">
                Using {site.modelProvider || 'kimi'} {site.modelName ? `(${site.modelName})` : ''} with auto-fallback
              </p>
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

        {activeTab === 'embed' && (
          <div className="space-y-5">
            {!site.chatbotEnabled && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-amber-300 font-medium">Chatbot is disabled</p>
                  <p className="text-[10px] text-amber-400/70">Enable the chatbot in Settings for the embed script to work. The widget will not load until the chatbot is enabled.</p>
                </div>
              </div>
            )}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                  <Code className="w-4 h-4 text-emerald-400" />
                  Embed Script
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-400">
                  Add this script to any website to deploy the AI chat widget. Place it before the closing {'</body>'} tag.
                </p>
                <div className="relative">
                  <pre className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {embedCode}
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyEmbedCode}
                    className="absolute top-2 right-2"
                    data-testid="button-copy-embed"
                  >
                    {embedCopied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {embedCopied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Widget Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg shrink-0"
                    style={{ backgroundColor: site.widgetColor || '#2563eb' }}
                  >
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium">Chat Widget Button</p>
                    <p className="text-[10px] text-slate-400">Position: {site.widgetPosition || 'bottom-right'}</p>
                    <p className="text-[10px] text-slate-400">Color: {site.widgetColor || '#2563eb'}</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="p-3 flex items-center gap-2" style={{ backgroundColor: site.widgetColor || '#2563eb' }}>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
                      {site.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{site.name}</p>
                      <p className="text-white/70 text-[10px]">Online</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50">
                    <div className="bg-white rounded-lg px-3 py-2 text-xs text-slate-700 border border-slate-100 inline-block">
                      {site.greetingMessage || 'Hello! How can I help you today?'}
                    </div>
                  </div>
                  <div className="p-2 border-t border-slate-200 flex gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full px-3 py-1.5 text-[10px] text-slate-400">
                      {site.placeholderText || 'Type a message...'}
                    </div>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: site.widgetColor || '#2563eb' }}>
                      <Send className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-slate-300">Configuration Summary</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="text-slate-400">Bot ID</div>
                <div className="text-slate-300 font-mono">{site.id.slice(0, 12)}...</div>
                <div className="text-slate-400">Provider</div>
                <div className="text-slate-300">{site.modelProvider || 'kimi'}</div>
                <div className="text-slate-400">Chatbot</div>
                <div className={site.chatbotEnabled ? 'text-emerald-400' : 'text-red-400'}>
                  {site.chatbotEnabled ? 'Enabled' : 'Disabled'}
                </div>
                <div className="text-slate-400">Widget Position</div>
                <div className="text-slate-300">{site.widgetPosition || 'bottom-right'}</div>
              </div>
            </div>
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

  const { data: templates = [] } = useQuery<BotTemplate[]>({
    queryKey: ['/api/bot-templates'],
  });

  const { data: demoLeads = [] } = useQuery<DemoLeadRow[]>({
    queryKey: ['/api/admin/demo-leads'],
  });

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
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            AI Biz Bot
          </h2>
          <p className="text-xs text-slate-500 mt-1">Manage chatbots on customer websites</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {sitesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 bg-slate-800" />)}
            </div>
          ) : isCreating ? (
            <CreateSiteDialog
              onCancel={() => setIsCreating(false)}
              onCreate={(data) => createMutation.mutate(data)}
            />
          ) : (
            <>
              <DemoLeadsSidebar
                leads={demoLeads}
                onSelectSite={setSelectedSiteId}
                selectedSiteId={selectedSiteId}
              />
              <SiteList
                sites={sites}
                selectedId={selectedSiteId}
                onSelect={setSelectedSiteId}
                onCreateNew={() => setIsCreating(true)}
              />
            </>
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        {selectedSiteId && sites.find(s => s.id === selectedSiteId) ? (
          <>
            <AdminPanel
              site={sites.find(s => s.id === selectedSiteId)!}
              agents={agents}
              templates={templates}
              onUpdate={handleUpdate}
              isUpdating={updateMutation.isPending}
            />
            <div className="absolute top-4 right-4 z-20">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (confirm('Delete this site configuration?')) {
                    deleteMutation.mutate(selectedSiteId);
                  }
                }}
                className="text-red-400 border-red-400/30 hover:bg-red-500/10"
                data-testid="button-delete-site"
              >
                <Trash2 className="w-3 h-3 mr-1" /> Delete
              </Button>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-slate-500">
              <Bot className="w-16 h-16 mx-auto mb-4 text-slate-700" />
              <h3 className="text-lg font-medium text-slate-400 mb-1">AI Biz Bot Admin</h3>
              <p className="text-sm">Select a site to manage its chatbot configuration</p>
              <p className="text-xs text-slate-600 mt-2">or create a new site from the sidebar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
