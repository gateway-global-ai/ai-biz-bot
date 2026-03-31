-- Workspace auth lifecycle hardening for governed adapter/proxy lane.

ALTER TABLE workspace_configurations
  ADD COLUMN IF NOT EXISTS auth_state text DEFAULT 'unknown';

ALTER TABLE workspace_configurations
  ADD COLUMN IF NOT EXISTS auth_error_code text;

ALTER TABLE workspace_configurations
  ADD COLUMN IF NOT EXISTS auth_error_detail text;

ALTER TABLE workspace_configurations
  ADD COLUMN IF NOT EXISTS degraded_reason text;

ALTER TABLE workspace_configurations
  ADD COLUMN IF NOT EXISTS last_auth_checked_at timestamptz;

ALTER TABLE workspace_configurations
  ADD COLUMN IF NOT EXISTS last_auth_refresh_attempt_at timestamptz;

ALTER TABLE workspace_configurations
  ADD COLUMN IF NOT EXISTS last_auth_refresh_succeeded_at timestamptz;
