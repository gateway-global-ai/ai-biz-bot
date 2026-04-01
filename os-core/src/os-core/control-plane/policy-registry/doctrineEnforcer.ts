/**
 * Doctrine Enforcer — maps AI_OS_OPERATING_DOCTRINE_V1.md to runtime assertions.
 *
 * Each doctrine principle becomes a machine-enforceable check:
 *
 * | Doctrine | Policy Rule | Violation Code |
 * |----------|-------------|----------------|
 * | D1 Intent is the interface | Execution only through intent loop | BYPASS_INTENT_LOOP |
 * | D2 Model proposes, OS decides | No action without PolicyDecision | DIRECT_EXECUTION |
 * | D2 Model proposes, OS decides | No prompt-derived permissions | PROMPT_POLICY |
 * | D5 Skill indirection | No direct tool/MCP calls from model | DIRECT_TOOL_CALL |
 * | D6 Fallback required | H >= threshold enforced on output | NO_FALLBACK |
 * | D7 Node is the unit | Views must be in registry | UNREGISTERED_VIEW |
 * | D7 Node is the unit | Actions must be in registry | UNREGISTERED_ACTION |
 * | D10 Single authority | No duplicate authority sources | SPLIT_AUTHORITY |
 * | D10 Single authority | No new routes in legacy monolith | MONOLITH_ROUTE |
 * | D4 Proficiency first | Agent must pass threshold | UNPROFICIENT_DEPLOYMENT |
 * | D3 Profiles are data | DISC/ARCH must be numeric | PROSE_BEHAVIOR |
 * | D8 Voice-first | Canvas view in allowedViewIds | CANVAS_BYPASS |
 *
 * This module provides:
 * 1. Runtime assertion functions (throw on violation in strict mode, log in permissive)
 * 2. Lint-ready check functions (return violations for CI/scanners)
 * 3. Integration with PolicyDecision.doctrineViolations field
 */

import type { DoctrineViolationCode } from "../../../../../shared/policyDecisionContract.js";
import { isRegisteredGate, getGateEntry } from "./policyGateCatalog.js";

export type DoctrineEnforcementMode = "strict" | "permissive" | "audit_only";

let _mode: DoctrineEnforcementMode = "permissive";

/**
 * Protected surfaces — these get strict enforcement regardless of global mode.
 * A surface is "protected" when a doctrine violation on it would compromise
 * security, billing, or customer trust.
 *
 * Pattern: file path prefix or route path prefix.
 */
const STRICT_SURFACES = new Set([
  "server/services/executionMutationGate",
  "server/middleware/policyGate",
  "server/routes/siteConfigRoutes",
  "server/routes/agentSystemRoutes",
  "server/routes/telephonyRoutes",
  "server/routes/billingRoutes",
  "server/routes/secureVaultRoutes",
  "server/routes/businessTelephonyRoutes",
  "server/routes/platformLicenseRoutes",
  "os-core/control-plane/action-registry",
  "os-core/control-plane/policy-registry",
]);

/**
 * Resolve enforcement mode for a given file/surface.
 * Protected surfaces always get strict; everything else uses the global mode.
 */
export function resolveEnforcementMode(file?: string): DoctrineEnforcementMode {
  if (!file) return _mode;
  for (const surface of STRICT_SURFACES) {
    if (file.includes(surface)) return "strict";
  }
  return _mode;
}

export function setDoctrineEnforcementMode(mode: DoctrineEnforcementMode): void {
  _mode = mode;
}

export function getDoctrineEnforcementMode(): DoctrineEnforcementMode {
  return _mode;
}

export function addStrictSurface(surfacePrefix: string): void {
  STRICT_SURFACES.add(surfacePrefix);
}

export function getStrictSurfaces(): ReadonlySet<string> {
  return STRICT_SURFACES;
}

export interface DoctrineViolation {
  code: DoctrineViolationCode;
  doctrine: number;
  detail: string;
  file?: string;
  line?: number;
}

const _violations: DoctrineViolation[] = [];

function recordViolation(v: DoctrineViolation): void {
  _violations.push(v);
  const prefix = `[DoctrineViolation:${v.code}]`;
  const loc = v.file ? ` (${v.file}${v.line ? `:${v.line}` : ""})` : "";
  const msg = `${prefix} D${v.doctrine}: ${v.detail}${loc}`;

  const effectiveMode = resolveEnforcementMode(v.file);

  if (effectiveMode === "strict") {
    throw new Error(msg);
  } else if (effectiveMode === "permissive") {
    console.warn(msg);
  }
}

