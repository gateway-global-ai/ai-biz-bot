import {
  SENSITIVE_INPUT_POLICIES,
  type SensitiveInputPolicy,
} from "../config/sensitiveInputPolicy";

export interface SensitiveDetectionResult {
  requiresSecureForm: boolean;
  policy?: SensitiveInputPolicy;
  reason?: string;
  matchedFieldName?: string;
}

export function detectSensitiveInput(text: string): SensitiveDetectionResult {
  const normalized = text.toLowerCase();
  for (const policy of SENSITIVE_INPUT_POLICIES) {
    const hintMatch = policy.hints.some((hint) => normalized.includes(hint.toLowerCase()));
    const patternMatch = policy.detectionPatterns.some((pattern) => pattern.test(text));
    if (hintMatch || patternMatch) {
      return {
        requiresSecureForm: true,
        policy,
        reason: `Detected ${policy.classification} field: ${policy.fieldName}`,
        matchedFieldName: policy.fieldName,
      };
    }
  }
  return { requiresSecureForm: false };
}

export function redactSensitiveText(input: string): string {
  let output = input;
  for (const policy of SENSITIVE_INPUT_POLICIES) {
    for (const pattern of policy.detectionPatterns) {
      output = output.replace(pattern, "[REDACTED]");
    }
    for (const hint of policy.hints) {
      const escaped = hint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const keywordPattern = new RegExp(escaped, "gi");
      output = output.replace(keywordPattern, "[SENSITIVE_FIELD]");
    }
  }
  return output;
}

function redactUnknown(value: unknown): unknown {
  if (typeof value === "string") return redactSensitiveText(value);
  if (Array.isArray(value)) return value.map((entry) => redactUnknown(entry));
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const keyLower = key.toLowerCase();
      const hasSensitiveKey = SENSITIVE_INPUT_POLICIES.some((policy) =>
        keyLower.includes(policy.fieldName.toLowerCase())
      );
      next[key] = hasSensitiveKey ? "[REDACTED]" : redactUnknown(entry);
    }
    return next;
  }
  return value;
}

export function redactSensitiveMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!metadata) return {};
  return redactUnknown(metadata) as Record<string, unknown>;
}

