import { z } from "zod";

export const verificationLevelSchema = z.enum(["basic", "standard", "strict"]);
export type VerificationLevel = z.infer<typeof verificationLevelSchema>;

export const verificationPolicySchema = z.object({
  level: verificationLevelSchema.default("standard"),
  steps: z
    .object({
      otp: z.boolean().default(true),
      magicLink: z.boolean().default(false),
      biometric: z.boolean().default(false),
      idDocument: z.boolean().default(true),
      digitalSignature: z.boolean().default(false),
      insuranceCardUpload: z.boolean().default(true),
      selfiePhotoMatch: z.boolean().default(false),
    })
    .default({
      otp: true,
      magicLink: false,
      biometric: false,
      idDocument: true,
      digitalSignature: false,
      insuranceCardUpload: true,
      selfiePhotoMatch: false,
    }),
});

export type VerificationPolicyConfig = z.infer<typeof verificationPolicySchema>;

export const DEFAULT_VERIFICATION_POLICY: VerificationPolicyConfig = {
  level: "standard",
  steps: {
    otp: true,
    magicLink: false,
    biometric: false,
    idDocument: true,
    digitalSignature: false,
    insuranceCardUpload: true,
    selfiePhotoMatch: false,
  },
};

export function resolveVerificationPolicyConfig(siteConfig: unknown): VerificationPolicyConfig {
  const maybeAgentConfig =
    siteConfig && typeof siteConfig === "object"
      ? (siteConfig as { agentConfig?: unknown }).agentConfig
      : undefined;
  const rawPolicy =
    maybeAgentConfig && typeof maybeAgentConfig === "object"
      ? (maybeAgentConfig as { verificationPolicy?: unknown }).verificationPolicy
      : undefined;

  const parsed = verificationPolicySchema.safeParse(rawPolicy);
  if (!parsed.success) return DEFAULT_VERIFICATION_POLICY;
  return {
    level: parsed.data.level,
    steps: {
      ...DEFAULT_VERIFICATION_POLICY.steps,
      ...parsed.data.steps,
    },
  };
}

