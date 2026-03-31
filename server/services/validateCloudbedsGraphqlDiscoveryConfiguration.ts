/**
 * Single writer for Cloudbeds GraphQL discovery onboarding validation state.
 * Persists to site_pms_integrations.config.cloudbeds_graphql_discovery_v1.onboarding
 * (see CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_V1.md).
 *
 * Does not: schema ingest, promotion, SMS, connect tokens, or secret collection.
 */
import { eq } from "drizzle-orm";
import {
  CLOUDBEDS_GRAPHQL_DISCOVERY_V1_CONFIG_KEY,
  type CloudbedsGraphqlDiscoveryLastValidationStatus,
  type CloudbedsGraphqlDiscoveryOnboardingPayload,
  type CloudbedsGraphqlDiscoveryOnboardingState,
  type CloudbedsGraphqlDiscoveryV1Config,
} from "@shared/cloudbedsGraphqlDiscoveryOnboarding";
import type { SitePmsIntegration } from "@shared/schema";
import { sitePmsIntegrations } from "@shared/schema";
import { db } from "../db";
import { loadCloudbedsPmsRow, readGlobalCloudbedsApiKey, resolvePmsAuthHeaders } from "./cloudbedsApi.js";

/** Same safe inventory query as scripts/fetch-cloudbeds-graphql-introspection.ts */
const MINIMAL_INTROSPECTION = `
query TypeInventory {
  __schema {
    queryType { name }
    mutationType { name }
    types {
      name
      kind
      description
    }
  }
}
`;

export type ValidateCloudbedsGraphqlDiscoveryOptions = {
  /** When true, skip HTTP POST to GraphQL (gap detection + auth resolution only). */
  skipHttpValidation?: boolean;
};

export type ValidateCloudbedsGraphqlDiscoveryResult =
  | {
      ok: false;
      code: "PMS_ROW_MISSING";
      message: string;
      persisted: false;
    }
  | {
      ok: true;
      persisted: true;
      sitePmsIntegrationId: string;
      integrationLane: typeof CLOUDBEDS_GRAPHQL_DISCOVERY_V1_CONFIG_KEY;
      status: CloudbedsGraphqlDiscoveryOnboardingState;
      missing_fields: string[];
      last_validation_status: CloudbedsGraphqlDiscoveryLastValidationStatus;
      last_validation_error: string | null;
      validated_at: string | null;
      payload: CloudbedsGraphqlDiscoveryOnboardingPayload;
    };

function nowIso(): string {
  return new Date().toISOString();
}

function hasCredentialMaterial(row: SitePmsIntegration): boolean {
  return !!(row.apiKey?.trim() || row.accessToken?.trim() || readGlobalCloudbedsApiKey());
}

function normalizeHttpsUrl(raw: string | undefined): URL | null {
  if (!raw?.trim()) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return null;
    return u;
  } catch {
    return null;
  }
}

function normalizePosture(row: SitePmsIntegration): string {
  return (row.installPosture ?? "connected").trim().toLowerCase() || "connected";
}

/** Map REST broker headers to GraphQL POST (Bearer or x-api-key). */
function graphqlHeadersFromAuthHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (headers.Authorization) out.Authorization = headers.Authorization;
  if (headers["x-api-key"]) out["x-api-key"] = headers["x-api-key"];
  return out;
}

function introspectionLooksValid(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  const o = json as Record<string, unknown>;
  if (Array.isArray(o.errors) && o.errors.length > 0) return false;
  const data = o.data;
  if (!data || typeof data !== "object") return false;
  const schema = (data as Record<string, unknown>).__schema;
  return schema != null && typeof schema === "object";
}

async function safeGraphqlIntrospectionProbe(
  httpUrl: string,
  headers: Record<string, string>,
): Promise<{ ok: true } | { ok: false; error: string; error_code: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(httpUrl, {
      method: "POST",
      headers: graphqlHeadersFromAuthHeaders(headers),
      body: JSON.stringify({ query: MINIMAL_INTROSPECTION }),
      signal: controller.signal,
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      return {
        ok: false,
        error: `Non-JSON response (HTTP ${res.status})`,
        error_code: "INVALID_RESPONSE",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        error: `HTTP ${res.status}`,
        error_code: "HTTP_STATUS",
      };
    }
    if (!introspectionLooksValid(json)) {
      return {
        ok: false,
        error: "GraphQL response missing __schema or contains errors",
        error_code: "GRAPHQL_ERRORS",
      };
    }
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const aborted = msg.includes("abort") || msg === "This operation was aborted";
    return {
      ok: false,
      error: aborted ? "Request timeout or aborted" : msg.slice(0, 200),
      error_code: aborted ? "NETWORK" : "NETWORK",
    };
  } finally {
    clearTimeout(t);
  }
}

