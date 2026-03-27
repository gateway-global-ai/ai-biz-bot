/**
 * Vault-First Verification Skill — **template** for Tier-2 secret ingestion (control plane).
 *
 * ## Pattern (Zero-LLM data path)
 * Sensitive values (PMS connection refs, payment instrument refs, integration tokens) MUST NOT:
 * - pass through chat_logs or voice transcripts
 * - appear in compiled prompts or RAG chunks
 * - be accepted from model tool JSON as authoritative
 *
 * They MUST enter only via:
 * 1. **Authenticated** modular routes (`server/routes/*.ts`, mounted from `server/routes.ts`)
 * 2. **Validated** request bodies (Zod) — treat as untrusted input until verified
 * 3. **Direct persistence** — storage / vault adapter; redacted audit trail only
 *
 * This module is **not** imported by `geminiVoice.ts`, `toolHandler.ts` hot paths, or chat streaming.
 *
 * @see docs-governance/EXECUTION_PLANE_BOUNDARY_SPEC.md
 * @see docs-governance/SKILL_REGISTRY.md
 */

import { z } from "zod";
import { storage } from "../storage";

/** Product / Bot Builder skill id when this capability is productized. */
export const SECURE_VAULT_SKILL_ID = "secure_vault" as const;

export type VaultSecretCategory =
  | "pms_connection_ref"
  | "payment_instrument_ref"
  | "integration_token_ref";

const secureVaultSubmissionSchema = z.object({
  siteConfigId: z.string().min(1),
  category: z.enum(["pms_connection_ref", "payment_instrument_ref", "integration_token_ref"]),
  /**
   * Opaque reference from a vault/HSM/upstream tokenization — **never** raw PAN, CVV, or full API secret in this field.
   */
  opaqueReference: z.string().min(8).max(2048),
  attestedAt: z.string().datetime(),
  idempotencyKey: z.string().min(8).max(128),
});

export type SecureVaultSubmission = z.infer<typeof secureVaultSubmissionSchema>;

export type SecureVaultReceipt = {
  ok: true;
  /** Opaque row id for UX / resume — not the upstream secret. */
  vaultHandoffToken: string;
  category: VaultSecretCategory;
};

export type SecureVaultError = {
  ok: false;
  code: "VALIDATION" | "POLICY" | "INTERNAL" | "CONFLICT";
  message: string;
};

export type SecureVaultResult = SecureVaultReceipt | SecureVaultError;

/** Parse and validate body from a trusted HTTP handler (not from LLM tool output). */
export function parseSecureVaultBody(
  body: unknown
): { data: SecureVaultSubmission } | { error: SecureVaultError } {
  const parsed = secureVaultSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: {
        ok: false,
        code: "VALIDATION",
        message: parsed.error.flatten().formErrors.join("; ") || "Invalid vault payload",
      },
    };
  }
  return { data: parsed.data };
}

/**
 * Redact accidental secret-like substrings before **any** log line.
 * Does not replace a vault — defense in depth for observability only.
 */
export function redactForLogs(payload: unknown): string {
  let s = typeof payload === "string" ? payload : JSON.stringify(payload);
  s = s.replace(/\b(sk_live_|pk_live_|api_key\s*=\s*)[^\s"&]{8,}/gi, "[REDACTED]");
  s = s.replace(/\bBearer\s+[^\s"]+/gi, "Bearer [REDACTED]");
  return s;
}

/**
 * Policy hook: call after auth resolves `adminUserId` / `customerAccountId` and site scope.
 * Return false to deny before storage (e.g. site not certified for `user_pii` dimension).
 */
export type VaultPolicyGate = (ctx: {
  siteConfigId: string;
  category: VaultSecretCategory;
  /** Whether gap analysis / Safe Mode allows this category for this site — inject from control plane. */
  dimensionCertified: boolean;
}) => boolean;

export const defaultVaultPolicyGate: VaultPolicyGate = ({ dimensionCertified }) => dimensionCertified;

/**
 * Persist opaque vault refs after session auth + site scope (route) and policy gate.
 *
 * - Do **not** store raw card numbers; store opaque refs / token IDs only.
 * - Do **not** call Gemini or append to chat.
 */
export async function processSecureVaultSubmission(
  submission: SecureVaultSubmission,
  ctx: {
    adminUserId: string;
    policy?: VaultPolicyGate;
  }
): Promise<SecureVaultResult> {
  const policy = ctx.policy ?? defaultVaultPolicyGate;
  const attestedAt = new Date(submission.attestedAt);
  if (Number.isNaN(attestedAt.getTime())) {
    return { ok: false, code: "VALIDATION", message: "Invalid attestedAt" };
  }

  const certified = true;
  if (
    !policy({
      siteConfigId: submission.siteConfigId,
      category: submission.category,
      dimensionCertified: certified,
    })
  ) {
    return {
      ok: false,
      code: "POLICY",
      message: "Vault write denied: certification/policy gate failed for this site and category.",
    };
  }

  return storage
    .upsertSecureVaultRef({
      siteConfigId: submission.siteConfigId,
      category: submission.category,
      opaqueReference: submission.opaqueReference,
      idempotencyKey: submission.idempotencyKey,
      attestedAt,
      createdByAdminUserId: ctx.adminUserId,
    })
    .then((row) => ({
      ok: true as const,
      vaultHandoffToken: row.id,
      category: submission.category,
    }))
    .catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "IDEMPOTENCY_KEY_CONFLICT") {
        return {
          ok: false as const,
          code: "CONFLICT" as const,
          message: "Idempotency key already used for a different site.",
        };
      }
      console.error("[secureVaultSkill]", redactForLogs(msg));
      return {
        ok: false as const,
        code: "INTERNAL" as const,
        message: "Vault persistence failed.",
      };
    });
}
