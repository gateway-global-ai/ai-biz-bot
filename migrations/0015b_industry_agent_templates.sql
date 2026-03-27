-- Migration 0015: Industry Agent Template Engine
-- 8 Business Groups × 6 Archetypes = 48 pre-tuned psychological profiles
-- Pre-seeded on platform startup via scripts/seed-industry-templates.ts

CREATE TABLE IF NOT EXISTS "industry_agent_templates" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "industry_group" text NOT NULL,
  "role_type" text NOT NULL,
  "default_name" text NOT NULL,
  "voice_id" text DEFAULT 'Kore',
  "voice_name" text DEFAULT 'Kore - Calm & Professional',
  "avatar_id" text DEFAULT 'avatar1',
  "short_term_memory_template" text,
  "long_term_core_template" text,
  "primary_intent" text,
  "world_view" text,
  "unbreakable_rule" text,
  "dominance" integer NOT NULL DEFAULT 50,
  "influence" integer NOT NULL DEFAULT 50,
  "steadiness" integer NOT NULL DEFAULT 50,
  "conscientiousness" integer NOT NULL DEFAULT 50,
  "arch_acknowledge" integer NOT NULL DEFAULT 60,
  "arch_reflect" integer NOT NULL DEFAULT 50,
  "arch_context" integer NOT NULL DEFAULT 60,
  "arch_handoff" integer NOT NULL DEFAULT 50,
  "default_tools" jsonb DEFAULT '[]',
  "default_system_prompt" text,
  "is_active" boolean DEFAULT true,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_iat_group_role"
  ON "industry_agent_templates" ("industry_group", "role_type");

COMMENT ON TABLE "industry_agent_templates" IS
  '48 pre-tuned agent archetypes (8 industry groups × 6 universal roles). Cloned into agent roster on business signup.';
