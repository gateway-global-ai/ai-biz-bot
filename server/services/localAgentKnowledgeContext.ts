/**
 * Local Agent Knowledge Context — 4-step task-compressed RAG loader.
 *
 * Injects governed knowledge into a local LLM call without a vector DB.
 * All content comes from governance docs, registry YAMLs, and skill files
 * that already exist in the workspace — no external service required.
 *
 * Pipeline per call:
 *   Step 1: select relevant docs by taskType
 *   Step 2: extract only rule/constraint lines (MUST, NEVER, FORBIDDEN, REQUIRED, CHECK)
 *   Step 3: concatenate with doc headers
 *   Step 4: enforce 3000-token hard cap (~12,000 chars); priority: policy > registry > reference
 */

import { promises as fs } from "fs";
import path from "path";

const WORKSPACE = path.resolve(
  process.env.WORKSPACE_ROOT ??
    "/opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai",
);

const TOKEN_CAP = 3000;
const CHARS_PER_TOKEN = 4;
const CHAR_CAP = TOKEN_CAP * CHARS_PER_TOKEN;

// ── Doc catalogue ─────────────────────────────────────────────────────────────

interface DocEntry {
  label: string;
  relativePath: string;
  priority: "policy" | "registry" | "reference";
  taskTypes: string[];
}

const DOC_CATALOGUE: DocEntry[] = [
  // Policy — always highest priority
  {
    label: "AGENT_POLICY_REGISTRY",
    relativePath: "docs-governance/canonical/AGENT_POLICY_REGISTRY.md",
    priority: "policy",
    taskTypes: ["governance", "agent", "code", "ui"],
  },
  {
    label: "SAFE_MODE_CONTRACT",
    relativePath: "docs-governance/canonical/SAFE_MODE_CONTRACT.md",
    priority: "policy",
    taskTypes: ["governance", "agent"],
  },
  {
    label: "PROMPT_RUNTIME_GOVERNANCE",
    relativePath: "docs-governance/canonical/PROMPT_RUNTIME_GOVERNANCE.md",
    priority: "policy",
    taskTypes: ["governance", "code"],
  },
  {
    label: "EXECUTION_PLANE_BOUNDARY_SPEC",
    relativePath:
      "docs-governance/canonical/EXECUTION_PLANE_BOUNDARY_SPEC.md",
    priority: "policy",
    taskTypes: ["code", "agent"],
  },

  // Registry — second priority
  {
    label: "SCHEMA_ANCHOR_REGISTRY",
    relativePath: "docs-governance/canonical/SCHEMA_ANCHOR_REGISTRY.md",
    priority: "registry",
    taskTypes: ["code", "agent"],
  },
  {
    label: "SOVEREIGN_UI_SDK_SPEC",
    relativePath: "user_uploads/ai_os_tailwind_shadcn_component_spec.md",
    priority: "policy",
    taskTypes: ["ui"],
  },
  {
    label: "VIEW_REGISTRY",
    relativePath: "docs-governance/canonical/VIEW_REGISTRY.md",
    priority: "registry",
    taskTypes: ["ui"],
  },
  {
    label: "ACTION_REGISTRY",
    relativePath: "docs-governance/canonical/ACTION_REGISTRY.md",
    priority: "registry",
    taskTypes: ["ui", "code"],
  },
  {
    label: "LOGICAL_ROUTE_REGISTRY",
    relativePath: "docs-governance/canonical/LOGICAL_ROUTE_REGISTRY.md",
    priority: "registry",
    taskTypes: ["code"],
  },
  {
    label: "CONTEXT_KEYS",
    relativePath: "docs-governance/canonical/CONTEXT_KEYS.md",
    priority: "registry",
    taskTypes: ["code", "agent"],
  },
  {
    label: "orchestrator_contract",
    relativePath: "registry-yaml/orchestrator_contract.yaml",
    priority: "registry",
    taskTypes: ["governance", "agent", "code"],
  },
  {
    label: "actions_yaml",
    relativePath: "registry-yaml/actions.yaml",
    priority: "registry",
    taskTypes: ["code", "ui"],
  },
  {
    label: "views_yaml",
    relativePath: "registry-yaml/views.yaml",
    priority: "registry",
    taskTypes: ["ui"],
  },

  // Reference — lowest priority (first to be truncated)
  {
    label: "SYSTEM_MANIFEST",
    relativePath: "docs-governance/canonical/SYSTEM_MANIFEST.md",
    priority: "reference",
    taskTypes: ["governance", "code", "agent", "ui"],
  },
  {
    label: "CURSOR_RULES_INDEX",
    relativePath: "docs-governance/canonical/CURSOR_RULES_INDEX.md",
    priority: "reference",
    taskTypes: ["governance"],
  },
];

