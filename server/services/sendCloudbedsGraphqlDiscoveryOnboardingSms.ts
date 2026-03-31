/**
 * Compliant onboarding SMS for Cloudbeds GraphQL discovery — Sovereign SMS Router only.
 * Uses status reader + secure handoff mint; never puts secrets or raw tokens in SMS body
 * (only HTTPS connect URL as a single link line).
 *
 * Intent: PLATFORM_CARE — operational platform → business operator (non-marketing pipe).
 */
import { eq } from "drizzle-orm";
import {
  beginCloudbedsIntegrationAuthHandoff,
  type BeginCloudbedsIntegrationAuthHandoffEligibilityMode,
} from "./beginCloudbedsIntegrationAuthHandoff";
import {
  insertIntegrationOnboardingSmsAudit,
  type IntegrationOnboardingSmsAuditInsert,
  type RecipientResolutionSource,
} from "./integrationOnboardingSmsAudit";
import { getCloudbedsGraphqlDiscoveryOnboardingStatus } from "./getCloudbedsGraphqlDiscoveryOnboardingStatus";
import { dispatchSms, SmsIntent } from "./smsRouter";
import { db } from "../db";
import { customerAccounts, siteConfigs } from "@shared/schema";
import type {
  CloudbedsGraphqlDiscoveryOnboardingState,
  SendCloudbedsGraphqlDiscoveryOnboardingSmsResult,
  SendCloudbedsGraphqlDiscoveryOnboardingSmsTemplateKey,
} from "@shared/cloudbedsGraphqlDiscoveryOnboarding";

function normalizeToE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  return `+${digits}`;
}

async function resolveOperatorPhoneE164WithSource(
  siteConfigId: string,
  override?: string | null,
): Promise<{ phone: string | null; source: RecipientResolutionSource }> {
  const o = override?.trim();
  if (o) {
    return { phone: normalizeToE164(o), source: "override" };
  }

  const [site] = await db
    .select({
      assignedToPhone: siteConfigs.assignedToPhone,
      ownerId: siteConfigs.ownerId,
    })
    .from(siteConfigs)
    .where(eq(siteConfigs.id, siteConfigId))
    .limit(1);

  if (!site) {
    return { phone: null, source: "none" };
  }
  if (site.assignedToPhone?.trim()) {
    return { phone: normalizeToE164(site.assignedToPhone), source: "assigned_to_phone" };
  }
  if (site.ownerId) {
    const [acct] = await db
      .select({ phone: customerAccounts.phone })
      .from(customerAccounts)
      .where(eq(customerAccounts.id, site.ownerId))
      .limit(1);
    if (acct?.phone?.trim()) {
      return { phone: normalizeToE164(acct.phone), source: "owner_account" };
    }
  }
  return { phone: null, source: "none" };
}

function businessNameFromSite(name: string | null | undefined): string {
  const n = name?.trim();
  return n && n.length > 0 ? n : "Your property";
}

/**
 * Whether we should send an SMS with a secure connect URL (mint handoff).
 * Does not run validation or HTTP probes.
 */
export function shouldSendConnectUrlForOnboardingState(
  status: CloudbedsGraphqlDiscoveryOnboardingState | null,
): boolean {
  if (status === "ready_for_discovery_ingest" || status === "blocked") {
    return false;
  }
  return true;
}

function buildBody(params: {
  templateKey: SendCloudbedsGraphqlDiscoveryOnboardingSmsTemplateKey;
  businessName: string;
  connectUrl: string;
}): string {
  const { businessName, connectUrl } = params;
  if (params.templateKey === "cloudbeds_gql_discovery_reminder") {
    return `Reminder: ${businessName} — complete Cloudbeds setup for GraphQL discovery (read-only). Open: ${connectUrl}`;
  }
  return `${businessName}: Cloudbeds GraphQL discovery setup — connect your account (read-only mapping). Open: ${connectUrl}`;
}

