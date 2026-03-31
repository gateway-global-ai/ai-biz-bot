/**
 * Governed onboarding state for Cloudbeds GraphQL discovery (tenant integration row).
 * Canonical prose: docs-governance/canonical/CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_V1.md
 * Persist under site_pms_integrations.config.cloudbeds_graphql_discovery_v1.onboarding
 */

/** JSON key under site_pms_integrations.config (single source of truth with validation writer). */
export const CLOUDBEDS_GRAPHQL_DISCOVERY_V1_CONFIG_KEY = "cloudbeds_graphql_discovery_v1" as const;

/** Deterministic onboarding states — gap detection and workflow progression. */
export const CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_STATES = [
  "not_started",
  "missing_http_url",
  "missing_auth",
  "pending_owner_consent",
  "pending_secure_auth_handoff",
  "auth_received_unverified",
  "validation_failed",
  "ready_for_discovery_ingest",
  "blocked",
] as const;

export type CloudbedsGraphqlDiscoveryOnboardingState =
  (typeof CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_STATES)[number];

/** Non-secret slice; secrets remain on site_pms_integrations columns (broker path). */
export interface CloudbedsGraphqlDiscoveryV1Config {
  http_url?: string;
  onboarding?: CloudbedsGraphqlDiscoveryOnboardingPayload;
}

/** Outcome of the last validate_integration_configuration run (single writer for validation). */
export type CloudbedsGraphqlDiscoveryLastValidationStatus = "success" | "failed" | "skipped";

export interface CloudbedsGraphqlDiscoveryOnboardingPayload {
  status: CloudbedsGraphqlDiscoveryOnboardingState;
  /** Gap analysis — stable field names (e.g. http_url, credential). */
  missing_fields?: string[];
  /** ISO 8601 — last successful end-to-end validation (HTTP probe succeeded). */
  validated_at?: string | null;
  /** ISO 8601 — last successful validation or verification (legacy alias; prefer validated_at for probe success). */
  verified_at?: string | null;
  /** How verification was attributed (no PII in free text — use enum). */
  verified_by?: "operator" | "system" | "owner" | null;
  last_validation?: {
    ok: boolean;
    at: string;
    error_code?: string | null;
  };
  last_validation_status?: CloudbedsGraphqlDiscoveryLastValidationStatus;
  /** Sanitized; never secrets or raw vendor bodies. */
  last_validation_error?: string | null;
  /** Operator intent only — e.g. integration_connect_token id reference in audit plane. */
  consent_recorded_at?: string | null;
  next_action?: string | null;
}

/** Single normalized reader output for get_integration_onboarding_status (no side effects). */
export interface CloudbedsGraphqlDiscoveryOnboardingDerived {
  isReadyForIngest: boolean;
  missingFields: string[];
  hasHttpUrl: boolean;
  hasOnboardingState: boolean;
  canBeginSecureAuthHandoff: boolean;
}

export interface CloudbedsGraphqlDiscoveryOnboardingStatusResult {
  siteConfigId: string;
  integrationPresent: boolean;
  lanePresent: boolean;
  /** Lane slice from config; null if key absent or not an object. */
  graphqlDiscoveryConfig: CloudbedsGraphqlDiscoveryV1Config | null;
  /** Onboarding state enum when valid; null if missing or invalid. */
  onboarding: CloudbedsGraphqlDiscoveryOnboardingState | null;
  /** Full onboarding payload when `hasOnboardingState`; otherwise null. */
  onboardingPayload: CloudbedsGraphqlDiscoveryOnboardingPayload | null;
  derived: CloudbedsGraphqlDiscoveryOnboardingDerived;
}

/** SMS engagement result — no secrets; `connectUrl` never echoed in API JSON (only sid / flags). */
export type SendCloudbedsGraphqlDiscoveryOnboardingSmsTemplateKey =
  | "cloudbeds_gql_discovery_invitation"
  | "cloudbeds_gql_discovery_reminder";

export type SendCloudbedsGraphqlDiscoveryOnboardingSmsSuccess = {
  ok: true;
  siteConfigId: string;
  smsSent: boolean;
  recipient: string | null;
  templateKey: SendCloudbedsGraphqlDiscoveryOnboardingSmsTemplateKey;
  onboardingStatus: CloudbedsGraphqlDiscoveryOnboardingState | null;
  connectUrlIncluded: boolean;
  nextAction: string | null;
  /** Twilio SID when dispatched */
  messageSid?: string | null;
  dryRun?: boolean;
};

export type SendCloudbedsGraphqlDiscoveryOnboardingSmsFailure = {
  ok: false;
  siteConfigId: string;
  smsSent: false;
  code:
    | "INVALID_INPUT"
    | "MISSING_ACTOR_CONTEXT"
    | "NO_INTEGRATION"
    | "NO_RECIPIENT"
    | "SKIPPED_ALREADY_READY"
    | "SKIPPED_BLOCKED"
    | "HANDOFF_FAILED"
    | "SMS_DISPATCH_FAILED";
  message: string;
  onboardingStatus: CloudbedsGraphqlDiscoveryOnboardingState | null;
  templateKey?: SendCloudbedsGraphqlDiscoveryOnboardingSmsTemplateKey;
  connectUrlIncluded?: boolean;
};

export type SendCloudbedsGraphqlDiscoveryOnboardingSmsResult =
  | SendCloudbedsGraphqlDiscoveryOnboardingSmsSuccess
  | SendCloudbedsGraphqlDiscoveryOnboardingSmsFailure;
