import { z } from "zod";

export const intakeWriteModeSchema = z.enum(["direct", "review", "secure_only", "denied"]);
export type IntakeWriteMode = z.infer<typeof intakeWriteModeSchema>;

export const intakePolicySchema = z.object({
  defaultModeByCategory: z
    .object({
      low_risk: intakeWriteModeSchema.default("direct"),
      business_sensitive: intakeWriteModeSchema.default("review"),
      sensitive_regulated: intakeWriteModeSchema.default("secure_only"),
    })
    .default({
      low_risk: "direct",
      business_sensitive: "review",
      sensitive_regulated: "secure_only",
    }),
  fields: z
    .record(
      z.object({
        category: z.enum(["low_risk", "business_sensitive", "sensitive_regulated"]).default("business_sensitive"),
        customerWriteMode: intakeWriteModeSchema,
        reviewerRole: z.string().optional(),
        auditRequired: z.boolean().default(true),
        channelRules: z.array(z.string()).default(["chat", "voice", "form"]),
      })
    )
    .default({}),
});

export type IntakePolicyConfig = z.infer<typeof intakePolicySchema>;

export const DEFAULT_INTAKE_POLICY: IntakePolicyConfig = {
  defaultModeByCategory: {
    low_risk: "direct",
    business_sensitive: "review",
    sensitive_regulated: "secure_only",
  },
  fields: {
    contactPreferences: {
      category: "low_risk",
      customerWriteMode: "direct",
      auditRequired: true,
      channelRules: ["chat", "voice", "form"],
    },
    appointmentNotes: {
      category: "low_risk",
      customerWriteMode: "direct",
      auditRequired: true,
      channelRules: ["chat", "voice", "form"],
    },
    insuranceProvider: {
      category: "business_sensitive",
      customerWriteMode: "review",
      reviewerRole: "receptionist",
      auditRequired: true,
      channelRules: ["form"],
    },
    legalName: {
      category: "business_sensitive",
      customerWriteMode: "review",
      reviewerRole: "manager",
      auditRequired: true,
      channelRules: ["form"],
    },
    cardNumber: {
      category: "sensitive_regulated",
      customerWriteMode: "secure_only",
      reviewerRole: "billing_admin",
      auditRequired: true,
      channelRules: ["secure_form"],
    },
  },
};

export function resolveIntakePolicyConfig(siteConfig: unknown): IntakePolicyConfig {
  const maybeAgentConfig =
    siteConfig && typeof siteConfig === "object"
      ? (siteConfig as { agentConfig?: unknown }).agentConfig
      : undefined;
  const rawPolicy =
    maybeAgentConfig && typeof maybeAgentConfig === "object"
      ? (maybeAgentConfig as { intakePolicy?: unknown }).intakePolicy
      : undefined;

  const parsed = intakePolicySchema.safeParse(rawPolicy);
  if (!parsed.success) return DEFAULT_INTAKE_POLICY;

  return {
    defaultModeByCategory: {
      ...DEFAULT_INTAKE_POLICY.defaultModeByCategory,
      ...parsed.data.defaultModeByCategory,
    },
    fields: {
      ...DEFAULT_INTAKE_POLICY.fields,
      ...parsed.data.fields,
    },
  };
}

export function resolveFieldWriteMode(config: IntakePolicyConfig, fieldName: string): IntakeWriteMode {
  const fieldPolicy = config.fields[fieldName];
  if (fieldPolicy) return fieldPolicy.customerWriteMode;
  return config.defaultModeByCategory.business_sensitive;
}

