/**
 * Admin certification UI — surfaces heuristic knowledge gap report from
 * GET /api/v1/admin/knowledge-gap (see server/services/knowledgeGapAnalysis.ts).
 */
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle2, CircleAlert, Phone } from "lucide-react";

export type KnowledgeDimensionId =
  | "hours_location"
  | "pricing_menu"
  | "policies_returns"
  | "booking_contact"
  | "brand_story";

export interface KnowledgeGapDimensionRow {
  id: KnowledgeDimensionId;
  label: string;
  score: number;
  required: boolean;
}

export interface KnowledgeGapReport {
  siteConfigId: string;
  siteName: string;
  profileId: string;
  profileLabel: string;
  artifactCount: number;
  knowledgeLibraryEntryCount: number;
  dimensions: KnowledgeGapDimensionRow[];
  observedMeanRequired: number;
  requiredMinimum: number;
  atRisk: boolean;
  notes: string[];
}

const PATH_TO_10: Record<KnowledgeDimensionId, string> = {
  hours_location: "Verify Google Place data or add hours and address to knowledge.",
  pricing_menu: "Upload rate sheet or menu, or sync PMS / pricing source.",
  policies_returns: "Add cancellation, returns, warranty, and terms text.",
  booking_contact: "Add booking URL, phone, and email—or connect telephony.",
  brand_story: "Add About, mission, team, or story content.",
};

function letterGrade(mean: number): string {
  if (mean >= 9) return "A";
  if (mean >= 7) return "B";
  if (mean >= 5) return "C";
  if (mean >= 3) return "D";
  return "F";
}

function rowStatus(d: KnowledgeGapDimensionRow): "critical" | "warn" | "ok" {
  if (d.required && d.score === 0) return "critical";
  if (d.required && d.score < 5) return "warn";
  if (d.score < 4) return "warn";
  return "ok";
}

export function knowledgeGapReportQueryOptions(siteConfigId: string | undefined) {
  return {
    queryKey: ["/api/v1/admin/knowledge-gap", siteConfigId] as const,
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/v1/admin/knowledge-gap?siteConfigId=${encodeURIComponent(siteConfigId!)}`,
      );
      return res.json() as Promise<{ ok?: boolean; report?: KnowledgeGapReport; error?: string }>;
    },
    enabled: !!siteConfigId,
  };
}

export interface KnowledgeProficiencyCardProps {
  siteConfigId: string;
  /** Scroll target for “Improve knowledge” (element id in same tab). */
  uploadFormAnchorId?: string;
  onNavigateTab?: (tab: "overview" | "agents" | "products" | "routing" | "telephony" | "knowledge") => void;
}

export function KnowledgeProficiencyCard({
  siteConfigId,
  uploadFormAnchorId = "knowledge-upload-anchor",
  onNavigateTab,
}: KnowledgeProficiencyCardProps) {
  const { data, isLoading, isError, error } = useQuery({
    ...knowledgeGapReportQueryOptions(siteConfigId),
  });

  const report = data?.report;
  const errMsg = error instanceof Error ? error.message : "Failed to load certification report.";

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6 flex items-center gap-3 text-slate-400"
      >
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400 shrink-0" />
        <span className="text-sm">Loading certification score…</span>
      </motion.div>
    );
  }

  if (isError || !report) {
    const isForbidden = errMsg.includes("403") || errMsg.includes("401");
    return (
      <div className="rounded-sui bg-slate-900/40 border border-amber-500/30 p-4 text-sm text-slate-300">
        <p className="font-medium text-amber-200/90">Certification unavailable</p>
        <p className="text-slate-400 mt-1">
          {isForbidden
            ? "Sign in as a platform admin to view knowledge certification."
            : errMsg}
        </p>
      </div>
    );
  }

  const grade = letterGrade(report.observedMeanRequired);
  const showAtRisk = report.atRisk;
  const weakBooking =
    report.dimensions.find((d) => d.id === "booking_contact")?.score !== undefined &&
    (report.dimensions.find((d) => d.id === "booking_contact")?.score ?? 0) < 5;

  const handleImprove = () => {
    const el = document.getElementById(uploadFormAnchorId);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6 space-y-5 shadow-2xl"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Knowledge certification</h3>
          <p className="text-xs text-slate-500 mt-1 font-mono data-chip">
            Profile: {report.profileLabel} · Min {report.requiredMinimum}/10 · Artifacts {report.artifactCount}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={`text-sm font-bold px-3 py-1 border-0 ${
              showAtRisk ? "bg-amber-500/20 text-amber-200" : "bg-emerald-500/15 text-emerald-300"
            }`}
          >
            Grade: {grade}
            {showAtRisk ? " — At risk" : ""}
          </Badge>
          <span className="text-xs text-slate-500 font-mono">
            Mean (required): {report.observedMeanRequired.toFixed(1)}/10
          </span>
        </div>
      </div>

      {report.notes.length > 0 && (
        <ul className="text-xs text-slate-400 space-y-1 border-l-2 border-indigo-500/30 pl-3">
          {report.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-white/10">
              <th className="p-3 font-medium">Dimension</th>
              <th className="p-3 font-medium">Score</th>
              <th className="p-3 font-medium">Required</th>
              <th className="p-3 font-medium min-w-[200px]">Path to 10/10</th>
            </tr>
          </thead>
          <tbody>
            {report.dimensions.map((d) => {
              const st = rowStatus(d);
              return (
                <tr key={d.id} className="border-b border-white/5 last:border-0">
                  <td className="p-3 text-white font-medium">{d.label}</td>
                  <td className="p-3 font-mono text-slate-300">{d.score}/10</td>
                  <td className="p-3">
                    {d.required ? (
                      <span className="text-xs text-indigo-300">Yes</span>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-start gap-2">
                      {st === "critical" && (
                        <CircleAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden />
                      )}
                      {st === "warn" && (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden />
                      )}
                      {st === "ok" && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500/80 shrink-0 mt-0.5" aria-hidden />
                      )}
                      <span className="text-slate-400 text-xs leading-relaxed">{PATH_TO_10[d.id]}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={handleImprove}
          className="bg-indigo-600 hover:bg-indigo-500 gap-2"
        >
          Improve knowledge
        </Button>
        {weakBooking && onNavigateTab && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigateTab("telephony")}
            className="border-slate-600 text-slate-200 gap-2"
          >
            <Phone className="w-4 h-4" />
            Open telephony
          </Button>
        )}
      </div>
    </motion.div>
  );
}
