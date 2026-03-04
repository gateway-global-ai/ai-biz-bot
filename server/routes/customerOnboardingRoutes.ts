/**
 * Customer-scoped onboarding: MSA status and accept-msa for My Account (customer token).
 * Used when the client clicks "Review & Accept MSA" from My Account — no admin OTP required.
 */

import { Router, Request, Response } from "express";
import { createHash } from "crypto";
import { z } from "zod";
import { requireCustomerAuth } from "../customerAuth";
import { storage } from "../storage";

const router = Router();
const GRACE_PERIOD_DAYS = 30;
const MSA_VERSION_DIRECT = "1.0.0";
const MSA_VERSION_RESELLER = "1.1.0";

function msaVersionHash(version: string): string {
  return createHash("sha256").update(`MSA_v${version}`).digest("hex");
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

const acceptMsaSchema = z.object({
  msaVersion: z.enum([MSA_VERSION_DIRECT, MSA_VERSION_RESELLER]),
  scrollConfirmed: z.literal(true),
});

router.get("/status", requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).customerSession;
    const account = await storage.getCustomerAccountById(session.customerAccountId);
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
      onboardingStatus: (account as any).onboardingStatus,
      complianceStatus: (account as any).complianceStatus,
      accountType: (account as any).accountType ?? "DIRECT",
      parentAccountId: (account as any).parentAccountId ?? null,
      activationDate: (account as any).activationDate ?? null,
      trialEndDate: (account as any).trialEndDate ?? null,
      trialDaysRemaining,
      trialDaysElapsed,
      gracePeriodDays: GRACE_PERIOD_DAYS,
      msaAcceptedAt: (account as any).msaAcceptedAt ?? null,
      msaVersion: (account as any).msaVersion ?? null,
      resellerMsaConfirmedAt: (account as any).resellerMsaConfirmedAt ?? null,
      stripeConnectedAccountId: (account as any).stripeConnectedAccountId ?? null,
    });
  } catch (err: any) {
    console.error("[CustomerOnboarding] GET /status error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch onboarding status" });
  }
});

router.post("/accept-msa", requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).customerSession;
    const account = await storage.getCustomerAccountById(session.customerAccountId);
    if (!account) {
      res.status(404).json({ error: "Customer account not found" });
      return;
    }
    const accountType: string = (account as any).accountType ?? "DIRECT";
    const parse = acceptMsaSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid request", details: parse.error.flatten() });
      return;
    }
    if ((account as any).msaAcceptedAt) {
      res.status(409).json({ error: "MSA has already been accepted for this account." });
      return;
    }
    const requiredVersion = accountType === "DIRECT" ? MSA_VERSION_DIRECT : MSA_VERSION_RESELLER;
    if (parse.data.msaVersion !== requiredVersion) {
      res.status(400).json({
        error: `${accountType} accounts must accept MSA version ${requiredVersion}. Received: ${parse.data.msaVersion}.`,
      });
      return;
    }
    if (accountType === "SUB_ACCOUNT") {
      if (!(account as any).resellerMsaConfirmedAt) {
        res.status(403).json({
          error: "Your reseller must complete their countersignature before you can accept the MSA. Please contact your account manager.",
        });
        return;
      }
    }
    const activationDate = new Date();
    const trialEndDate = addDays(activationDate, GRACE_PERIOD_DAYS);
    await storage.updateCustomerAccount(account.id, {
      msaAcceptedAt: activationDate,
      msaVersion: msaVersionHash(parse.data.msaVersion),
      activationDate,
      trialEndDate,
      onboardingStatus: "PENDING_COMPLIANCE",
    } as any);
    res.json({
      success: true,
      activationDate,
      trialEndDate,
      gracePeriodDays: GRACE_PERIOD_DAYS,
      msaVersionAccepted: parse.data.msaVersion,
    });
  } catch (err: any) {
    console.error("[CustomerOnboarding] POST /accept-msa error:", err);
    res.status(500).json({ error: err.message || "Failed to record MSA acceptance" });
  }
});

export default router;
