/**
 * Shared broker entry for Cloudbeds HTTP callers (routes, cloudbedsGetJson with capabilityId).
 * Kept separate from cloudbedsApi static graph to avoid import cycles with integrationCredentialBroker.
 */
import { getExecutionContext } from "./integrationCredentialBroker.js";
import { integrationBlockToSafeMessage } from "@shared/integrationExecution";

export async function cloudbedsHeadersForCapability(
  siteConfigId: string,
  capabilityId: string,
): Promise<Record<string, string>> {
  const r = await getExecutionContext({ siteConfigId, vendorId: "cloudbeds", capabilityId });
  if (r.ok) return r.headers;
  throw new Error(integrationBlockToSafeMessage(r.block));
}