async function persistAudit(
  actorAdminUserId: string | undefined,
  row: Omit<IntegrationOnboardingSmsAuditInsert, "actorAdminUserId">,
): Promise<void> {
  if (!actorAdminUserId || !row.siteConfigId) return;
  try {
    await insertIntegrationOnboardingSmsAudit({ ...row, actorAdminUserId });
  } catch (e) {
    console.error("[sendCloudbedsGraphqlDiscoveryOnboardingSms] audit insert failed:", e);
  }
}

export type SendCloudbedsGraphqlDiscoveryOnboardingSmsInput = {
  siteConfigId: string;
  /** Required for append-only audit when invoked from operator routes. */
  actorAdminUserId?: string;
  /** Override recipient; otherwise site assignedToPhone or owner account phone. */
  toE164?: string | null;
  variant?: "invitation" | "reminder";
  /** Default graphql_discovery_onboarding — pass cloudbeds_row_only only for ops. */
  eligibilityMode?: BeginCloudbedsIntegrationAuthHandoffEligibilityMode;
  /** When true, compute message and handoff but do not call Twilio (tests). */
  dryRun?: boolean;
};

/**
 * Send integration onboarding SMS via Sovereign SMS Router (PLATFORM_CARE).
 */
export async function sendCloudbedsGraphqlDiscoveryOnboardingSms(
  input: SendCloudbedsGraphqlDiscoveryOnboardingSmsInput,
): Promise<SendCloudbedsGraphqlDiscoveryOnboardingSmsResult> {
  const eligibilityMode = input.eligibilityMode ?? "graphql_discovery_onboarding";
  const requestedVariant = input.variant === "reminder" ? "reminder" : "invitation";
  const providedToE164 = input.toE164?.trim() || null;
  const dryRun = input.dryRun === true;
  const actor = input.actorAdminUserId;

  const siteConfigId = input.siteConfigId?.trim();
  if (!siteConfigId) {
    const result: SendCloudbedsGraphqlDiscoveryOnboardingSmsResult = {
      ok: false,
      code: "INVALID_INPUT",
      message: "siteConfigId is required",
      siteConfigId: "",
      smsSent: false,
      onboardingStatus: null,
    };
    await persistAudit(actor, {
      siteConfigId: "",
      requestedVariant,
      providedToE164,
      recipientResolutionSource: "none",
      finalRecipientE164: null,
      eligibilityMode,
      outcomeCode: "INVALID_INPUT",
      suppressionReason: "invalid_input",
      connectTokenId: null,
      twilioMessageSid: null,
      dispatchOk: null,
      dryRun,
    });
    return result;
  }

  // Option C (INTEGRATION_GOVERNANCE_INVENTORY_V1 §6): real sends require admin actor; dry-run may omit for proof.
  const actorTrimmed = actor?.trim();
  if (!dryRun && !actorTrimmed) {
    return {
      ok: false,
      code: "MISSING_ACTOR_CONTEXT",
      message:
        "actorAdminUserId is required for non-dry-run integration onboarding SMS (admin session must identify the operator).",
      siteConfigId,
      smsSent: false,
      onboardingStatus: null,
    };
  }
  if (dryRun && !actorTrimmed) {
    console.warn(
      "[sendCloudbedsGraphqlDiscoveryOnboardingSms] dryRun without actorAdminUserId: proof path only; no audit row (see INTEGRATION_GOVERNANCE_INVENTORY_V1 §6).",
    );
  }

  const statusSnapshot = await getCloudbedsGraphqlDiscoveryOnboardingStatus(siteConfigId);
  const onboardingStatus = statusSnapshot.onboarding;

  if (!statusSnapshot.integrationPresent) {
    const result: SendCloudbedsGraphqlDiscoveryOnboardingSmsResult = {
      ok: false,
      code: "NO_INTEGRATION",
      message: "No Cloudbeds integration row for this site",
      siteConfigId,
      smsSent: false,
      onboardingStatus,
    };
    await persistAudit(actor, {
      siteConfigId,
      requestedVariant,
      providedToE164,
      recipientResolutionSource: "none",
      finalRecipientE164: null,
      eligibilityMode,
      outcomeCode: "NO_INTEGRATION",
      suppressionReason: "no_cloudbeds_row",
      connectTokenId: null,
      twilioMessageSid: null,
      dispatchOk: null,
      dryRun,
    });
    return result;
  }

  if (onboardingStatus === "ready_for_discovery_ingest") {
    const result: SendCloudbedsGraphqlDiscoveryOnboardingSmsResult = {
      ok: false,
      code: "SKIPPED_ALREADY_READY",
      message: "Onboarding already ready for discovery ingest; SMS not sent",
      siteConfigId,
      smsSent: false,
      onboardingStatus,
    };
    await persistAudit(actor, {
      siteConfigId,
      requestedVariant,
      providedToE164,
      recipientResolutionSource: "none",
      finalRecipientE164: null,
      eligibilityMode,
      outcomeCode: "SKIPPED_ALREADY_READY",
      suppressionReason: "already_ready_for_discovery_ingest",
      connectTokenId: null,
      twilioMessageSid: null,
      dispatchOk: null,
      dryRun,
    });
    return result;
  }

  if (onboardingStatus === "blocked") {
    const result: SendCloudbedsGraphqlDiscoveryOnboardingSmsResult = {
      ok: false,
      code: "SKIPPED_BLOCKED",
      message: "Integration blocked; send SMS manually after resolution",
      siteConfigId,
      smsSent: false,
      onboardingStatus,
    };
    await persistAudit(actor, {
      siteConfigId,
      requestedVariant,
      providedToE164,
      recipientResolutionSource: "none",
      finalRecipientE164: null,
      eligibilityMode,
      outcomeCode: "SKIPPED_BLOCKED",
      suppressionReason: "install_blocked",
      connectTokenId: null,
      twilioMessageSid: null,
      dispatchOk: null,
      dryRun,
    });
    return result;
  }

  const { phone: to, source: recipientSource } = await resolveOperatorPhoneE164WithSource(
    siteConfigId,
    input.toE164,
  );

  if (!to) {
    const result: SendCloudbedsGraphqlDiscoveryOnboardingSmsResult = {
      ok: false,
      code: "NO_RECIPIENT",
      message: "No operator phone (set site assignedToPhone, owner account phone, or pass toE164)",
      siteConfigId,
      smsSent: false,
      onboardingStatus,
    };
    await persistAudit(actor, {
      siteConfigId,
      requestedVariant,
      providedToE164,
      recipientResolutionSource: recipientSource,
      finalRecipientE164: null,
      eligibilityMode,
      outcomeCode: "NO_RECIPIENT",
      suppressionReason: "no_resolved_recipient",
      connectTokenId: null,
      twilioMessageSid: null,
      dispatchOk: null,
      dryRun,
    });
    return result;
  }

  const includeUrl = shouldSendConnectUrlForOnboardingState(onboardingStatus);
  const templateKey: SendCloudbedsGraphqlDiscoveryOnboardingSmsTemplateKey =
    input.variant === "reminder" ? "cloudbeds_gql_discovery_reminder" : "cloudbeds_gql_discovery_invitation";

  const [siteRow] = await db
    .select({ name: siteConfigs.name })
    .from(siteConfigs)
    .where(eq(siteConfigs.id, siteConfigId))
    .limit(1);
  const businessName = businessNameFromSite(siteRow?.name);

  let connectUrl: string | undefined;
  let connectTokenId: string | null = null;

  if (includeUrl) {
    const handoff = await beginCloudbedsIntegrationAuthHandoff({
      siteConfigId,
      connectLane: "oauth",
      createdBy: "sendCloudbedsGraphqlDiscoveryOnboardingSms",
      eligibilityMode,
      allowWhenAlreadyReady: false,
      phoneE164: to,
    });
    if (!handoff.ok) {
      const result: SendCloudbedsGraphqlDiscoveryOnboardingSmsResult = {
        ok: false,
        code: "HANDOFF_FAILED",
        message: handoff.message,
        siteConfigId,
        smsSent: false,
        onboardingStatus,
        templateKey,
        connectUrlIncluded: true,
      };
      await persistAudit(actor, {
        siteConfigId,
        requestedVariant,
        providedToE164,
        recipientResolutionSource: recipientSource,
        finalRecipientE164: to,
        eligibilityMode,
        outcomeCode: "HANDOFF_FAILED",
        suppressionReason: handoff.code,
        connectTokenId: null,
        twilioMessageSid: null,
        dispatchOk: null,
        dryRun,
      });
      return result;
    }
    connectUrl = handoff.connectUrl;
    connectTokenId = handoff.tokenId;
  }

  if (!includeUrl || !connectUrl) {
    const result: SendCloudbedsGraphqlDiscoveryOnboardingSmsResult = {
      ok: false,
      code: "HANDOFF_FAILED",
      message: "Connect URL could not be prepared",
      siteConfigId,
      smsSent: false,
      onboardingStatus,
      templateKey,
      connectUrlIncluded: false,
    };
    await persistAudit(actor, {
      siteConfigId,
      requestedVariant,
      providedToE164,
      recipientResolutionSource: recipientSource,
      finalRecipientE164: to,
      eligibilityMode,
      outcomeCode: "HANDOFF_FAILED",
      suppressionReason: "connect_url_not_prepared",
      connectTokenId,
      twilioMessageSid: null,
      dispatchOk: null,
      dryRun,
    });
    return result;
  }

  const body = buildBody({ templateKey, businessName, connectUrl });

  if (dryRun) {
    const result: SendCloudbedsGraphqlDiscoveryOnboardingSmsResult = {
      ok: true,
      siteConfigId,
      smsSent: false,
      recipient: to,
      templateKey,
      onboardingStatus,
      connectUrlIncluded: true,
      nextAction: "dry_run_no_dispatch",
      dryRun: true,
      messageSid: null,
    };
    await persistAudit(actor, {
      siteConfigId,
      requestedVariant,
      providedToE164,
      recipientResolutionSource: recipientSource,
      finalRecipientE164: to,
      eligibilityMode,
      outcomeCode: "DRY_RUN_OK",
      suppressionReason: null,
      connectTokenId,
      twilioMessageSid: null,
      dispatchOk: null,
      dryRun: true,
    });
    return result;
  }

  const sent = await dispatchSms({
    to,
    body,
    intent: SmsIntent.PLATFORM_CARE,
    siteConfigId,
  });

  if (!sent.ok) {
    const result: SendCloudbedsGraphqlDiscoveryOnboardingSmsResult = {
      ok: false,
      code: "SMS_DISPATCH_FAILED",
      message: sent.message ?? "SMS dispatch failed",
      siteConfigId,
      smsSent: false,
      onboardingStatus,
      templateKey,
      connectUrlIncluded: true,
    };
    await persistAudit(actor, {
      siteConfigId,
      requestedVariant,
      providedToE164,
      recipientResolutionSource: recipientSource,
      finalRecipientE164: to,
      eligibilityMode,
      outcomeCode: "SMS_DISPATCH_FAILED",
      suppressionReason: sent.reason ?? "dispatch_failed",
      connectTokenId,
      twilioMessageSid: null,
      dispatchOk: false,
      dryRun: false,
    });
    return result;
  }

  const result: SendCloudbedsGraphqlDiscoveryOnboardingSmsResult = {
    ok: true,
    siteConfigId,
    smsSent: true,
    recipient: to,
    templateKey,
    onboardingStatus,
    connectUrlIncluded: true,
    nextAction: null,
    messageSid: sent.sid,
  };
  await persistAudit(actor, {
    siteConfigId,
    requestedVariant,
    providedToE164,
    recipientResolutionSource: recipientSource,
    finalRecipientE164: to,
    eligibilityMode,
    outcomeCode: "SMS_DISPATCHED",
    suppressionReason: null,
    connectTokenId,
    twilioMessageSid: sent.sid,
    dispatchOk: true,
    dryRun: false,
  });
  return result;
}
