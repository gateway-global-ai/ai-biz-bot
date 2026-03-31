/**
 * Zod merge gate for Phase B → Phase C (`IntentLoopResolution`).
 *
 * Fail-closed policy (normative): `docs-governance/canonical/VOICE_FIRST_INTERFACE_PIPELINE_V1.md`
 * § Phase B output / § Fail closed when resolution cannot map to a registered surface.
 * Validator-approved view ids: `server/services/canvasDirectiveValidator.ts` (`REGISTERED_VIEW_IDS`).
 *
 * When `allowedCanvasViewIds` is empty or omitted, the resolver must not leave Phase C
 * without guidance: either populate **non-empty `auditNotes`** (denial / clarify / fallback reason)
 * **or** supply at least one registry `CanvasViewId` in `allowedCanvasViewIds` (including
 * explicit fallback ids from `INTENT_LOOP_FAIL_CLOSED_FALLBACK_VIEW_IDS`).
 */

import { z } from "zod";

import type { CanvasViewId } from "./canvasViewContract.js";
import {
  INTENT_LOOP_CONTRACT_VERSION,
  type IntentLoopResolution,
  type IntentLoopStateVector,
} from "./intentLoopContract.js";

/**
 * Runtime allowlist for Zod + resolver (must match `REGISTERED_VIEW_IDS` in
 * `server/services/canvasDirectiveValidator.ts`). **Single source of truth** is the union
 * `CanvasViewId` in `canvasViewContract.ts`; this array + validator Set should stay aligned —
 * consider a follow-up to generate one list from the other in CI.
 */
export const REGISTERED_CANVAS_VIEW_ID_VALUES = [
  "welcome",
  "service_menu",
  "faq_list",
  "intake_checklist",
  "business_summary",
  "support_home",
  "disambiguation_menu",
  "schedule",
  "pricing_table",
  "custom_card",
  "account_overview",
  "identity_verify",
  "phone_provisioning_form",
  "agent_builder_form",
  "workspace_provisioning_form",
  "agent_roster",
  "knowledge_library_builder",
  "aptitude_test_runner",
  "command_center",
  "canvas_backgrounds",
  "dynamic",
] as const satisfies readonly CanvasViewId[];

export const canvasViewIdSchema = z.enum(REGISTERED_CANVAS_VIEW_ID_VALUES);

/**
 * Tier-3 / safe-default views for fail-closed derivation (registry + validator; see VIEW_REGISTRY).
 * Prefer `disambiguation_menu` for clarify, `support_home` for care, `welcome` as neutral safe shell.
 */
export const INTENT_LOOP_FAIL_CLOSED_FALLBACK_VIEW_IDS = [
  "disambiguation_menu",
  "support_home",
  "welcome",
] as const satisfies readonly CanvasViewId[];

/** Prefer these machine-readable prefixes in `auditNotes` lines (resolver + Phase C). */
export const INTENT_LOOP_AUDIT_NOTE_PREFIXES = [
  "deny:",
  "registry:",
  "fallback:",
  "identity:",
  "noop:",
  "tenant:",
  "clarify:",
] as const;

const REGISTERED_CANVAS_VIEW_ID_SET = new Set<string>(REGISTERED_CANVAS_VIEW_ID_VALUES);

export function isRegisteredCanvasViewId(id: string): id is CanvasViewId {
  return REGISTERED_CANVAS_VIEW_ID_SET.has(id);
}

const intentLoopActorClassSchema = z.enum(["customer", "employee", "vendor", "management"]);

const intentLoopLifecycleStageSchema = z.enum([
  "outreach",
  "onboarding",
  "operations",
  "retention",
]);

const intentLoopManagementStageSchema = z.enum([
  "planning",
  "tracking",
  "reporting",
  "optimization",
]);

const intentLoopLifecycleUnionSchema = z.union([
  intentLoopLifecycleStageSchema,
  intentLoopManagementStageSchema,
]);

export const intentLoopStateVectorSchema: z.ZodType<IntentLoopStateVector> = z.object({
  actorClass: intentLoopActorClassSchema.optional(),
  lifecycle: intentLoopLifecycleUnionSchema.optional(),
  domainJourneyKey: z.string().optional(),
  sessionRef: z.string().optional(),
  entitlementKeys: z.array(z.string()).optional(),
  swarmRoleRef: z.string().optional(),
  operationalMode: z.string().optional(),
});

const intentLoopMergeStepSchema = z.enum([
  "classification",
  "domain",
  "role",
  "tenant",
  "turn",
]);

const swarmSchematicRefSchema = z.object({
  id: z.string().min(1),
  version: z.string().optional(),
});

export const intentLoopResolutionSchema: z.ZodType<IntentLoopResolution> = z
  .object({
    contractVersion: z.literal(INTENT_LOOP_CONTRACT_VERSION),
    resolutionId: z.string().min(1),
    stateVector: intentLoopStateVectorSchema,
    mergeStepsApplied: z.array(intentLoopMergeStepSchema),
    swarmSchematicRef: swarmSchematicRefSchema.optional(),
    allowedCanvasViewIds: z.array(canvasViewIdSchema).optional(),
    allowedActionIds: z.array(z.string().min(1)).optional(),
    auditNotes: z.array(z.string().min(1)).optional(),
  })
  .strict();

export type IntentLoopResolutionParsed = z.infer<typeof intentLoopResolutionSchema>;

export function parseIntentLoopResolution(
  input: unknown,
):
  | { success: true; data: IntentLoopResolution }
  | { success: false; error: z.ZodError } {
  const r = intentLoopResolutionSchema.safeParse(input);
  if (!r.success) return { success: false, error: r.error };
  return { success: true, data: r.data };
}

/**
 * Policy gate before Phase C: empty allowed views is only valid with explicit audit lines
 * (denial, clarification, or documented fallback intent — human-readable strings).
 */
export function assertResolutionForSurfaceDerivation(resolution: IntentLoopResolution): void {
  const parsed = intentLoopResolutionSchema.safeParse(resolution);
  if (!parsed.success) {
    throw new Error(
      `IntentLoopResolution invalid: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    );
  }
  const views = parsed.data.allowedCanvasViewIds;
  const empty = views == null || views.length === 0;
  if (empty) {
    const notes = parsed.data.auditNotes?.filter((n) => n.trim().length > 0) ?? [];
    if (notes.length === 0) {
      throw new Error(
        "IntentLoopResolution: allowedCanvasViewIds is empty but auditNotes is missing or empty — fail-closed policy requires explicit audit when no views are allowed (see INTENT_LOOP_FAIL_CLOSED_FALLBACK_VIEW_IDS / VOICE_FIRST_INTERFACE_PIPELINE_V1).",
      );
    }
  }
}
