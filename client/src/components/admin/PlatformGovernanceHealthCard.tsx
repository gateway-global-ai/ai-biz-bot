/**
 * Platform Business Manager — governance copy: PayByLink email + OG social preview readiness.
 */
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Link2, Mail, ShieldCheck } from "lucide-react";

export type SocialPreviewPayload = {
  siteConfigId: string;
  publicBizUrl: string | null;
  effectiveOg: {
    ogTitle: string;
    ogDescription: string;
    ogUrl: string;
    ogImage: string;
    ogSiteName: string;
  };
  issues: { level: "error" | "warning"; code: string; message: string }[];
  planningChecklist: string[];
};

export function PlatformGovernanceHealthCard({
  siteConfigId,
  token,
  slug,
  siteName,
}: {
  siteConfigId: string;
  token: string | null;
  slug: string | null;
  siteName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SocialPreviewPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/site-configs/${encodeURIComponent(siteConfigId)}/social-preview-readiness`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json().catch(() => ({}))) as SocialPreviewPayload & { error?: string };
      if (!res.ok) {
        setErr(j.error || `${res.status}`);
        setData(null);
        return;
      }
      setData(j);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Request failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [siteConfigId, token]);

  useEffect(() => {
    void load();
  }, [load, slug]);

  const errors = data?.issues?.filter((i) => i.level === "error") ?? [];
  const warnings = data?.issues?.filter((i) => i.level === "warning") ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            Governance & share health
          </h3>
          <p className="text-[10px] text-slate-400 mt-1 max-w-xl leading-relaxed">
            PayByLink email deliverability (audit) and Open Graph previews for social crawlers. Treat OG as a{" "}
            <span className="text-slate-300">launch requirement</span>, not an afterthought.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-300"
          onClick={() => void load()}
          disabled={!token || loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-2">Refresh checks</span>
        </Button>
      </div>

      {!token && (
        <p className="text-xs text-amber-200/90 border border-amber-500/30 rounded-sui px-3 py-2 bg-amber-500/10">
          Sign in to load OG readiness from the server.
        </p>
      )}

      {/* PayByLink email — mirror of runbook */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 text-slate-500" />
          PayByLink email (Cloudbeds)
        </h4>
        <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed">
          <li>
            <span className="text-slate-300">SPF:</span> include SendGrid in DNS (e.g.{" "}
            <span className="font-mono text-[10px] text-slate-500">include:sendgrid.net</span>) — confirm with Cloudbeds.
          </li>
          <li>
            <span className="text-slate-300">DKIM / DMARC:</span> align with your DNS host; weak auth increases spam placement.
          </li>
          <li>
            <span className="text-slate-300">No shorteners</span> on payment links; use full https URLs from Cloudbeds.
          </li>
          <li>
            <span className="text-slate-300">Transactional SMS:</span> for time-critical pay links when the guest phone is verified, use{" "}
            <span className="font-mono text-[10px]">POST /api/share/send-payment-link</span> (see runbook).
          </li>
        </ul>
      </div>

      {/* OG / social */}
      <div className="space-y-2 border-t border-white/10 pt-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5 text-slate-500" />
          Open Graph & social previews
        </h4>
        <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed mb-3">
          <li>
            <span className="text-slate-300">Planning:</span> {data?.planningChecklist?.[0] ?? "Set OG title, description, and 1200×630 image before go-live."}
          </li>
          <li>
            Crawlers hitting <span className="font-mono text-[10px] text-slate-500">/biz/{slug || "…"}</span> receive dedicated meta HTML (not the SPA shell).
          </li>
          <li>
            Edit fields in the owner dashboard: <span className="text-slate-300">Social Sharing</span> (e.g.{" "}
            <a href="/aibizbot" className="text-indigo-400 hover:text-indigo-300 underline">
              /aibizbot
            </a>
            ) — set <span className="font-mono text-[10px]">og:image</span>, title, description.
          </li>
        </ul>

        {loading && !data && token && (
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading preview assessment…
          </p>
        )}
        {err && (
          <p className="text-xs text-red-300 border border-red-500/30 rounded-sui px-3 py-2 bg-red-500/10">{err}</p>
        )}

        {data && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {errors.length === 0 && warnings.length === 0 ? (
                <Badge className="bg-emerald-500/15 text-emerald-300 border-0 text-[10px]">OG: no blocking issues</Badge>
              ) : (
                <>
                  {errors.length > 0 && (
                    <Badge className="bg-red-500/15 text-red-200 border-red-500/30 text-[10px]">
                      {errors.length} error{errors.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  {warnings.length > 0 && (
                    <Badge className="bg-amber-500/15 text-amber-200 border-amber-500/30 text-[10px]">
                      {warnings.length} warning{warnings.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </>
              )}
            </div>
            {slug && data.publicBizUrl && (
              <p className="text-[10px] text-slate-500 font-mono break-all">
                Public URL: {data.publicBizUrl}
              </p>
            )}
            {data.issues.map((issue) => (
              <p
                key={issue.code}
                className={`text-xs rounded-sui px-3 py-2 border ${
                  issue.level === "error"
                    ? "border-red-500/30 bg-red-500/10 text-red-200"
                    : "border-amber-500/25 bg-amber-500/10 text-amber-100"
                }`}
              >
                {issue.message}
              </p>
            ))}
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer text-slate-400 hover:text-slate-300">Effective crawler preview (read-only)</summary>
              <div className="mt-2 space-y-1 font-mono text-[10px] text-slate-500 break-all">
                <p>
                  <span className="text-slate-600">og:title</span> {data.effectiveOg.ogTitle}
                </p>
                <p>
                  <span className="text-slate-600">og:image</span> {data.effectiveOg.ogImage}
                </p>
              </div>
            </details>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-600 leading-relaxed">
        Site: <span className="font-mono text-slate-500">{siteName}</span>
        {slug ? (
          <>
            {" "}
            · slug <span className="font-mono text-slate-500">{slug}</span>
          </>
        ) : (
          <span className="text-amber-500/80"> · Set a slug for a shareable /biz URL.</span>
        )}
      </p>
    </motion.div>
  );
}
