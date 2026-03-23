import { z } from "zod";

export const intakeWriteModeSchema = z.enum(["direct", "review", "secure_only", "denied"]);
export type IntakeWriteMode = z.infer<typeof intakeWriteModeSchema>;

/** Owner-toggled fields when capturing a net-new customer / lead (chat + voice). */
export const NEW_CUSTOMER_INTAKE_FIELD_KEYS = [
  "firstName",
  "lastName",
  "cellPhone",
  "email",
  "address",
] as const;
export type NewCustomerIntakeFieldKey = (typeof NEW_CUSTOMER_INTAKE_FIELD_KEYS)[number];

const newCustomerFieldToggleSchema = z.object({
  enabled: z.boolean().default(true),
  required: z.boolean().default(false),
});

export const callerIdLookupPolicySchema = z.object({
  /** When true, agents may use the `get_inbound_caller_identity` tool (Twilio CNAM-style metadata). */
  skillEnabled: z.boolean().default(false),
  /** Owner acknowledged per-call pricing disclosure in admin UI. */
  pricingAcknowledged: z.boolean().optional(),
});

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
      }),
    )
    .default({}),
  /** Per-field enable/require for new-customer capture (owner canvas / Platform Settings). */
  newCustomerIntakeFields: z
    .object({
      firstName: newCustomerFieldToggleSchema.optional(),
      lastName: newCustomerFieldToggleSchema.optional(),
      cellPhone: newCustomerFieldToggleSchema.optional(),
      email: newCustomerFieldToggleSchema.optional(),
      address: newCustomerFieldToggleSchema.optional(),
    })
    .optional(),
  /** Twilio inbound Caller Name / CNAM skill — not identity verification; see governance docs. */
  callerIdLookup: callerIdLookupPolicySchema.optional(),
});

export type IntakePolicyConfig = z.infer<typeof intakePolicySchema>;

export const DEFAULT_NEW_CUSTOMER_INTAKE_FIELDS: Record<
  NewCustomerIntakeFieldKey,
  { enabled: boolean; required: boolean }
> = {
  firstName: { enabled: true, required: false },
  lastName: { enabled: true, required: false },
  cellPhone: { enabled: true, required: false },
  email: { enabled: true, required: false },
  address: { enabled: true, required: false },
};

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
  newCustomerIntakeFields: { ...DEFAULT_NEW_CUSTOMER_INTAKE_FIELDS },
  callerIdLookup: { skillEnabled: false, pricingAcknowledged: false },
};

export function mergeNewCustomerIntakeFields(
  raw: Partial<Record<NewCustomerIntakeFieldKey, { enabled?: boolean; required?: boolean }>> | undefined,
): Record<NewCustomerIntakeFieldKey, { enabled: boolean; required: boolean }> {
  const out = { ...DEFAULT_NEW_CUSTOMER_INTAKE_FIELDS };
  if (!raw) return out;
  for (const key of NEW_CUSTOMER_INTAKE_FIELD_KEYS) {
    const patch = raw[key];
    if (patch) {
      out[key] = {
        enabled: patch.enabled ?? out[key].enabled,
        required: patch.required ?? out[key].required,
      };
    }
  }
  return out;
}

/** One line for system prompts: owner-configured new-customer field capture. */
export function formatNewCustomerIntakePromptLine(config: IntakePolicyConfig): string {
  const merged = mergeNewCustomerIntakeFields(config.newCustomerIntakeFields);
  const parts: string[] = [];
  const labels: Record<NewCustomerIntakeFieldKey, string> = {
    firstName: "first name",
    lastName: "last name",
    cellPhone: "cell phone",
    email: "email",
    address: "address",
  };
  for (const key of NEW_CUSTOMER_INTAKE_FIELD_KEYS) {
    if (!merged[key].enabled) continue;
    parts.push(merged[key].required ? `${labels[key]} (required)` : labels[key]);
  }
  if (parts.length === 0) {
    return "\n\n--- NEW CUSTOMER CAPTURE ---\nThe owner has not enabled standard contact fields for new customers. Ask only what the conversation requires; do not insist on a full profile unless the business needs it.";
  }
  return `\n\n--- NEW CUSTOMER CAPTURE (owner-configured) ---\nWhen creating a new customer or lead, collect these fields when appropriate: ${parts.join(", ")}. Do not ask for disabled fields.`;
}

export function resolveIntakePolicyConfig(siteConfig: unknown): IntakePolicyConfig {
  const maybeAgentConfig =
    siteConfig && typeof siteConfig === "object" ? (siteConfig as { agentConfig?: unknown }).agentConfig : undefined;
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
    newCustomerIntakeFields: mergeNewCustomerIntakeFields(parsed.data.newCustomerIntakeFields),
    callerIdLookup: {
      ...(DEFAULT_INTAKE_POLICY.callerIdLookup ?? { skillEnabled: false, pricingAcknowledged: false }),
      ...(parsed.data.callerIdLookup ?? {}),
    },
  };
}

export function resolveFieldWriteMode(config: IntakePolicyConfig, fieldName: string): IntakeWriteMode {
  const fieldPolicy = config.fields[fieldName];
  if (fieldPolicy) return fieldPolicy.customerWriteMode;
  return config.defaultModeByCategory.business_sensitive;
}
