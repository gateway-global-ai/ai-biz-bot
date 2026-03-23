/**
 * Always-on middleware for verification HTTP routes: rate limit + append-only passage log.
 * Every completed response (including 401/403/429) is logged for transparency statistics.
 */

import type { NextFunction, Request, Response } from "express";
import {
  extractSiteConfigIdFromBody,
  hashClientFingerprint,
  recordVerificationGatePassage,
  type AuthStateForLog,
  type PassageKind,
} from "../services/verificationGateTransparency";
import { checkVerificationGateRateLimit } from "../utils/verificationGateRateLimit";

type InstallationCtx = { siteConfigId: string; keyId: string };

type AugmentedRequest = Request & {
  verificationInstallation?: InstallationCtx;
};

function resolveAuthStateV1(req: AugmentedRequest, status: number): AuthStateForLog {
  if (req.verificationInstallation) return "installation_key";
  if (status === 403) return "forbidden_scope";
  if (status === 401) return "invalid_or_missing_key";
  return "unknown";
}

export function createVerificationGateMiddleware(passageKind: PassageKind) {
  return async function verificationGateMiddleware(req: AugmentedRequest, res: Response, next: NextFunction) {
    const started = Date.now();

    const siteScopeForFingerprint =
      passageKind === "nova_guest_http" || passageKind === "voice_client_heartbeat"
        ? extractSiteConfigIdFromBody(req)
        : null;
    const fp = hashClientFingerprint(req, siteScopeForFingerprint);

    const rateKey =
      passageKind === "api_v1_verification"
        ? `v1:${fp}:${req.path}`
        : `nova:${siteScopeForFingerprint ?? "anon"}:${fp}:${req.path}`;

    res.on("finish", () => {
      const durationMs = Date.now() - started;
      const status = res.statusCode;
      const rateLimited = (res.locals as { verificationGateRateLimited?: boolean }).verificationGateRateLimited === true;

      let authState: AuthStateForLog;
      let siteId: string | null;
      let keyId: string | null;

      if (passageKind === "api_v1_verification") {
        siteId = req.verificationInstallation?.siteConfigId ?? null;
        keyId = req.verificationInstallation?.keyId ?? null;
        authState = resolveAuthStateV1(req, status);
      } else {
        siteId = extractSiteConfigIdFromBody(req);
        keyId = null;
        authState = "browser_public";
      }

      void recordVerificationGatePassage({
        siteConfigId: siteId,
        route: req.path,
        httpMethod: req.method,
        passageKind,
        authState,
        installationKeyId: keyId,
        httpStatus: status,
        clientFingerprintHash: fp,
        durationMs,
        rateLimited,
        metadata: rateLimited ? { reason: "rate_limit" } : undefined,
      });
    });

    const rl = await checkVerificationGateRateLimit(rateKey);
    if (!rl.allowed) {
      (res.locals as { verificationGateRateLimited?: boolean }).verificationGateRateLimited = true;
      res.setHeader("Retry-After", String(rl.retryAfterSec ?? 60));
      res.status(429).json({ error: "Too many verification attempts. Try again later." });
      return;
    }

    next();
  };
}
