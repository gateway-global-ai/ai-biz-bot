/**
 * Phased industry funnel — conversation workflow (governed JSON on sales_funnels[]).
 * See docs-governance/PHASED_INDUSTRY_FUNNEL_SPEC.md
 */
import { z } from "zod";

export const industryKnowledgeRefSchema = z.object({
  source: z.enum(["knowledge_doc_id", "artifact_key", "slug"]),
  value: z.string().min(1),
  title: z.string().optional(),
});

export const conversationPhaseSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  goal: z.string().optional(),
  /** visitor | owner | both */
  allowedIntent: z.enum(["visitor", "owner", "both"]).default("both"),
  /** Keys that must be present in funnelContext to treat this phase as complete for transition */
  requiredContextKeys: z.array(z.string()).default([]),
  /** Bullets: what the agent may say / must not say */
  outputContract: z
    .object({
      must: z.array(z.string()).optional(),
      mustNot: z.array(z.string()).optional(),
      maxSentences: z.number().int().positive().optional(),
    })
    .optional(),
  boldClaimHint: z.string().optional(),
  disclosureTierHint: z.enum(["minimal", "standard", "full"]).optional(),
});

export const conversationTransitionSchema = z.object({
  fromPhaseId: z.string(),
  toPhaseId: z.string(),
  when: z.object({
    contextKeysPresent: z.array(z.string()).optional(),
    /** If true, advance when all requiredContextKeys of `from` are satisfied */
    allRequiredKeysOfPhaseMet: z.boolean().optional(),
  }),
});

export const conversationWorkflowSchema = z.object({
  version: z.number().int().positive().default(1),
  industryVertical: z.string().optional(),
  phases: z.array(conversationPhaseSchema).min(1),
  transitions: z.array(conversationTransitionSchema).default([]),
  industryKnowledgeRef: industryKnowledgeRefSchema.optional(),
});

export type ConversationPhase = z.infer<typeof conversationPhaseSchema>;
export type ConversationWorkflow = z.infer<typeof conversationWorkflowSchema>;
export type IndustryKnowledgeRef = z.infer<typeof industryKnowledgeRefSchema>;

/** Full funnel entry: extends SALES_FUNNEL_SPEC base fields */
export const salesFunnelEntrySchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1),
    terminalAction: z.enum(["book", "buy", "signup", "support", "lead"]),
    entryPoints: z.array(z.string()).optional(),
    digitalTree: z.record(z.string(), z.any()).optional(),
    conversionObjective: z.string().optional(),
    fallbackRoutes: z
      .object({
        website: z.string().optional(),
        booking: z.string().optional(),
        ordering: z.string().optional(),
        support: z.string().optional(),
      })
      .optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    conversationWorkflow: conversationWorkflowSchema.optional(),
  })
  .passthrough();

export const salesFunnelsArraySchema = z.array(salesFunnelEntrySchema);

export function hasPresentKey(
  keys: Record<string, string | undefined>,
  k: string
): boolean {
  const v = keys[k];
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Resolve active phase: first phase (in order) with any missing requiredContextKeys.
 * Phases with empty requiredContextKeys are skipped (use a sentinel like funnel_started).
 */
export function resolveCurrentPhase(
  workflow: ConversationWorkflow,
  contextKeys: Record<string, string | undefined>
): ConversationPhase {
  const phases = workflow.phases;
  if (!phases.length) {
    throw new Error("conversationWorkflow.phases must not be empty");
  }
  for (const phase of phases) {
    const required = phase.requiredContextKeys ?? [];
    if (required.length === 0) continue;
    const missing = required.some((k) => !hasPresentKey(contextKeys, k));
    if (missing) return phase;
  }
  return phases[phases.length - 1];
}

export function formatPhasePromptFragment(
  phase: ConversationPhase,
  workflow: ConversationWorkflow
): string {
  const lines: string[] = [
    "### CURRENT CONVERSATION PHASE (MANDATORY)",
    `Phase: ${phase.label} (${phase.id})`,
  ];
  if (phase.goal) lines.push(`Goal: ${phase.goal}`);
  if (phase.allowedIntent) lines.push(`Audience: ${phase.allowedIntent}`);
  if (phase.disclosureTierHint) {
    lines.push(`Disclosure tier: ${phase.disclosureTierHint} — do not exceed this depth until the user progresses.`);
  }
  const oc = phase.outputContract;
  if (oc?.must?.length) {
    lines.push("You MUST:", ...oc.must.map((m) => `- ${m}`));
  }
  if (oc?.mustNot?.length) {
    lines.push("You MUST NOT:", ...oc.mustNot.map((m) => `- ${m}`));
  }
  if (oc?.maxSentences) {
    lines.push(`Keep this turn to at most ${oc.maxSentences} short sentences before listening.`);
  }
  if (phase.boldClaimHint) {
    lines.push(`Bold claim angle (use once, in plain language): ${phase.boldClaimHint}`);
  }
  if (workflow.industryKnowledgeRef?.title) {
    lines.push(
      `Industry evidence is in the knowledge library under "${workflow.industryKnowledgeRef.title}" — cite facts sparingly; never dump the full report.`
    );
  }
  lines.push(
    "Advance phases only by collecting the required context keys — do not skip to pricing or full technical architecture until the phase goal is met or the user explicitly demands it."
  );
  return lines.join("\n");
}
