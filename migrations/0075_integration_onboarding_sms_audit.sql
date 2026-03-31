-- Append-only audit for integration onboarding SMS attempts (Cloudbeds GraphQL discovery and future lanes).
-- See docs-governance/artifacts/CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_REVIEW_V1.md

CREATE TABLE IF NOT EXISTS integration_onboarding_sms_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_admin_user_id varchar NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  site_config_id varchar NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  integration_key text NOT NULL DEFAULT 'cloudbeds_graphql_discovery',
  requested_variant text NOT NULL,
  provided_to_e164 text,
  recipient_resolution_source text,
  final_recipient_e164 text,
  eligibility_mode text NOT NULL,
  outcome_code text NOT NULL,
  suppression_reason text,
  connect_token_id uuid REFERENCES integration_connect_tokens(id) ON DELETE SET NULL,
  twilio_message_sid text,
  dispatch_ok boolean,
  dry_run boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS integration_onboarding_sms_audit_site_created_idx
  ON integration_onboarding_sms_audit (site_config_id, created_at DESC);

CREATE INDEX IF NOT EXISTS integration_onboarding_sms_audit_actor_created_idx
  ON integration_onboarding_sms_audit (actor_admin_user_id, created_at DESC);

COMMENT ON TABLE integration_onboarding_sms_audit IS 'Append-only log of integration onboarding SMS attempts; no updates';
