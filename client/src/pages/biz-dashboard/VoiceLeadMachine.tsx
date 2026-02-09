import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Download, PhoneCall, Globe, Mail, MapPin, Star,
  TrendingUp, Users, Target, Zap, BarChart3, RefreshCw, Plus,
  Phone, Building2, ExternalLink, AlertCircle, CheckCircle2,
  XCircle, Clock, Loader2, Bot, Send, Rocket, FileText,
  ToggleLeft, ToggleRight,
} from "lucide-react";
import type { VlmProspect, VlmCampaign, VlmCallAttempt } from "@shared/schema";

function QualityBadge({ score }: { score: number }) {
  if (score >= 80) return <Badge variant="default" className="bg-emerald-600 border-emerald-500">{score}</Badge>;
  if (score >= 60) return <Badge variant="default" className="bg-yellow-600 border-yellow-500">{score}</Badge>;
  if (score >= 40) return <Badge variant="default" className="bg-orange-600 border-orange-500">{score}</Badge>;
  return <Badge variant="default" className="bg-red-600 border-red-500">{score}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: string; color: string }> = {
    new: { variant: "outline", color: "text-blue-400 border-blue-600" },
    queued: { variant: "outline", color: "text-yellow-400 border-yellow-600" },
    called: { variant: "outline", color: "text-purple-400 border-purple-600" },
    won: { variant: "default", color: "bg-emerald-600 border-emerald-500" },
    lost: { variant: "outline", color: "text-red-400 border-red-600" },
    draft: { variant: "outline", color: "text-slate-400 border-slate-600" },
    active: { variant: "default", color: "bg-emerald-600 border-emerald-500" },
    paused: { variant: "outline", color: "text-yellow-400 border-yellow-600" },
    completed: { variant: "default", color: "bg-blue-600 border-blue-500" },
    pending: { variant: "outline", color: "text-slate-400 border-slate-600" },
    in_progress: { variant: "outline", color: "text-blue-400 border-blue-600" },
    failed: { variant: "outline", color: "text-red-400 border-red-600" },
  };
  const s = map[status] || map.new;
  return <Badge className={s.color}>{status.replace("_", " ")}</Badge>;
}

