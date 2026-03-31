/**
 * Platform-owned credential broker — no vendor HTTP before checks pass.
 * Agents never receive raw keys/tokens; adapters call getExecutionContext first.
 */
import type { IntegrationExecutionBlock, IntegrationExecutionResult } from "@shared/integrationExecution";
import type { SitePmsIntegration } from "@shared/schema";
import { loadIntegrationAuthProfile } from "../config/loadIntegrationAuthProfile.js";
import { getIntegrationCapabilityRow } from "../config/loadIntegrationCapabilityRegistry.js";
import {
  CLOUDBEDS_BASE,
  loadCloudbedsPmsRow,
  readGlobalCloudbedsApiKey,
  resolvePmsAuthHeaders,
} from "./cloudbedsApi.js";

export type GetExecutionContextInput = {
  siteConfigId: string;
  vendorId: string;
  capabilityId: string;
};

function inferCloudbedsVersionLaneFromEnv(): string | null {
  const b = CLOUDBEDS_BASE.toLowerCase();
  if (b.includes("v1.2")) return "cloudbeds_v1_2";
  if (b.includes("v1.3")) return "cloudbeds_v1_3";
  return null;
}

function effectiveCloudbedsVersionLane(row: SitePmsIntegration): string | null {
  const fromRow = row.apiVersionLane?.trim();
  if (fromRow) return fromRow;
  return inferCloudbedsVersionLaneFromEnv();
}

function inferAuthLane(row: SitePmsIntegration): string | null {
  if (row.authLane?.trim()) return row.authLane.trim();
  if (row.accessToken?.trim()) return "oauth2";
  if (row.apiKey?.trim()) return "api_key_property";
  return null;
}

function hasCloudbedsCredential(row: SitePmsIntegration): boolean {
  return !!(row.apiKey?.trim() || row.accessToken?.trim() || readGlobalCloudbedsApiKey());
}

function normalizeGrantedScopes(row: SitePmsIntegration): string[] {
  const g = row.scopesGranted;
  if (!Array.isArray(g)) return [];
  return g.filter((x): x is string => typeof x === "string");
}

function scopesSatisfied(required: string[], granted: string[]): boolean {
  if (granted.includes("*")) return true;
  return required.every((r) => granted.includes(r));
}

function normalizePosture(row: SitePmsIntegration): string {
  return (row.installPosture ?? "connected").trim().toLowerCase() || "connected";
}

/**
 * Resolve auth headers for a governed Cloudbeds capability. Does not perform vendor HTTP.
 */
export async function getExecutionContext(input: GetExecutionContextInput): Promise<IntegrationExecutionResult> {
  const { siteConfigId, vendorId, capabilityId } = input;

  if (vendorId !== "cloudbeds") {
    return { ok: false, block: { code: "VENDOR_UNSUPPORTED", vendorId } };
  }

  const cap = getIntegrationCapabilityRow(capabilityId);
  if (!cap || cap.vendor_id !== vendorId) {
    return { ok: false, block: { code: "CAPABILITY_NOT_REGISTERED", capabilityId, vendorId } };
  }

  const row = await loadCloudbedsPmsRow(siteConfigId);
  if (!row || !row.isActive) {
    return { ok: false, block: { code: "AUTH_MISSING", vendorId, siteConfigId } };
  }

  const posture = normalizePosture(row);
  if (posture === "revoked") {
    return { ok: false, block: { code: "INSTALL_REVOKED", vendorId, siteConfigId } };
  }
  if (posture === "degraded" || posture === "draft") {
    return {
      ok: false,
      block: { code: "CONNECTION_DEGRADED", vendorId, siteConfigId, installPosture: posture },
    };
  }

  if (!hasCloudbedsCredential(row)) {
    return { ok: false, block: { code: "AUTH_MISSING", vendorId, siteConfigId } };
  }

  const profile = loadIntegrationAuthProfile(vendorId);
  const effectiveLane = inferAuthLane(row);
  if (effectiveLane && profile && !profile.supported_auth_modes.includes(effectiveLane)) {
    return {
      ok: false,
      block: { code: "LANE_BLOCKED", vendorId, siteConfigId, authLane: effectiveLane },
    };
  }

  const requiredScopes = cap.required_scope_ids ?? [];
  const grantedScopes = normalizeGrantedScopes(row);
  if (!scopesSatisfied(requiredScopes, grantedScopes)) {
    return {
      ok: false,
      block: {
        code: "SCOPE_MISSING",
        capabilityId,
        requiredScopeIds: requiredScopes,
        grantedScopeIds: grantedScopes,
      },
    };
  }

  const allowedLanes = cap.allowed_version_lanes;
  if (allowedLanes?.length) {
    const effectiveV = effectiveCloudbedsVersionLane(row);
    if (!effectiveV || !allowedLanes.includes(effectiveV)) {
      return {
        ok: false,
        block: {
          code: "VERSION_LANE_MISMATCH",
          capabilityId,
          allowedVersionLanes: allowedLanes,
          effectivePropertyLane: effectiveV,
        },
      };
    }
  }

  try {
    const { headers, updatedRow } = await resolvePmsAuthHeaders(row);
    return { ok: true, headers, pmsRow: updatedRow };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Cloudbeds auth resolution failed.";
    console.error("[integrationCredentialBroker] resolvePmsAuthHeaders:", msg);
    return { ok: false, block: { code: "AUTH_MISSING", vendorId, siteConfigId } };
  }
}

export function integrationBlockForLogging(block: IntegrationExecutionBlock): Record<string, unknown> {
  return { ...block };
}
