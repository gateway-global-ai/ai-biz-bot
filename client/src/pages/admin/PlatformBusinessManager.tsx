/**
 * Platform Business Manager — per-business management at /platform/businesses/:id.
 * Tabbed interface: Overview, Agents, Products & Services, Routing, Telephony, Knowledge.
 * Reuses existing components (AgentRosterPanel, QRRoutesManager, TelephonyPanel, etc.).
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgentRosterPanel } from "@/components/admin/AgentRosterPanel";
import { QRRoutesManager } from "@/components/account/QRRoutesManager";
import TelephonyPanelFull from "@/pages/developer/TelephonyPanel";
import { ProductsServicePanel } from "@/components/admin/ProductsServicePanel";
import {
  ArrowLeft, Building2, Bot, Package, QrCode, Phone, BookOpen,
  Globe, Sparkles, MapPin, Loader2, Save, ExternalLink, Check, Settings,
} from "lucide-react";

type BusinessTab = "overview" | "agents" | "products" | "routing" | "telephony" | "knowledge";

const TABS: { id: BusinessTab; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: Building2 },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "products", label: "Products & Services", icon: Package },
  { id: "routing", label: "Routing", icon: QrCode },
  { id: "telephony", label: "Telephony", icon: Phone },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
];

interface SiteConfig {
  id: string;
  name: string;
  plan: string | null;
  businessType?: string | null;
  businessDescription?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  domain?: string | null;
  slug?: string | null;
  placeData?: any;
  assignedAgentId?: string | null;
  provisionedPhoneNumber?: string | null;
  heroImageUrl?: string | null;
}

function OverviewTab({ site, onSave }: { site: SiteConfig; onSave: (updates: Partial<SiteConfig>) => void }) {
  const [name, setName] = useState(site.name || "");
  const [description, setDescription] = useState(site.businessDescription || "");
  const [website, setWebsite] = useState(site.website || "");
  const [logoUrl, setLogoUrl] = useState(site.logoUrl || "");
  const [domain, setDomain] = useState(site.domain || "");
  const [plan, setPlan] = useState(site.plan || "free");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ name, businessDescription: description, website, logoUrl, domain, plan: plan as any });
      toast({ title: "Saved" });
    } finally {
      setSaving(false);
    }
  };

  const address = (site.placeData as any)?.formatted_address;
  const isCustom = site.businessType === "custom" || !site.placeData;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Identity card */}
      <div className="rounded-sui bg-slate-900/40 border border-indigo-500/20 p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Business Identity</h3>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-sui bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
            ) : isCustom ? (
              <Sparkles className="w-7 h-7 text-indigo-400" />
            ) : (
              <MapPin className="w-7 h-7 text-slate-400" />
            )}
          </div>
          <div>
            <p className="font-bold text-white text-lg">{site.name}</p>
            {address && <p className="text-xs text-slate-400">{address}</p>}
            {site.slug && (
              <a
                href={`/biz/${site.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-0.5"
              >
                /biz/{site.slug}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {site.slug && (
              <a
                href={`/agent/${site.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                /agent/{site.slug}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-400">Business Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-400">Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {["free", "pro", "voice", "enterprise"].map((p) => (
                  <SelectItem key={p} value={p} className="text-white capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-slate-400">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of this business"
              className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-400">Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://" className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-400">Custom Domain</Label>
            <Input value={domain} onChange={(e) => setDomain(e.target.value)}
              placeholder="app.mybusiness.com" className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-slate-400">Logo URL</Label>
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..." className="bg-slate-800 border-slate-700 text-white" />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

function KnowledgeTab({ siteConfigId }: { siteConfigId: string }) {
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const { data: docs = [], refetch } = useQuery<any[]>({
    queryKey: [`/api/site-configs/${siteConfigId}/knowledge`],
  });

  const handleAdd = async () => {
    if (!title || !content) return;
    setUploading(true);
    try {
      await apiRequest("POST", `/api/site-configs/${siteConfigId}/knowledge`, { title, content });
      await refetch();
      setTitle(""); setContent("");
      toast({ title: "Knowledge added" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="rounded-sui bg-slate-900/40 border border-indigo-500/20 p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Add Knowledge</h3>
        <div className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title" className="bg-slate-800 border-slate-700 text-white" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Paste document content, FAQs, product info..."
            rows={6}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white text-sm p-3 resize-none focus:outline-none focus:border-indigo-500/50" />
          <Button onClick={handleAdd} disabled={uploading || !title || !content}
            className="bg-indigo-600 hover:bg-indigo-500 gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            Add to Knowledge Library
          </Button>
        </div>
      </div>

      {docs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{docs.length} document{docs.length !== 1 ? "s" : ""}</h3>
          {docs.map((doc: any) => (
            <div key={doc.id} className="p-3 rounded-sui bg-slate-900/40 border border-slate-700">
              <p className="text-sm font-medium text-white">{doc.title}</p>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{doc.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PlatformBusinessManager() {
  const [location] = useLocation();
  const { toast } = useToast();
  const siteId = location.split("/platform/businesses/")[1]?.split("?")[0];
  const [activeTab, setActiveTab] = useState<BusinessTab>("overview");

  const { data: site, isLoading } = useQuery<SiteConfig>({
    queryKey: [`/api/site-configs/${siteId}`],
    enabled: !!siteId,
  });

  const { data: agents = [] } = useQuery<any[]>({
    queryKey: ["/api/agents"],
  });
  const siteAgents = agents.filter((a: any) => a.siteConfigId === siteId);

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<SiteConfig>) =>
      apiRequest("PATCH", `/api/site-configs/${siteId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/site-configs/${siteId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/site-configs"] });
    },
    onError: (e: Error) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  if (!siteId) return <div className="p-6 text-slate-400">Invalid business ID.</div>;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="p-6">
        <p className="text-slate-400">Business not found.</p>
        <Link href="/platform/businesses">
          <Button variant="outline" className="mt-3 gap-2 border-slate-700 text-slate-300">
            <ArrowLeft className="w-4 h-4" /> Back to Businesses
          </Button>
        </Link>
      </div>
    );
  }

  const isCustom = site.businessType === "custom" || !site.placeData;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b border-indigo-500/20 bg-slate-900/60 backdrop-blur-sm">
        <Link href="/platform/businesses">
          <button className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Businesses
          </button>
        </Link>
        <span className="text-slate-600">/</span>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
            {site.logoUrl ? (
              <img src={site.logoUrl} alt={site.name} className="w-full h-full object-cover" />
            ) : isCustom ? (
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
          <span className="font-semibold text-white">{site.name}</span>
          <Badge className={`text-[10px] ${isCustom ? "bg-indigo-500/15 text-indigo-300" : "bg-slate-500/15 text-slate-400"} border-0`}>
            {isCustom ? "Custom" : "Maps"}
          </Badge>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">{siteAgents.length} agent{siteAgents.length !== 1 ? "s" : ""}</span>
          {site.slug && (
            <a href={`/agent/${site.slug}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 gap-1.5 text-xs">
                <Globe className="w-3.5 h-3.5" />
                Live Agent
                <ExternalLink className="w-3 h-3" />
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 flex border-b border-indigo-500/15 bg-slate-900/40 px-4 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        {activeTab === "overview" && (
          <OverviewTab site={site} onSave={(updates) => updateMutation.mutate(updates)} />
        )}
        {activeTab === "agents" && (
          <AgentRosterPanel
            siteConfigId={siteId}
            currentAssignedAgentId={site.assignedAgentId || null}
            onAssignAgent={(agentId) => updateMutation.mutate({ assignedAgentId: agentId })}
          />
        )}
        {activeTab === "products" && (
          <ProductsServicePanel siteConfigId={siteId} siteAgents={siteAgents} />
        )}
        {activeTab === "routing" && (
          <div className="telephony-canvas">
            <QRRoutesManager siteConfigId={siteId} siteSlug={site.slug || undefined} />
          </div>
        )}
        {activeTab === "telephony" && (
          <div className="telephony-canvas">
            <TelephonyPanelFull siteConfigId={siteId} />
          </div>
        )}
        {activeTab === "knowledge" && (
          <KnowledgeTab siteConfigId={siteId} />
        )}
      </div>
    </div>
  );
}
