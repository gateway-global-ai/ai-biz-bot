import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Activity, Search, Copy, Check } from "lucide-react";

type DependencyStatus = "ok" | "missing" | "error";
type PipelineStatus = "pass" | "fail" | "skip";

interface HealthDependencyCheck {
  name: string;
  status: DependencyStatus;
  message?: string;
}

interface HealthPipelineCheck {
  name: string;
  status: PipelineStatus;
  message?: string;
  detail?: Record<string, unknown>;
}

interface AdminHealthReport {
  timestamp: string;
  params: { placeId: string; businessName: string };
  dependencyChecks: HealthDependencyCheck[];
  pipelineChecks: HealthPipelineCheck[];
  summary: { passed: number; failed: number; skipped: number };
  rawMessages?: string[];
}

function StatusBadge({ status }: { status: DependencyStatus | PipelineStatus }) {
  const { label, variant } = useMemo(() => {
    switch (status) {
      case "ok":
      case "pass":
        return { label: "OK", variant: "default" as const };
      case "missing":
      case "skip":
        return { label: "Skipped", variant: "secondary" as const };
      case "error":
      case "fail":
        return { label: "Fail", variant: "destructive" as const };
      default:
        return { label: String(status), variant: "secondary" as const };
    }
  }, [status]);

  return <Badge variant={variant}>{label}</Badge>;
}

function StatusIcon({ status }: { status: DependencyStatus | PipelineStatus }) {
  if (status === "ok" || status === "pass") return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === "missing" || status === "skip") return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  return <XCircle className="w-4 h-4 text-red-500" />;
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} className="gap-1">
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

