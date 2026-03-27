-- Migration 0068: Audit / debug columns for local agent orchestration runs
-- These enable tuning the local agent plane without re-running tasks.

ALTER TABLE agent_orchestration_runs
  ADD COLUMN IF NOT EXISTS raw_model_output   TEXT,
  ADD COLUMN IF NOT EXISTS parse_error        TEXT,
  ADD COLUMN IF NOT EXISTS files_touched_json JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS review_required    BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS violation_reason   TEXT;
