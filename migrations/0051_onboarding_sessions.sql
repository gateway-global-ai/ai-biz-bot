-- Onboarding Sessions — 5-step AI Biz Bot business onboarding flow
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id varchar NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  current_step integer NOT NULL DEFAULT 1,
  collected_data jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS onboarding_sessions_site_config_id_idx ON onboarding_sessions(site_config_id);
