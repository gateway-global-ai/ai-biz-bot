/**
 * server/routes/onboardingRoutes.ts
 *
 * Onboarding & Compliance Gateway — MSA v1.0.0 / v1.1.0 Reseller Addendum
 *
 * Account type routing:
 *   DIRECT      → single MSA signature (v1.0.0), standard 30-day grace period
 *   RESELLER    → single MSA signature (v1.1.0), same grace logic
 *   SUB_ACCOUNT → dual-signature gate: Reseller pre-signs first (resellerMsaConfirmedAt),
 *                 then end-user signs (msaAcceptedAt). activationDate anchored only after
 *                 both signatures are present.
 *
 * CEO mandates enforced here:
 *   - Governance Sync: msaVersion hash is SHA-256 of "MSA_v1.0.0" or "MSA_v1.1.0" based on accountType
 *   - Stateless Integrity: all error paths are caught; no unhandled promise rejections; no logging noise
 *   - A2P Responsibility: SUB_ACCOUNT compliance stores a2pContentProvider (§1.5 carrier audit field)
 *
 * Source of truth: /.system_design/rules.md, pricing_v1.yaml, skills/billing_engine.json
 */

import { Router, Request, Response } from "express";
import { createHash } from "crypto";
import { z } from "zod";
import { requireAuth } from "../auth";
import { storage } from "../storage";

const router = Router();

// ── Constants sourced from pricing_v1.yaml ───────────────────────────────────
const GRACE_PERIOD_DAYS = 30;
const MSA_VERSION_DIRECT   = "1.0.0";  // DIRECT accounts sign the base MSA
const MSA_VERSION_RESELLER = "1.1.0";  // RESELLER and SUB_ACCOUNT sign the Addendum

function msaVersionHash(version: string): string {
  return createHash("sha256").update(`MSA_v${version}`).digest("hex");
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const acceptMsaDirectSchema = z.object({
  msaVersion: z.enum([MSA_VERSION_DIRECT, MSA_VERSION_RESELLER]),
  scrollConfirmed: z.literal(true),
});

// Reseller pre-signing on behalf of a SUB_ACCOUNT
const resellerPresignSchema = z.object({
  onBehalfOf: z.literal(true),
  subAccountId: z.string().min(1),
});

const physicalAddressSchema = z.object({
  street:  z.string().min(1),
  city:    z.string().min(1),
  state:   z.string().min(1),
  zip:     z.string().min(1),
  country: z.string().min(1),
});

const complianceBaseSchema = z.object({
  entityType:   z.enum(["Corporate", "Individual"]),
  businessName: z.string().min(1),
  ein:          z.string().regex(/^\d{2}-\d{7}$/, "EIN must be in the format XX-XXXXXXX"),
  address:      physicalAddressSchema,
  smsUseCase:   z.string().min(10, "Please describe your SMS use case (min 10 characters)"),
});

// SUB_ACCOUNT compliance requires the Content Provider designation (MSA v1.1.0 §1.5)
const complianceSubAccountSchema = complianceBaseSchema.extend({
  contentProviderName: z.string().min(1, "Content Provider name is required for sub-accounts"),
  contentProviderAcknowledged: z.literal(true, {
    errorMap: () => ({ message: "You must acknowledge the Content Provider designation for carrier compliance." }),
  }),
});

// ── GET /api/onboarding/status ───────────────────────────────────────────────

router.get("/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;
    const account = await storage.getCustomerAccountById(session.adminUserId);

    if (!account) {
      res.status(404).json({ error: "Customer account not found" });
      return;
    }

    const now = new Date();
    let trialDaysRemaining: number | null = null;
    let trialDaysElapsed: number | null = null;

    if ((account as any).trialEndDate && (account as any).activationDate) {
      const msRemaining = (account as any).trialEndDate.getTime() - now.getTime();
      trialDaysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
      const msElapsed = now.getTime() - (account as any).activationDate.getTime();
      trialDaysElapsed = Math.min(GRACE_PERIOD_DAYS, Math.floor(msElapsed / (1000 * 60 * 60 * 24)));
    }

    res.json({
      onboardingStatus:          (account as any).onboardingStatus,
      complianceStatus:          (account as any).complianceStatus,
      accountType:               (account as any).accountType ?? "DIRECT",
      parentAccountId:           (account as any).parentAccountId ?? null,
      activationDate:            (account as any).activationDate ?? null,
      trialEndDate:              (account as any).trialEndDate ?? null,
      trialDaysRemaining,
      trialDaysElapsed,
      gracePeriodDays:           GRACE_PERIOD_DAYS,
      msaAcceptedAt:             (account as any).msaAcceptedAt ?? null,
      msaVersion:                (account as any).msaVersion ?? null,
      resellerMsaConfirmedAt:    (account as any).resellerMsaConfirmedAt ?? null,
      stripeConnectedAccountId:  (account as any).stripeConnectedAccountId ?? null,
    });
  } catch (err: any) {
    console.error("[Onboarding] GET /status error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch onboarding status" });
  }
});

