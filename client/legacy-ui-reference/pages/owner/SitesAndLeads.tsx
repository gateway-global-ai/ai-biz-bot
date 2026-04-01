import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe, Users, MessageSquare, Search, ExternalLink, Phone,
  MapPin, Star, Bot, Loader2, ChevronRight, ArrowLeft,
  BarChart3, Clock, Eye, Send, CheckCircle2, Building2,
} from 'lucide-react';

interface SiteSummary {
  id: string;
  name: string;
  domain: string | null;
  placeId: string | null;
  chatbotEnabled: boolean;
  voiceConciergeEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  totalVisitors: number;
  totalMessages: number;
  lastActivity: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
  industry: string | null;
  rating: string | null;
  reviewCount: number | null;
}

interface SiteVisitor {
  visitorId: string;
  messageCount: number;
  firstSeen: string | null;
  lastSeen: string | null;
}

interface ChatMessage {
  id: string;
  siteConfigId: string | null;
  visitorId: string | null;
  role: string;
  content: string;
  createdAt: string | null;
}

interface SiteLead {
  siteId: string;
  siteName: string;
  placeId: string | null;
  domain: string | null;
  chatbotEnabled: boolean;
  voiceConciergeEnabled: boolean;
  createdAt: string;
  businessPhone: string | null;
  businessAddress: string | null;
  industry: string | null;
  rating: string | null;
  reviewCount: number | null;
  prospectId: string | null;
  qualityScore: number | null;
  prospectStatus: string | null;
  smsSent: boolean;
  siteGenerated: boolean;
}

