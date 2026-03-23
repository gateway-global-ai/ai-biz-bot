/**
 * Platform QR Code Manager — list all QR codes (Website + Route), search, view/download for printing.
 * Sovereign-styled to match Platform Overview and Tenants.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { QrCode, Loader2, Search, ExternalLink, Download } from "lucide-react";

interface SiteConfigRow {
  id: string;
  name?: string | null;
  slug?: string | null;
}

interface QrRouteRow {
  id: number;
  destination: string | null;
  siteConfigId: string | null;
  label: string | null;
  routeUrl: string;
}

type QrRow =
  | { type: "website"; identifier: string; business: string; destination: string; imageUrl: string }
  | { type: "route"; identifier: string; business: string; destination: string; imageUrl: string };

const origin = typeof window !== "undefined" ? window.location.origin : "";

async function downloadImageAsFile(imageUrl: string, filename: string) {
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
    console.error("Download failed:", e);
    window.open(imageUrl, "_blank");
  }
}

export function PlatformQRCodeManager() {
  const [search, setSearch] = useState("");

  const { data: sites = [], isLoading: sitesLoading } = useQuery<SiteConfigRow[]>({
    queryKey: ["/api/site-configs"],
    staleTime: 60_000,
  });

  const { data: routesData, isLoading: routesLoading } = useQuery<{ routes: QrRouteRow[]; total: number }>({
    queryKey: ["/api/qr-routes", 1, 500],
    queryFn: async () => {
      const res = await fetch("/api/qr-routes?page=1&limit=500");
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    staleTime: 60_000,
  });

  const siteById = useMemo(() => {
    const m: Record<string, SiteConfigRow> = {};
    for (const s of sites) m[s.id] = s;
    return m;
  }, [sites]);

  const rows: QrRow[] = useMemo(() => {
    const list: QrRow[] = [];
    for (const s of sites) {
      if (!s.slug?.trim()) continue;
      const publicUrl = `${origin}/biz/${s.slug}`;
      const imageUrl = `${origin}/qr/img/${s.slug}`;
      list.push({
        type: "website",
        identifier: s.slug,
        business: s.name ?? "—",
        destination: publicUrl,
        imageUrl,
      });
    }
    const routes = routesData?.routes ?? [];
    for (const r of routes) {
      const business = r.siteConfigId ? siteById[r.siteConfigId]?.name ?? r.label ?? "—" : r.label ?? "—";
      const imageUrl = `${origin}/api/qr-routes/${r.id}/image`;
      list.push({
        type: "route",
        identifier: `Route #${r.id}`,
        business,
        destination: r.destination ?? r.routeUrl ?? "—",
        imageUrl,
      });
    }
    return list;
  }, [sites, routesData?.routes, siteById]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.business.toLowerCase().includes(q) ||
        row.identifier.toLowerCase().includes(q) ||
        row.destination.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const isLoading = sitesLoading || routesLoading;

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex items-center gap-3"
      >
        <div className="p-2 rounded-sui bg-slate-900/40 border border-indigo-500/20">
          <QrCode className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">QR Code Manager</h1>
          <p className="text-slate-400 text-sm">All website and route QR codes. View or download for printing.</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.03 }}
        className="p-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl shadow-2xl"
      >
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by business name or QR code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-400 py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading QR codes…</span>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-slate-400 py-4">
            {rows.length === 0 ? "No QR codes yet." : "No matches for your search."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-slate-700/80">
                  <th className="text-left py-3 px-3 text-slate-400 font-semibold uppercase tracking-wider text-sm">QR identifier</th>
                  <th className="text-left py-3 px-3 text-slate-400 font-semibold uppercase tracking-wider text-sm">Business</th>
                  <th className="text-left py-3 px-3 text-slate-400 font-semibold uppercase tracking-wider text-sm">Type</th>
                  <th className="text-left py-3 px-3 text-slate-400 font-semibold uppercase tracking-wider text-sm">Destination / URL</th>
                  <th className="text-right py-3 px-3 text-slate-400 font-semibold uppercase tracking-wider text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr key={`${row.type}-${row.identifier}-${idx}`} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-mono text-sm text-white">{row.identifier}</td>
                    <td className="py-3 px-3 font-medium text-white">{row.business}</td>
                    <td className="py-3 px-3">
                      <span className={`text-sm ${row.type === "website" ? "text-emerald-400" : "text-amber-400"}`}>
                        {row.type === "website" ? "Website QR" : "Route QR"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 truncate max-w-[240px] text-sm" title={row.destination}>
                      {row.destination}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => window.open(row.imageUrl, "_blank")}
                          className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadImageAsFile(row.imageUrl, `qr-${row.identifier.replace(/\s+/g, "-")}.png`)}
                          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-slate-500 text-sm mt-4">
          {filtered.length === rows.length ? `${rows.length} QR code(s)` : `${filtered.length} of ${rows.length} shown`}
        </p>
      </motion.div>
    </div>
  );
}
