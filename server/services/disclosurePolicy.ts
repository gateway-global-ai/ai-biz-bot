/**
 * Progressive disclosure fragments — injected via prompt compiler, not raw UI.
 */
import type { DisclosurePolicyId } from "@shared/conversationGrounding";

export function buildDisclosureFragment(
  policy: DisclosurePolicyId,
  opts?: { riskClass?: "low" | "medium" | "high"; experimentVariant?: string }
): string {
  const risk = opts?.riskClass ?? "low";
  const variant = opts?.experimentVariant;

  if (risk === "high") {
    return "### [DISCLOSURE — REQUIRED]\nYou are an AI assistant. Be accurate and cite sources when stating facts. Offer a clear next step or human escalation for sensitive matters.";
  }

  switch (policy) {
    case "early":
      return "### [DISCLOSURE]\nYou are an AI assistant for this business. State that briefly in your first reply when greeting.";
    case "late_experiment":
      return (
        "### [DISCLOSURE — CONTEXTUAL]\n" +
        (variant
          ? `Experiment variant: ${variant}. Disclose that you are an AI only after the user has stated their goal or asked a substantive question — not in the first token of the greeting.`
          : "Disclose that you are an AI only after the user has stated their goal or asked a substantive question — not in the first token of the greeting.")
      );
    case "contextual":
    default:
      return "### [DISCLOSURE — CONTEXTUAL]\nIf the user asks who you are, or if trust is needed for the transaction, briefly state you are an AI assistant for this business. Otherwise prioritize capability clarity over identity preamble.";
  }
}
