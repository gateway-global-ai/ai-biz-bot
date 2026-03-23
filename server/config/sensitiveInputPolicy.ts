export type SensitiveClassification = "PII" | "PCI" | "PHI" | "SECRET";
export type SensitiveStoreMode = "tokenized_only" | "masked_only" | "forbidden";

export interface SensitiveInputPolicy {
  policyId: string;
  fieldName: string;
  classification: SensitiveClassification;
  allowedChannels: Array<"secure_form">;
  redactInTranscript: boolean;
  storeMode: SensitiveStoreMode;
  displayMode: "masked" | "hidden";
  hints: string[];
  detectionPatterns: RegExp[];
  secureFormFields: Array<{
    key: string;
    label: string;
    type: "text" | "date" | "select" | "number" | "signature";
    required: boolean;
    masked?: boolean;
  }>;
}

export const SENSITIVE_INPUT_POLICIES: SensitiveInputPolicy[] = [
  {
    policyId: "sensitive.ssn",
    fieldName: "ssn",
    classification: "PII",
    allowedChannels: ["secure_form"],
    redactInTranscript: true,
    storeMode: "tokenized_only",
    displayMode: "masked",
    hints: ["social security", "ssn", "social security number"],
    detectionPatterns: [/\b\d{3}-?\d{2}-?\d{4}\b/],
    secureFormFields: [
      { key: "ssn", label: "Social Security Number", type: "text", required: true, masked: true },
      { key: "dob", label: "Date of Birth", type: "date", required: true },
      { key: "fullName", label: "Full Legal Name", type: "text", required: true },
    ],
  },
  {
    policyId: "sensitive.payment_card",
    fieldName: "creditCardNumber",
    classification: "PCI",
    allowedChannels: ["secure_form"],
    redactInTranscript: true,
    storeMode: "tokenized_only",
    displayMode: "masked",
    hints: ["card number", "credit card", "debit card", "cvv", "cvc", "security code"],
    detectionPatterns: [/\b(?:\d[ -]*?){13,19}\b/, /\b(?:cvv|cvc)\b/i],
    secureFormFields: [
      { key: "cardNumber", label: "Card Number", type: "text", required: true, masked: true },
      { key: "expiry", label: "Expiry Date", type: "text", required: true, masked: true },
      { key: "cardholderName", label: "Cardholder Name", type: "text", required: true },
    ],
  },
  {
    policyId: "sensitive.insurance_member_id",
    fieldName: "insuranceMemberId",
    classification: "PHI",
    allowedChannels: ["secure_form"],
    redactInTranscript: true,
    storeMode: "masked_only",
    displayMode: "masked",
    hints: ["insurance member id", "policy number", "member id", "subscriber id"],
    detectionPatterns: [/\b(member|policy|subscriber)\s*(id|number)\b/i],
    secureFormFields: [
      { key: "insuranceProvider", label: "Insurance Provider", type: "text", required: true },
      { key: "policyNumber", label: "Policy Number", type: "text", required: true, masked: true },
      { key: "groupNumber", label: "Group Number", type: "text", required: false, masked: true },
      { key: "subscriberName", label: "Subscriber Name", type: "text", required: true },
    ],
  },
  {
    policyId: "sensitive.password_secret",
    fieldName: "password",
    classification: "SECRET",
    allowedChannels: ["secure_form"],
    redactInTranscript: true,
    storeMode: "forbidden",
    displayMode: "hidden",
    hints: ["password", "passcode", "secret", "api key", "private key"],
    detectionPatterns: [/\b(password|passcode|api[_\s-]?key|private[_\s-]?key|secret)\b/i],
    secureFormFields: [
      { key: "secretValue", label: "Secret Value", type: "text", required: true, masked: true },
      { key: "confirmation", label: "Confirm Secret", type: "text", required: true, masked: true },
    ],
  },
];

export function getSensitiveInputPolicyById(policyId: string): SensitiveInputPolicy | undefined {
  return SENSITIVE_INPUT_POLICIES.find((policy) => policy.policyId === policyId);
}