function buildPayload(
  status: CloudbedsGraphqlDiscoveryOnboardingState,
  args: {
    missing_fields: string[];
    last_validation_status: CloudbedsGraphqlDiscoveryLastValidationStatus;
    last_validation_error: string | null;
    error_code: string | null;
    validated_at: string | null;
    verified_at: string | null;
  },
): CloudbedsGraphqlDiscoveryOnboardingPayload {
  const at = nowIso();
  return {
    status,
    missing_fields: args.missing_fields,
    validated_at: args.validated_at,
    verified_at: args.verified_at,
    verified_by: "system",
    last_validation: {
      ok: args.last_validation_status === "success",
      at,
      error_code: args.error_code,
    },
    last_validation_status: args.last_validation_status,
    last_validation_error: args.last_validation_error,
    next_action:
      status === "ready_for_discovery_ingest"
        ? null
        : status === "missing_http_url"
          ? "set_graphql_http_url"
          : status === "missing_auth"
            ? "complete_secure_connect"
            : status === "validation_failed"
              ? "fix_endpoint_or_credentials"
              : null,
  };
}

async function persistOnboarding(
  rowId: string,
  prevConfig: Record<string, unknown>,
  gqlSlice: CloudbedsGraphqlDiscoveryV1Config,
  onboarding: CloudbedsGraphqlDiscoveryOnboardingPayload,
): Promise<void> {
  const nextGql: CloudbedsGraphqlDiscoveryV1Config = {
    ...gqlSlice,
    onboarding,
  };
  await db
    .update(sitePmsIntegrations)
    .set({
      config: {
        ...prevConfig,
        [CLOUDBEDS_GRAPHQL_DISCOVERY_V1_CONFIG_KEY]: nextGql as unknown as Record<string, unknown>,
      },
      updatedAt: new Date(),
    })
    .where(eq(sitePmsIntegrations.id, rowId));
}

/**
 * Validates tenant GraphQL discovery configuration: gap detection, broker auth resolution,
 * optional safe introspection probe. Writes normalized onboarding state only.
 */
