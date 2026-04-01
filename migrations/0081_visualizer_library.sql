-- Visualizer Library: community-shared audio visualizer configurations
-- Each row is a parametric JSON config (engine type + colors + amplitude etc.)
-- authored by a customer_account and browsable by all users.

CREATE TABLE IF NOT EXISTS visualizer_library (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id VARCHAR REFERENCES customer_accounts(id) ON DELETE SET NULL,
  author_name TEXT,
  name TEXT NOT NULL,
  description TEXT,
  engine_type TEXT NOT NULL DEFAULT 'circular_pulse',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  use_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  preview_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vizlib_public ON visualizer_library(is_public, use_count DESC);
CREATE INDEX IF NOT EXISTS idx_vizlib_author ON visualizer_library(author_id);
CREATE INDEX IF NOT EXISTS idx_vizlib_engine ON visualizer_library(engine_type);
