/**
 * Single normalized reader for Cloudbeds GraphQL discovery onboarding (read-only).
 * Does not call validateCloudbedsGraphqlDiscoveryConfiguration, broker, HTTP, SMS, or mutate DB.
 *
 * @see validateCloudbedsGraphqlDiscoveryConfiguration.ts (validation writer)
 */
import {
  CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_STATES,
  CLOUDBEDS_GRAPHQL_DISCOVERY_V1_CONFIG_KEY,
  type CloudbedsGraphqlDiscoveryOnboardingDerived,
  type CloudbedsGraphqlDiscoveryOnboardingPayload,
  type CloudbedsGraphqlDiscoveryOnboardingState,
  type CloudbedsGraphqlDiscoveryOnboardingStatusResult,
  type CloudbedsGraphqlDiscoveryV1Config,
} from "@shared/cloudbedsGraphqlDiscoveryOnboarding";
import { loadCloudbedsPmsRow } from "./cloudbedsApi";

const STATE_SET = new Set<string>(CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_STATES);

function normalizeMissingFields(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

function isValidState(s: string): s is CloudbedsGraphqlDiscoveryOnboardingState {
  return STATE_SET.has(s);
}

/**
 * Deterministic derived flags for agent / UI / SMS — no inference beyond rules below.
 */
export function deriveCloudbedsGraphqlDiscoveryOnboardingSummary(
  graphqlDiscoveryConfig: CloudbedsGraphqlDiscoveryV1Config | null,
): CloudbedsGraphqlDiscoveryOnboardingDerived {
  const ob = graphqlDiscoveryConfig?.onboarding;
  const hasOnboardingState = ob != null && typeof ob === "object";
  const status =
    hasOnboardingState && typeof ob.status === "string" && isValidState(ob.status) ? ob.status : null;
  const missingFields = normalizeMissingFields(ob?.missing_fields);

  const hasHttpUrl = !!(graphqlDiscoveryConfig?.http_url?.trim());

  const isReadyForIngest = status === "ready_for_discovery_ingest";

  const canBeginSecureAuthHandoff =
    status === "missing_auth" || status === "pending_secure_auth_handoff";

  return {
    isReadyForIngest,
    missingFields,
    hasHttpUrl,
    hasOnboardingState,
    canBeginSecureAuthHandoff,
  };
}

function normalizeOnboardingPayload(
  raw: unknown,
): CloudbedsGraphqlDiscoveryOnboardingPayload | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.status !== "string" || !isValidState(o.status)) return null;
  return {
    ...o,
    status: o.status,
    missing_fields: normalizeMissingFields(o.missing_fields),
  } as CloudbedsGraphqlDiscoveryOnboardingPayload;
}

function normalizeLaneConfig(raw: unknown): CloudbedsGraphqlDiscoveryV1Config | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const http_url = typeof o.http_url === "string" ? o.http_url : undefined;
  const onboardingRaw = o.onboarding;
  const onboarding = normalizeOnboardingPayload(onboardingRaw);
  const out: CloudbedsGraphqlDiscoveryV1Config = {};
  if (http_url !== undefined) out.http_url = http_url;
  if (onboarding) out.onboarding = onboarding;
  return out;
}

function emptyResult(siteConfigId: string): CloudbedsGraphqlDiscoveryOnboardingStatusResult {
  return {
    siteConfigId,
    integrationPresent: false,
    lanePresent: false,
    graphqlDiscoveryConfig: null,
    onboarding: null,
    onboardingPayload: null,
    derived: {
      isReadyForIngest: false,
      missingFields: [],
      hasHttpUrl: false,
      hasOnboardingState: false,
      canBeginSecureAuthHandoff: false,
    },
  };
}

/**
 * Read normalized GraphQL discovery onboarding status for a site (Cloudbeds PMS row).
 */
export async function getCloudbedsGraphqlDiscoveryOnboardingStatus(
  siteConfigId: string,
): Promise<CloudbedsGraphqlDiscoveryOnboardingStatusResult> {
  const id = siteConfigId?.trim();
  if (!id) {
    return emptyResult("");
  }

  const row = await loadCloudbedsPmsRow(id);
  if (!row) {
    return emptyResult(id);
  }

  const cfg =
    row.config && typeof row.config === "object" ? (row.config as Record<string, unknown>) : {};
  const laneRaw = cfg[CLOUDBEDS_GRAPHQL_DISCOVERY_V1_CONFIG_KEY];
  const lanePresent =
    laneRaw !== undefined &&
    laneRaw !== null &&
    typeof laneRaw === "object" &&
    !Array.isArray(laneRaw);
  const graphqlDiscoveryConfig = lanePresent ? normalizeLaneConfig(laneRaw) : null;

  const onboardingPayload = graphqlDiscoveryConfig?.onboarding ?? null;
  const onboarding = onboardingPayload?.status ?? null;

  const derived = deriveCloudbedsGraphqlDiscoveryOnboardingSummary(graphqlDiscoveryConfig);

  return {
    siteConfigId: id,
    integrationPresent: true,
    lanePresent: graphqlDiscoveryConfig != null,
    graphqlDiscoveryConfig,
    onboarding,
    onboardingPayload,
    derived,
  };
}
