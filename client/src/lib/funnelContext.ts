/**
 * Client-side phased funnel context — persisted per site in sessionStorage.
 * Server resolves current phase from these keys + sales_funnels[].conversationWorkflow.
 *
 * Server sync: buyer journey (cross-session) is durably stored via /api/visitor-session.
 * visitorId is derived from localStorage (anonymous UUID per site, persisted across tabs).
 */

const storageKey = (siteConfigId: string) => `funnel_ctx_${siteConfigId}`;
const visitorIdKey = (siteConfigId: string) => `gg_vid_${siteConfigId}`;

// ── Funnel context keys (sessionStorage fast path) ────────────────────────────

export function loadFunnelContextKeys(siteConfigId: string | null | undefined): Record<string, string> {
  if (!siteConfigId || typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(storageKey(siteConfigId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveFunnelContextKeys(siteConfigId: string | null | undefined, keys: Record<string, string>) {
  if (!siteConfigId || typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(storageKey(siteConfigId), JSON.stringify(keys));
  } catch {
    /* ignore quota */
  }
}

export function mergeFunnelContextFromBusiness(
  business: { name?: string; address?: string },
  keys: Record<string, string>
): Record<string, string> {
  const out = { ...keys };
  if (business.name?.trim() && !out.owner_salon_name) out.owner_salon_name = business.name.trim();
  if (business.address?.trim() && !out.owner_city) {
    const parts = business.address.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) out.owner_city = `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
    else out.owner_city = business.address.trim();
  }
  return out;
}

// ── Visitor ID (anonymous, persistent across tabs via localStorage) ───────────

/** Returns or creates a stable anonymous visitor ID for a site. */
export function getOrCreateVisitorId(siteConfigId: string | null | undefined): string | null {
  if (!siteConfigId || typeof window === 'undefined') return null;
  try {
    const key = visitorIdKey(siteConfigId);
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const newId = crypto.randomUUID();
    localStorage.setItem(key, newId);
    return newId;
  } catch {
    return null;
  }
}

// ── Buyer journey server sync ─────────────────────────────────────────────────

export interface BuyerJourneyClient {
  phase: string;
  industry?: string;
  painPointsExpressed: string[];
  pricingObjectionsRaised: string[];
  needsExpressed: string[];
  demoViewedAt?: string;
  trialStartedAt?: string;
  activatedAt?: string;
  sessionCount: number;
}

/**
 * Load buyer journey from the server. Returns null if visitor is unknown or request fails.
 * Does NOT create a session — that happens automatically on the GET endpoint.
 */
export async function loadBuyerJourneyFromServer(
  visitorId: string | null | undefined,
  siteConfigId: string | null | undefined,
): Promise<BuyerJourneyClient | null> {
  if (!visitorId || !siteConfigId || typeof window === 'undefined') return null;
  try {
    const res = await fetch(`/api/visitor-session/${encodeURIComponent(visitorId)}/${encodeURIComponent(siteConfigId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.buyerJourney ?? null;
  } catch {
    return null;
  }
}

export type VisitorEventType = 'painPoint' | 'objection' | 'need' | 'demoView' | 'trialStart' | 'activation' | 'phaseTransition';

/**
 * Append a single buyer signal to the server-side journey.
 * Fire-and-forget — non-blocking, failures are swallowed.
 */
export function persistBuyerJourneySignal(
  visitorId: string | null | undefined,
  siteConfigId: string | null | undefined,
  event: { type: VisitorEventType; value?: string; phase?: string; agentId?: string },
): void {
  if (!visitorId || !siteConfigId || typeof window === 'undefined') return;
  fetch(
    `/api/visitor-session/${encodeURIComponent(visitorId)}/${encodeURIComponent(siteConfigId)}/event`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    },
  ).catch(() => { /* non-fatal */ });
}
