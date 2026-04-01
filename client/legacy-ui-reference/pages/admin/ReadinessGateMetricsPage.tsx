/**
 * Platform admin — in-process readiness_gate_v1 counters (resets on server restart).
 */
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { BRAND } from "@/config/brand";
import {
  SovereignThemeProvider,
  SovereignPageShell,
  SovereignSectionHeader,
  SovereignCard,
  SovereignAlert,
  SovereignButton,
  SovereignStack,
  SovereignTypography,
} from "@/ui-core";

type Metrics = {
  ok?: boolean;
  total: number;
  customer_ready_true: number;
  customer_ready_false: number;
  from_qr_true: number;
  reason_counts: Record<string, number>;
  top_degraded_sites: { site_config_id: string; slug: string; degraded_hits: number }[];
  updated_at: string;
  error?: string;
};

export function ReadinessGateMetricsPage() {
  const [data, setData] = useState<Metrics | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    setErr(null);
    fetch("/api/v1/admin/readiness-gate-v1/metrics", { credentials: "include" })
      .then(async (r) => {
        const j = (await r.json()) as Metrics & { error?: string };
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        setData(j);
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Failed to load"));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SovereignThemeProvider>
      <SovereignPageShell>
        <SovereignSectionHeader
          title="Readiness gate (v1)"
          subtitle="Counts from GET /api/site-configs/by-slug — in-memory only; resets on deploy."
          actions={<SovereignButton onClick={load}>Refresh</SovereignButton>}
        />

        <SovereignStack spacing={3}>
          {err && (
            <SovereignAlert variant="danger">
              {err} — sign in to platform admin with an authorized role.
            </SovereignAlert>
          )}

          {data && (
            <>
              <SovereignTypography variant="body2" color="text.secondary">
                Last updated:{" "}
                <SovereignTypography component="span" variant="body2" fontFamily="monospace" fontSize="0.85em">
                  {data.updated_at}
                </SovereignTypography>
              </SovereignTypography>

              <SovereignCard title="Totals">
                <SovereignStack spacing={1}>
                  <SovereignTypography variant="body2">
                    Evaluations: <strong>{data.total}</strong>
                  </SovereignTypography>
                  <SovereignTypography variant="body2">
                    customer_ready true: <strong>{data.customer_ready_true}</strong> · false:{" "}
                    <strong>{data.customer_ready_false}</strong>
                  </SovereignTypography>
                  <SovereignTypography variant="body2">
                    from_qr: <strong>{data.from_qr_true}</strong>
                  </SovereignTypography>
                </SovereignStack>
              </SovereignCard>

              <SovereignCard title="Failure reasons (cumulative)">
                <SovereignStack spacing={0.5}>
                  {Object.entries(data.reason_counts || {}).map(([k, v]) => (
                    <SovereignTypography key={k} variant="body2" fontFamily="monospace" fontSize="0.85em">
                      {k}: {v}
                    </SovereignTypography>
                  ))}
                </SovereignStack>
              </SovereignCard>

              <SovereignCard title="Top degraded sites (by hit count)">
                {data.top_degraded_sites?.length ? (
                  <SovereignStack spacing={1}>
                    {data.top_degraded_sites.map((row) => (
                      <SovereignTypography key={row.site_config_id} variant="body2" fontFamily="monospace" fontSize="0.8em">
                        {row.slug} · {row.site_config_id.slice(0, 8)}… · {row.degraded_hits} hits
                      </SovereignTypography>
                    ))}
                  </SovereignStack>
                ) : (
                  <SovereignTypography variant="body2" color="text.secondary">
                    No degraded hits recorded yet.
                  </SovereignTypography>
                )}
              </SovereignCard>
            </>
          )}
        </SovereignStack>
      </SovereignPageShell>
    </SovereignThemeProvider>
  );
}
