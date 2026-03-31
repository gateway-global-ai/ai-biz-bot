/**
 * Merged cognition contract builder + prompt fragment smoke test.
 * Run: npx tsx tests/test-cognition-contract.ts
 */
import {
  buildCognitionContractPromptFragment,
  buildMergedCognitionContract,
} from "../shared/cognitionContract.js";
import { getArchetypeCharacterProfile } from "../server/config/archetypeCharacterDefaults.js";
import { getHospitalityCharacterDefault } from "../server/config/hospitalityCharacterDefaults.js";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function main(): void {
  const merged = buildMergedCognitionContract({
    templateCharacter: {
      governing_values: ["guest_safety", "accuracy"],
      decision_priority_weights: { accuracy: 0.9, speed: 0.4 },
      refusal_ethics: { financial_commitment: "high" },
      disc_weighting: { dominance: 0.2, influence: 0.3, steadiness: 0.25, conscientiousness: 0.25 },
      conversational_power_default: 55,
    },
    provenance: {
      agent_template_id: "tmpl-1",
      swarm_schematic_member_id: "mem-1",
      schematic_id: "sch-1",
    },
    schematicVersion: "1.2.0",
  });

  assert(merged.schemaVersion === 1, "schemaVersion");
  assert(merged.character.version === "1.0.0", "default character version");
  assert(merged.provenance.schematic_version === "1.2.0", "schematic version merged");
  assert(merged.merged_at.length > 10, "merged_at ISO");

  const frag = buildCognitionContractPromptFragment(merged);
  assert(frag.includes("GOVERNED COGNITION CONTRACT"), "fragment header");
  assert(frag.includes("accuracy"), "priority weight line");
  assert(frag.includes("guest_safety"), "governing values");
  assert(frag.includes("financial_commitment"), "refusal ethics");
  assert(frag.includes("tmpl-1"), "provenance template id");
  assert(frag.includes("sch-1@1.2.0"), "schematic provenance");

  assert(buildCognitionContractPromptFragment(null) === "", "null contract empty");
  assert(buildCognitionContractPromptFragment(undefined) === "", "undefined contract empty");

  assert(
    getArchetypeCharacterProfile("concierge").classification_id === "archetype_concierge_v1",
    "archetype concierge id",
  );
  assert(
    getArchetypeCharacterProfile("unknown_role").classification_id === "archetype_default_v1",
    "archetype default id",
  );
  assert(
    getHospitalityCharacterDefault("concierge").classification_id === "hospitality_concierge_v1",
    "hospitality overrides classification_id",
  );

  console.log("[test-cognition-contract] PASSED");
}

main();
