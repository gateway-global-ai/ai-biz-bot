-- Industry Agent Templates: 8 business groups × 6 archetypes for one-click agent provisioning
CREATE TABLE IF NOT EXISTS industry_agent_templates (
  id SERIAL PRIMARY KEY,
  industry_group TEXT NOT NULL,
  role_type TEXT NOT NULL,
  default_name TEXT NOT NULL,
  short_term_memory_template TEXT,
  long_term_core_template TEXT,
  primary_intent TEXT,
  world_view TEXT,
  dominance INTEGER NOT NULL DEFAULT 50,
  influence INTEGER NOT NULL DEFAULT 50,
  steadiness INTEGER NOT NULL DEFAULT 50,
  conscientiousness INTEGER NOT NULL DEFAULT 50,
  default_tools JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_industry_agent_templates_industry_group ON industry_agent_templates(industry_group);
