/**
 * Platform Business Customers — list of site configs (businesses) for super-admin.
 * Columns: Creation Date, Business Name, Phone, Plan, Address, City, State, [VIEW].
 * Agent and Site ID are on the business profile, not in this table.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, Loader2, ExternalLink, Search, ImagePlus } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

interface SiteConfig {
  id: string;
  name?: string | null;
  plan?: string | null;
  assignedAgentId?: string | null;
  createdAt?: string | null;
  heroImageUrl?: string | null;
  placeId?: string | null;
  provisionedPhoneNumber?: string | null;
  placeData?: {
    formatted_address?: string;
    formattedAddress?: string;
    address_components?: Array<{ types: string[]; long_name: string; short_name: string }>;
    formatted_phone_number?: string;
    internationalPhoneNumber?: string;
  } | null;
}

/** Derive address, city, state from placeData for table display. */
function getAddressParts(site: SiteConfig): { address: string; city: string; state: string } {
  const pd = site.placeData;
  if (!pd) {
    return { address: "", city: "", state: "" };
  }
  let city = "";
  let state = "";
  if (pd.address_components && Array.isArray(pd.address_components)) {
    for (const c of pd.address_components) {
      const t = c.types || [];
      if (t.includes("locality")) city = c.long_name;
      else if (t.includes("administrative_area_level_1")) state = c.short_name;
    }
  }
  const address = (pd.formatted_address ?? pd.formattedAddress ?? "").trim();
  return { address, city, state };
}

/** Phone: provisioned number first, then placeData. */
function getPhone(site: SiteConfig): string {
  if (site.provisionedPhoneNumber?.trim()) return site.provisionedPhoneNumber.trim();
  const pd = site.placeData;
  return (pd?.formatted_phone_number ?? pd?.internationalPhoneNumber ?? "").trim();
}

/**
 * Thumbnail: prefer Google Places photo via proxy when placeId exists (so we always show
 * the business image from Maps, not a stale or demo heroImageUrl).
 */
function SiteThumbnail({ site }: { site: SiteConfig }) {
  const [imgError, setImgError] = useState(false);
  const proxyUrl = site.placeId ? `/api/places/photo-proxy/${encodeURIComponent(site.placeId)}?maxWidth=120` : null;
  const src = proxyUrl ?? site.heroImageUrl ?? null;
  const showPlaceholder = !src || imgError;
  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 border border-slate-600 shrink-0 flex items-center justify-center">
      {showPlaceholder ? (
        <Building2 className="w-5 h-5 text-slate-400" />
      ) : (
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}

export function PlatformTenants() {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("");

  const queryClient = useQueryClient();
  const { data: sites = [], isLoading, isError } = useQuery<SiteConfig[]>({
    queryKey: ["/api/site-configs"],
    staleTime: 60_000,
  });

  const refreshAllImagesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/site-configs/refresh-all-hero-images");
      return res.json() as Promise<{ updated: number; total: number }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-configs"] });
      // Toast could be added here: e.g. `${data.updated} hero images set to Google Places.`
    },
  });

  const plans = useMemo(() => {
    const set = new Set<string>();
    for (const s of sites) {
      const p = (s.plan ?? "").trim() || "—";
      set.add(p);
    }
    return Array.from(set).sort((a, b) => (a === "—" ? 1 : b === "—" ? -1 : a.localeCompare(b)));
  }, [sites]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byPlan = planFilter.trim();
    return sites.filter((site) => {
      if (byPlan) {
        const sitePlan = (site.plan ?? "").trim() || "—";
        if (sitePlan !== byPlan) return false;
      }
      if (!q) return true;
      const name = (site.name ?? "").toLowerCase();
      const plan = (site.plan ?? "").toLowerCase();
      const { address, city, state } = getAddressParts(site);
      const phone = getPhone(site).toLowerCase();
      return (
        name.includes(q) ||
        plan.includes(q) ||
        address.toLowerCase().includes(q) ||
        city.toLowerCase().includes(q) ||
        state.toLowerCase().includes(q) ||
        phone.includes(q)
      );
    });
  }, [sites, search, planFilter]);

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex items-center gap-3"
      >
        <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80 shadow-sm">
          <Building2 className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Business Customers</h1>
          <p className="text-slate-400 text-sm">Creation date, name, phone, plan, address, city, state. View profile for agent and site ID.</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.03 }}
      >
        <Card className="rounded-xl border border-slate-700/80 bg-slate-900/60 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Search by name, phone, address, city, state, plan…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 rounded-lg bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500/50"
                />
              </div>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="h-10 px-3 rounded-lg bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-w-[140px]"
              >
                <option value="">All plans</option>
                {plans.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 border-slate-600 text-slate-300 hover:bg-slate-800"
                disabled={refreshAllImagesMutation.isPending || sites.length === 0}
                onClick={() => refreshAllImagesMutation.mutate()}
              >
                {refreshAllImagesMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4 mr-1.5" />
                )}
                Pull images from Google
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-400 py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading business customers…</span>
          </div>
        ) : isError ? (
          <p className="text-slate-400 py-4">Failed to load business customers.</p>
        ) : filtered.length === 0 ? (
          <p className="text-slate-400 py-4">
            {sites.length === 0 ? "No business customers yet." : "No business customers match your search or filter."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/80">
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold uppercase tracking-wider w-12"> </th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap">Creation date</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold uppercase tracking-wider">Business name</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold uppercase tracking-wider">Phone</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold uppercase tracking-wider">Plan</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold uppercase tracking-wider">Address</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold uppercase tracking-wider">City</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-semibold uppercase tracking-wider">State</th>
                  <th className="text-right py-3 px-2 text-slate-400 font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((site) => {
                  const { address, city, state } = getAddressParts(site);
                  const phone = getPhone(site);
                  const created = site.createdAt ? new Date(site.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
                  return (
                    <tr key={site.id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-2">
                        <SiteThumbnail site={site} />
                      </td>
                      <td className="py-3 px-2 text-slate-300 whitespace-nowrap">{created}</td>
                      <td className="py-3 px-2 font-medium text-white">{site.name ?? "—"}</td>
                      <td className="py-3 px-2 text-slate-300">{phone || "—"}</td>
                      <td className="py-3 px-2 text-slate-300">{site.plan ?? "—"}</td>
                      <td className="py-3 px-2 text-slate-400 max-w-[180px] truncate" title={address}>{address || "—"}</td>
                      <td className="py-3 px-2 text-slate-400">{city || "—"}</td>
                      <td className="py-3 px-2 text-slate-400">{state || "—"}</td>
                      <td className="py-3 px-2 text-right">
                        <Link
                          href={`/platform/businesses/${site.id}`}
                          className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-slate-500 text-xs mt-4">
          {filtered.length === sites.length ? `${sites.length} tenant(s)` : `${filtered.length} of ${sites.length} shown`}
        </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