function StatsOverview() {
  const { data: stats, isLoading } = useQuery<any>({ queryKey: ["/api/vlm/stats"] });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>;
  if (!stats) return null;

  const statCards = [
    { label: "Total Prospects", value: stats.totalProspects, icon: Users, color: "text-blue-400" },
    { label: "With Phone", value: stats.prospectsWithPhone, icon: Phone, color: "text-emerald-400" },
    { label: "With Email", value: stats.prospectsWithEmail, icon: Mail, color: "text-yellow-400" },
    { label: "Avg Quality", value: stats.avgQualityScore, icon: Target, color: "text-purple-400" },
    { label: "Total Calls", value: stats.totalCalls, icon: PhoneCall, color: "text-orange-400" },
    { label: "Connected", value: stats.totalConnected, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Sales Won", value: stats.totalSales, icon: TrendingUp, color: "text-green-400" },
    { label: "Connect Rate", value: `${stats.connectionRate}%`, icon: BarChart3, color: "text-indigo-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {statCards.map((s) => {
        const Icon = s.icon;
        return (
          <Card key={s.label} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-slate-400">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-white" data-testid={`text-vlm-stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>{s.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function DiscoveryPanel() {
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [maxResults, setMaxResults] = useState("20");
  const [enrichEmail, setEnrichEmail] = useState(false);
  const { toast } = useToast();

  const discoverMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/vlm/discover", {
        city, industry, maxResults: parseInt(maxResults), enrichEmail,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Discovery Complete", description: `Found ${data.discovered} businesses, saved ${data.saved} new prospects` });
      queryClient.invalidateQueries({ queryKey: ["/api/vlm/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vlm/stats"] });
    },
    onError: (err: any) => toast({ title: "Discovery Failed", description: err.message, variant: "destructive" }),
  });

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-purple-400" />
          Lead Discovery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">City / Location</label>
            <Input
              data-testid="input-vlm-city"
              placeholder="e.g. Austin, TX"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Industry / Business Type</label>
            <Input
              data-testid="input-vlm-industry"
              placeholder="e.g. restaurants, plumbers, dentists"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Max Results</label>
            <Select value={maxResults} onValueChange={setMaxResults}>
              <SelectTrigger data-testid="select-vlm-max" className="w-28 bg-slate-900 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              data-testid="checkbox-vlm-enrich"
              type="checkbox"
              checked={enrichEmail}
              onChange={(e) => setEnrichEmail(e.target.checked)}
              className="rounded border-slate-600"
            />
            Enrich emails (slower)
          </label>
          <Button
            data-testid="button-vlm-discover"
            onClick={() => discoverMutation.mutate()}
            disabled={!city || !industry || discoverMutation.isPending}
          >
            {discoverMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
            Discover Leads
          </Button>
        </div>
        {discoverMutation.isPending && (
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              <div>
                <p className="text-sm text-white font-medium">Searching Google Maps...</p>
                <p className="text-xs text-slate-400">This may take 30-60 seconds depending on results</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProspectsPanel() {
  const [filter, setFilter] = useState<string>("all");
  const { toast } = useToast();

  const queryPath = filter !== "all" ? `/api/vlm/prospects?status=${filter}` : "/api/vlm/prospects";
  const { data: prospects = [], isLoading } = useQuery<VlmProspect[]>({
    queryKey: ["/api/vlm/prospects", filter],
    queryFn: async () => {
      const res = await fetch(queryPath);
      if (!res.ok) throw new Error("Failed to fetch prospects");
      return res.json();
    },
  });

  const callMutation = useMutation({
    mutationFn: async (prospectId: string) => {
      const res = await apiRequest("POST", "/api/vlm/call", { prospectId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Call Initiated", description: "Outbound call started" });
      queryClient.invalidateQueries({ queryKey: ["/api/vlm/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vlm/stats"] });
    },
    onError: (err: any) => toast({ title: "Call Failed", description: err.message, variant: "destructive" }),
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/vlm/export-csv", {});
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "prospects.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => toast({ title: "Export Complete" }),
    onError: (err: any) => toast({ title: "Export Failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger data-testid="select-vlm-filter" className="w-36 bg-slate-900 border-slate-700 text-white">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="called">Called</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Button data-testid="button-vlm-export" variant="outline" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
        <span className="text-sm text-slate-400 ml-auto">{prospects.length} prospects</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
      ) : prospects.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-white font-medium mb-1">No prospects yet</p>
            <p className="text-sm text-slate-400">Use Lead Discovery to find business leads from Google Maps</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {prospects.map((p) => (
            <Card key={p.id} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="text-white font-medium truncate">{p.businessName}</h4>
                      <QualityBadge score={p.qualityScore} />
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      {p.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {p.phone}</span>}
                      {p.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {p.email}</span>}
                      {p.website && (
                        <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:underline">
                          <Globe className="w-3 h-3" /> Website
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {(p.city || p.state) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {[p.city, p.state].filter(Boolean).join(", ")}</span>}
                      {p.rating && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" /> {p.rating} ({p.reviewCount || 0})</span>}
                    </div>
                    <span className="text-xs text-slate-500">{p.industry}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.phone && p.status !== "called" && p.status !== "won" && (
                      <Button
                        data-testid={`button-vlm-call-${p.id}`}
                        size="sm"
                        variant="outline"
                        onClick={() => callMutation.mutate(p.id)}
                        disabled={callMutation.isPending}
                      >
                        <PhoneCall className="w-4 h-4 mr-1" /> Call
                      </Button>
                    )}
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

function CampaignsPanel() {
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [campaignCity, setCampaignCity] = useState("");
  const [campaignIndustry, setCampaignIndustry] = useState("");
  const [script, setScript] = useState("");
  const { toast } = useToast();

  const { data: campaigns = [], isLoading } = useQuery<VlmCampaign[]>({ queryKey: ["/api/vlm/campaigns"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/vlm/campaigns", {
        name, city: campaignCity, industry: campaignIndustry, scriptTemplate: script || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Campaign Created" });
      setShowNew(false);
      setName(""); setCampaignCity(""); setCampaignIndustry(""); setScript("");
      queryClient.invalidateQueries({ queryKey: ["/api/vlm/campaigns"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/vlm/campaigns/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vlm/campaigns"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button data-testid="button-vlm-new-campaign" onClick={() => setShowNew(!showNew)}>
          <Plus className="w-4 h-4 mr-2" /> New Campaign
        </Button>
        <span className="text-sm text-slate-400 ml-auto">{campaigns.length} campaigns</span>
      </div>

      {showNew && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input data-testid="input-campaign-name" placeholder="Campaign name" value={name} onChange={(e) => setName(e.target.value)} className="bg-slate-900 border-slate-700 text-white" />
              <Input data-testid="input-campaign-city" placeholder="Target city" value={campaignCity} onChange={(e) => setCampaignCity(e.target.value)} className="bg-slate-900 border-slate-700 text-white" />
              <Input data-testid="input-campaign-industry" placeholder="Industry" value={campaignIndustry} onChange={(e) => setCampaignIndustry(e.target.value)} className="bg-slate-900 border-slate-700 text-white" />
            </div>
            <Textarea data-testid="input-campaign-script" placeholder="Call script template (use {businessName}, {industry}, {city} for variables)" value={script} onChange={(e) => setScript(e.target.value)} className="bg-slate-900 border-slate-700 text-white" rows={3} />
            <div className="flex justify-end gap-2">
              <Button data-testid="button-campaign-cancel" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button data-testid="button-campaign-save" onClick={() => createMutation.mutate()} disabled={!name || !campaignCity || !campaignIndustry || createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
      ) : campaigns.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-white font-medium mb-1">No campaigns yet</p>
            <p className="text-sm text-slate-400">Create a campaign to organize your outbound calling</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h4 className="text-white font-medium">{c.name}</h4>
                  <StatusBadge status={c.status} />
                  <span className="text-xs text-slate-400">{c.industry} - {c.city}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="bg-slate-900/50 rounded-lg p-2">
                    <p className="text-xs text-slate-400">Prospects</p>
                    <p className="text-lg font-bold text-white">{c.totalProspects || 0}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2">
                    <p className="text-xs text-slate-400">Called</p>
                    <p className="text-lg font-bold text-white">{c.totalCalled || 0}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2">
                    <p className="text-xs text-slate-400">Connected</p>
                    <p className="text-lg font-bold text-emerald-400">{c.totalConnected || 0}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2">
                    <p className="text-xs text-slate-400">Sales</p>
                    <p className="text-lg font-bold text-green-400">{c.totalSales || 0}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.status === "draft" && (
                    <Button data-testid={`button-campaign-start-${c.id}`} size="sm" onClick={() => statusMutation.mutate({ id: c.id, status: "active" })}>
                      <Zap className="w-4 h-4 mr-1" /> Start
                    </Button>
                  )}
                  {c.status === "active" && (
                    <Button data-testid={`button-campaign-pause-${c.id}`} size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: c.id, status: "paused" })}>
                      Pause
                    </Button>
                  )}
                  {c.status === "paused" && (
                    <Button data-testid={`button-campaign-resume-${c.id}`} size="sm" onClick={() => statusMutation.mutate({ id: c.id, status: "active" })}>
                      Resume
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CallLogsPanel() {
  const { data: attempts = [], isLoading } = useQuery<VlmCallAttempt[]>({ queryKey: ["/api/vlm/call-attempts"] });

  const outcomeIcons: Record<string, any> = {
    connected: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    sale: <TrendingUp className="w-4 h-4 text-green-400" />,
    no_answer: <XCircle className="w-4 h-4 text-red-400" />,
    voicemail: <Clock className="w-4 h-4 text-yellow-400" />,
    rejected: <XCircle className="w-4 h-4 text-red-400" />,
    callback: <RefreshCw className="w-4 h-4 text-blue-400" />,
  };

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
      ) : attempts.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-12 text-center">
            <PhoneCall className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-white font-medium mb-1">No call attempts yet</p>
            <p className="text-sm text-slate-400">Call a prospect to see call logs here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {attempts.map((a) => (
            <Card key={a.id} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    {a.outcome ? outcomeIcons[a.outcome] || <AlertCircle className="w-4 h-4 text-slate-400" /> : <Clock className="w-4 h-4 text-slate-400" />}
                    <StatusBadge status={a.status} />
                  </div>
                  {a.outcome && <Badge variant="outline" className="text-slate-300 border-slate-600">{a.outcome.replace("_", " ")}</Badge>}
                  <span className="text-xs text-slate-400">Attempt #{a.attemptNumber}</span>
                  {a.duration ? <span className="text-xs text-slate-400">{a.duration}s</span> : null}
                  {a.callSid && <span className="text-xs text-slate-500 font-mono">{a.callSid.substring(0, 12)}...</span>}
                  <span className="text-xs text-slate-500 ml-auto">{a.calledAt ? new Date(a.calledAt).toLocaleString() : "Pending"}</span>
                </div>
                {a.notes && <p className="text-xs text-slate-400 mt-1">{a.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
      <button
        type="button"
        data-testid={`toggle-${label.toLowerCase().replace(/\s+/g, "-")}`}
        onClick={() => onChange(!checked)}
        className="relative w-10 h-5 rounded-full transition-colors"
        style={{ backgroundColor: checked ? "#7c3aed" : "#475569" }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
        />
      </button>
      {label}
    </label>
  );
}

function AutoAgentPanel() {
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [maxLeads, setMaxLeads] = useState("20");
  const [enrichEmails, setEnrichEmails] = useState(false);
  const [autoGenerateSites, setAutoGenerateSites] = useState(true);
  const [autoCall, setAutoCall] = useState(false);
  const [minQuality, setMinQuality] = useState("40");
  const [callScript, setCallScript] = useState(
    `Hi, this is your Google Place AI Biz Bot calling about {businessName}. We've built a free Google-powered AI website for your business that's now available online. Would you like us to send you the link? Press 1 to receive your free website link via text message. Press 2 if you're not interested. Your basic site is already live and our AI concierge is ready to answer questions from your customers.`
  );
  const { toast } = useToast();

  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/vlm/auto-agent/run", {
        city, industry, maxLeads: parseInt(maxLeads), enrichEmails,
        autoGenerateSites, autoCall, minQualityScore: parseInt(minQuality),
        callScript: callScript || undefined, callDelayMs: 3000,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Pipeline Complete!", description: `Discovered ${data.stats.discovered} leads, ${data.stats.sitesGenerated} sites generated, ${data.stats.callsQueued} calls queued` });
      queryClient.invalidateQueries({ queryKey: ["/api/vlm/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vlm/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vlm/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vlm/call-attempts"] });
    },
    onError: (err: any) => toast({ title: "Pipeline Failed", description: err.message, variant: "destructive" }),
  });

  const { data: progress } = useQuery<any>({
    queryKey: ["/api/vlm/auto-agent/progress"],
    refetchInterval: runMutation.isPending ? 2000 : false,
  });

  const scriptPreviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/vlm/auto-agent/generate-script", {
        businessName: "Joe's Pizza", industry: industry || "restaurants",
        city: city || "Austin, TX", rating: "4.5", reviewCount: 127,
        baseScript: callScript,
      });
      return res.json();
    },
    onSuccess: (data) => toast({ title: "Script Preview", description: data.script }),
  });

  const phaseColors: Record<string, string> = {
    idle: "text-slate-400", discovering: "text-blue-400", enriching: "text-yellow-400",
    scoring: "text-purple-400", generating_sites: "text-emerald-400",
    generating_script: "text-indigo-400", calling: "text-orange-400",
    complete: "text-green-400", error: "text-red-400",
  };

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Rocket className="w-5 h-5 text-purple-400" />
            Auto Agent Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-400">
            One-click automation: Discover leads, generate free AI websites, call them with the pitch, and send the link when they're interested.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Target City</label>
              <Input data-testid="input-auto-city" placeholder="e.g. Austin, TX" value={city} onChange={(e) => setCity(e.target.value)} className="bg-slate-900 border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Industry</label>
              <Input data-testid="input-auto-industry" placeholder="e.g. restaurants, plumbers" value={industry} onChange={(e) => setIndustry(e.target.value)} className="bg-slate-900 border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Max Leads</label>
              <Select value={maxLeads} onValueChange={setMaxLeads}>
                <SelectTrigger data-testid="select-auto-max" className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Min Quality Score (0-100)</label>
              <Select value={minQuality} onValueChange={setMinQuality}>
                <SelectTrigger data-testid="select-auto-quality" className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 (All leads)</SelectItem>
                  <SelectItem value="20">20+</SelectItem>
                  <SelectItem value="40">40+ (Recommended)</SelectItem>
                  <SelectItem value="60">60+</SelectItem>
                  <SelectItem value="80">80+ (Premium only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 justify-end">
              <ToggleSwitch checked={enrichEmails} onChange={setEnrichEmails} label="Enrich emails" />
              <ToggleSwitch checked={autoGenerateSites} onChange={setAutoGenerateSites} label="Auto-generate AI websites" />
              <ToggleSwitch checked={autoCall} onChange={setAutoCall} label="Auto-call prospects" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400">Call Script</label>
              <Button data-testid="button-auto-preview" size="sm" variant="outline" onClick={() => scriptPreviewMutation.mutate()} disabled={scriptPreviewMutation.isPending}>
                <FileText className="w-3 h-3 mr-1" /> Preview
              </Button>
            </div>
            <Textarea
              data-testid="input-auto-script"
              value={callScript}
              onChange={(e) => setCallScript(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white text-sm"
              rows={4}
              placeholder="Use {businessName}, {industry}, {city} for personalization"
            />
            <p className="text-xs text-slate-500 mt-1">Variables: {"{businessName}"}, {"{industry}"}, {"{city}"}, {"{rating}"}, {"{reviewCount}"}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              data-testid="button-auto-run"
              onClick={() => runMutation.mutate()}
              disabled={!city || !industry || runMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {runMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}
              Launch Auto Agent
            </Button>
            {autoCall && (
              <Badge className="bg-orange-600/20 text-orange-400 border-orange-600">
                <Phone className="w-3 h-3 mr-1" /> Live calls enabled
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {(runMutation.isPending || (progress && progress.phase !== "idle")) && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              {progress?.phase !== "complete" && progress?.phase !== "error" ? (
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              ) : progress?.phase === "complete" ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <div>
                <p className={`text-sm font-medium ${phaseColors[progress?.phase || "idle"]}`}>
                  {progress?.phase?.replace("_", " ").toUpperCase() || "STARTING"}
                </p>
                <p className="text-xs text-slate-400">{progress?.message}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-400">Discovered</p>
                <p className="text-lg font-bold text-white" data-testid="text-auto-discovered">{progress?.discovered || 0}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-400">Enriched</p>
                <p className="text-lg font-bold text-white" data-testid="text-auto-enriched">{progress?.enriched || 0}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-400">Sites Built</p>
                <p className="text-lg font-bold text-emerald-400" data-testid="text-auto-sites">{progress?.sitesGenerated || 0}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-400">Calls Queued</p>
                <p className="text-lg font-bold text-orange-400" data-testid="text-auto-calls">{progress?.callsQueued || 0}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-400">Errors</p>
                <p className="text-lg font-bold text-red-400" data-testid="text-auto-errors">{progress?.errors?.length || 0}</p>
              </div>
            </div>

            {progress?.errors?.length > 0 && (
              <div className="mt-3 bg-red-950/30 border border-red-900/50 rounded-lg p-3">
                <p className="text-xs text-red-400 font-medium mb-1">Errors:</p>
                <ul className="text-xs text-red-300 space-y-1">
                  {progress.errors.slice(0, 5).map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                  {progress.errors.length > 5 && (
                    <li className="text-red-500">...and {progress.errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <h4 className="text-white font-medium flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4 text-purple-400" />
            How the Auto Agent Works
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { step: "1", title: "Discover", desc: "Finds businesses on Google Maps by city + industry", icon: Search, color: "text-blue-400" },
              { step: "2", title: "Build Sites", desc: "Auto-generates a free AI website for each business", icon: Globe, color: "text-emerald-400" },
              { step: "3", title: "Call & Pitch", desc: "Calls each business with a personalized AI pitch", icon: PhoneCall, color: "text-orange-400" },
              { step: "4", title: "Send Link", desc: "Texts them their free website link when they press 1", icon: Send, color: "text-green-400" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="bg-slate-900/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">{s.step}</span>
                    <Icon className={`w-4 h-4 ${s.color}`} />
                    <span className="text-sm text-white font-medium">{s.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 ml-7">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VoiceLeadMachine() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3" data-testid="text-vlm-title">
          <Zap className="w-7 h-7 text-purple-400" />
          VoiceLeadMachine
        </h1>
        <p className="text-slate-400 mt-1">Outbound lead generator and auto-dialer powered by Google Maps and Twilio</p>
      </div>

      <StatsOverview />

      <Tabs defaultValue="auto-agent" className="space-y-4">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger data-testid="tab-vlm-auto" value="auto-agent" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <Rocket className="w-4 h-4 mr-2" /> Auto Agent
          </TabsTrigger>
          <TabsTrigger data-testid="tab-vlm-discover" value="discover" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <Search className="w-4 h-4 mr-2" /> Discover
          </TabsTrigger>
          <TabsTrigger data-testid="tab-vlm-prospects" value="prospects" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" /> Prospects
          </TabsTrigger>
          <TabsTrigger data-testid="tab-vlm-campaigns" value="campaigns" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <Target className="w-4 h-4 mr-2" /> Campaigns
          </TabsTrigger>
          <TabsTrigger data-testid="tab-vlm-calls" value="calls" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <PhoneCall className="w-4 h-4 mr-2" /> Call Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="auto-agent"><AutoAgentPanel /></TabsContent>
        <TabsContent value="discover"><DiscoveryPanel /></TabsContent>
        <TabsContent value="prospects"><ProspectsPanel /></TabsContent>
        <TabsContent value="campaigns"><CampaignsPanel /></TabsContent>
        <TabsContent value="calls"><CallLogsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