export async function validateCloudbedsGraphqlDiscoveryConfiguration(
  siteConfigId: string,
  options?: ValidateCloudbedsGraphqlDiscoveryOptions,
): Promise<ValidateCloudbedsGraphqlDiscoveryResult> {
  const skipHttp = options?.skipHttpValidation === true;

  if (!siteConfigId?.trim()) {
    return { ok: false, code: "PMS_ROW_MISSING", message: "site_config_id required", persisted: false };
  }

  const row = await loadCloudbedsPmsRow(siteConfigId.trim());
  if (!row) {
    return {
      ok: false,
      code: "PMS_ROW_MISSING",
      message: "No active Cloudbeds site_pms_integrations row for this site_config_id",
      persisted: false,
    };
  }

  const prevConfig = (row.config && typeof row.config === "object" ? row.config : {}) as Record<string, unknown>;
  const gqlSlice =
    (prevConfig[CLOUDBEDS_GRAPHQL_DISCOVERY_V1_CONFIG_KEY] as CloudbedsGraphqlDiscoveryV1Config | undefined) ?? {};
  const httpRaw = gqlSlice.http_url?.trim();
  const url = normalizeHttpsUrl(httpRaw);

  const posture = normalizePosture(row);
  if (posture === "revoked") {
    const payload = buildPayload("blocked", {
      missing_fields: ["credential"],
      last_validation_status: "skipped",
      last_validation_error: "install_posture_revoked",
      error_code: "INSTALL_REVOKED",
      validated_at: null,
      verified_at: gqlSlice.onboarding?.validated_at ?? gqlSlice.onboarding?.verified_at ?? null,
    });
    await persistOnboarding(row.id, prevConfig, gqlSlice, payload);
    return {
      ok: true,
      persisted: true,
      sitePmsIntegrationId: row.id,
      integrationLane: CLOUDBEDS_GRAPHQL_DISCOVERY_V1_CONFIG_KEY,
      status: payload.status,
      missing_fields: payload.missing_fields ?? [],
      last_validation_status: payload.last_validation_status ?? "skipped",
      last_validation_error: payload.last_validation_error ?? null,
      validated_at: payload.validated_at ?? null,
      payload,
    };
  }

  if (!row.isActive) {
    const payload = buildPayload("missing_auth", {
      missing_fields: ["integration_active"],
      last_validation_status: "skipped",
      last_validation_error: "site_pms_integration_inactive",
      error_code: "ROW_INACTIVE",
      validated_at: null,
      verified_at: gqlSlice.onboarding?.validated_at ?? null,
    });
    await persistOnboarding(row.id, prevConfig, gqlSlice, payload);
    return {
      ok: true,
      persisted: true,
      sitePmsIntegrationId: row.id,
      integrationLane: CLOUDBEDS_GRAPHQL_DISCOVERY_V1_CONFIG_KEY,
      status: payload.status,
      missing_fields: payload.missing_fields ?? [],
      last_validation_status: payload.last_validation_status ?? "skipped",
      last_validation_error: payload.last_validation_error ?? null,
      validated_at: payload.validated_at ?? null,
      payload,
    };
  }

  if (!url) {
    const payload = buildPayload("missing_http_url", {
      missing_fields: ["http_url"],
      last_validation_status: "skipped",
      last_validation_error: httpRaw ? "http_url_must_be_https" : "http_url_missing",
      error_code: "MISSING_HTTP_URL",
      validated_at: null,
      verified_at: gqlSlice.onboarding?.validated_at ?? null,
    });
    await persistOnboarding(row.id, prevConfig, gqlSlice, payload);
    return {
      ok: true,
      persisted: true,
      sitePmsIntegrationId: row.id,
      integrationLane: CLOUDBEDS_GRAPHQL_DISCOVERY_V1_CONFIG_KEY,
      status: payload.status,
      missing_fields: payload.missing_fields ?? [],
      last_validation_status: payload.last_validation_status ?? "skipped",
      last_validation_error: payload.last_validation_error ?? null,
      validated_at: payload.validated_at ?? null,
      payload,
    };
  }

  if (!hasCredentialMaterial(row)) {
    const payload = buildPayload("missing_auth", {
      missing_fields: ["credential"],
      last_validation_status: "skipped",
      last_validation_error: "no_api_key_or_access_token",
      error_code: "MISSING_AUTH",
      validated_at: null,
      verified_at: gqlSlice.onboarding?.validated_at ?? null,
    });
    await persistOnboarding(row.id, prevConfig, gqlSlice, payload);
    return {
      ok: true,
      persisted: true,
      sitePmsIntegrationId: row.id,
      integrationLane: CLOUDBEDS_GRAPHQL_DISCOVERY_V1_CONFIG_KEY,
      status: payload.status,
      missing_fields: payload.missing_fields ?? [],
      last_validation_status: payload.last_validation_status ?? "skipped",
      last_validation_error: payload.last_validation_error ?? null,
      validated_at: payload.validated_at ?? null,
      payload,
    };
  }

  let authHeaders: Record<string, string>;
  try {
    const resolved = await resolvePmsAuthHeaders(row);
    authHeaders = resolved.headers;
  } catch {
    const payload = buildPayload("missing_auth", {
      missing_fields: ["credential"],
      last_validation_status: "skipped",
      last_validation_error: "resolvePmsAuthHeaders_failed",
      error_code: "MISSING_AUTH",
      validated_at: null,
      verified_at: gqlSlice.onboarding?.validated_at ?? null,
    });
    await persistOnboarding(row.id, prevConfig, gqlSlice, payload);
    return {
      ok: true,
      persisted: true,
      sitePmsIntegrationId: row.id,
      integrationLane: CLOUDBEDS_GRAPHQL_DISCOVERY_V1_CONFIG_KEY,
      status: payload.status,
      missing_fields: payload.missing_fields ?? [],
      last_validation_status: payload.last_validation_status ?? "skipped",
      last_validation_error: payload.last_validation_error ?? null,
      validated_at: payload.validated_at ?? null,
      payload,
    };
  }

  if (posture === "draft" || posture === "degraded") {
    const payload = buildPayload(
      posture === "draft" ? "pending_secure_auth_handoff" : "validation_failed",
      {
        missing_fields: [],
        last_validation_status: "skipped",
        last_validation_error:
          posture === "draft" ? "install_posture_draft" : "install_posture_degraded",
        error_code: posture === "draft" ? "CONNECTION_DRAFT" : "CONNECTION_DEGRADED",
        validated_at: null,
        verified_at: gqlSlice.onboarding?.validated_at ?? gqlSlice.onboarding?.verified_at ?? null,
      },
    );
    await persistOnboarding(row.id, prevConfig, gqlSlice, payload);
    return {
      ok: true,
      persisted: true,
      sitePmsIntegrationId: row.id,
      integrationLane: CLOUDBEDS_GRAPHQL_DISCOVERY_V1_CONFIG_KEY,
      status: payload.status,
      missing_fields: payload.missing_fields ?? [],
      last_validation_status: payload.last_validation_status ?? "skipped",
      last_validation_error: payload.last_validation_error ?? null,
      validated_at: payload.validated_at ?? null,
      payload,
    };
  }

  if (skipHttp) {
    const validatedAt = gqlSlice.onboarding?.validated_at ?? null;
    const payload = buildPayload("auth_received_unverified", {
      missing_fields: [],
      last_validation_status: "skipped",
      last_validation_error: null,
      error_code: null,
      validated_at: validatedAt,
      verified_at: gqlSlice.onboarding?.verified_at ?? validatedAt,
    });
    await persistOnboarding(row.id, prevConfig, gqlSlice, payload);
    return {
      ok: true,
      persisted: true,
      sitePmsIntegrationId: row.id,
      integrationLane: CLOUDBEDS_GRAPHQL_DISCOVERY_V1_CONFIG_KEY,
      status: payload.status,
      missing_fields: payload.missing_fields ?? [],
      last_validation_status: payload.last_validation_status ?? "skipped",
      last_validation_error: payload.last_validation_error ?? null,
      validated_at: payload.validated_at ?? null,
      payload,
    };
  }

  const probe = await safeGraphqlIntrospectionProbe(url.toString(), authHeaders);
  const at = nowIso();

  if (!probe.ok) {
    const payload: CloudbedsGraphqlDiscoveryOnboardingPayload = {
      status: "validation_failed",
      missing_fields: [],
      validated_at: gqlSlice.onboarding?.validated_at ?? null,
      verified_at: gqlSlice.onboarding?.verified_at ?? null,
      verified_by: "system",
      last_validation: {
        ok: false,
        at,
        error_code: probe.error_code,
      },
      last_validation_status: "failed",
      last_validation_error: probe.error,
      next_action: "fix_endpoint_or_credentials",
    };
    await persistOnboarding(row.id, prevConfig, gqlSlice, payload);
    return {
      ok: true,
      persisted: true,
      sitePmsIntegrationId: row.id,
      integrationLane: CLOUDBEDS_GRAPHQL_DISCOVERY_V1_CONFIG_KEY,
      status: payload.status,
      missing_fields: payload.missing_fields ?? [],
      last_validation_status: "failed",
      last_validation_error: payload.last_validation_error ?? null,
      validated_at: payload.validated_at ?? null,
      payload,
    };
  }

  const payload: CloudbedsGraphqlDiscoveryOnboardingPayload = {
    status: "ready_for_discovery_ingest",
    missing_fields: [],
    validated_at: at,
    verified_at: at,
    verified_by: "system",
    last_validation: {
      ok: true,
      at,
      error_code: null,
    },
    last_validation_status: "success",
    last_validation_error: null,
    next_action: null,
  };
  await persistOnboarding(row.id, prevConfig, gqlSlice, payload);
  return {
    ok: true,
    persisted: true,
    sitePmsIntegrationId: row.id,
    integrationLane: CLOUDBEDS_GRAPHQL_DISCOVERY_V1_CONFIG_KEY,
    status: payload.status,
    missing_fields: [],
    last_validation_status: "success",
    last_validation_error: null,
    validated_at: at,
    payload,
  };
}
