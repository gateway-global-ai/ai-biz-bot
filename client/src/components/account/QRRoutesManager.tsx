/**
 * QR Network (shadow telecom): manage qr_routes and firewall rules.
 * Routes tab: table with IncrKey, Variable, Route URL, Destination, Scans, Active, QR preview/download, Actions.
 * Firewall tab: list rules, add/remove.
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Download,
  Shield,
  Loader2,
  Search,
  BarChart3,
} from "lucide-react";

interface QrRouteRow {
  id: number;
  variable: string;
  destination: string | null;
  siteConfigId: string | null;
  label: string | null;
  qrCodePath: string | null;
  isActive: boolean;
  scanCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  routeUrl: string;
}

interface FirewallRule {
  id: number;
  qrRouteId: number | null;
  ruleType: string;
  value: string;
  isActive: boolean;
  createdAt: string | null;
}

interface QrScanStats {
  totalScans: number;
  byRoute: { routeId: number; label: string | null; scans: number }[];
  last7Days: number;
  last30Days: number;
}

async function downloadQrImage(imageUrl: string, filename: string) {
  try {
    const res = await fetch(imageUrl, { credentials: "include" });
    if (!res.ok) throw new Error(res.statusText);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("QR download failed:", e);
    window.open(imageUrl, "_blank");
  }
}

export function QRRoutesManager({ siteConfigId, siteSlug }: { siteConfigId?: string; siteSlug?: string }) {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<"routes" | "firewall">("routes");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [draftDestination, setDraftDestination] = useState<Record<number, string>>({});
  const limit = 50;
  const scopedToSite = !!siteConfigId;

  const { data: routesData, isLoading: routesLoading } = useQuery<{ routes: QrRouteRow[]; total: number }>({
    queryKey: ["/api/qr-routes", page, limit, search, siteConfigId ?? null],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (siteConfigId) params.set("siteConfigId", siteConfigId);
      const res = await fetch(`/api/qr-routes?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const { data: siteConfigs } = useQuery<{ id: string; name: string; slug: string | null }[]>({
    queryKey: ["/api/site-configs-list"],
    queryFn: async () => {
      const res = await fetch("/api/site-configs");
      if (!res.ok) return [];
      const list = await res.json();
      return Array.isArray(list) ? list : [];
    },
    enabled: !scopedToSite,
  });

  const { data: qrStats, isLoading: qrStatsLoading } = useQuery<QrScanStats>({
    queryKey: ["/api/site-configs", siteConfigId, "qr-stats"],
    queryFn: async () => {
      const res = await fetch(`/api/site-configs/${siteConfigId}/qr-stats`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!siteConfigId,
  });

  const createRoute = useMutation({
    mutationFn: async () => {
      const body: { siteConfigId?: string; destination?: string } = {};
      if (siteConfigId) body.siteConfigId = siteConfigId;
      if (siteConfigId && siteSlug && typeof window !== "undefined") {
        body.destination = `${window.location.origin}/biz/${siteSlug}`;
      }
      const res = await apiRequest("POST", "/api/qr-routes", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qr-routes"] });
      if (siteConfigId) queryClient.invalidateQueries({ queryKey: ["/api/site-configs", siteConfigId, "qr-stats"] });
      toast({ title: "Route created" });
    },
    onError: (e: Error) => {
      toast({ title: "Failed to create route", description: e.message, variant: "destructive" });
    },
  });

  const updateRoute = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/qr-routes/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qr-routes"] });
      if (siteConfigId) queryClient.invalidateQueries({ queryKey: ["/api/site-configs", siteConfigId, "qr-stats"] });
      toast({ title: "Route updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    },
  });

  const deleteRoute = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/qr-routes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qr-routes"] });
      if (siteConfigId) queryClient.invalidateQueries({ queryKey: ["/api/site-configs", siteConfigId, "qr-stats"] });
      toast({ title: "Route deleted" });
    },
    onError: (e: Error) => {
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" });
    },
  });

  const regenerateQr = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/qr-routes/${id}/regenerate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qr-routes"] });
      toast({ title: "QR regenerated" });
    },
    onError: (e: Error) => {
      toast({ title: "Failed to regenerate", description: e.message, variant: "destructive" });
    },
  });

  const copyRouteUrl = (route: QrRouteRow) => {
    navigator.clipboard.writeText(route.routeUrl);
    setCopiedId(route.id);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const routes = routesData?.routes ?? [];
  const total = routesData?.total ?? 0;

  const baseUrl = typeof window !== "undefined" ? `${window.location.origin}` : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative p-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl shadow-2xl"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-white text-lg">QR Network</h2>
        <div className="flex gap-2 border-b border-slate-700/50">
          <button
            onClick={() => setActiveSubTab("routes")}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeSubTab === "routes"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 border-b-0 -mb-px"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Routes
          </button>
          <button
            onClick={() => setActiveSubTab("firewall")}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
              activeSubTab === "firewall"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 border-b-0 -mb-px"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Firewall
          </button>
        </div>
      </div>

      {activeSubTab === "routes" && (
        <div className="space-y-4">
          {siteConfigId && (
            <div className="rounded-sui border border-indigo-500/20 bg-slate-800/30 p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Scan stats for this site
              </h3>
              {qrStatsLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : qrStats && (qrStats.totalScans > 0 || qrStats.byRoute.length > 0) ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-900/50 px-3 py-2">
                    <span className="text-slate-400 block">Total scans</span>
                    <span className="font-mono font-bold text-white">{qrStats.totalScans}</span>
                  </div>
                  <div className="rounded-lg bg-slate-900/50 px-3 py-2">
                    <span className="text-slate-400 block">Last 7 days</span>
                    <span className="font-mono font-bold text-white">{qrStats.last7Days}</span>
                  </div>
                  <div className="rounded-lg bg-slate-900/50 px-3 py-2">
                    <span className="text-slate-400 block">Last 30 days</span>
                    <span className="font-mono font-bold text-white">{qrStats.last30Days}</span>
                  </div>
                  {qrStats.byRoute.length > 0 && (
                    <div className="rounded-lg bg-slate-900/50 px-3 py-2 sm:col-span-2 sm:col-start-1">
                      <span className="text-slate-400 block mb-1">By route</span>
                      <ul className="font-mono text-xs text-slate-300 space-y-0.5">
                        {qrStats.byRoute.slice(0, 5).map((r) => (
                          <li key={r.routeId}>
                            {r.label || `Route #${r.routeId}`}: {r.scans}
                          </li>
                        ))}
                        {qrStats.byRoute.length > 5 && (
                          <li className="text-slate-400">+{qrStats.byRoute.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-300 text-sm">No scan data yet. Create a route and set this site as destination to see stats.</p>
              )}
            </div>
          )}
          <div className="flex flex-col gap-3">
            <div className="relative flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px] flex items-center gap-1">
                <Search className="absolute left-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search label, URL, or ID..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), setSearch(searchInput), setPage(1))}
                  className="pl-8 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
                onClick={() => { setSearch(searchInput); setPage(1); }}
              >
                Search
              </Button>
              {search && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-slate-400 hover:text-white"
                  onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="text-slate-400 text-sm">
              {scopedToSite
                ? "Routes for this agent only. Each route is a virtual phone number; scan → redirect to this business."
                : "Each route is a virtual phone number. Scan → redirect to destination."}
            </p>
          </div>
          <div className="flex justify-between items-center">
            <Button
              onClick={() => createRoute.mutate()}
              disabled={createRoute.isPending}
              className="bg-indigo-500 hover:bg-indigo-600 text-white border-0"
            >
              {createRoute.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span className="ml-2">Add Route</span>
            </Button>
          </div>

          {routesLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : routes.length === 0 ? (
            <div className="rounded-sui border border-indigo-500/20 bg-slate-800/60 p-8 text-center text-slate-200">
              No routes yet. Click &quot;Add Route&quot; to create one.
            </div>
          ) : (
            <div className="rounded-sui border border-indigo-500/20 overflow-hidden">
              <table className="w-full text-base">
                <thead>
                  <tr className="bg-slate-800/60 border-b border-indigo-500/20">
                    <th className="text-left py-3 px-3 text-slate-300 font-medium text-sm">#</th>
                    <th className="text-left py-3 px-3 text-slate-300 font-medium text-sm">Variable</th>
                    <th className="text-left py-3 px-3 text-slate-300 font-medium text-sm">Route URL</th>
                    <th className="text-left py-3 px-3 text-slate-300 font-medium text-sm">Destination</th>
                    <th className="text-left py-3 px-3 text-slate-300 font-medium text-sm">Scans</th>
                    <th className="text-left py-3 px-3 text-slate-300 font-medium text-sm">Active</th>
                    <th className="text-left py-3 px-3 text-slate-300 font-medium text-sm">QR</th>
                    <th className="text-left py-3 px-3 text-slate-300 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-3 font-mono text-sm text-slate-300">{r.id}</td>
                      <td className="py-3 px-3">
                        <span className="data-chip font-mono text-sm text-slate-400 bg-slate-800/80 px-2 py-1 rounded border border-indigo-500/20">
                          {String(r.variable).slice(0, 8)}…
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 truncate max-w-[200px] font-mono text-sm">
                            {r.routeUrl}
                          </span>
                          <button
                            onClick={() => copyRouteUrl(r)}
                            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white shrink-0"
                            title="Copy URL"
                          >
                            {copiedId === r.id ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1">
                          <Input
                            value={draftDestination[r.id] ?? r.destination ?? ""}
                            onChange={(e) =>
                              setDraftDestination((prev) => ({ ...prev, [r.id]: e.target.value }))
                            }
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              const current = r.destination ?? "";
                              if (v !== current) {
                                updateRoute.mutate({ id: r.id, updates: { destination: v || null } });
                              }
                              setDraftDestination((prev) => {
                                const next = { ...prev };
                                delete next[r.id];
                                return next;
                              });
                            }}
                            placeholder={scopedToSite ? "URL for this agent" : "URL or assign below"}
                            className="h-9 text-sm bg-slate-800/80 border-indigo-500/20 text-white placeholder:text-slate-400 max-w-[240px]"
                          />
                          {scopedToSite && siteSlug && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 text-sm text-indigo-400 hover:text-indigo-300 -mt-0.5"
                              onClick={() => {
                                const dest = `${baseUrl}/biz/${siteSlug}`;
                                updateRoute.mutate({ id: r.id, updates: { destination: dest } });
                              }}
                            >
                              Set to this business
                            </Button>
                          )}
                          {!scopedToSite && siteConfigs && siteConfigs.length > 0 && (
                            <select
                              className="h-8 text-sm bg-slate-800/80 border border-indigo-500/20 rounded text-slate-300 max-w-[240px]"
                              value=""
                              onChange={(e) => {
                                const slug = e.target.value;
                                if (!slug) return;
                                const dest = `${baseUrl}/biz/${slug}`;
                                updateRoute.mutate({ id: r.id, updates: { destination: dest } });
                                e.target.value = "";
                              }}
                            >
                              <option value="">Assign to business…</option>
                              {siteConfigs
                                .filter((s) => s.slug)
                                .map((s) => (
                                  <option key={s.id} value={s.slug!}>
                                    {s.name}
                                  </option>
                                ))}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-sm text-slate-400">{r.scanCount}</td>
                      <td className="py-3 px-3">
                        <Switch
                          checked={r.isActive}
                          onCheckedChange={(checked) =>
                            updateRoute.mutate({ id: r.id, updates: { isActive: checked } })
                          }
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={`/api/qr-routes/${r.id}/image`}
                            alt={`QR ${r.id}`}
                            className="w-12 h-12 rounded border border-slate-600 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => downloadQrImage(`/api/qr-routes/${r.id}/image`, `qr-route-${r.id}.png`)}
                            className="p-2 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                            title="Download QR"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => regenerateQr.mutate(r.id)}
                            disabled={regenerateQr.isPending}
                            className="p-2 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                            title="Regenerate QR"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm("Delete this route? QR file will be removed.")) {
                                deleteRoute.mutate(r.id);
                              }
                            }}
                            className="p-2 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > limit && (
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="border-indigo-500/30 text-slate-300"
              >
                Previous
              </Button>
              <span className="text-slate-400 text-sm py-1">
                Page {page} of {Math.ceil(total / limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(total / limit)}
                onClick={() => setPage((p) => p + 1)}
                className="border-indigo-500/30 text-slate-300"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {activeSubTab === "firewall" && (
        <FirewallTab />
      )}
    </motion.div>
  );
}

function FirewallTab() {
  const { toast } = useToast();
  const { data: rulesData, isLoading } = useQuery<{ rules: FirewallRule[] }>({
    queryKey: ["/api/qr-routes/firewall/rules"],
    queryFn: async () => {
      const res = await fetch("/api/qr-routes/firewall/rules");
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const addRule = useMutation({
    mutationFn: async (body: { qrRouteId?: number; ruleType: string; value: string }) => {
      const res = await apiRequest("POST", "/api/qr-routes/firewall/rules", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qr-routes/firewall/rules"] });
      toast({ title: "Rule added" });
    },
    onError: (e: Error) => {
      toast({ title: "Failed to add rule", description: e.message, variant: "destructive" });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/qr-routes/firewall/rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qr-routes/firewall/rules"] });
      toast({ title: "Rule removed" });
    },
    onError: (e: Error) => {
      toast({ title: "Failed to remove rule", description: e.message, variant: "destructive" });
    },
  });

  const [newRuleType, setNewRuleType] = useState("deny_ip");
  const [newRuleValue, setNewRuleValue] = useState("");
  const [newRouteId, setNewRouteId] = useState<string>("");

  const rules = rulesData?.rules ?? [];
  const ruleTypes = [
    { value: "allow_ip", label: "Allow IP" },
    { value: "deny_ip", label: "Deny IP" },
    { value: "allow_ua", label: "Allow UA" },
    { value: "deny_ua", label: "Deny UA" },
    { value: "rate_limit", label: "Rate limit (req/min)" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Restrict or allow access by IP, user-agent, or rate limit. Leave route empty for global rule.
      </p>
      <div className="flex flex-wrap gap-2 items-end">
        <select
          value={newRuleType}
          onChange={(e) => setNewRuleType(e.target.value)}
          className="h-9 px-3 rounded bg-slate-800 border border-indigo-500/20 text-slate-200 text-sm"
        >
          {ruleTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <Input
          value={newRuleValue}
          onChange={(e) => setNewRuleValue(e.target.value)}
          placeholder={newRuleType === "rate_limit" ? "e.g. 60" : "IP, CIDR, or pattern"}
          className="h-9 w-48 bg-slate-800 border-indigo-500/20 text-white placeholder:text-slate-400 text-sm"
        />
        <Input
          value={newRouteId}
          onChange={(e) => setNewRouteId(e.target.value)}
          placeholder="Route ID (optional)"
          className="h-9 w-24 bg-slate-800 border-indigo-500/20 text-white placeholder:text-slate-400 text-sm"
        />
        <Button
          onClick={() => {
            if (!newRuleValue.trim()) {
              toast({ title: "Value required", variant: "destructive" });
              return;
            }
            addRule.mutate({
              ruleType: newRuleType,
              value: newRuleValue.trim(),
              qrRouteId: newRouteId ? parseInt(newRouteId, 10) : undefined,
            });
            setNewRuleValue("");
            setNewRouteId("");
          }}
          disabled={addRule.isPending}
          className="bg-indigo-500 hover:bg-indigo-600 text-white h-9"
        >
          {addRule.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          <span className="ml-1">Add</span>
        </Button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-sui border border-indigo-500/20 bg-slate-800/50 p-6 text-center text-slate-300">
          No firewall rules. Add one above.
        </div>
      ) : (
        <div className="rounded-sui border border-indigo-500/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/60 border-b border-indigo-500/20">
                <th className="text-left py-2 px-3 text-slate-300 font-medium">Route ID</th>
                <th className="text-left py-2 px-3 text-slate-300 font-medium">Type</th>
                <th className="text-left py-2 px-3 text-slate-300 font-medium">Value</th>
                <th className="text-left py-2 px-3 text-slate-300 font-medium">Active</th>
                <th className="text-left py-2 px-3 text-slate-300 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                  <td className="py-2 px-3 font-mono text-slate-400">
                    {rule.qrRouteId ?? "global"}
                  </td>
                  <td className="py-2 px-3 text-slate-300">{rule.ruleType}</td>
                  <td className="py-2 px-3 font-mono text-slate-400 text-xs">{rule.value}</td>
                  <td className="py-2 px-3">
                    {rule.isActive ? (
                      <span className="text-emerald-400 text-xs">Yes</span>
                    ) : (
                      <span className="text-slate-400 text-xs">No</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => deleteRule.mutate(rule.id)}
                      className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
