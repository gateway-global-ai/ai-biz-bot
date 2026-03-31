-- Cognition contract: classification-level character profile on agent_templates;
-- materialized merged contract on agents (AGENT_BEHAVIOR_SPEC_V1 / CLASSIFICATION_GOVERNANCE_SPEC_V1).

ALTER TABLE agent_templates
  ADD COLUMN IF NOT EXISTS character_profile JSONB;

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS merged_cognition_contract JSONB;

COMMENT ON COLUMN agent_templates.character_profile IS 'Classification defaults: governing_values, decision_priority_weights, refusal_ethics, disc_weighting, conversational_power_default, arch_defaults (v1)';
COMMENT ON COLUMN agents.merged_cognition_contract IS 'Materialized merged cognition + provenance after provisioning (inspectable; v1)';
