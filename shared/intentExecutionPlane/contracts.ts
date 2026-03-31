import { z } from "zod";

export const WORK_ITEM_STATUSES = [
  "queued",
  "active",
  "blocked",
  "review",
  "done",
] as const;

export const INTENT_EXECUTION_STATES = [
  "planning",
  "executing",
  "review",
  "completed",
  "failed",
] as const;

export const SCOPE_EXECUTION_STATES = [
  "queued",
  "active",
  "blocked",
  "done",
] as const;

export const ACTION_RUN_STATES = [
  "queued",
  "running",
  "blocked",
  "succeeded",
  "failed",
] as const;

export const APPROVAL_TIERS = [
  "tier0",
  "tier1",
  "tier2",
  "tier3",
] as const;

export const REVIEW_GATE_STATES = [
  "pending",
  "satisfied",
  "failed",
] as const;

export const CODING_SCOPE_KEYS = [
  "workspace_scope",
  "ui_scope",
  "voice_scope",
  "canvas_scope",
  "routing_scope",
  "governance_scope",
  "verification_scope",
  "migration_scope",
] as const;

export const CODING_SKILL_KEYS = [
  "repo_analysis",
  "branch_preparation",
  "workspace_integration",
  "ui_generation",
  "canvas_surface_derivation",
  "voice_verification",
  "registry_alignment",
  "route_contract_design",
  "test_verification",
  "review_packaging",
] as const;

export const CODING_ACTION_KEYS = [
  "create_branch",
  "create_worktree",
  "inspect_files",
  "modify_files",
  "call_workspace_mcp",
  "call_shadcn_mcp",
  "run_checks",
  "summarize_diff",
  "package_review_artifacts",
  "open_or_update_pr",
] as const;

export const CODING_AGENT_ROLE_TYPES = [
  "coding_intent_orchestrator",
  "workspace_integration_agent",
  "ui_agent",
  "canvas_orchestration_agent",
  "registry_governance_agent",
  "routing_agent",
  "verification_agent",
  "voice_architect_agent",
  "sovereign_coder",
] as const;

export const CHECK_RUN_STATUSES = ["passed", "failed", "skipped"] as const;
export const FILE_CHANGE_TYPES = ["added", "modified", "deleted"] as const;

export type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number];
export type IntentExecutionState = (typeof INTENT_EXECUTION_STATES)[number];
export type ScopeExecutionState = (typeof SCOPE_EXECUTION_STATES)[number];
export type ActionRunState = (typeof ACTION_RUN_STATES)[number];
export type ApprovalTier = (typeof APPROVAL_TIERS)[number];
export type ReviewGateState = (typeof REVIEW_GATE_STATES)[number];
export type CodingScopeKey = (typeof CODING_SCOPE_KEYS)[number];
export type CodingSkillKey = (typeof CODING_SKILL_KEYS)[number];
export type CodingActionKey = (typeof CODING_ACTION_KEYS)[number];
export type CodingAgentRoleType = (typeof CODING_AGENT_ROLE_TYPES)[number];

export const RequiredCheckSchema = z.object({
  cmd: z.string().min(1),
  timeoutSec: z.number().int().positive().max(7200).optional(),
});

export const PolicyContextSchema = z.object({
  approvalTier: z.enum(APPROVAL_TIERS),
  authorizedDomains: z.array(z.string().min(1)).default([]),
  evidenceRequirements: z.array(z.string().min(1)).default([]),
  requiredReviewGates: z.array(z.string().min(1)).default([]),
});

