/**
 * Design Studio persisted state — lives under site_configs.metadata.designStudio.
 * @see AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md
 *
 * - designStudioStateVersion: explicit contract for readers (migrations).
 * - version: legacy alias; both are always 1 for v1 blobs.
 * - intentSummary.confidence is in [0, 1] (classification convention).
 */

import { z } from "zod";

export const DESIGN_STUDIO_PHASE_KEYS = [
  "intake",
  "plan",
  "theme",
  "data_input",
  "data_output",
  "components",
  "test_save",
  "agent_layer",
] as const;

export type DesignStudioPhaseKey = (typeof DESIGN_STUDIO_PHASE_KEYS)[number];

const phaseKeyZod = z.enum([
  "intake",
  "plan",
  "theme",
  "data_input",
  "data_output",
  "components",
  "test_save",
  "agent_layer",
]);

export function phaseKeyAtIndex(index: number): DesignStudioPhaseKey {
  const i = Math.max(0, Math.min(7, Math.floor(index)));
  return DESIGN_STUDIO_PHASE_KEYS[i]!;
}

/** Structured intent for compiler, analytics, and resume (confidence ∈ [0, 1]). */
export const designIntentSummarySchema = z.object({
  raw: z.string().min(1),
  classified_intent: z.string().min(1),
  project_type: z.enum(["view", "app"]),
  confidence: z.number().min(0).max(1),
});

export type DesignIntentSummary = z.infer<typeof designIntentSummarySchema>;

export const PROJECT_STATUS_KEYS = [
  "draft",
  "planning",
  "building",
  "testing",
  "ready",
  "published",
] as const;

export type DesignStudioProjectStatus = (typeof PROJECT_STATUS_KEYS)[number];

export const designStudioProjectSchema = z.object({
  buildMode: z.enum(["build_view", "build_app"]),
  stepIndex: z.number().int().min(0).max(7),
  stepKey: phaseKeyZod,
  project_status: z.enum(PROJECT_STATUS_KEYS).default("draft"),
  planVersion: z.string().optional(),
  themeProfileId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  phaseOutputs: z.record(z.string(), z.unknown()).optional(),
  intentSummary: designIntentSummarySchema.optional(),
  handoffReason: z.enum(["user_requested_design"]).optional(),
  referringAgentId: z.string().optional(),
  entrySurface: z.enum(["voice", "text"]).optional(),
});

export type DesignStudioProject = z.infer<typeof designStudioProjectSchema>;

export const designStudioStateSchema = z.object({
  designStudioStateVersion: z.literal(1),
  version: z.literal(1),
  activeProjectId: z.string().nullable(),
  projects: z.record(z.string(), designStudioProjectSchema),
});

export type DesignStudioState = z.infer<typeof designStudioStateSchema>;

export const DEFAULT_DESIGN_STUDIO_STATE: DesignStudioState = {
  designStudioStateVersion: 1,
  version: 1,
  activeProjectId: null,
  projects: {},
};

/** PATCH body: partial top-level + per-project partial merges (no new project IDs — handoff only). */
export const designStudioPatchSchema = z
  .object({
    activeProjectId: z.string().nullable().optional(),
    projects: z.record(z.string(), designStudioProjectSchema.partial()).optional(),
  })
  .strict();

export type DesignStudioPatch = z.infer<typeof designStudioPatchSchema>;

export class DesignStudioMergeError extends Error {
  constructor(
    public readonly code: "NEW_PROJECT_VIA_PATCH_FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "DesignStudioMergeError";
  }
}

/** Stable codes for UI, analytics, and policy. */
export type PublishBlockerCode =
  | "LIFECYCLE_NOT_READY"
  | "WORKFLOW_INCOMPLETE"
  | "MISSING_THEME"
  | "AGENT_LAYER_INCOMPLETE";

export interface PublishBlocker {
  code: PublishBlockerCode;
  message: string;
}

