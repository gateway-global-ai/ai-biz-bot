-- Subgroup anchor: workspace_configurations must exist before 0077_workspace_auth_lifecycle.sql.
-- This is not foundational bootstrap (see 0000_base_schema_anchor.sql); it fixes overlay ordering
-- for the Workspace integration subgroup so fresh-db CI can ALTER the table.
--
-- Pre-0077 canonical shape: shared/schema.ts workspaceConfigurations minus auth lifecycle columns
-- added in 0077 (auth_state, auth_error_*, degraded_reason, last_auth_*).
-- 0077 remains the auth-lifecycle overlay (ADD COLUMN IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS public.workspace_configurations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id varchar NOT NULL REFERENCES public.site_configs(id) ON DELETE CASCADE,
  setup_type text DEFAULT 'oauth',
  google_email text,
  access_token text,
  refresh_token text,
  token_expiry timestamp without time zone,
  enabled_apps jsonb DEFAULT '{}'::jsonb,
  drive_folder_id text,
  lead_tracking_sheet_id text,
  calendar_id text,
  task_list_id text,
  status text DEFAULT 'disconnected',
  status_message text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT workspace_configurations_site_config_id_key UNIQUE (site_config_id)
);