// ── Step 2: constraint line extractor ─────────────────────────────────────────

const CONSTRAINT_RE =
  /\b(MUST|NEVER|FORBIDDEN|REQUIRED|CHECK|PROHIBITED|DO NOT|SHALL NOT)\b/i;

function extractConstraintLines(content: string, label: string): string {
  const lines = content.split("\n");
  const kept: string[] = [];
  let lastHeading = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^#{1,4} /.test(trimmed)) {
      lastHeading = trimmed;
      continue;
    }

    if (CONSTRAINT_RE.test(trimmed)) {
      if (lastHeading && kept[kept.length - 1] !== lastHeading) {
        kept.push(lastHeading);
      }
      kept.push(trimmed);
    }
  }

  if (kept.length === 0) return "";
  return `\n### [${label}]\n${kept.join("\n")}`;
}

// ── Step 1: doc selection ─────────────────────────────────────────────────────

function selectDocs(taskType: string): DocEntry[] {
  const normalized = taskType.toLowerCase();
  const matching = DOC_CATALOGUE.filter((d) =>
    d.taskTypes.includes(normalized),
  );

  const PRIORITY_ORDER: Record<DocEntry["priority"], number> = {
    policy: 0,
    registry: 1,
    reference: 2,
  };
  return matching.sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );
}

// ── Step 3 + 4: load, compress, cap ──────────────────────────────────────────

async function tryReadFile(absPath: string): Promise<string | null> {
  try {
    return await fs.readFile(absPath, "utf8");
  } catch {
    return null;
  }
}

export async function loadKnowledgeContext(taskType: string): Promise<string> {
  const selected = selectDocs(taskType);
  const sections: string[] = [];
  let totalChars = 0;
  const dropped: string[] = [];

  for (const doc of selected) {
    const absPath = path.join(WORKSPACE, doc.relativePath);
    const raw = await tryReadFile(absPath);
    if (!raw) {
      dropped.push(`${doc.label} (not found)`);
      continue;
    }

    const compressed = extractConstraintLines(raw, doc.label);
    if (!compressed) continue;

    const projected = totalChars + compressed.length;
    if (projected > CHAR_CAP) {
      // Fit as much as possible for policy docs; skip entirely for lower priority
      if (doc.priority === "policy") {
        const remaining = CHAR_CAP - totalChars;
        if (remaining > 200) {
          sections.push(compressed.slice(0, remaining));
          totalChars = CHAR_CAP;
        }
      } else {
        dropped.push(`${doc.label} (cap reached)`);
      }
      continue;
    }

    sections.push(compressed);
    totalChars += compressed.length;
  }

  if (dropped.length > 0) {
    console.log(
      `[localAgentKnowledgeContext] taskType=${taskType} dropped=${dropped.join(", ")}`,
    );
  }

  const header = `## Governance Context (taskType: ${taskType})\n_Extracted constraint lines only. Full docs at docs-governance/._\n`;
  return header + sections.join("\n");
}

// ── Skill context loader (supplementary) ─────────────────────────────────────

const SKILL_MAP: Record<string, string> = {
  governance: ".cursor/skills/governance-review/SKILL.md",
  agent: ".cursor/skills/knowledge-engineering-lead/SKILL.md",
  code: ".cursor/skills/programmatic-sales-engine/SKILL.md",
  ui: ".cursor/skills/ui-design-governance/SKILL.md",
};

export async function loadSkillContext(taskType: string): Promise<string> {
  const skillPath = SKILL_MAP[taskType.toLowerCase()];
  if (!skillPath) return "";

  const absPath = path.join(WORKSPACE, skillPath);
  const raw = await tryReadFile(absPath);
  if (!raw) return "";

  const compressed = extractConstraintLines(raw, `SKILL:${taskType}`);
  return compressed.slice(0, CHAR_CAP / 4);
}
