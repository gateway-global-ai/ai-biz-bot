/**
 * Platform Businesses — primary business management page at /platform/businesses.
 * Supports Google Maps businesses AND custom (non-physical/SaaS) businesses.
 * On creation, agents are auto-provisioned server-side.
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building2, Plus, Search, Globe, MapPin, Bot, Phone, Loader2,
  ExternalLink, Zap, Map, ArrowRight, Sparkles,
} from "lucide-react";

interface SiteConfig {
  id: string;
  name: string;
  plan: string | null;
  businessType?: string;
  businessDescription?: string;
  website?: string;
  logoUrl?: string;
  placeData?: any;
  provisionedPhoneNumber?: string | null;
  createdAt?: string;
  slug?: string | null;
}

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  types?: string[];
}

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-500/20 text-slate-400",
  pro: "bg-indigo-500/20 text-indigo-300",
  voice: "bg-emerald-500/20 text-emerald-400",
  enterprise: "bg-amber-500/20 text-amber-400",
};

function CreateBusinessModal({ onCreated }: { onCreated: (id: string) => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"custom" | "maps">("custom");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  // Maps search state
  const [mapsQuery, setMapsQuery] = useState("");
  const [mapsResults, setMapsResults] = useState<PlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [searching, setSearching] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/site-configs", data),
    onSuccess: async (res) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/site-configs"] });
      toast({
        title: "Business Created",
        description: `${created.name} is live. Agents are being provisioned.`,
      });
      setOpen(false);
      resetForm();
      onCreated(created.id);
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSearch = async () => {
    if (!mapsQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/places/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mapsQuery }),
      });
      const data = await res.json();
      setMapsResults(data.results || data || []);
    } catch {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const resetForm = () => {
    setName(""); setDescription(""); setWebsite(""); setLogoUrl("");
    setMapsQuery(""); setMapsResults([]); setSelectedPlace(null);
    setMode("custom");
  };

  const handleSubmit = () => {
    if (mode === "custom") {
      if (!name.trim()) return toast({ title: "Business name required", variant: "destructive" });
      createMutation.mutate({
        name: name.trim(),
        businessType: "custom",
        businessDescription: description || undefined,
        website: website || undefined,
        logoUrl: logoUrl || undefined,
      });
    } else {
      if (!selectedPlace) return toast({ title: "Select a business from results", variant: "destructive" });
      createMutation.mutate({
        name: selectedPlace.name,
        placeId: selectedPlace.place_id,
        businessType: "google_maps",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-500 gap-2">
          <Plus className="w-4 h-4" />
          New Business
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border border-indigo-500/20 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Create Business
          </DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("custom")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
              mode === "custom"
                ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                : "border-slate-700 text-slate-400 hover:border-slate-500"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Custom Business
          </button>
          <button
            onClick={() => setMode("maps")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
              mode === "maps"
                ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                : "border-slate-700 text-slate-400 hover:border-slate-500"
            }`}
          >
            <Map className="w-4 h-4" />
            Google Maps
          </button>
        </div>

        {mode === "custom" ? (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">
              Create a SaaS, virtual, or non-physical business with a custom agent.
            </p>
            <div className="space-y-2">
              <Label className="text-slate-300">Business Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Gateway Global AI"
                className="bg-slate-800 border-slate-700 text-white"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. AI-powered business communication platform"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-300">Website</Label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="bg-slate-800 border-slate-700 text-white text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Logo URL</Label>
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-slate-800 border-slate-700 text-white text-sm"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">
              Search Google Maps to import business data and auto-configure the agent.
            </p>
            <div className="flex gap-2">
              <Input
                value={mapsQuery}
                onChange={(e) => setMapsQuery(e.target.value)}
                placeholder="Search businesses..."
                className="bg-slate-800 border-slate-700 text-white"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button
                variant="secondary"
                onClick={handleSearch}
                disabled={searching}
                className="shrink-0"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {mapsResults.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                {mapsResults.map((place) => (
                  <button
                    key={place.place_id}
                    type="button"
                    onClick={() => setSelectedPlace(place)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedPlace?.place_id === place.place_id
                        ? "border-indigo-500/50 bg-indigo-600/10"
                        : "border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{place.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{place.formatted_address}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 border-slate-700 text-slate-300"
            onClick={() => { setOpen(false); resetForm(); }}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-indigo-600 hover:bg-indigo-500"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Create & Deploy Agents
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PlatformBusinesses() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const { data: sites = [], isLoading } = useQuery<SiteConfig[]>({
    queryKey: ["/api/site-configs"],
  });

  const { data: agentCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/agents/counts"],
    queryFn: async () => {
      const res = await fetch("/api/agents");
      if (!res.ok) return {};
      const agents: Array<{ siteConfigId: string }> = await res.json();
      return agents.reduce((acc, a) => {
        if (a.siteConfigId) acc[a.siteConfigId] = (acc[a.siteConfigId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    },
  });

  const filtered = sites.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.plan?.toLowerCase().includes(q) ||
      (s.placeData as any)?.formatted_address?.toLowerCase().includes(q) ||
      s.website?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">Businesses</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {sites.length} business{sites.length !== 1 ? "es" : ""} · agents auto-provisioned on creation
          </p>
        </div>
        <CreateBusinessModal onCreated={(id) => navigate(`/platform/businesses/${id}`)} />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search businesses..."
          className="pl-9 bg-slate-900/40 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <p className="text-white font-medium">{search ? "No businesses match your search" : "No businesses yet"}</p>
            <p className="text-slate-400 text-sm mt-1">
              {search ? "Try a different search term." : "Create your first business to get started."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((site, i) => {
            const address = (site.placeData as any)?.formatted_address || site.businessDescription || site.website || "—";
            const phone = site.provisionedPhoneNumber || (site.placeData as any)?.formatted_phone_number;
            const agentCount = agentCounts[site.id] || 0;
            const isCustom = site.businessType === "custom";
            const logo = site.logoUrl || (site.placeData as any)?.photos?.[0]?.photo_reference
              ? undefined
              : null;

            return (
              <motion.div
                key={site.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="flex items-center gap-4 p-4 rounded-sui bg-slate-900/40 border border-indigo-500/10 hover:border-indigo-500/30 transition-all group"
              >
                {/* Logo / Icon */}
                <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                  {site.logoUrl ? (
                    <img src={site.logoUrl} alt={site.name} className="w-full h-full object-cover" />
                  ) : site.placeData && !isCustom ? (
                    <MapPin className="w-5 h-5 text-slate-400" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                  )}
                </div>

                {/* Name + address */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white truncate">{site.name}</p>
                    {isCustom && (
                      <Badge className="bg-indigo-500/15 text-indigo-300 border-0 text-[10px] shrink-0">
                        Custom
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{address}</p>
                </div>

                {/* Plan */}
                <span className={`text-xs px-2 py-0.5 rounded font-semibold shrink-0 ${PLAN_COLORS[site.plan || "free"] || PLAN_COLORS.free}`}>
                  {(site.plan || "free").toUpperCase()}
                </span>

                {/* Agents */}
                <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                  <span>{agentCount}</span>
                </div>

                {/* Phone */}
                {phone && (
                  <div className="flex items-center gap-1 text-xs text-slate-400 font-mono shrink-0 hidden md:flex">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{phone}</span>
                  </div>
                )}

                {/* Public link */}
                {site.slug && (
                  <a
                    href={`/biz/${site.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-indigo-400 shrink-0 hidden lg:block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}

                {/* Manage button */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-slate-400 hover:text-white hover:bg-indigo-500/10 gap-1.5"
                  onClick={() => navigate(`/platform/businesses/${site.id}`)}
                >
                  Manage
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
