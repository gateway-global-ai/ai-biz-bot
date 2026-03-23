-- Migration 0044: Add task_order JSONB column to site_configs
-- Stores an ordered list of interaction tasks the agent works through each session.
-- Shape: [{ id: string, label: string, description?: string, required: boolean }]

ALTER TABLE site_configs ADD COLUMN IF NOT EXISTS task_order jsonb DEFAULT '[]'::jsonb;