export function getRecordedViolations(): readonly DoctrineViolation[] {
  return _violations;
}

export function clearRecordedViolations(): void {
  _violations.length = 0;
}

// ── D2: No execution without PolicyDecision ───────────────────────────────

/**
 * Assert that an action is being executed through a PolicyDecision gate.
 * Call at the top of any mutation handler that should be governed.
 */
export function assertPolicyGated(params: {
  hasPolicyDecision: boolean;
  actionId?: string;
  file?: string;
}): void {
  if (!params.hasPolicyDecision) {
    recordViolation({
      code: "DOCTRINE_VIOLATION_DIRECT_EXECUTION",
      doctrine: 2,
      detail: `Action "${params.actionId ?? "unknown"}" executed without PolicyDecision`,
      file: params.file,
    });
  }
}

/**
 * Assert that a permission was not derived from prompt text.
 * Call when evaluating access — if the source is "prompt" or "system_instruction",
 * it's a doctrine violation.
 */
export function assertNotPromptPolicy(params: {
  permissionSource: string;
  gate?: string;
  file?: string;
}): void {
  const src = params.permissionSource.toLowerCase();
  if (src === "prompt" || src === "system_instruction" || src === "model_output") {
    recordViolation({
      code: "DOCTRINE_VIOLATION_PROMPT_POLICY",
      doctrine: 2,
      detail: `Permission for gate "${params.gate ?? "unknown"}" derived from "${params.permissionSource}" instead of registry/policy`,
      file: params.file,
    });
  }
}

// ── D5: Skill indirection ─────────────────────────────────────────────────

/**
 * Assert that a tool call goes through the skill adapter, not directly.
 * Call in tool execution paths to verify indirection.
 */
export function assertSkillIndirection(params: {
  hasSkillAdapter: boolean;
  toolName?: string;
  file?: string;
}): void {
  if (!params.hasSkillAdapter) {
    recordViolation({
      code: "DOCTRINE_VIOLATION_DIRECT_TOOL_CALL",
      doctrine: 5,
      detail: `Tool "${params.toolName ?? "unknown"}" invoked without skill adapter`,
      file: params.file,
    });
  }
}

// ── D6: Fallback required ─────────────────────────────────────────────────

/**
 * Assert that a response includes a handoff cue when required.
 * Call after ARCH envelope validation.
 */
export function assertFallbackPresent(params: {
  handoffSlider: number;
  hasHandoffCue: boolean;
  file?: string;
}): void {
  if (params.handoffSlider >= 50 && !params.hasHandoffCue) {
    recordViolation({
      code: "DOCTRINE_VIOLATION_NO_FALLBACK",
      doctrine: 6,
      detail: `Response missing handoff/next-step cue (H=${params.handoffSlider}, threshold=50)`,
      file: params.file,
    });
  }
}

// ── D7: View/action must be registered ────────────────────────────────────

/**
 * Assert that a view is in the canvas view registry.
 */
export function assertRegisteredView(params: {
  viewId: string;
  registeredViewIds: Set<string> | string[];
  file?: string;
}): void {
  const registered = params.registeredViewIds instanceof Set
    ? params.registeredViewIds
    : new Set(params.registeredViewIds);
  if (!registered.has(params.viewId)) {
    recordViolation({
      code: "DOCTRINE_VIOLATION_UNREGISTERED_VIEW",
      doctrine: 7,
      detail: `View "${params.viewId}" is not in the canvas view registry`,
      file: params.file,
    });
  }
}

/**
 * Assert that an action is in the actions registry.
 */
export function assertRegisteredAction(params: {
  actionId: string;
  registeredActionIds: Set<string> | string[];
  file?: string;
}): void {
  const registered = params.registeredActionIds instanceof Set
    ? params.registeredActionIds
    : new Set(params.registeredActionIds);
  if (!registered.has(params.actionId)) {
    recordViolation({
      code: "DOCTRINE_VIOLATION_UNREGISTERED_ACTION",
      doctrine: 7,
      detail: `Action "${params.actionId}" is not in the actions registry`,
      file: params.file,
    });
  }
}

// ── D10: Single authority ─────────────────────────────────────────────────

/**
 * Assert that a gate is backed by the registry catalog (not hardcoded elsewhere).
 */