function ObsoletePlaceIdSuggestion({
  businessName,
  suggestedPlaceId,
  detailPlaceId,
}: {
  businessName: string;
  suggestedPlaceId?: string | null;
  detailPlaceId?: string;
}) {
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<{ placeId: string | null; source: string | null } | null>(null);

  const runDiscovery = async () => {
    setDiscoveryLoading(true);
    setDiscoveryResult(null);
    try {
      const res = await apiRequest("POST", "/api/admin/place-discovery", {
        searchSignature: businessName,
      });
      const data = (await res.json()) as { placeId: string | null; source: string | null };
      setDiscoveryResult(data);
    } catch (e) {
      setDiscoveryResult({ placeId: null, source: null });
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const placeIdToShow = discoveryResult?.placeId ?? suggestedPlaceId ?? null;
  const sourceToShow = discoveryResult?.source ?? (suggestedPlaceId ? "from report" : null);

  return (
    <div className="mt-3 p-3 rounded-lg border border-amber-900/50 bg-amber-950/20 text-sm space-y-2">
      <p className="text-amber-200">
        Place ID is obsolete or invalid for Places API (New). Refresh the ID to fix Test 2 and Test 3.
      </p>
      {detailPlaceId && (
        <p className="text-slate-400 text-xs">
          Current Place ID: <code className="bg-slate-900/60 px-1 rounded">{detailPlaceId}</code>
        </p>
      )}
      {placeIdToShow && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-300">Suggested Place ID:</span>
          <code className="bg-slate-900/60 px-2 py-1 rounded text-amber-100 break-all">{placeIdToShow}</code>
          <CopyButton text={placeIdToShow} />
          {sourceToShow && (
            <Badge variant="secondary" className="text-xs">
              {sourceToShow}
            </Badge>
          )}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={runDiscovery}
        disabled={discoveryLoading}
        className="gap-1 border-amber-700/60 text-amber-200 hover:bg-amber-900/30"
      >
        {discoveryLoading ? (
          <RefreshCw className="w-3 h-3 animate-spin" />
        ) : (
          <Search className="w-3 h-3" />
        )}
        Search for New ID
      </Button>
    </div>
  );
}

export default function SystemHealthCheck() {
  const [lastReport, setLastReport] = useState<AdminHealthReport | null>(null);

  const reportQuery = useQuery<AdminHealthReport>({
    queryKey: ["/api/admin/health-report"],
    enabled: false,
    staleTime: 0,
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/health-report");
      return res.json() as Promise<AdminHealthReport>;
    },
  });

  const run = async () => {
    const result = await reportQuery.refetch();
    if (result.data) setLastReport(result.data);
  };

  const report = lastReport;
  const whatWorks = useMemo(() => {
    if (!report) return [];
    const depsOk = report.dependencyChecks.filter((c) => c.status === "ok").map((c) => `Dependency OK: ${c.name}`);
    const pipelineOk = report.pipelineChecks.filter((c) => c.status === "pass").map((c) => `Pass: ${c.name}`);
    return [...depsOk, ...pipelineOk];
  }, [report]);

  const whatDoesNotWork = useMemo(() => {
    if (!report) return [];
    const depsBad = report.dependencyChecks
      .filter((c) => c.status === "missing" || c.status === "error")
      .map((c) => `Dependency ${c.status.toUpperCase()}: ${c.name}${c.message ? ` — ${c.message}` : ""}`);
    const pipelineBad = report.pipelineChecks
      .filter((c) => c.status === "fail")
      .map((c) => `Fail: ${c.name}${c.message ? ` — ${c.message}` : ""}`);
    const pipelineSkipped = report.pipelineChecks
      .filter((c) => c.status === "skip")
      .map((c) => `Skipped: ${c.name}${c.message ? ` — ${c.message}` : ""}`);
    return [...depsBad, ...pipelineBad, ...pipelineSkipped];
  }, [report]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-300" />
            System Health
          </h1>
          <p className="text-slate-400 mt-1">
            Runs dependency checks and BI pipeline checks (SERP API → Gemini → Places → System Instructions).
          </p>
        </div>
        <Button onClick={run} disabled={reportQuery.isFetching} data-testid="button-run-system-health">
          {reportQuery.isFetching ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Running…
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Run health check and tests
            </>
          )}
        </Button>
      </div>

      {reportQuery.isError && (
        <Card className="border-red-900/40 bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-red-200">Failed to run health report</CardTitle>
            <CardDescription className="text-red-300/80">
              {(reportQuery.error as any)?.message || "Unknown error"}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!report && !reportQuery.isFetching && (
        <Card>
          <CardHeader>
            <CardTitle>No report yet</CardTitle>
            <CardDescription>Click “Run health check and tests” to generate a complete system report.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {report && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>
                {report.params.businessName} • {report.params.placeId} • {new Date(report.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Badge className="bg-green-700/40 text-green-200 border-green-800/60">Passed: {report.summary.passed}</Badge>
              <Badge className="bg-red-700/40 text-red-200 border-red-800/60">Failed: {report.summary.failed}</Badge>
              <Badge className="bg-yellow-700/40 text-yellow-200 border-yellow-800/60">Skipped: {report.summary.skipped}</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dependencies</CardTitle>
              <CardDescription>Presence/format checks (no secrets are displayed).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.dependencyChecks.map((c) => (
                <div key={c.name} className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <StatusIcon status={c.status} />
                    <div>
                      <div className="text-slate-100 font-medium">{c.name}</div>
                      {c.message && <div className="text-slate-400 text-sm">{c.message}</div>}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline Checks</CardTitle>
              <CardDescription>Live data-source checks using the same core services as the CLI test.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.pipelineChecks.map((c) => (
                <div key={c.name} className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <StatusIcon status={c.status} />
                    <div className="min-w-0">
                      <div className="text-slate-100 font-medium">{c.name}</div>
                      {c.message && <div className="text-slate-400 text-sm">{c.message}</div>}
                      {c.status === "fail" && (c.detail?.obsoletePlaceId === true || c.detail?.suggestion === "Search for New ID") && (
                        <ObsoletePlaceIdSuggestion
                          businessName={report.params.businessName}
                          suggestedPlaceId={c.detail?.suggestedPlaceId as string | undefined}
                          detailPlaceId={c.detail?.placeId as string | undefined}
                        />
                      )}
                      {c.detail && (
                        <pre className="mt-2 text-xs text-slate-300 bg-slate-950/40 border border-slate-800 rounded p-2 overflow-auto">
                          {JSON.stringify(c.detail, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Report</CardTitle>
              <CardDescription>What works vs what does not, based on the checks above.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-slate-200 font-semibold mb-2">What works</div>
                {whatWorks.length === 0 ? (
                  <div className="text-slate-400 text-sm">No passing checks yet.</div>
                ) : (
                  <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
                    {whatWorks.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="text-slate-200 font-semibold mb-2">What does not work / skipped</div>
                {whatDoesNotWork.length === 0 ? (
                  <div className="text-slate-400 text-sm">No issues detected.</div>
                ) : (
                  <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
                    {whatDoesNotWork.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          {report.rawMessages && report.rawMessages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Raw Messages</CardTitle>
                <CardDescription>Supplemental warnings and notes captured during the run.</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-slate-300 bg-slate-950/40 border border-slate-800 rounded p-3 overflow-auto">
                  {report.rawMessages.join("\n")}
                </pre>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

