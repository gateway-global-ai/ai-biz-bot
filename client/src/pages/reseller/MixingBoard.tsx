/**
 * client/src/pages/reseller/MixingBoard.tsx
 *
 * Reseller / Broker "Control Room" — dark-themed Mixing Board for configuring
 * the AI persona, voice, and showroom theme for a given site_config.
 *
 * Writes via PATCH /api/site-configs/:id using the three new JSONB columns:
 *   agentConfig  — { name, role, discProfile, basePrompt }
 *   voiceConfig  — { voiceName, language, isPushToTalk }
 *   themeConfig  — { primaryColor, fontFamily, borderRadius }
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot,
  Mic2,
  Palette,
  Save,
  BarChart3,
  Loader2,
  CheckCircle2,
  Settings2,
} from "lucide-react";
import ResellerAnalytics from "./ResellerAnalytics";

// ─── Constants ───────────────────────────────────────────────────────────────

const VOICES = [
  { id: "kore", name: "Kore", description: "Warm & Professional" },
  { id: "puck", name: "Puck", description: "Friendly & Upbeat" },
  { id: "charon", name: "Charon", description: "Deep & Authoritative" },
  { id: "fenrir", name: "Fenrir", description: "Calm & Reassuring" },
  { id: "aoede", name: "Aoede", description: "Clear & Articulate" },
  { id: "leda", name: "Leda", description: "Soft & Gentle" },
];

const DISC_PROFILES = [
  { id: "D", label: "D — Dominant", description: "Direct, results-oriented" },
  { id: "I", label: "I — Influential", description: "Enthusiastic, persuasive" },
  { id: "S", label: "S — Steady", description: "Patient, dependable" },
  { id: "C", label: "C — Conscientious", description: "Accurate, analytical" },
];

const FONT_FAMILIES = [
  { id: "Inter", label: "Inter (Default)" },
  { id: "Geist", label: "Geist" },
  { id: "DM Sans", label: "DM Sans" },
  { id: "Outfit", label: "Outfit" },
];

const BORDER_RADII = [
  { id: "0.5rem", label: "Sharp (0.5rem)" },
  { id: "1rem", label: "Rounded (1rem)" },
  { id: "1.5rem", label: "Soft (1.5rem)" },
  { id: "2rem", label: "Pill (2rem)" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentConfig {
  name: string;
  role: string;
  discProfile: string;
  basePrompt: string;
}

interface VoiceConfig {
  voiceName: string;
  language: string;
  isPushToTalk: boolean;
}

interface ThemeConfig {
  primaryColor: string;
  fontFamily: string;
  borderRadius: string;
}

interface SiteConfig {
  id: string;
  name: string;
  agentConfig: AgentConfig | null;
  voiceConfig: VoiceConfig | null;
  themeConfig: ThemeConfig | null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-gray-900/50 border border-gray-800 rounded-2xl backdrop-blur-sm shadow-xl p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
        <Icon className="w-5 h-5 text-indigo-400" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-gray-100">{title}</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Site Selector ────────────────────────────────────────────────────────────

function SiteSelector({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { data: sites = [] } = useQuery<SiteConfig[]>({
    queryKey: ["/api/site-configs"],
  });

  return (
    <div className="flex items-center gap-3">
      <Settings2 className="w-4 h-4 text-gray-500 shrink-0" />
      <Select value={selectedId} onValueChange={onSelect}>
        <SelectTrigger className="w-72 bg-gray-900/70 border-gray-700 text-gray-200 focus:ring-indigo-500/50">
          <SelectValue placeholder="Select a site to configure…" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-700 text-gray-200">
          {sites.map((s) => (
            <SelectItem key={s.id} value={s.id} className="focus:bg-gray-800">
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Agent Panel ──────────────────────────────────────────────────────────────

function AgentPanel({
  siteId,
  initial,
}: {
  siteId: string;
  initial: AgentConfig | null;
}) {
  const { toast } = useToast();
  const [config, setConfig] = useState<AgentConfig>({
    name: initial?.name ?? "",
    role: initial?.role ?? "",
    discProfile: initial?.discProfile ?? "I",
    basePrompt: initial?.basePrompt ?? "",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/site-configs/${siteId}`, {
        agentConfig: config,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-configs"] });
      toast({ title: "Agent config saved", description: config.name || "Unnamed agent" });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <GlassCard>
      <PanelHeader
        icon={Bot}
        title="Agent Persona"
        subtitle="Define who your AI is and how it behaves"
      />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs uppercase tracking-wider">
              Agent Name
            </Label>
            <Input
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              placeholder="e.g. Alex"
              className="bg-gray-800/60 border-gray-700 text-gray-100 placeholder-gray-600 focus:ring-indigo-500/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs uppercase tracking-wider">
              Role / Title
            </Label>
            <Input
              value={config.role}
              onChange={(e) => setConfig({ ...config, role: e.target.value })}
              placeholder="e.g. Senior Real Estate Concierge"
              className="bg-gray-800/60 border-gray-700 text-gray-100 placeholder-gray-600 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-400 text-xs uppercase tracking-wider">
            DISC Profile
          </Label>
          <Select
            value={config.discProfile}
            onValueChange={(v) => setConfig({ ...config, discProfile: v })}
          >
            <SelectTrigger className="bg-gray-800/60 border-gray-700 text-gray-100 focus:ring-indigo-500/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700 text-gray-200">
              {DISC_PROFILES.map((d) => (
                <SelectItem key={d.id} value={d.id} className="focus:bg-gray-800">
                  <span className="font-medium">{d.label}</span>
                  <span className="ml-2 text-gray-500 text-xs">{d.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-400 text-xs uppercase tracking-wider">
            Base Prompt
          </Label>
          <Textarea
            value={config.basePrompt}
            onChange={(e) => setConfig({ ...config, basePrompt: e.target.value })}
            placeholder="You are Alex, a senior real estate concierge for Prestige Homes Las Vegas…"
            rows={5}
            className="bg-gray-800/60 border-gray-700 text-gray-100 placeholder-gray-600 focus:ring-indigo-500/50 resize-none"
          />
        </div>

        <Button
          onClick={() => mutate()}
          disabled={isPending}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Agent Config
        </Button>
      </div>
    </GlassCard>
  );
}

// ─── Voice Panel ──────────────────────────────────────────────────────────────

function VoicePanel({
  siteId,
  initial,
}: {
  siteId: string;
  initial: VoiceConfig | null;
}) {
  const { toast } = useToast();
  const [config, setConfig] = useState<VoiceConfig>({
    voiceName: initial?.voiceName ?? "kore",
    language: initial?.language ?? "en-US",
    isPushToTalk: initial?.isPushToTalk ?? false,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/site-configs/${siteId}`, {
        voiceConfig: config,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-configs"] });
      toast({ title: "Voice config saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const selectedVoice = VOICES.find((v) => v.id === config.voiceName);

  return (
    <GlassCard>
      <PanelHeader
        icon={Mic2}
        title="Voice & Audio"
        subtitle="Set the AI voice, language, and interaction mode"
      />
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-gray-400 text-xs uppercase tracking-wider">Voice</Label>
          <Select
            value={config.voiceName}
            onValueChange={(v) => setConfig({ ...config, voiceName: v })}
          >
            <SelectTrigger className="bg-gray-800/60 border-gray-700 text-gray-100 focus:ring-indigo-500/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700 text-gray-200">
              {VOICES.map((v) => (
                <SelectItem key={v.id} value={v.id} className="focus:bg-gray-800">
                  <span className="font-medium capitalize">{v.name}</span>
                  <span className="ml-2 text-gray-500 text-xs">{v.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedVoice && (
            <p className="text-xs text-indigo-400">{selectedVoice.description}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-400 text-xs uppercase tracking-wider">Language</Label>
          <Select
            value={config.language}
            onValueChange={(v) => setConfig({ ...config, language: v })}
          >
            <SelectTrigger className="bg-gray-800/60 border-gray-700 text-gray-100 focus:ring-indigo-500/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700 text-gray-200">
              {[
                { id: "en-US", label: "English (US)" },
                { id: "en-GB", label: "English (UK)" },
                { id: "es-US", label: "Spanish (US)" },
                { id: "es-ES", label: "Spanish (Spain)" },
                { id: "fr-FR", label: "French" },
                { id: "pt-BR", label: "Portuguese (Brazil)" },
              ].map((l) => (
                <SelectItem key={l.id} value={l.id} className="focus:bg-gray-800">
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
          <div>
            <p className="text-sm font-medium text-gray-200">Push-to-Talk Mode</p>
            <p className="text-xs text-gray-500 mt-0.5">
              User holds a button to speak instead of open mic
            </p>
          </div>
          <Switch
            checked={config.isPushToTalk}
            onCheckedChange={(v) => setConfig({ ...config, isPushToTalk: v })}
            className="data-[state=checked]:bg-indigo-600"
          />
        </div>

        <Button
          onClick={() => mutate()}
          disabled={isPending}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Voice Config
        </Button>
      </div>
    </GlassCard>
  );
}

// ─── Theme Panel ──────────────────────────────────────────────────────────────

function ThemePanel({
  siteId,
  initial,
}: {
  siteId: string;
  initial: ThemeConfig | null;
}) {
  const { toast } = useToast();
  const [config, setConfig] = useState<ThemeConfig>({
    primaryColor: initial?.primaryColor ?? "#1346A0",
    fontFamily: initial?.fontFamily ?? "Inter",
    borderRadius: initial?.borderRadius ?? "1rem",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/site-configs/${siteId}`, {
        themeConfig: config,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-configs"] });
      toast({ title: "Theme config saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <GlassCard>
      <PanelHeader
        icon={Palette}
        title="Showroom Theme"
        subtitle="Customize the customer-facing UI appearance"
      />
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-gray-400 text-xs uppercase tracking-wider">
            Primary Color
          </Label>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg border border-gray-700 shrink-0 cursor-pointer overflow-hidden"
              title="Click to pick color"
            >
              <input
                type="color"
                value={config.primaryColor}
                onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                className="w-12 h-12 -m-1 cursor-pointer border-none bg-transparent"
              />
            </div>
            <Input
              value={config.primaryColor}
              onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
              placeholder="#1346A0"
              className="bg-gray-800/60 border-gray-700 text-gray-100 placeholder-gray-600 font-mono focus:ring-indigo-500/50"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-400 text-xs uppercase tracking-wider">
            Font Family
          </Label>
          <Select
            value={config.fontFamily}
            onValueChange={(v) => setConfig({ ...config, fontFamily: v })}
          >
            <SelectTrigger className="bg-gray-800/60 border-gray-700 text-gray-100 focus:ring-indigo-500/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700 text-gray-200">
              {FONT_FAMILIES.map((f) => (
                <SelectItem key={f.id} value={f.id} className="focus:bg-gray-800">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-400 text-xs uppercase tracking-wider">
            Border Radius
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {BORDER_RADII.map((r) => (
              <button
                key={r.id}
                onClick={() => setConfig({ ...config, borderRadius: r.id })}
                className={`p-2 text-xs rounded-lg border transition-all ${
                  config.borderRadius === r.id
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                    : "border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-600"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className="p-4 rounded-lg border border-gray-700/50 bg-gray-800/20"
          style={{ borderRadius: config.borderRadius }}
        >
          <p className="text-xs text-gray-500 mb-2">Preview</p>
          <div
            className="h-8 rounded flex items-center justify-center text-white text-sm font-medium"
            style={{
              backgroundColor: config.primaryColor,
              borderRadius: config.borderRadius,
              fontFamily: config.fontFamily,
            }}
          >
            Talk to AI Concierge
          </div>
        </div>

        <Button
          onClick={() => mutate()}
          disabled={isPending}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Theme Config
        </Button>
      </div>
    </GlassCard>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MixingBoard() {
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  const { data: site, isLoading } = useQuery<SiteConfig>({
    queryKey: ["/api/site-configs", selectedSiteId],
    queryFn: () =>
      apiRequest("GET", `/api/site-configs/${selectedSiteId}`).then((r) => r.json()),
    enabled: !!selectedSiteId,
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-100 tracking-tight">
              Mixing Board
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Sovereign OS — Reseller Control Room
            </p>
          </div>
          <SiteSelector selectedId={selectedSiteId} onSelect={setSelectedSiteId} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {!selectedSiteId ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-2xl mb-4">
              <Settings2 className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium">Select a site to begin configuring</p>
            <p className="text-gray-600 text-sm mt-1">
              Choose from the dropdown above to load the Mixing Board
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="agent" className="space-y-6">
            <TabsList className="bg-gray-900/60 border border-gray-800 p-1 rounded-xl">
              <TabsTrigger
                value="agent"
                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-gray-400 rounded-lg px-4 py-2 text-sm"
              >
                <Bot className="w-4 h-4 mr-2" />
                Agent
              </TabsTrigger>
              <TabsTrigger
                value="voice"
                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-gray-400 rounded-lg px-4 py-2 text-sm"
              >
                <Mic2 className="w-4 h-4 mr-2" />
                Voice
              </TabsTrigger>
              <TabsTrigger
                value="theme"
                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-gray-400 rounded-lg px-4 py-2 text-sm"
              >
                <Palette className="w-4 h-4 mr-2" />
                Theme
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-gray-400 rounded-lg px-4 py-2 text-sm"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="agent" className="mt-0">
              <div className="max-w-2xl">
                <AgentPanel siteId={selectedSiteId} initial={site?.agentConfig ?? null} />
              </div>
            </TabsContent>

            <TabsContent value="voice" className="mt-0">
              <div className="max-w-2xl">
                <VoicePanel siteId={selectedSiteId} initial={site?.voiceConfig ?? null} />
              </div>
            </TabsContent>

            <TabsContent value="theme" className="mt-0">
              <div className="max-w-2xl">
                <ThemePanel siteId={selectedSiteId} initial={site?.themeConfig ?? null} />
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-0">
              <ResellerAnalytics siteId={selectedSiteId} siteName={site?.name ?? ""} />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Save confirmation badge */}
      {site && (
        <div className="fixed bottom-6 right-6">
          <div className="flex items-center gap-2 bg-gray-900/90 border border-gray-700 rounded-full px-4 py-2 text-xs text-gray-400 backdrop-blur-sm shadow-xl">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Changes auto-save per panel
          </div>
        </div>
      )}
    </div>
  );
}