export interface DesignStudioEntryContext {
  projectId: string;
  project_status: DesignStudioProjectStatus;
  stepKey: DesignStudioPhaseKey;
  stepIndex: number;
  buildMode: DesignStudioProject["buildMode"];
  intentSummary: DesignIntentSummary | null;
  handoffReason: DesignStudioProject["handoffReason"];
  entrySurface: DesignStudioProject["entrySurface"];
  referringAgentId: string | undefined;
  publishBlockers: PublishBlocker[];
  readyToPublish: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Normalize legacy blobs before strict Zod parse. */
function normalizeDesignStudioBlob(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return { ...DEFAULT_DESIGN_STUDIO_STATE };
  }
  const o: Record<string, unknown> = { ...raw };
  if (o.designStudioStateVersion == null && o.version === 1) {
    o.designStudioStateVersion = 1;
  }
  if (o.version == null && o.designStudioStateVersion === 1) {
    o.version = 1;
  }
  if (!isRecord(o.projects)) {
    o.projects = {};
  } else {
    const pr: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o.projects as Record<string, unknown>)) {
      pr[k] = normalizeProjectBlob(v);
    }
    o.projects = pr;
  }
  return o;
}

function normalizeProjectBlob(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  const p: Record<string, unknown> = { ...raw };
  if (p.project_status == null) p.project_status = "draft";
  return p;
}

export function parseDesignStudioFromMetadata(metadata: unknown): DesignStudioState {
  if (!isRecord(metadata)) {
    return { ...DEFAULT_DESIGN_STUDIO_STATE };
  }
  const normalized = normalizeDesignStudioBlob(metadata.designStudio);
  const parsed = designStudioStateSchema.safeParse(normalized);
  if (!parsed.success) {
    return { ...DEFAULT_DESIGN_STUDIO_STATE };
  }
  return parsed.data;
}

export function mergeDesignStudioPatch(
  base: DesignStudioState,
  patch: DesignStudioPatch,
): DesignStudioState {
  const now = new Date().toISOString();
  const projects: Record<string, DesignStudioProject> = { ...base.projects };

  if (patch.projects) {
    for (const [projectId, delta] of Object.entries(patch.projects)) {
      const prev = projects[projectId];
      if (!prev) {
        throw new DesignStudioMergeError(
          "NEW_PROJECT_VIA_PATCH_FORBIDDEN",
          "New design studio projects must be created via POST /api/site-configs/:id/design-studio/handoff, not PATCH.",
        );
      }
      const stepIndex =
        delta.stepIndex !== undefined ? delta.stepIndex : prev.stepIndex;
      const mergedRaw = {
        ...prev,
        ...delta,
        stepIndex,
        stepKey: delta.stepKey ?? phaseKeyAtIndex(stepIndex),
        updatedAt: now,
        createdAt: prev.createdAt,
      };
      projects[projectId] = designStudioProjectSchema.parse(mergedRaw);
    }
  }

  return designStudioStateSchema.parse({
    designStudioStateVersion: 1,
    version: 1,
    activeProjectId:
      patch.activeProjectId !== undefined ? patch.activeProjectId : base.activeProjectId,
    projects,
  });
}

export function getActiveDesignStudioProject(
  state: DesignStudioState,
): { projectId: string; project: DesignStudioProject } | null {
  const id = state.activeProjectId;
  if (!id) return null;
  const project = state.projects[id];
  if (!project) return null;
  return { projectId: id, project };
}

