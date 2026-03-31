/**
 * Integration onboarding — read and validate tenant integration onboarding state (governed lanes).
 *
 * GET  /api/integration-onboarding/cloudbeds-graphql-discovery/:siteConfigId
 *      Skill contract: get_integration_onboarding_status (read-only; no secrets).
 *
 * POST /api/integration-onboarding/cloudbeds-graphql-discovery/:siteConfigId/validate
 *      Skill contract: validate_integration_configuration — runs validateCloudbedsGraphqlDiscoveryConfiguration.
 *      Query: skipHttpValidation=true — gap detection + auth resolution only (no GraphQL HTTP probe).
 *
 * POST /api/integration-onboarding/cloudbeds-graphql-discovery/:siteConfigId/send-sms
 *      Skill contract: send_integration_onboarding_sms — PLATFORM_CARE via smsRouter; body: variant, toE164?, dryRun?, eligibilityMode?
 *
 * @see docs-governance/canonical/CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_V1.md
 */
import { Router, type Request, type Response } from "express";
import type { AuthSession } from "@shared/schema";
import { requireAuth } from "../auth";
import { getCloudbedsGraphqlDiscoveryOnboardingStatus } from "../services/getCloudbedsGraphqlDiscoveryOnboardingStatus";
import { sendCloudbedsGraphqlDiscoveryOnboardingSms } from "../services/sendCloudbedsGraphqlDiscoveryOnboardingSms";
import { validateCloudbedsGraphqlDiscoveryConfiguration } from "../services/validateCloudbedsGraphqlDiscoveryConfiguration";
import { assertSiteAccessForSession } from "../utils/siteScopedAccess";

const router = Router();

async function guardSite(req: Request, res: Response, siteConfigId: string): Promise<boolean> {
  const access = await assertSiteAccessForSession(req as any, siteConfigId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return false;
  }
  return true;
}

router.get(
  "/cloudbeds-graphql-discovery/:siteConfigId",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const siteConfigId = String(req.params.siteConfigId ?? "").trim();
      if (!(await guardSite(req, res, siteConfigId))) return;

      const result = await getCloudbedsGraphqlDiscoveryOnboardingStatus(siteConfigId);
      res.json({
        skill_id: "get_integration_onboarding_status",
        integration_key: "cloudbeds_graphql_discovery",
        ...result,
      });
    } catch (e) {
      console.error("[integration-onboarding] GET status failed:", e);
      res.status(500).json({ error: "integration_onboarding_status_failed" });
    }
  },
);

router.post(
  "/cloudbeds-graphql-discovery/:siteConfigId/validate",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const siteConfigId = String(req.params.siteConfigId ?? "").trim();
      if (!(await guardSite(req, res, siteConfigId))) return;

      const q = req.query.skipHttpValidation;
      const skipHttpValidation = q === "true" || q === "1";
      const result = await validateCloudbedsGraphqlDiscoveryConfiguration(siteConfigId, {
        skipHttpValidation,
      });

      res.json({
        skill_id: "validate_integration_configuration",
        integration_key: "cloudbeds_graphql_discovery",
        skipHttpValidation,
        ...result,
      });
    } catch (e) {
      console.error("[integration-onboarding] POST validate failed:", e);
      res.status(500).json({ error: "integration_onboarding_validate_failed" });
    }
  },
);

/**
 * POST /api/integration-onboarding/cloudbeds-graphql-discovery/:siteConfigId/send-sms
 * Skill: send_integration_onboarding_sms — PLATFORM_CARE via Sovereign SMS Router; no secrets in body.
 */
router.post(
  "/cloudbeds-graphql-discovery/:siteConfigId/send-sms",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const siteConfigId = String(req.params.siteConfigId ?? "").trim();
      if (!(await guardSite(req, res, siteConfigId))) return;

      const toE164 =
        typeof req.body?.toE164 === "string" && req.body.toE164.trim() ? String(req.body.toE164) : undefined;
      const variant = req.body?.variant === "reminder" ? "reminder" : "invitation";
      const dryRun = req.body?.dryRun === true;
      const eligibilityMode =
        req.body?.eligibilityMode === "cloudbeds_row_only" ? "cloudbeds_row_only" : "graphql_discovery_onboarding";

      const session = (req as Request & { session?: AuthSession }).session;
      const actorAdminUserId = session?.adminUserId;

      const result = await sendCloudbedsGraphqlDiscoveryOnboardingSms({
        siteConfigId,
        actorAdminUserId,
        toE164,
        variant,
        dryRun,
        eligibilityMode,
      });

      if (!result.ok) {
        const status =
          result.code === "INVALID_INPUT" || result.code === "MISSING_ACTOR_CONTEXT"
            ? 400
            : result.code === "NO_INTEGRATION" || result.code === "NO_RECIPIENT"
              ? 404
              : result.code === "SKIPPED_ALREADY_READY" || result.code === "SKIPPED_BLOCKED"
                ? 409
                : result.code === "HANDOFF_FAILED" || result.code === "SMS_DISPATCH_FAILED"
                  ? 502
                  : 400;
        return res.status(status).json({
          skill_id: "send_integration_onboarding_sms",
          integration_key: "cloudbeds_graphql_discovery",
          ...result,
        });
      }

      res.json({
        skill_id: "send_integration_onboarding_sms",
        integration_key: "cloudbeds_graphql_discovery",
        ...result,
      });
    } catch (e) {
      console.error("[integration-onboarding] POST send-sms failed:", e);
      res.status(500).json({ error: "integration_onboarding_send_sms_failed" });
    }
  },
);

export default router;
