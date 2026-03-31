/**
 * Append-only persistence for integration onboarding SMS attempts.
 */
import { db } from "../db";
import { integrationOnboardingSmsAudit } from "@shared/schema";

export type RecipientResolutionSource = "override" | "assigned_to_phone" | "owner_account" | "none";

export type IntegrationOnboardingSmsAuditInsert = {
  actorAdminUserId: string;
  siteConfigId: string;
  integrationKey?: string;
  requestedVariant: "invitation" | "reminder";
  providedToE164: string | null;
  recipientResolutionSource: RecipientResolutionSource;
  finalRecipientE164: string | null;
  eligibilityMode: string;
  outcomeCode: string;
  suppressionReason: string | null;
  connectTokenId: string | null;
  twilioMessageSid: string | null;
  dispatchOk: boolean | null;
  dryRun: boolean;
};

export async function insertIntegrationOnboardingSmsAudit(
  row: IntegrationOnboardingSmsAuditInsert,
): Promise<void> {
  await db.insert(integrationOnboardingSmsAudit).values({
    actorAdminUserId: row.actorAdminUserId,
    siteConfigId: row.siteConfigId,
    integrationKey: row.integrationKey ?? "cloudbeds_graphql_discovery",
    requestedVariant: row.requestedVariant,
    providedToE164: row.providedToE164,
    recipientResolutionSource: row.recipientResolutionSource,
    finalRecipientE164: row.finalRecipientE164,
    eligibilityMode: row.eligibilityMode,
    outcomeCode: row.outcomeCode,
    suppressionReason: row.suppressionReason,
    connectTokenId: row.connectTokenId,
    twilioMessageSid: row.twilioMessageSid,
    dispatchOk: row.dispatchOk,
    dryRun: row.dryRun,
  });
}
