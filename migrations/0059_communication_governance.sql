-- Communication Plane: JSON bundle for disclosure policy, stability dials, principal-of-record.
ALTER TABLE site_configs
  ADD COLUMN IF NOT EXISTS communication_governance jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN site_configs.communication_governance IS 'Governance: disclosurePolicyId, principalOfRecord, stabilityDials, disclosureExperimentVariant — see shared/conversationGrounding.ts';
