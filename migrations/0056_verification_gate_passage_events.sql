-- Append-only transparency log: every verification gate passage (success or failure, auth or not).
-- Enables user statistics, audit, and rate-limit accounting per fingerprint/site.

CREATE TABLE IF NOT EXISTS verification_gate_passage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id varchar REFERENCES site_configs(id) ON DELETE SET NULL,
  route text NOT NULL,
  http_method text NOT NULL,
  passage_kind text NOT NULL,
  auth_state text NOT NULL,
  installation_key_id uuid REFERENCES verification_installation_api_keys(id) ON DELETE SET NULL,
  http_status integer NOT NULL,
  client_fingerprint_hash text NOT NULL,
  duration_ms integer,
  rate_limited boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verification_gate_passage_site_created_idx
  ON verification_gate_passage_events (site_config_id, created_at DESC);

CREATE INDEX IF NOT EXISTS verification_gate_passage_fingerprint_created_idx
  ON verification_gate_passage_events (client_fingerprint_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS verification_gate_passage_kind_created_idx
  ON verification_gate_passage_events (passage_kind, created_at DESC);
