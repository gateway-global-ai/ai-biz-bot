/**
 * Design Studio (Chad) — compiler fragments only. Do not embed in UI.
 * @see AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md
 */

import type { DesignStudioState } from "@shared/designStudioState";
import {
  DESIGN_STUDIO_PHASE_KEYS,
  getActiveDesignStudioProject,
  getDesignStudioEntryContext,
  type DesignStudioPhaseKey,
} from "@shared/designStudioState";

const PHASE_PLAYBOOK: Record<
  DesignStudioPhaseKey,
  { title: string; goals: string; outputs: string }
> = {
  intake: {
    title: "Phase 1 — Intake",
    goals: "Confirm project type, business goal, and success criteria with the owner.",
    outputs: "project_type, business_goal, success_criteria",
  },
  plan: {
    title: "Phase 2 — Plan",
    goals: "Produce a concise plan: required data, recommended layout, and risks.",
    outputs: "plan_summary, required_data, recommended_layout",
  },
  theme: {
    title: "Phase 3 — Theme",
    goals: "Lock theme tokens and background mode; no ad-hoc hex or raw CSS colors.",
    outputs: "theme_profile, background_mode",
  },
  data_input: {
    title: "Phase 4 — Data input",
    goals: "Map read paths and query parameters; stay within governed data contracts.",
    outputs: "data_sources, query_params",
  },
  data_output: {
    title: "Phase 5 — Data output",
    goals: "Define write actions and validation rules; refuse unspecified side effects.",
    outputs: "write_actions, validation_rules",
  },
  components: {
    title: "Phase 6 — Components",
    goals:
      "Select components and layout; Shadcn is discovery-only until promoted into @/ui-core per manifest.",
    outputs: "selected_components, layout_structure",
  },
  test_save: {
    title: "Phase 7 — Test + save",
    goals: "Exercise the flow, record test results, and choose save target.",
    outputs: "test_results, save_target",
  },
  agent_layer: {
    title: "Phase 8 — Agent layer",
    goals:
      "Wire knowledge and behavior config to the prompt compiler and policy gates — no prompt dumping in the client.",
    outputs: "knowledge_config, behavior_config",
  },
};

function formatPhaseList(): string {
  return DESIGN_STUDIO_PHASE_KEYS.map((key, i) => {
    const p = PHASE_PLAYBOOK[key];
    return `${i + 1}. **${p.title}** — ${p.goals}\n   - Capture: \`${p.outputs}\``;
  }).join("\n");
}

const VIEW1_VOICE =
  "VIEW 1 (voice entry): Greet the owner by first name if known. In one short breath, say you are the Design Studio agent, you help ship views and multi-step apps under Gateway governance, and ask what they want to build or change today. Then stop and listen.";

const VIEW1_TEXT =
  "VIEW 1 (text entry): Open with a single line of acknowledgment, then ask one focused question: build a single customer-facing view, or a multi-step app? Offer both as explicit choices. Keep messages short.";

const GOVERNANCE_CORE = `GOVERNANCE (non-negotiable):
- Shadcn MCP and external catalogs are **discovery_only** until reviewed and promoted into the Gateway SDK manifest and @/ui-core wrappers.
- Do not invent theme colors or inline styles; use approved theme tokens and registry entries.
- Persist state only through governed actions and APIs — do not claim writes occurred without confirmation.
- When uncertain on policy or certification, pause and route to a human operator or documented next step — do not fabricate compliance.`;

/** One sentence max; no repetition with VIEW1 or playbook. */
function handoffAwareIntro(ctx: ReturnType<typeof getDesignStudioEntryContext>): string {
  const raw = ctx.intentSummary?.raw?.trim();
  if (raw) {
    const clipped = raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;
    return `The owner arrived from a handoff with this intent (do not repeat it verbatim later): ${clipped}`;
  }
  return "The owner entered Design Studio without a stored handoff summary; ask what they want to build in one short question.";
}

function publishPostureLine(ctx: ReturnType<typeof getDesignStudioEntryContext>): string | null {
  if (ctx.readyToPublish || ctx.publishBlockers.length === 0) return null;
  const first = ctx.publishBlockers[0];
  return `Publish is blocked (${first.code}): ${first.message} — guide them to complete gates before claiming publish.`;
}

export function buildDesignStudioPromptFragments(state: DesignStudioState | null): string {
  const s =
    state ??
    ({
      designStudioStateVersion: 1 as const,
      version: 1 as const,
      activeProjectId: null,
      projects: {},
    } satisfies DesignStudioState);
  const active = getActiveDesignStudioProject(s);
  const entryCtx = active ? getDesignStudioEntryContext(active.projectId, active.project) : null;

  const resume = entryCtx
    ? [
        "### [DESIGN STUDIO — ACTIVE PROJECT]",
        `- projectId: \`${entryCtx.projectId}\``,
        `- lifecycle: \`${entryCtx.project_status}\``,
        `- buildMode: \`${entryCtx.buildMode}\``,
        `- step: ${entryCtx.stepIndex + 1}/8 (\`${entryCtx.stepKey}\`)`,
        handoffAwareIntro(entryCtx),
        publishPostureLine(entryCtx),
        "",
      ]
        .filter(Boolean)
        .join("\n")
    : "### [DESIGN STUDIO — NO ACTIVE PROJECT]\nGuide the owner to start or resume a project from the landing path.\n";

  const playbook = [
    "### [DESIGN STUDIO — 8-PHASE PLAYBOOK]",
    "Advance only when the current phase outputs are captured or explicitly deferred per policy.",
    "",
    formatPhaseList(),
  ].join("\n");

  const entry = ["### [DESIGN STUDIO — VIEW 1 ENTRY]", VIEW1_VOICE, "", VIEW1_TEXT].join("\n");

  const identity = [
    "### [DESIGN STUDIO — IDENTITY]",
    "You are **Chad**, the AI Design Studio agent for this business on Gateway Global AI OS.",
    "You pair consultative tone with execution discipline: structured phases, explicit outputs, no vaporware.",
  ].join("\n");

  return [identity, GOVERNANCE_CORE, resume, entry, playbook].join("\n\n");
}
