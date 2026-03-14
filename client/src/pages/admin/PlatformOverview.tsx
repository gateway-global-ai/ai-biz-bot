/**
 * Platform Overview — sovereign-styled dashboard with full system health.
 * Expandable check rows show exactly what was tested + raw response (CLI-level clarity).
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Activity,
  Database,
  Phone,
  Sparkles,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Search,
  Server,
  MinusCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

type HealthCheckItem = {
  service: string;
  status: "ok" | "error" | "skip";
  message: string;
  tested?: Record<string, unknown>;
  listModels?: boolean;
  nativeAudioPreviewPermit?: boolean;
  missing?: string[];
  expected?: string | string[];
  hint?: string;
  [key: string]: unknown;
};

type HealthResponse = {
  status: "ok" | "error";
  timestamp: string;
  checks: HealthCheckItem[];
};

type DomainStatus = {
  env: string;
  label: string;
  url: string;
  status: "online" | "offline" | "degraded";
  statusCode: number | null;
  responseTimeMs: number;
  error?: string;
};

type EnvironmentStatusResponse = {
  domains: DomainStatus[];
  timestamp: string;
};

const SERVICE_LABELS: Record<string, string> = {
  database: "Database",
  twilio: "Twilio",
  gemini: "Gemini",
  serpapi: "SerpAPI",
  server_hostinger: "Server (Hostinger)",
  sovereign_env: "Sovereign env",
  doppler_token_env: "Doppler token env",
};

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  database: Database,
  twilio: Phone,
  gemini: Sparkles,
  serpapi: Search,
  server_hostinger: Server,
  sovereign_env: Shield,
  doppler_token_env: Key,
};

function HealthCheckRow({ check }: { check: HealthCheckItem }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = SERVICE_ICONS[check.service] ?? Activity;
  const label = SERVICE_LABELS[check.service] ?? check.service;
  const isOk = check.status === "ok";
  const isSkip = check.status === "skip";
  const isError = check.status === "error";

  const rawJson = JSON.stringify(check, null, 2);

  return (
    <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 py-3 px-4 text-left hover:bg-slate-700/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />
        )}
        <Icon
          className={`w-4 h-4 shrink-0 ${
            isOk ? "text-emerald-400" : isSkip ? "text-slate-500" : "text-amber-400"
          }`}
        />
        <span className="font-mono text-xs font-semibold text-slate-300">{label}</span>
        {isOk && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-auto" />}
        {isSkip && <MinusCircle className="w-4 h-4 text-slate-500 shrink-0 ml-auto" />}
        {isError && <XCircle className="w-4 h-4 text-amber-400 shrink-0 ml-auto" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-700/50"
          >
            <div className="p-4 space-y-4 bg-slate-900/60">
              <p className={`text-sm ${isOk ? "text-slate-400" : isSkip ? "text-slate-500" : "text-amber-200/90"}`}>
                {check.message}
              </p>
              {check.tested && Object.keys(check.tested).length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    What we tested
                  </h4>
                  <pre className="text-xs text-slate-400 font-mono bg-slate-950/80 p-3 rounded border border-slate-700/50 overflow-x-auto">
                    {JSON.stringify(check.tested, null, 2)}
                  </pre>
                </div>
              )}
              {(check.nativeAudioPreviewPermit !== undefined || check.listModels !== undefined) && (
                <div className="flex flex-wrap gap-2">
                  {check.listModels !== undefined && (
                    <span className="data-chip font-mono text-[10px] px-2 py-0.5 rounded border border-indigo-500/30 text-indigo-300">
                      listModels: {String(check.listModels)}
                    </span>
                  )}
                  {check.nativeAudioPreviewPermit !== undefined && (
                    <span className="data-chip font-mono text-[10px] px-2 py-0.5 rounded border border-indigo-500/30 text-indigo-300">
                      nativeAudioPreviewPermit: {String(check.nativeAudioPreviewPermit)}
                    </span>
                  )}
                </div>
              )}
              {check.missing?.length ? (
                <p className="text-xs text-amber-200/80">missing: {check.missing.join(", ")}</p>
              ) : null}
              {check.expected != null && (
                <p className="text-xs text-slate-500">
                  expected:{" "}
                  {Array.isArray(check.expected) ? check.expected.join(", ") : String(check.expected)}
                </p>
              )}
              {check.hint && <p className="text-xs text-amber-200/90 italic">{check.hint}</p>}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Raw check (full response)
                </h4>
                <pre className="text-[11px] text-slate-400 font-mono bg-slate-950/80 p-3 rounded border border-slate-700/50 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-all">
                  {rawJson}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HealthGroup({ title, checks }: { title: string; checks: HealthCheckItem[] }) {
  if (checks.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      <div className="space-y-2">
        {checks.map((c) => (
          <HealthCheckRow key={c.service} check={c} />
        ))}
      </div>
    </div>
  );
}

export function PlatformOverview() {
  const { data: health, isLoading, isError, error } = useQuery<HealthResponse>({
    queryKey: ["/api/health"],
    staleTime: 30_000,
    retry: false,
  });

  const { data: envStatus, isLoading: envLoading } = useQuery<EnvironmentStatusResponse>({
    queryKey: ["/api/admin/environment-status"],
    staleTime: 30_000,
    retry: 1,
  });

  const infrastructure = health?.checks?.filter((c) => c.service === "database") ?? [];
  const telecom = health?.checks?.filter((c) => c.service === "twilio") ?? [];
  const ai = health?.checks?.filter((c) => c.service === "gemini") ?? [];
  const dataApis = health?.checks?.filter((c) => c.service === "serpapi") ?? [];
  const server = health?.checks?.filter((c) => c.service === "server_hostinger") ?? [];
  const env = health?.checks?.filter(
    (c) => c.service === "sovereign_env" || c.service === "doppler_token_env"
  ) ?? [];

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex items-center gap-3"
      >
        <div className="p-2 rounded-sui bg-slate-900/40 border border-indigo-500/20">
          <LayoutDashboard className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Platform Overview</h1>
          <p className="text-slate-400 text-sm">Super-admin dashboard and system health.</p>
        </div>
      </motion.div>

      {/* Environment status: Dev / Stage / Prod — pings each domain /api/health */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.03 }}
        className="p-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl shadow-2xl"
      >
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-indigo-400" />
          Environment status (Dev / Stage / Prod)
        </h2>
        {envLoading ? (
          <div className="flex items-center gap-2 text-slate-400 py-4">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Checking dev, stage, prod…</span>
          </div>
        ) : envStatus?.domains?.length ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {envStatus.domains.map((d) => (
              <div
                key={d.env}
                className={`rounded-sui border p-4 ${
                  d.status === "online"
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : d.status === "degraded"
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-slate-800/60 border-slate-600/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-white">{d.label}</span>
                  {d.status === "online" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {d.status === "degraded" && <MinusCircle className="w-4 h-4 text-amber-400 shrink-0" />}
                  {d.status === "offline" && <XCircle className="w-4 h-4 text-slate-400 shrink-0" />}
                </div>
                <p className="text-xs text-slate-400 mt-1 truncate" title={d.url}>
                  {d.url}
                </p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded ${
                      d.status === "online"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : d.status === "degraded"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-slate-700/50 text-slate-400"
                    }`}
                  >
                    {d.status}
                  </span>
                  {d.statusCode != null && (
                    <span className="data-chip font-mono text-[10px] text-slate-500">{d.statusCode}</span>
                  )}
                  {d.responseTimeMs >= 0 && (
                    <span className="font-mono text-[10px] text-slate-500">{d.responseTimeMs} ms</span>
                  )}
                </div>
                {d.error && (
                  <p className="text-[11px] text-amber-300/90 mt-1 truncate" title={d.error}>
                    {d.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm py-2">Environment status unavailable.</p>
        )}
        {envStatus?.timestamp && (
          <p className="text-[10px] text-slate-500 mt-3">Last checked: {new Date(envStatus.timestamp).toLocaleString()}</p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
        className="p-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl shadow-2xl space-y-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            System Health
          </h2>
          {health?.timestamp && (
            <span className="font-mono text-xs text-slate-500">
              {new Date(health.timestamp).toLocaleString()}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-400 py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading health checks…</span>
          </div>
        ) : isError ? (
          <div className="py-4 px-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-amber-400 font-medium">Health check failed</p>
            <p className="text-sm text-slate-400 mt-1">
              {(error as Error)?.message ?? "Server or network error."}
            </p>
          </div>
        ) : health?.checks?.length ? (
          <>
            <p className="text-slate-400 text-sm">
              Click a check to see what was tested and the full raw response (same data as the
              command-line health check).
            </p>
            <div className="flex items-center gap-2 mb-4">
              {health.status === "ok" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  All systems operational
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium">
                  <XCircle className="w-4 h-4" />
                  One or more checks failed
                </span>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
              <HealthGroup title="Infrastructure" checks={infrastructure} />
              <HealthGroup title="Telecom" checks={telecom} />
              <HealthGroup title="AI / Gemini" checks={ai} />
              <HealthGroup title="Data / APIs" checks={dataApis} />
              <HealthGroup title="Server" checks={server} />
              <HealthGroup title="Environment" checks={env} />
            </div>
          </>
        ) : (
          <p className="text-slate-400 py-4">No health data available.</p>
        )}
      </motion.div>
    </div>
  );
}
