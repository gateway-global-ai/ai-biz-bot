-- Import Quarantine Pipeline — Doctrine 12: zero-trust supply chain governance.
-- Creates import_quarantine_runs table and updates violation type constraint.

CREATE TABLE IF NOT EXISTS import_quarantine_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_uri text NOT NULL,
  source_type text NOT NULL DEFAULT 'external',
  sdk_mode text NOT NULL DEFAULT 'extract_adapter',
  state text NOT NULL DEFAULT 'quarantined',
  quarantine_path text NOT NULL,

  scan_result jsonb,
  extracted_artifacts jsonb DEFAULT '[]'::jsonb,
  extraction_report_path text,
  extraction_report_hash text,

  certification_level text NOT NULL DEFAULT 'unverified',
  promoted_level text,
  violations jsonb DEFAULT '[]'::jsonb,

  orchestration_run_id varchar REFERENCES agent_orchestration_runs(id) ON DELETE SET NULL,
  intent_execution_id varchar REFERENCES intent_executions(id) ON DELETE SET NULL,
  site_config_id varchar REFERENCES site_configs(id) ON DELETE SET NULL,
  requested_by text,

  incinerated_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),

  CONSTRAINT chk_quarantine_source_type CHECK (source_type IN ('external', 'web', 'owner')),
  CONSTRAINT chk_quarantine_sdk_mode CHECK (sdk_mode IN ('docs_only', 'extract_adapter', 'install_package')),
  CONSTRAINT chk_quarantine_state CHECK (state IN (
    'quarantined', 'scanning', 'scan_complete', 'extracting', 'extracted',
    'certifying', 'certified', 'promoting', 'promoted',
    'incinerating', 'incinerated', 'blocked', 'failed'
  )),
  CONSTRAINT chk_quarantine_certification CHECK (certification_level IN ('unverified', 'trusted', 'rejected')),
  CONSTRAINT chk_quarantine_promoted CHECK (promoted_level IS NULL OR promoted_level IN ('unverified', 'trusted', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_import_quarantine_runs_state ON import_quarantine_runs(state);
CREATE INDEX IF NOT EXISTS idx_import_quarantine_runs_site_config_id ON import_quarantine_runs(site_config_id);
CREATE INDEX IF NOT EXISTS idx_import_quarantine_runs_created_at ON import_quarantine_runs(created_at);

-- Update violation type constraint to include quarantine violations
ALTER TABLE orchestration_violations DROP CONSTRAINT IF EXISTS orchestration_violations_type_check;

ALTER TABLE orchestration_violations ADD CONSTRAINT orchestration_violations_type_check
  CHECK (violation_type IN (
    'governance_violation',
    'orchestration_bypass_attempt',
    'aptitude_failure',
    'customer_outcome_threshold_miss',
    'local_model_voice_path_attempt',
    'unauthorized_domain_access',
    'missing_orchestration_run',
    'invalid_structured_output',
    'domain_allowlist_violation',
    'workspace_tool_unauthorized',
    'quarantine_direct_execution',
    'quarantine_package_install_bypass',
    'quarantine_unscanned_import',
    'quarantine_routing_import',
    'quarantine_dependency_trust_bypass'
  ));
