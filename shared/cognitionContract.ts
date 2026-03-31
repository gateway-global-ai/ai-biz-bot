/**
 * Governed cognition contract types (v1) — see docs-governance/canonical/AGENT_BEHAVIOR_SPEC_V1.md
 */
export type RefusalEthicsLevel = "high" | "medium" | "low";

/** Stored on agent_templates.character_profile and embedded in merged_cognition_contract.character */
export interface CharacterProfileV1 {
  classification_id?: string;
  version?: string;
  governing_values?: string[];
  decision_priority_weights?: Record<string, number>;
  disc_weighting?: {
    dominance: number;
    influence: number;
    steadiness: number;
    conscientiousness: number;
  };
  refusal_ethics?: Record<string, RefusalEthicsLevel>;
  /** 0–100 conversational authority default for this classification */
  conversational_power_default?: number;
  arch_defaults?: {
    acknowledge: number;
    reflect: number;
    context: number;
    handoff: number;
  };
}

export interface CognitionProvenanceV1 {
  agent_template_id: string;
  swarm_schematic_member_id?: string | null;
  schematic_id?: string;
  /** Swarm schematic bundle version (e.g. YAML `version`). */
  schematic_version?: string;
}

/** Materialized on agents.merged_cognition_contract at provisioning */
export interface MergedCognitionContractV1 {
  schemaVersion: 1;
  character: CharacterProfileV1;
  provenance: CognitionProvenanceV1;
  merged_at: string;
}

export function buildMergedCognitionContract(input: {
  templateCharacter: CharacterProfileV1 | null | undefined;
  provenance: CognitionProvenanceV1;
  schematicVersion?: string;
}): MergedCognitionContractV1 {
  const character: CharacterProfileV1 = {
    ...(input.templateCharacter ?? {}),
    version: input.templateCharacter?.version ?? "1.0.0",
  };
  return {
    schemaVersion: 1,
    character,
    provenance: {
      ...input.provenance,
      schematic_version: input.schematicVersion ?? input.provenance.schematic_version,
    },
    merged_at: new Date().toISOString(),
  };
}

/** Compact prompt fragment: governed reasoning order under tension (not vibe prose). */
export function buildCognitionContractPromptFragment(contract: MergedCognitionContractV1 | null | undefined): string {
  if (!contract?.character) return "";
  const c = contract.character;
  const p = contract.provenance;
  const lines: string[] = [
    "### [GOVERNED COGNITION CONTRACT — CLASSIFICATION DEFAULTS]",
    "",
    "Under ambiguity or conflicting goals, honor priorities in this order (higher weight = stronger pull when tradeoffs are unresolved):",
  ];
  if (c.decision_priority_weights && Object.keys(c.decision_priority_weights).length > 0) {
    const sorted = Object.entries(c.decision_priority_weights).sort((a, b) => b[1] - a[1]);
    for (const [k, w] of sorted) {
      lines.push(`- **${k}** (weight ${w.toFixed(2)})`);
    }
  }
  if (c.governing_values?.length) {
    lines.push("", `Governing values: ${c.governing_values.join(", ")}.`);
  }
  if (c.refusal_ethics && Object.keys(c.refusal_ethics).length > 0) {
    lines.push("", "Refusal ethics (severity):");
    for (const [k, v] of Object.entries(c.refusal_ethics)) {
      lines.push(`- ${k}: **${v}**`);
    }
  }
  if (c.disc_weighting) {
    const dw = c.disc_weighting;
    lines.push(
      "",
      "Judgment priors (DISC as weighting, not tone): prioritize verification and closure according to these relative weights —",
      `D ${dw.dominance.toFixed(2)}, I ${dw.influence.toFixed(2)}, S ${dw.steadiness.toFixed(2)}, C ${dw.conscientiousness.toFixed(2)}.`,
    );
  }
  if (c.conversational_power_default != null) {
    lines.push(`Default conversational authority (0–100): **${c.conversational_power_default}** (who may direct/close dialogue vs defer).`);
  }
  lines.push(
    "",
    `Provenance: template_id=${p.agent_template_id}${p.swarm_schematic_member_id ? `, member_id=${p.swarm_schematic_member_id}` : ""}${p.schematic_id ? `, schematic=${p.schematic_id}@${p.schematic_version ?? "?"}` : ""}.`,
    `Merged at ${contract.merged_at}.`,
  );
  return lines.join("\n");
}
