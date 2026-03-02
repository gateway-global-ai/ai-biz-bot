/**
 * Sovereign Environment Guard — validates required canonical env keys at bootstrap
 * or via health check. Throws SOVEREIGN_CONFIGURATION_ERROR when a required
 * key is missing. See docs/SOVEREIGN_ENV_MANIFEST.md.
 *
 * Enable at startup by setting SOVEREIGN_ENV_STRICT=true.
 */

export const SOVEREIGN_CONFIGURATION_ERROR = "SOVEREIGN_CONFIGURATION_ERROR";

/** Required canonical keys (must be present when guard is strict). */
const REQUIRED_CANONICAL_KEYS = [
  "SESSION_SECRET",
  "ENCRYPTION_KEY",
] as const;

/** Programmatic email (Gmail DWD): required when ENABLE_GOOGLE_WORKSPACE and SOVEREIGN_ENV_STRICT. See docs/integrations/PLATFORM_EMAIL_SERVICE_ACCOUNT.md. */
export const PROGRAMMATIC_EMAIL_CANONICAL_KEYS = [
  "GOOGLE_SERVICE_ACCOUNT_JSON",
  "PLATFORM_SENDER_EMAIL",
] as const;

export class SovereignEnvError extends Error {
  code = SOVEREIGN_CONFIGURATION_ERROR;
  missing: string[];

  constructor(missing: string[]) {
    super(
      `${SOVEREIGN_CONFIGURATION_ERROR}: Missing required env key(s): ${missing.join(", ")}. Add them to .env or Doppler and ensure they are listed in docs/SOVEREIGN_ENV_MANIFEST.md.`
    );
    this.name = "SovereignEnvError";
    this.missing = missing;
  }
}

/**
 * Validates that required canonical env keys are set.
 * @param requiredKeys - override default list (default: SESSION_SECRET, ENCRYPTION_KEY)
 * @throws SovereignEnvError when any required key is missing
 */
export function validateSovereignEnv(
  requiredKeys: readonly string[] = REQUIRED_CANONICAL_KEYS
): void {
  const missing = requiredKeys.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new SovereignEnvError([...missing]);
  }
}

/**
 * Returns a health-check result for sovereign env (for GET /api/health or similar).
 * Does not throw; returns status and missing keys.
 */
export function checkSovereignEnv(): {
  status: "ok" | "error";
  message: string;
  missing?: string[];
} {
  const missing = [...REQUIRED_CANONICAL_KEYS].filter(
    (key) => !process.env[key]?.trim()
  );
  if (missing.length > 0) {
    return {
      status: "error",
      message: `${SOVEREIGN_CONFIGURATION_ERROR}: Missing required env key(s): ${missing.join(", ")}`,
      missing,
    };
  }
  return {
    status: "ok",
    message: "Required sovereign env keys are set.",
  };
}

/**
 * Verifies DOPPLER_TOKEN matches expected environment (dev/stg/prod).
 * Tokens typically contain the env name; this detects wrong-token copy (e.g. dev token on stg).
 * Does not log or expose the token. Optional: set DOPPLER_EXPECT_ENV=dev|stg|prod to enable.
 */
export function checkDopplerTokenEnv(): {
  status: "ok" | "error" | "skip";
  message: string;
  expected?: string;
} {
  const token = process.env.DOPPLER_TOKEN?.trim();
  const expectEnv = process.env.DOPPLER_EXPECT_ENV?.trim().toLowerCase();
  if (!expectEnv) {
    return { status: "skip", message: "DOPPLER_EXPECT_ENV not set; Doppler token env check skipped." };
  }
  if (!token) {
    return { status: "skip", message: "DOPPLER_TOKEN not set; Doppler token env check skipped." };
  }
  const hint = expectEnv === "prod" ? "prod" : expectEnv === "stg" ? "stg" : "dev";
  const matches = token.toLowerCase().includes(hint);
  if (!matches) {
    return {
      status: "error",
      message: `Doppler token does not match expected environment "${expectEnv}" (token should contain "${hint}"). Possible wrong-token copy from another config.`,
      expected: expectEnv,
    };
  }
  return {
    status: "ok",
    message: `Doppler token matches expected environment (${expectEnv}).`,
    expected: expectEnv,
  };
}