export const WorkItemSchema = z.object({
  id: z.string().uuid(),
  siteConfigId: z.string().min(1).nullable().optional(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  requestedBy: z.string().optional().nullable(),
  status: z.enum(WORK_ITEM_STATUSES),
  createdAt: z.string().datetime(),
});

export const IntentExecutionSchema = z.object({
  id: z.string().uuid(),
  workItemId: z.string().uuid(),
  siteConfigId: z.string().min(1).nullable().optional(),
  orchestrationRunId: z.string().uuid().nullable().optional(),
  intentKey: z.string().min(1),
  intentInput: z.record(z.unknown()).default({}),
  state: z.enum(INTENT_EXECUTION_STATES),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable().optional(),
});

export const ScopeExecutionSchema = z.object({
  id: z.string().uuid(),
  intentExecutionId: z.string().uuid(),
  scopeKey: z.enum(CODING_SCOPE_KEYS),
  state: z.enum(SCOPE_EXECUTION_STATES),
  assignedAgentRoleType: z.enum(CODING_AGENT_ROLE_TYPES).nullable().optional(),
  scopePlan: z.record(z.unknown()).default({}),
});

export const SkillBindingSchema = z.object({
  id: z.string().uuid(),
  scopeExecutionId: z.string().uuid(),
  skillKey: z.enum(CODING_SKILL_KEYS),
  skillConfig: z.record(z.unknown()).default({}),
});

export const ExecutionPacketSchema = z.object({
  id: z.string().uuid(),
  intentExecutionId: z.string().uuid(),
  scopeExecutionId: z.string().uuid().nullable().optional(),
  repoRef: z.string().min(1),
  baseBranch: z.string().min(1),
  featureBranch: z.string().min(1),
  worktreePath: z.string().min(1).optional(),
  policyContext: PolicyContextSchema,
  requiredChecks: z.array(RequiredCheckSchema).default([]),
});

export const ActionRequestSchema = z.object({
  skillKey: z.enum(CODING_SKILL_KEYS),
  actionKey: z.enum(CODING_ACTION_KEYS),
  input: z.record(z.unknown()).default({}),
});

export const ActionRunSchema = z.object({
  id: z.string().uuid(),
  scopeExecutionId: z.string().uuid(),
  skillBindingId: z.string().uuid().nullable().optional(),
  orchestrationRunId: z.string().uuid().nullable().optional(),
  agentId: z.string().min(1).nullable().optional(),
  actionKey: z.enum(CODING_ACTION_KEYS),
  state: z.enum(ACTION_RUN_STATES),
  input: z.record(z.unknown()).default({}),
  output: z.record(z.unknown()).default({}),
});

export const FileTouchSchema = z.object({
  path: z.string().min(1),
  changeType: z.enum(FILE_CHANGE_TYPES),
});

export const CheckRunSchema = z.object({
  cmd: z.string().min(1),
  status: z.enum(CHECK_RUN_STATUSES),
  artifactUri: z.string().min(1).optional(),
  outputSnippet: z.string().optional(),
});

export const OutcomePacketSchema = z.object({
  id: z.string().uuid(),
  intentExecutionId: z.string().uuid(),
  summary: z.record(z.unknown()).default({}),
  filesTouched: z.array(FileTouchSchema).default([]),
  domainsTouched: z.array(z.string().min(1)).default([]),
  checksRun: z.array(CheckRunSchema).default([]),
  risks: z.array(z.string().min(1)).default([]),
  reviewReady: z.boolean(),
  requiredGates: z.array(z.string().min(1)).default([]),
});

export const OutcomePacketFragmentSchema = OutcomePacketSchema.omit({
  id: true,
  intentExecutionId: true,
}).extend({
  summary: z.record(z.unknown()).default({}),
});

export const EvidenceArtifactSchema = z.object({
  id: z.string().uuid(),
  actionRunId: z.string().uuid(),
  kind: z.string().min(1),
  uri: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
});

export const ReviewGateSchema = z.object({
  id: z.string().uuid(),
  outcomePacketId: z.string().uuid(),
  gateKey: z.string().min(1),
  state: z.enum(REVIEW_GATE_STATES),
  requirements: z.record(z.unknown()).default({}),
});

export const PullRequestLinkSchema = z.object({
  id: z.string().uuid(),
  intentExecutionId: z.string().uuid(),
  provider: z.string().min(1),
  repo: z.string().min(1),
  prNumber: z.number().int().positive().nullable().optional(),
  prUrl: z.string().min(1).nullable().optional(),
  branchName: z.string().min(1).nullable().optional(),
  status: z.string().min(1).default("open"),
});

export const CreateCodingIntentRequestSchema = z.object({
  siteConfigId: z.string().min(1).optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  requestedBy: z.string().optional(),
  intentKey: z.string().min(1),
  intentInput: z.record(z.unknown()).default({}),
});

export const BindSkillsRequestSchema = z.object({
  replaceExisting: z.boolean().default(false),
});

export const CreateExecutionPacketRequestSchema = z.object({
  scopeExecutionId: z.string().uuid(),
  repoRef: z.string().min(1).default("gateway-global-ai-platform"),
  baseBranch: z.string().min(1).default("main"),
  featureBranchName: z.string().min(1).optional(),
  createBranch: z.boolean().default(true),
  createWorktree: z.boolean().default(true),
});

export const UpgradedLocalAgentTaskBodySchema = z.object({
  taskType: z.enum(["governance", "code", "agent", "ui"]).optional(),
  prompt: z.string().min(1).max(60_000).optional(),
  siteConfigId: z.string().min(1),
  agentId: z.string().min(1),
  subAgentOf: z.string().optional(),
  workItemId: z.string().uuid().optional(),
  intentExecutionId: z.string().uuid().optional(),
  scopeExecutionId: z.string().uuid().optional(),
  executionPacket: ExecutionPacketSchema.optional(),
  actionRequest: ActionRequestSchema.optional(),
  responseSchemaId: z.string().min(1).optional(),
}).superRefine((value, ctx) => {
  if (!value.prompt && !value.actionRequest) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["prompt"],
      message: "prompt or actionRequest is required",
    });
  }
  if (value.actionRequest && !value.scopeExecutionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["scopeExecutionId"],
      message: "scopeExecutionId is required when actionRequest is provided",
    });
  }
});

export type RequiredCheck = z.infer<typeof RequiredCheckSchema>;
export type PolicyContext = z.infer<typeof PolicyContextSchema>;
export type WorkItem = z.infer<typeof WorkItemSchema>;
export type IntentExecution = z.infer<typeof IntentExecutionSchema>;
export type ScopeExecution = z.infer<typeof ScopeExecutionSchema>;
export type SkillBinding = z.infer<typeof SkillBindingSchema>;
export type ExecutionPacket = z.infer<typeof ExecutionPacketSchema>;
export type ActionRequest = z.infer<typeof ActionRequestSchema>;
export type ActionRun = z.infer<typeof ActionRunSchema>;
export type FileTouch = z.infer<typeof FileTouchSchema>;
export type CheckRun = z.infer<typeof CheckRunSchema>;
export type OutcomePacket = z.infer<typeof OutcomePacketSchema>;
export type OutcomePacketFragment = z.infer<typeof OutcomePacketFragmentSchema>;
export type EvidenceArtifact = z.infer<typeof EvidenceArtifactSchema>;
export type ReviewGate = z.infer<typeof ReviewGateSchema>;
export type PullRequestLink = z.infer<typeof PullRequestLinkSchema>;
export type CreateCodingIntentRequest = z.infer<typeof CreateCodingIntentRequestSchema>;
export type CreateExecutionPacketRequest = z.infer<typeof CreateExecutionPacketRequestSchema>;
export type UpgradedLocalAgentTaskBody = z.infer<typeof UpgradedLocalAgentTaskBodySchema>;