// ── POST /api/onboarding/accept-msa ─────────────────────────────────────────
//
// Three branches based on accountType:
//
// DIRECT / RESELLER: Standard single-signature flow.
//   Body: { msaVersion, scrollConfirmed: true }
//   RESELLER must supply msaVersion "1.1.0"; DIRECT must supply "1.0.0".
//
// SUB_ACCOUNT (Reseller pre-sign):
//   Body: { onBehalfOf: true, subAccountId }
//   Called by the RESELLER session to record resellerMsaConfirmedAt on the sub-account.
//   Does NOT set activationDate; that is anchored only when the end-user signs.
//
// SUB_ACCOUNT (End-user sign):
//   Body: { msaVersion: "1.1.0", scrollConfirmed: true }
//   Called by the SUB_ACCOUNT session. Requires resellerMsaConfirmedAt to be set first.
//   Sets activationDate and trialEndDate, advances to PENDING_COMPLIANCE.

router.post("/accept-msa", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;
    const account = await storage.getCustomerAccountById(session.adminUserId);

    if (!account) {
      res.status(404).json({ error: "Customer account not found" });
      return;
    }

    const accountType: string = (account as any).accountType ?? "DIRECT";

    // ── Branch: Reseller pre-signing on behalf of a sub-account ──────────────
    if (req.body?.onBehalfOf === true) {
      if (accountType !== "RESELLER") {
        res.status(403).json({ error: "Only RESELLER accounts may pre-sign on behalf of a sub-account." });
        return;
      }

      const parse = resellerPresignSchema.safeParse(req.body);
      if (!parse.success) {
        res.status(400).json({ error: "Invalid request", details: parse.error.flatten() });
        return;
      }

      const subAccount = await storage.getCustomerAccountById(parse.data.subAccountId);
      if (!subAccount) {
        res.status(404).json({ error: "Sub-account not found." });
        return;
      }
      if ((subAccount as any).parentAccountId !== account.id) {
        res.status(403).json({ error: "This sub-account does not belong to your reseller account." });
        return;
      }
      if ((subAccount as any).resellerMsaConfirmedAt) {
        res.status(409).json({ error: "Reseller pre-signature already recorded for this sub-account." });
        return;
      }

      await storage.updateCustomerAccount(subAccount.id, {
        resellerMsaConfirmedAt: new Date(),
      } as any);

      res.json({
        success: true,
        message: "Reseller pre-signature recorded. The end-user may now complete their MSA acceptance.",
        subAccountId: subAccount.id,
        resellerMsaConfirmedAt: new Date(),
      });
      return;
    }

    // ── Branch: End-user signature (DIRECT, RESELLER, or SUB_ACCOUNT) ────────
    const parse = acceptMsaDirectSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid request", details: parse.error.flatten() });
      return;
    }

    if ((account as any).msaAcceptedAt) {
      res.status(409).json({ error: "MSA has already been accepted for this account." });
      return;
    }

    // Governance Sync: enforce correct MSA version per account type
    const requiredVersion = accountType === "DIRECT" ? MSA_VERSION_DIRECT : MSA_VERSION_RESELLER;
    if (parse.data.msaVersion !== requiredVersion) {
      res.status(400).json({
        error: `${accountType} accounts must accept MSA version ${requiredVersion}. Received: ${parse.data.msaVersion}.`,
      });
      return;
    }

    // SUB_ACCOUNT: Reseller pre-signature is a hard prerequisite
    if (accountType === "SUB_ACCOUNT") {
      if (!(account as any).resellerMsaConfirmedAt) {
        res.status(403).json({
          error: "Your reseller must complete their countersignature before you can accept the MSA. Please contact your account manager.",
        });
        return;
      }
    }

    const activationDate = new Date();
    const trialEndDate   = addDays(activationDate, GRACE_PERIOD_DAYS);

    await storage.updateCustomerAccount(account.id, {
      msaAcceptedAt:     activationDate,
      msaVersion:        msaVersionHash(parse.data.msaVersion),
      activationDate,
      trialEndDate,
      onboardingStatus:  "PENDING_COMPLIANCE",
    } as any);

    res.json({
      success: true,
      activationDate,
      trialEndDate,
      gracePeriodDays: GRACE_PERIOD_DAYS,
      msaVersionAccepted: parse.data.msaVersion,
    });
  } catch (err: any) {
    console.error("[Onboarding] POST /accept-msa error:", err);
    res.status(500).json({ error: err.message || "Failed to record MSA acceptance" });
  }
});

