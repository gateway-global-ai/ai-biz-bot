import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Activity, Loader2 } from "lucide-react";

const TOKEN_KEY = "gateway_auth_token";

type VoiceActivationResponse = {
  ok: boolean;
  days: number;
  siteConfigId: string | null;
  total: number;
  series: Array<{ dayUtc: string; siteConfigId: string | null; siteName: string; count: number }>;
};

/**
 * Per-site voice activation (post–audio-pipeline heartbeats) — not token billing.
 */
export function VoiceActivationPulse({ siteConfigId, days = 14 }: { siteConfigId: string; days?: number }) {
  const { token, isAuthenticated } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["voice-activation", siteConfigId, days, token],
    queryFn: async (): Promise<VoiceActivationResponse> => {
      const t = token ?? (typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null);
      const params = new URLSearchParams({
        days: String(days),
        siteConfigId,
      });
      const res = await fetch(`/api/v1/admin/analytics/voice-activation?${params}`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      return res.json();
    },
    enabled: !!siteConfigId && isAuthenticated && !!token,
  });

  if (!isAuthenticated || !token) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="rounded-sui bg-slate-900/40 border border-indigo-500/20 p-6 flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading voice activation…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-sui bg-slate-900/40 border border-rose-500/20 p-4 text-sm text-rose-300">
        Voice activation stats unavailable ({error instanceof Error ? error.message : "error"}).
      </div>
    );
  }

  const series = data?.series ?? [];
  const byDay = new Map<string, number>();
  for (const row of series) {
    byDay.set(row.dayUtc, (byDay.get(row.dayUtc) ?? 0) + row.count);
  }
  const daysSorted = Array.from(byDay.keys()).sort();
  const counts = daysSorted.map((d) => byDay.get(d) ?? 0);
  const max = Math.max(1, ...counts);

  return (
    <div className="rounded-sui bg-slate-900/40 border border-indigo-500/20 p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Voice activation</h3>
            <p className="text-[11px] text-slate-500">
              Post-audio heartbeats (last {days} days) — activation signal, not token usage.
            </p>
          </div>
        </div>
        <p className="text-sm font-mono text-emerald-400">Σ {data?.total ?? 0}</p>
      </div>

      {daysSorted.length === 0 ? (
        <p className="text-xs text-slate-500">No voice sessions yet for this site.</p>
      ) : (
        <div className="flex items-end gap-1.5 h-32 px-1">
          {daysSorted.map((day, i) => {
            const c = counts[i] ?? 0;
            const px = Math.max(6, Math.round((c / max) * 96));
            return (
              <div key={day} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0 h-full">
                <div
                  className="w-full rounded-t bg-emerald-500/80 transition-all"
                  style={{ height: `${px}px` }}
                  title={`${day}: ${c}`}
                />
                <span className="text-[9px] text-slate-500 font-mono truncate w-full text-center">
                  {day.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
