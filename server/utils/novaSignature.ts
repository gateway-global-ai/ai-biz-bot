/**
 * NOVA Sovereign — RSA-4096-PKCS1v15-SHA256 signature verification
 * Constitution: .system_design/nova_sovereign_ruleset_v1.yaml api.headers
 * Canonical string (signer and server must match): METHOD + "\n" + path + "\n" + X-Nova-Timestamp + "\n" + body
 */

import crypto from "node:crypto";

const REPLAY_WINDOW_MS = 120_000; // 120 seconds

export function buildCanonical(method: string, path: string, timestamp: string, body: string): string {
  return `${method}\n${path}\n${timestamp}\n${body}`;
}

export function verifyReplayTimestamp(timestampHeader: string): { ok: boolean; error?: string } {
  const t = Date.parse(timestampHeader);
  if (Number.isNaN(t)) return { ok: false, error: "Invalid X-Nova-Timestamp (not ISO-8601)" };
  const now = Date.now();
  if (Math.abs(now - t) > REPLAY_WINDOW_MS) return { ok: false, error: "X-Nova-Timestamp outside 120s replay window" };
  return { ok: true };
}

export function verifyNovaSignature(
  canonical: string,
  signatureBase64: string,
  publicKeyPem: string
): boolean {
  try {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(canonical, "utf8");
    return verifier.verify(publicKeyPem, signatureBase64, "base64");
  } catch {
    return false;
  }
}

export function loadPublicKey(): string | null {
  const pem = process.env.NOVA_RSA_PUBLIC_KEY;
  if (!pem || typeof pem !== "string" || !pem.includes("-----BEGIN")) return null;
  return pem;
}
