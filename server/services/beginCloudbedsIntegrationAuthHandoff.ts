/**
 * Secure operator auth handoff for Cloudbeds — mint integration connect token + canonical connect URL.
 * Does not send SMS. Does not call validate/get with side effects beyond mint.
 *
 * @see INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md
 * @see server/services/integrationConnectTokens.ts
 */
import {
  mintIntegrationConnectToken,
  type IntegrationConnectLane,
  type MintIntegrationConnectTokenInput,
} from "./integrationConnectTokens";
import { loadCloudbedsPmsRow } from "./cloudbedsApi";
import { getCloudbedsGraphqlDiscoveryOnboardingStatus } from "./getCloudbedsGraphqlDiscoveryOnboardingStatus";

export const INTEGRATION_CONNECT_LOGICAL_ROUTE_ID = "operator.integration.connect" as const;
export const INTEGRATION_CONNECT_VIEW_ID = "integration_connect_surface" as const;
export const INTEGRATION_CONNECT_BROWSER_ADAPTER_PATH = "/connect/cloudbeds" as const;

export type BeginCloudbedsIntegrationAuthHandoffEligibilityMode =
  | "cloudbeds_row_only"
  | "graphql_discovery_onboarding";

export type BeginCloudbedsIntegrationAuthHandoffInput = {
  siteConfigId: string;
  connectLane?: IntegrationConnectLane;
  phoneE164?: string | null;
  createdBy?: string | null;
  /** When true, mint even if GraphQL discovery onboarding reports ready_for_discovery_ingest. */
  allowWhenAlreadyReady?: boolean;
  /** Default graphql_discovery_onboarding — uses status reader to block redundant handoff when already ready. */
  eligibilityMode?: BeginCloudbedsIntegrationAuthHandoffEligibilityMode;
};

export type BeginCloudbedsIntegrationAuthHandoffErrorCode =
  | "INVALID_INPUT"
  | "NO_CLOUDBEDS_ROW"
  | "APP_URL_NOT_CONFIGURED"
  | "ALREADY_READY"
  | "CONNECT_TOKEN_SECRET_MISSING";

export type BeginCloudbedsIntegrationAuthHandoffResult =
  | {
      ok: true;
      siteConfigId: string;
      vendorId: "cloudbeds";
      connectLane: IntegrationConnectLane;
      tokenId: string;
      expiresAt: Date;
      /** Absolute URL with ?token= — single distribution surface for operators. */
      connectUrl: string;
      /** POST JSON { token } — for API clients; browser uses connectUrl. */
      exchangePostUrl: string;
      logicalRouteId: typeof INTEGRATION_CONNECT_LOGICAL_ROUTE_ID;
      viewId: typeof INTEGRATION_CONNECT_VIEW_ID;
      browserAdapterPath: typeof INTEGRATION_CONNECT_BROWSER_ADAPTER_PATH;
      /** Trusted callers only — never log. Strip from HTTP JSON responses. */
      plainToken: string;
    }
  | {
      ok: false;
      code: BeginCloudbedsIntegrationAuthHandoffErrorCode;
      message: string;
    };

function publicAppBase(): string {
  const raw = process.env.APP_URL?.trim() || process.env.CLIENT_URL?.trim() || "";
  return raw.replace(/\/$/, "");
}

/**
 * Mint a single-use connect token and build the canonical `/connect/cloudbeds?token=` URL.
 */
export async function beginCloudbedsIntegrationAuthHandoff(
  input: BeginCloudbedsIntegrationAuthHandoffInput,
): Promise<BeginCloudbedsIntegrationAuthHandoffResult> {
  const siteConfigId = input.siteConfigId?.trim();
  if (!siteConfigId) {
    return { ok: false, code: "INVALID_INPUT", message: "siteConfigId is required" };
  }

  const connectLane: IntegrationConnectLane = input.connectLane === "api_key" ? "api_key" : "oauth";
  const mode = input.eligibilityMode ?? "graphql_discovery_onboarding";

  if (mode === "graphql_discovery_onboarding") {
    const st = await getCloudbedsGraphqlDiscoveryOnboardingStatus(siteConfigId);
    if (!st.integrationPresent) {
      return {
        ok: false,
        code: "NO_CLOUDBEDS_ROW",
        message: "No Cloudbeds site_pms_integrations row for this site_config_id",
      };
    }
    if (st.derived.isReadyForIngest && !input.allowWhenAlreadyReady) {
      return {
        ok: false,
        code: "ALREADY_READY",
        message:
          "GraphQL discovery onboarding is already ready for ingest. Pass allowWhenAlreadyReady to mint anyway.",
      };
    }
  } else {
    const row = await loadCloudbedsPmsRow(siteConfigId);
    if (!row) {
      return {
        ok: false,
        code: "NO_CLOUDBEDS_ROW",
        message: "No Cloudbeds site_pms_integrations row for this site_config_id",
      };
    }
  }

  const base = publicAppBase();
  if (!base) {
    return {
      ok: false,
      code: "APP_URL_NOT_CONFIGURED",
      message: "Set APP_URL (or CLIENT_URL) to build an absolute connect URL for operators",
    };
  }

  const mintInput: MintIntegrationConnectTokenInput = {
    siteConfigId,
    vendorId: "cloudbeds",
    connectLane,
    phoneE164: input.phoneE164,
    createdBy: input.createdBy ?? "beginCloudbedsIntegrationAuthHandoff",
  };

  let minted: { id: string; plainToken: string; expiresAt: Date };
  try {
    minted = await mintIntegrationConnectToken(mintInput);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("INTEGRATION_CONNECT_TOKEN_SECRET")) {
      return {
        ok: false,
        code: "CONNECT_TOKEN_SECRET_MISSING",
        message: "INTEGRATION_CONNECT_TOKEN_SECRET is not configured",
      };
    }
    throw e;
  }

  const tokenQ = encodeURIComponent(minted.plainToken);
  const connectUrl = `${base}${INTEGRATION_CONNECT_BROWSER_ADAPTER_PATH}?token=${tokenQ}`;
  const exchangePostUrl = `${base}/api/integration/connect/exchange`;

  return {
    ok: true,
    siteConfigId,
    vendorId: "cloudbeds",
    connectLane,
    tokenId: minted.id,
    expiresAt: minted.expiresAt,
    connectUrl,
    exchangePostUrl,
    logicalRouteId: INTEGRATION_CONNECT_LOGICAL_ROUTE_ID,
    viewId: INTEGRATION_CONNECT_VIEW_ID,
    browserAdapterPath: INTEGRATION_CONNECT_BROWSER_ADAPTER_PATH,
    plainToken: minted.plainToken,
  };
}