interface Analytics {
  totalSites: number;
  activeSites: number;
  totalVisitors: number;
  totalMessages: number;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatTimeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function AnalyticsCards({ analytics }: { analytics: Analytics | undefined }) {
  const stats = [
    { label: 'Total Sites', value: analytics?.totalSites || 0, icon: Globe, color: 'text-blue-400' },
    { label: 'Active Sites', value: analytics?.activeSites || 0, icon: BarChart3, color: 'text-emerald-400' },
    { label: 'Total Visitors', value: analytics?.totalVisitors || 0, icon: Users, color: 'text-purple-400' },
    { label: 'Total Messages', value: analytics?.totalMessages || 0, icon: MessageSquare, color: 'text-orange-400' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <Card key={s.label} className="rounded-sui bg-slate-900/40 backdrop-blur-xl border border-indigo-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-slate-400">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-white" data-testid={`text-analytics-${s.label.toLowerCase().replace(/\s+/g, '-')}`}>{s.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SiteDetail({ siteId, siteName, onBack }: { siteId: string; siteName: string; onBack: () => void }) {
  const [selectedVisitor, setSelectedVisitor] = useState<string | null>(null);

  const { data: visitors = [], isLoading: visitorsLoading } = useQuery<SiteVisitor[]>({
    queryKey: ['/api/admin/sites', siteId, 'visitors'],
  });

  const { data: chatHistory = [], isLoading: chatLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/admin/sites', siteId, 'chat-history', selectedVisitor],
    queryFn: async () => {
      const url = `/api/admin/sites/${siteId}/chat-history${selectedVisitor ? `?visitorId=${encodeURIComponent(selectedVisitor)}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch chat history');
      return res.json();
    },
    enabled: !!selectedVisitor,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-sites">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h3 className="text-lg font-bold text-white">{siteName}</h3>
          <p className="text-xs text-slate-400">{visitors.length} visitor{visitors.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-sui bg-slate-900/40 backdrop-blur-xl border border-indigo-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              Visitors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-96 overflow-y-auto">
            {visitorsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-purple-400" /></div>
            ) : visitors.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No visitors yet</p>
            ) : (
              visitors.map((v) => (
                <button
                  key={v.visitorId}
                  onClick={() => setSelectedVisitor(v.visitorId)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${selectedVisitor === v.visitorId ? 'bg-purple-600/20 border border-purple-500/30' : 'hover-elevate'}`}
                  data-testid={`button-visitor-${v.visitorId.slice(0, 8)}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{v.visitorId.slice(0, 12)}...</p>
                      <p className="text-xs text-slate-400">{v.messageCount} message{v.messageCount !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-500">{formatTimeAgo(v.lastSeen)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-sui bg-slate-900/40 backdrop-blur-xl border border-indigo-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              Chat History
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {!selectedVisitor ? (
              <p className="text-sm text-slate-500 py-8 text-center">Select a visitor to view their conversation</p>
            ) : chatLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
            ) : chatHistory.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No messages found</p>
            ) : (
              <div className="space-y-3">
                {chatHistory.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-sui p-3 text-sm ${msg.role === 'user' ? 'bg-purple-600/20 text-purple-200' : 'bg-slate-800/60 text-slate-300'}`}>
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{formatDate(msg.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VisitorsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState<{ id: string; name: string } | null>(null);

  const { data: sites = [], isLoading } = useQuery<SiteSummary[]>({
    queryKey: ['/api/admin/sites/summary'],
  });

  const { data: analytics } = useQuery<Analytics>({
    queryKey: ['/api/admin/sites/analytics'],
  });

  const filtered = sites.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.businessAddress?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedSite) {
    return <SiteDetail siteId={selectedSite.id} siteName={selectedSite.name} onBack={() => setSelectedSite(null)} />;
  }

  return (
    <div className="space-y-4">
      <AnalyticsCards analytics={analytics} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          data-testid="input-site-search"
          placeholder="Search sites by name, industry, or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-400"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-sui bg-slate-900/40 backdrop-blur-xl border border-indigo-500/20">
          <CardContent className="py-12 text-center">
            <Globe className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-400">No generated sites found</p>
            <p className="text-xs text-slate-500 mt-1">Sites will appear here once the Auto Agent generates them</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((site) => (
            <Card
              key={site.id}
              className="rounded-sui bg-slate-900/40 backdrop-blur-xl border border-indigo-500/20 cursor-pointer hover-elevate"
              onClick={() => setSelectedSite({ id: site.id, name: site.name })}
              data-testid={`card-site-${site.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{site.name}</p>
                      <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
                        {site.industry && <span>{site.industry}</span>}
                        {site.businessAddress && (
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{site.businessAddress}</span>
                        )}
                        {site.rating && (
                          <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{site.rating}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <p className="text-lg font-bold text-purple-400">{site.totalVisitors}</p>
                      <p className="text-[10px] text-slate-500">visitors</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-400">{site.totalMessages}</p>
                      <p className="text-[10px] text-slate-500">messages</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{formatTimeAgo(site.lastActivity)}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {site.chatbotEnabled && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-1">Chat</Badge>}
                        {site.voiceConciergeEnabled && <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] px-1">Voice</Badge>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

type LeadsQueryResult = { leads: SiteLead[]; vlmRetired: boolean };

function LeadsTab() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, isError } = useQuery<LeadsQueryResult>({
    queryKey: ['/api/admin/sites/leads'],
    queryFn: async () => {
      const res = await fetch('/api/admin/sites/leads', { credentials: 'include' });
      if (res.status === 410) {
        return { leads: [], vlmRetired: true };
      }
      if (!res.ok) {
        throw new Error((await res.text()) || `HTTP ${res.status}`);
      }
      const leads = (await res.json()) as SiteLead[];
      return { leads, vlmRetired: false };
    },
  });

  const leads = data?.leads ?? [];
  const vlmRetired = data?.vlmRetired ?? false;

  const filtered = leads.filter(l =>
    l.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.businessPhone?.includes(searchTerm) ||
    l.businessAddress?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: leads.length,
    withPhone: leads.filter(l => l.businessPhone).length,
    smsSent: leads.filter(l => l.smsSent).length,
    won: leads.filter(l => l.prospectStatus === 'won').length,
  };

  return (
    <div className="space-y-4">
      {!isLoading && !isError && vlmRetired ? (
        <Card className="rounded-sui bg-amber-950/30 border border-amber-500/30 backdrop-blur-xl">
          <CardContent className="py-3 px-4">
            <p className="text-sm text-amber-200/90">
              VLM-backed lead merge is <span className="font-medium">retired for v1</span> (API returns 410). Use Visitors &amp; Chats and governed operator tools.
            </p>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Leads', value: stats.total, icon: Building2, color: 'text-blue-400' },
          { label: 'With Phone', value: stats.withPhone, icon: Phone, color: 'text-emerald-400' },
          { label: 'SMS Sent', value: stats.smsSent, icon: Send, color: 'text-purple-400' },
          { label: 'Converted', value: stats.won, icon: CheckCircle2, color: 'text-green-400' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="rounded-sui bg-slate-900/40 backdrop-blur-xl border border-indigo-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-xs text-slate-400">{s.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          data-testid="input-lead-search"
          placeholder="Search leads by name, industry, phone, or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-400"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-sui bg-slate-900/40 backdrop-blur-xl border border-indigo-500/20">
          <CardContent className="py-12 text-center">
            <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            {vlmRetired ? (
              <>
                <p className="text-slate-400">No lead list in v1</p>
                <p className="text-xs text-slate-500 mt-1">Prospect merge endpoint is gone; see notice above.</p>
              </>
            ) : (
              <>
                <p className="text-slate-400">No leads with generated sites yet</p>
                <p className="text-xs text-slate-500 mt-1">Run the Auto Agent pipeline to discover leads and generate sites</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead) => (
            <Card key={lead.siteId} className="rounded-sui bg-slate-900/40 backdrop-blur-xl border border-indigo-500/20" data-testid={`card-lead-${lead.siteId}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{lead.siteName}</p>
                      <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
                        {lead.industry && <span>{lead.industry}</span>}
                        {lead.businessPhone && (
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.businessPhone}</span>
                        )}
                        {lead.businessAddress && (
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.businessAddress}</span>
                        )}
                        {lead.rating && (
                          <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{lead.rating}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    {lead.qualityScore != null && (
                      <Badge className={`${lead.qualityScore >= 60 ? 'bg-emerald-600 border-emerald-500' : lead.qualityScore >= 40 ? 'bg-amber-600 border-amber-500' : 'bg-slate-600 border-slate-500'}`}>
                        {lead.qualityScore}
                      </Badge>
                    )}
                    {lead.prospectStatus && (
                      <Badge className={`text-[10px] ${
                        lead.prospectStatus === 'won' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        lead.prospectStatus === 'called' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                        lead.prospectStatus === 'lost' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        'bg-slate-500/20 text-slate-400 border-slate-500/30'
                      }`}>
                        {lead.prospectStatus}
                      </Badge>
                    )}
                    {lead.smsSent && (
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">
                        <Send className="w-3 h-3 mr-1" /> SMS Sent
                      </Badge>
                    )}
                    <div className="flex items-center gap-1">
                      {lead.chatbotEnabled && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-1">Chat</Badge>}
                      {lead.voiceConciergeEnabled && <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] px-1">Voice</Badge>}
                    </div>
                    <a
                      href={`/site/${lead.siteId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`link-preview-${lead.siteId}`}
                    >
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </Button>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SitesAndLeads() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3" data-testid="text-sites-leads-title">
          <Globe className="w-7 h-7 text-blue-400" />
          Sites & Leads
        </h1>
        <p className="text-slate-400 mt-1">Manage generated AI websites, track visitors, and monitor leads</p>
      </div>

      <Tabs defaultValue="visitors" className="space-y-4">
        <TabsList className="bg-slate-900/60 border border-indigo-500/20">
          <TabsTrigger data-testid="tab-sites-visitors" value="visitors" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Eye className="w-4 h-4 mr-2" /> Visitors & Chats
          </TabsTrigger>
          <TabsTrigger data-testid="tab-sites-leads" value="leads" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Building2 className="w-4 h-4 mr-2" /> Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visitors"><VisitorsTab /></TabsContent>
        <TabsContent value="leads"><LeadsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