// ── POST /api/onboarding/compliance ─────────────────────────────────────────
//
// Implements the verifyCompliance skill from billing_engine.json.
// SUB_ACCOUNTs must additionally supply contentProviderName and acknowledge
// the Content Provider designation (MSA v1.1.0 §1.5 — carrier audit requirement).
// Status is set to PENDING (not APPROVED) pending async carrier approval.

router.post("/compliance", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;
    const account = await storage.getCustomerAccountById(session.adminUserId);

    if (!account) {
      res.status(404).json({ error: "Customer account not found" });
      return;
    }

    if ((account as any).onboardingStatus !== "PENDING_COMPLIANCE") {
      res.status(409).json({
        error: "Account must complete MSA acceptance before submitting compliance information.",
      });
      return;
    }

    const accountType: string = (account as any).accountType ?? "DIRECT";
    const schema = accountType === "SUB_ACCOUNT" ? complianceSubAccountSchema : complianceBaseSchema;

    const parse = schema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Validation failed", details: parse.error.flatten() });
      return;
    }

    const { businessName, ein, address, smsUseCase } = parse.data;
    const rejectionReasons: string[] = [];

    if (!businessName.trim()) rejectionReasons.push("Business name is required.");
    if (!smsUseCase.trim())   rejectionReasons.push("SMS use case description is required.");

    if (rejectionReasons.length > 0) {
      const rejectionReason = rejectionReasons.join(" ");

      await storage.updateCustomerAccount(account.id, {
        complianceStatus:          "REJECTED",
        complianceRejectionReason: rejectionReason,
        businessName,
        ein,
        physicalAddress:           address,
        smsUseCase,
      } as any);

      console.warn(`[Onboarding] Compliance REJECTED for account ${account.id}: ${rejectionReason}`);
      res.status(422).json({ status: "FAIL", rejectionReason });
      return;
    }

    // Build the a2pContentProvider record for SUB_ACCOUNTs (carrier audit field)
    let a2pContentProvider: object | null = null;
    if (accountType === "SUB_ACCOUNT") {
      const d = parse.data as z.infer<typeof complianceSubAccountSchema>;
      a2pContentProvider = {
        name:            d.contentProviderName,
        role:            "Content Provider",
        accountOwner:    (account as any).parentAccountId ?? null,
        acknowledgedAt:  new Date().toISOString(),
      };
    }

    await storage.updateCustomerAccount(account.id, {
      complianceStatus:          "PENDING",
      onboardingStatus:          "ACTIVE",
      businessName,
      ein,
      physicalAddress:           address,
      smsUseCase,
      complianceRejectionReason: null,
      ...(a2pContentProvider ? { a2pContentProvider } : {}),
    } as any);

    res.json({
      status:  "PASS",
      message: "Compliance information submitted. Your A2P 10DLC registration is pending carrier approval. SMS will be enabled once the campaign is approved.",
      ...(accountType === "SUB_ACCOUNT" && { contentProviderRecorded: true }),
    });
  } catch (err: any) {
    console.error("[Onboarding] POST /compliance error:", err);
    res.status(500).json({ error: err.message || "Failed to process compliance submission" });
  }
});

export default router;
