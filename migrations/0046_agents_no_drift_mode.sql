-- Migration 0046: Add no_drift_mode column to agents table
-- No-Drift Mode locks agent behavioral posture to the mode's hardcoded ARCH profile.
-- Enforced server-side in promptCompiler — not just a UI flag.

ALTER TABLE agents ADD COLUMN IF NOT EXISTS no_drift_mode boolean DEFAULT false;
