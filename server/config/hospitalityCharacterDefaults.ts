/**
 * Default CharacterProfileV1 per hospitality_cloudbeds role_type — classification layer
 * (AGENT_BEHAVIOR_SPEC_V1). Wraps universal archetype profiles with hospitality_* classification_ids
 * for agent_templates.character_profile projection.
 */
import type { CharacterProfileV1 } from "@shared/cognitionContract";
import { getArchetypeCharacterProfile } from "./archetypeCharacterDefaults.js";

export function getHospitalityCharacterDefault(roleType: string): CharacterProfileV1 {
  const base = getArchetypeCharacterProfile(roleType);
  const isDefault = base.classification_id === "archetype_default_v1";
  return {
    ...base,
    classification_id: isDefault ? "hospitality_default_v1" : `hospitality_${roleType}_v1`,
  };
}
