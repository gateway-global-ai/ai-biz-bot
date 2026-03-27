/**
 * In-process counters for readiness_gate_v1 (by-slug evaluations). Resets on process restart.
 */
import type { ReadinessGateV1Evaluation, ReadinessGateV1Reason } from './readinessGateV1';

const reasonKeys: ReadinessGateV1Reason[] = [
  'site_created_false',
  'minimum_identity_false',
  'concierge_response_path_false',
];

type SiteDegraded = { site_config_id: string; slug: string; degraded_hits: number };

const state = {
  total: 0,
  customer_ready_true: 0,
  customer_ready_false: 0,
  from_qr_true: 0,
  reason_counts: Object.fromEntries(reasonKeys.map((k) => [k, 0])) as Record<ReadinessGateV1Reason, number>,
  /** Bounded map for repeat degraded sites */
  site_degraded: new Map<string, SiteDegraded>(),
  maxSiteEntries: 80,
};

function bumpSiteDegraded(site_config_id: string, slug: string) {
  const prev = state.site_degraded.get(site_config_id);
  const nextCount = (prev?.degraded_hits ?? 0) + 1;
  if (state.site_degraded.size >= state.maxSiteEntries && !state.site_degraded.has(site_config_id)) {
    let minK = '';
    let minV = Infinity;
    for (const [k, v] of state.site_degraded) {
      if (v.degraded_hits < minV) {
        minV = v.degraded_hits;
        minK = k;
      }
    }
    if (minK) state.site_degraded.delete(minK);
  }
  state.site_degraded.set(site_config_id, { site_config_id, slug, degraded_hits: nextCount });
}

export function recordReadinessGateV1Metric(input: {
  evaluation: ReadinessGateV1Evaluation;
  site_config_id: string;
  slug: string;
  from_qr: boolean;
}): void {
  const { evaluation, site_config_id, slug, from_qr } = input;
  state.total += 1;
  if (evaluation.customer_ready) state.customer_ready_true += 1;
  else {
    state.customer_ready_false += 1;
    bumpSiteDegraded(site_config_id, slug);
  }
  if (from_qr) state.from_qr_true += 1;
  for (const r of evaluation.reasons) {
    if (r in state.reason_counts) state.reason_counts[r as ReadinessGateV1Reason] += 1;
  }
}

export function getReadinessGateV1MetricsSnapshot(): {
  total: number;
  customer_ready_true: number;
  customer_ready_false: number;
  from_qr_true: number;
  reason_counts: Record<string, number>;
  top_degraded_sites: SiteDegraded[];
  updated_at: string;
} {
  const top = [...state.site_degraded.values()].sort((a, b) => b.degraded_hits - a.degraded_hits).slice(0, 25);
  return {
    total: state.total,
    customer_ready_true: state.customer_ready_true,
    customer_ready_false: state.customer_ready_false,
    from_qr_true: state.from_qr_true,
    reason_counts: { ...state.reason_counts },
    top_degraded_sites: top,
    updated_at: new Date().toISOString(),
  };
}
