/**
 * Canonical integration execution outcomes — broker, readiness reports, logs, UI.
 * @see docs-governance/canonical/INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md
 */

import type { SitePmsIntegration } from "./schema";

export type IntegrationExecutionBlock =
  | { code: "AUTH_MISSING"; vendorId: string; siteConfigId: string }
  | { code: "SCOPE_MISSING"; capabilityId: string; requiredScopeIds: string[]; grantedScopeIds: string[] }
  | {
      code: "VERSION_LANE_MISMATCH";
      capabilityId: string;
      allowedVersionLanes: string[];
      effectivePropertyLane: string | null;
    }
  | { code: "INSTALL_REVOKED"; vendorId: string; siteConfigId: string }
  | {
      code: "CONNECTION_DEGRADED";
      vendorId: string;
      siteConfigId: string;
      installPosture: string;
    }
  | { code: "LANE_BLOCKED"; vendorId: string; siteConfigId: string; authLane: string }
  | { code: "CAPABILITY_NOT_REGISTERED"; capabilityId: string; vendorId: string }
  | { code: "VENDOR_UNSUPPORTED"; vendorId: string };

export type IntegrationExecutionOk = {
  ok: true;
  headers: Record<string, string>;
  pmsRow: SitePmsIntegration;
};

export type IntegrationExecutionResult =
  | IntegrationExecutionOk
  | { ok: false; block: IntegrationExecutionBlock };

export function integrationBlockToSafeMessage(block: IntegrationExecutionBlock): string {
  switch (block.code) {
    case "AUTH_MISSING":
      return "Cloudbeds is not connected for this property (no API credentials).";
    case "SCOPE_MISSING":
      return "This action requires API permissions that are not granted for this property.";
    case "VERSION_LANE_MISMATCH":
      return "Cloudbeds API version for this property does not match this capability.";
    case "INSTALL_REVOKED":
      return "The Cloudbeds integration was revoked for this property.";
    case "CONNECTION_DEGRADED":
      return "The Cloudbeds integration is not ready (connection degraded or incomplete).";
    case "LANE_BLOCKED":
      return "This authentication method is not allowed for Cloudbeds on this property.";
    case "CAPABILITY_NOT_REGISTERED":
      return "This integration capability is not registered for the platform.";
    case "VENDOR_UNSUPPORTED":
      return "This vendor is not supported by the integration broker yet.";
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}
