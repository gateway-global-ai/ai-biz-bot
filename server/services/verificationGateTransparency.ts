/**
 * Verification gate transparency — append-only passage logging for statistics and audit.
 * Fingerprints: pepper + normalized IP + UA + scope — see server/utils/clientFingerprint.ts.
 */

import type { Request } from "express";
import { hashClientFingerprint } from "../utils/clientFingerprint";
import { db } from "../db";
import { verificationGatePassageEvents } from "@shared/schema";

export type PassageKind =
  | "api_v1_verification"
  | "nova_guest_http"
  | "voice_session_connect"
  | "voice_client_heartbeat";

export type AuthStateForLog =
  | "installation_key"
  | "invalid_or_missing_key"
  | "forbidden_scope"
  | "browser_public"
  | "unknown"
  | "anonymous"
  | "owner_jwt"
  | "guest_token";

export { hashClientFingerprint };

export function extractSiteConfigIdFromBody(req: Request): string | null {
  const b = req.body as { siteConfigId?: string } | undefined;
  const id = b?.siteConfigId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export async function recordVerificationGatePassage(params: {
  siteConfigId: string | null;
  route: string;
  httpMethod: string;
  passageKind: PassageKind;
  authState: AuthStateForLog;
  installationKeyId: string | null;
  httpStatus: number;
  clientFingerprintHash: string;
  durationMs: number;
  rateLimited: boolean;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(verificationGatePassageEvents).values({
      siteConfigId: params.siteConfigId ?? undefined,
      route: params.route,
      httpMethod: params.httpMethod,
      passageKind: params.passageKind,
      authState: params.authState,
      installationKeyId: params.installationKeyId ?? undefined,
      httpStatus: params.httpStatus,
      clientFingerprintHash: params.clientFingerprintHash,
      durationMs: params.durationMs,
      rateLimited: params.rateLimited,
      metadata: params.metadata ?? undefined,
    });
  } catch (e) {
    console.error("[verificationGateTransparency] insert failed:", e instanceof Error ? e.message : e);
  }
}