export function assertSingleAuthority(params: {
  gateId: string;
  file?: string;
}): void {
  if (!isRegisteredGate(params.gateId)) {
    recordViolation({
      code: "DOCTRINE_VIOLATION_SPLIT_AUTHORITY",
      doctrine: 10,
      detail: `Gate "${params.gateId}" is not in the registry catalog — potential split authority`,
      file: params.file,
    });
  }
}

// ── D4: Proficiency gating ────────────────────────────────────────────────

/**
 * Assert that an agent has passed proficiency threshold before deployment.
 */
export function assertProficiencyGated(params: {
  aptitudeScore: number;
  threshold?: number;
  agentId?: string;
  file?: string;
}): void {
  const threshold = params.threshold ?? 80;
  if (params.aptitudeScore < threshold) {
    recordViolation({
      code: "DOCTRINE_VIOLATION_UNPROFICIENT_DEPLOYMENT",
      doctrine: 4,
      detail: `Agent "${params.agentId ?? "unknown"}" score ${params.aptitudeScore} < threshold ${threshold}`,
      file: params.file,
    });
  }
}

// ── D1: Intent loop required ──────────────────────────────────────────────

/**
 * Assert that execution happened through the intent loop, not a direct path.
 */
export function assertIntentLoopPath(params: {
  hasIntentLoopResolution: boolean;
  endpoint?: string;
  file?: string;
}): void {
  if (!params.hasIntentLoopResolution) {
    recordViolation({
      code: "DOCTRINE_VIOLATION_BYPASS_INTENT_LOOP",
      doctrine: 1,
      detail: `Execution at "${params.endpoint ?? "unknown"}" bypassed the intent loop`,
      file: params.file,
    });
  }
}

// ── D8: Canvas bypass ─────────────────────────────────────────────────────

/**
 * Assert that a canvas render is within the allowedViewIds from the intent loop.
 */
export function assertCanvasWithinAllowedViews(params: {
  renderingViewId: string;
  allowedViewIds: string[];
  file?: string;
}): void {
  if (!params.allowedViewIds.includes(params.renderingViewId)) {
    recordViolation({
      code: "DOCTRINE_VIOLATION_CANVAS_BYPASS",
      doctrine: 8,
      detail: `Canvas rendering "${params.renderingViewId}" which is not in allowedViewIds [${params.allowedViewIds.join(", ")}]`,
      file: params.file,
    });
  }
}

// ── D11: Knowledge governance ─────────────────────────────────────────────

/**
 * Assert that knowledge was filtered through the certification pipeline
 * before being injected into a model's context.
 */
export function assertKnowledgeCertified(params: {
  path: string;
  usesGovernedBridge: boolean;
  file?: string;
}): void {
  if (!params.usesGovernedBridge) {
    recordViolation({
      code: "DOCTRINE_VIOLATION_UNCERTIFIED_KNOWLEDGE",
      doctrine: 11,
      detail: `Knowledge injection at "${params.path}" bypasses the governed knowledge bridge (assembleGovernedKnowledge)`,
      file: params.file,
    });
  }
}

/**
 * Assert that LLM inference output is not being treated as an authoritative
 * knowledge source (e.g. stored with certification level "approved" or "trusted").
 */
export function assertInferenceNotAuthority(params: {
  sourceType: string;
  certificationLevel: string;
  file?: string;
}): void {
  if (
    params.sourceType === "inference" &&
    (params.certificationLevel === "approved" || params.certificationLevel === "trusted")
  ) {
    recordViolation({
      code: "DOCTRINE_VIOLATION_INFERENCE_AS_AUTHORITY",
      doctrine: 11,
      detail: `Inference output classified as "${params.certificationLevel}" — LLM output must never be treated as authoritative knowledge`,
      file: params.file,
    });
  }
}

// ── Batch check for lint/CI ───────────────────────────────────────────────

export interface DoctrineCheckResult {
  violations: DoctrineViolation[];
  passed: boolean;
}

/**
 * Run a batch of doctrine checks and return structured results.
 * For CI integration: exit 1 if any violations found.
 */
export function runDoctrineChecks(checks: Array<() => void>): DoctrineCheckResult {
  clearRecordedViolations();
  const prevMode = _mode;
  _mode = "audit_only";

  for (const check of checks) {
    try {
      check();
    } catch {
      // audit_only mode should not throw, but catch defensively
    }
  }

  _mode = prevMode;
  const violations = [..._violations];
  return { violations, passed: violations.length === 0 };
}
