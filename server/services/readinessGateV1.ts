/**
 * readiness_gate_v1 — server-side evaluation of customer_ready_v1 (soft enforcement).
 * Contract: docs/product/CUSTOMER_READY_V1.md
 * Do not rename casually; ops and future flags depend on this label.
 */

export type ReadinessGateV1Mode = "normal" | "degraded";

export type ReadinessGateV1Payload = {
  customer_ready: boolean;
  mode: ReadinessGateV1Mode;
};

/** Internal-only failure tags for logs / metrics (not exposed on public JSON). */
export type ReadinessGateV1Reason =
  | "site_created_false"
  | "minimum_identity_false"
  | "concierge_response_path_false";

export type ReadinessGateV1Evaluation = ReadinessGateV1Payload & {
  reasons: ReadinessGateV1Reason[];
  agent_count: number;
};

type SiteLike = {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
  businessDescription?: string | null;
  businessType?: string | null;
  placeData?: unknown;
  assignedAgentId?: string | null;
};

type AgentLike = { id: string };

function minimumIdentityPresent(site: SiteLike): boolean {
  const name = String(site.name ?? "").trim();
  if (!name) return false;

  const desc = String(site.businessDescription ?? "").trim();
  const bt = String(site.businessType ?? "").trim();
  if (desc || bt) return true;

  const pd = site.placeData;
  if (!pd || typeof pd !== "object") return false;
  const o = pd as Record<string, unknown>;
  const addr = typeof o.formatted_address === "string" ? o.formatted_address.trim() : "";
  const n = typeof o.name === "string" ? o.name.trim() : "";
  const types = o.types;
  const hasTypes = Array.isArray(types) && types.length > 0;
  return Boolean(addr || n || hasTypes);
}

function siteCreated(site: SiteLike): boolean {
  return Boolean(String(site.id ?? "").trim() && String(site.slug ?? "").trim());
}

/**
 * Response path per CUSTOMER_READY_V1 §3:
 * - Swarm path: at least one agent row for this site; OR
 * - Fallback: minimum identity present so public Concierge can answer with business context (platform guarantee).
 */
function conciergeOrAgentResponseAvailable(site: SiteLike, agents: AgentLike[]): boolean {
  if (agents.length > 0) return true;
  return minimumIdentityPresent(site);
}

/**
 * Full evaluation + diagnostics for telemetry. `reasons` lists failed clauses (may be multiple).
 */
export function evaluateReadinessGateV1WithDiagnostics(
  site: SiteLike,
  agents: AgentLike[],
): ReadinessGateV1Evaluation {
  const created = siteCreated(site);
  const identity = minimumIdentityPresent(site);
  const responseOk = conciergeOrAgentResponseAvailable(site, agents);

  const reasons: ReadinessGateV1Reason[] = [];
  if (!created) reasons.push("site_created_false");
  if (!identity) reasons.push("minimum_identity_false");
  if (!responseOk) reasons.push("concierge_response_path_false");

  const customer_ready = created && identity && responseOk;
  return {
    customer_ready,
    mode: customer_ready ? "normal" : "degraded",
    reasons,
    agent_count: agents.length,
  };
}

/**
 * Public JSON payload only (no reasons — avoid leaking diagnostics to browsers).
 */
export function evaluateReadinessGateV1(
  site: SiteLike,
  agents: AgentLike[],
): ReadinessGateV1Payload {
  const e = evaluateReadinessGateV1WithDiagnostics(site, agents);
  return { customer_ready: e.customer_ready, mode: e.mode };
}

/**
 * Structured log line for log aggregators (grep `evt":"readiness_gate_v1"`).
 * Set `READINESS_GATE_LOG=false` to disable.
 */
export function logReadinessGateV1Event(input: {
  evaluation: ReadinessGateV1Evaluation;
  site_config_id: string;
  slug: string;
  from_qr: boolean;
}): void {
  if (process.env.READINESS_GATE_LOG === "false") return;

  const { evaluation, site_config_id, slug, from_qr } = input;
  console.log(
    JSON.stringify({
      evt: "readiness_gate_v1",
      ts: new Date().toISOString(),
      site_config_id,
      slug,
      from_qr: from_qr || undefined,
      customer_ready: evaluation.customer_ready,
      mode: evaluation.mode,
      agent_count: evaluation.agent_count,
      reasons: evaluation.reasons.length ? evaluation.reasons : undefined,
    }),
  );
}