export function getDesignStudioPublishBlockers(project: DesignStudioProject): PublishBlocker[] {
  const blockers: PublishBlocker[] = [];

  if (project.project_status === "published") {
    return [];
  }

  if (project.project_status !== "ready") {
    blockers.push({
      code: "LIFECYCLE_NOT_READY",
      message: `Project status must be "ready" before publish (current: "${project.project_status}").`,
    });
  }

  if (project.stepKey !== "agent_layer") {
    blockers.push({
      code: "WORKFLOW_INCOMPLETE",
      message: "Publish requires completing the workflow through the agent_layer phase.",
    });
  }

  const hasTheme =
    Boolean(project.themeProfileId) ||
    Boolean(
      project.phaseOutputs &&
        isRecord(project.phaseOutputs.theme) &&
        Object.keys(project.phaseOutputs.theme as object).length > 0,
    );
  if (!hasTheme) {
    blockers.push({
      code: "MISSING_THEME",
      message: "Theme is not confirmed (set themeProfileId or phaseOutputs.theme).",
    });
  }

  const agentOut = project.phaseOutputs?.agent_layer;
  if (agentOut == null || (isRecord(agentOut) && Object.keys(agentOut).length === 0)) {
    blockers.push({
      code: "AGENT_LAYER_INCOMPLETE",
      message: "Agent layer outputs are missing (phaseOutputs.agent_layer).",
    });
  }

  return blockers;
}

export function isDesignStudioReadyForPublish(project: DesignStudioProject): boolean {
  return getDesignStudioPublishBlockers(project).length === 0;
}

export function getDesignStudioEntryContext(
  projectId: string,
  project: DesignStudioProject,
): DesignStudioEntryContext {
  const publishBlockers = getDesignStudioPublishBlockers(project);
  return {
    projectId,
    project_status: project.project_status,
    stepKey: project.stepKey,
    stepIndex: project.stepIndex,
    buildMode: project.buildMode,
    intentSummary: project.intentSummary ?? null,
    handoffReason: project.handoffReason,
    entrySurface: project.entrySurface,
    referringAgentId: project.referringAgentId,
    publishBlockers,
    readyToPublish: publishBlockers.length === 0,
  };
}

function buildModeFromProjectType(t: "view" | "app"): DesignStudioProject["buildMode"] {
  return t === "view" ? "build_view" : "build_app";
}

/**
 * Apply primary-agent handoff: create or resume project, set activeProjectId, persist handoff fields.
 * Caller supplies projectId when the client omits designProjectId (e.g. randomUUID() on server).
 */
export function applyDesignStudioHandoff(
  base: DesignStudioState,
  args: {
    projectId: string;
    intentSummary: DesignIntentSummary;
    handoffReason: "user_requested_design";
    referringAgentId: string;
    entrySurface: "voice" | "text";
  },
): DesignStudioState {
  const now = new Date().toISOString();
  const { projectId } = args;
  const projects: Record<string, DesignStudioProject> = { ...base.projects };
  const existing = projects[projectId];

  const buildMode = buildModeFromProjectType(args.intentSummary.project_type);

  if (existing) {
    projects[projectId] = designStudioProjectSchema.parse({
      ...existing,
      buildMode: existing.buildMode,
      intentSummary: args.intentSummary,
      handoffReason: args.handoffReason,
      referringAgentId: args.referringAgentId,
      entrySurface: args.entrySurface,
      updatedAt: now,
    });
  } else {
    projects[projectId] = designStudioProjectSchema.parse({
      buildMode,
      stepIndex: 0,
      stepKey: phaseKeyAtIndex(0),
      project_status: "draft",
      createdAt: now,
      updatedAt: now,
      intentSummary: args.intentSummary,
      handoffReason: args.handoffReason,
      referringAgentId: args.referringAgentId,
      entrySurface: args.entrySurface,
    });
  }

  return designStudioStateSchema.parse({
    designStudioStateVersion: 1,
    version: 1,
    activeProjectId: projectId,
    projects,
  });
}

/** Mark project published after gates pass (use with policy + publish blockers). */
export function markDesignStudioProjectPublished(
  base: DesignStudioState,
  projectId: string,
): DesignStudioState {
  const now = new Date().toISOString();
  const prev = base.projects[projectId];
  if (!prev) {
    throw new Error(`Unknown design studio projectId: ${projectId}`);
  }
  const projects = {
    ...base.projects,
    [projectId]: designStudioProjectSchema.parse({
      ...prev,
      project_status: "published",
      updatedAt: now,
    }),
  };
  return designStudioStateSchema.parse({
    designStudioStateVersion: 1,
    version: 1,
    activeProjectId: base.activeProjectId,
    projects,
  });
}
