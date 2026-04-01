-- Migration: Knowledge Certification Governance (Doctrine 11)
--
-- Adds source classification, certification lifecycle, scope binding,
-- conflict resolution priority, and knowledge audit trail.
--
-- Doctrine 11: Knowledge is input, not authority.
-- Registry authority: registry-yaml/knowledge-sources.yaml
-- Contract: shared/knowledgeCertificationContract.ts

-- ── 1. Extend knowledge_artifacts with certification columns ─────────────

ALTER TABLE knowledge_artifacts
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS source_id text NOT NULL DEFAULT 'knowledge_artifacts',
  ADD COLUMN IF NOT EXISTS certification_level text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS certification_source text NOT NULL DEFAULT 'auto_heuristic',
  ADD COLUMN IF NOT EXISTS confidence_score numeric(3,2) DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS certified_at timestamptz,
  ADD COLUMN IF NOT EXISTS certified_by varchar,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS refresh_interval_hours integer,
  ADD COLUMN IF NOT EXISTS agent_id varchar,
  ADD COLUMN IF NOT EXISTS swarm_role text,
  ADD COLUMN IF NOT EXISTS conflict_priority integer NOT NULL DEFAULT 50;

COMMENT ON COLUMN knowledge_artifacts.source_type IS 'system | owner | web | external | inference — Doctrine 11 source classification';
COMMENT ON COLUMN knowledge_artifacts.source_id IS 'References knowledge-sources.yaml source_id';
COMMENT ON COLUMN knowledge_artifacts.certification_level IS 'approved | trusted | unverified | rejected — governs policy filtering';
COMMENT ON COLUMN knowledge_artifacts.certification_source IS 'system | operator | ai_assisted | auto_heuristic — who certified this';
COMMENT ON COLUMN knowledge_artifacts.confidence_score IS '0.00–1.00 numeric confidence from classifier';
COMMENT ON COLUMN knowledge_artifacts.certified_at IS 'When certification was last applied';
COMMENT ON COLUMN knowledge_artifacts.certified_by IS 'Admin user ID or system identifier that certified';
COMMENT ON COLUMN knowledge_artifacts.expires_at IS 'After this time, item is treated as rejected by filter';
COMMENT ON COLUMN knowledge_artifacts.last_validated_at IS 'Last time content was verified as still accurate';
COMMENT ON COLUMN knowledge_artifacts.refresh_interval_hours IS 'Expected refresh cadence from registry; null = no auto-refresh';
COMMENT ON COLUMN knowledge_artifacts.agent_id IS 'Scope binding: restrict to specific agent (null = all agents on site)';
COMMENT ON COLUMN knowledge_artifacts.swarm_role IS 'Scope binding: restrict to specific swarm role (null = all roles)';
COMMENT ON COLUMN knowledge_artifacts.conflict_priority IS 'Higher = wins conflict (system=100, owner=75, web=50, external=50, inference=25)';

-- ── 2. Add constraint checks ─────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE knowledge_artifacts
    ADD CONSTRAINT chk_source_type
    CHECK (source_type IN ('system', 'owner', 'web', 'external', 'inference'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE knowledge_artifacts
    ADD CONSTRAINT chk_certification_level
    CHECK (certification_level IN ('approved', 'trusted', 'unverified', 'rejected'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE knowledge_artifacts
    ADD CONSTRAINT chk_certification_source
    CHECK (certification_source IN ('system', 'operator', 'ai_assisted', 'auto_heuristic'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE knowledge_artifacts
    ADD CONSTRAINT chk_inference_not_approved
    CHECK (NOT (source_type = 'inference' AND certification_level IN ('approved', 'trusted')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. New indexes for governance queries ────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ka_certification_level
  ON knowledge_artifacts (site_config_id, certification_level);

CREATE INDEX IF NOT EXISTS idx_ka_source_type
  ON knowledge_artifacts (site_config_id, source_type);

CREATE INDEX IF NOT EXISTS idx_ka_expires_at
  ON knowledge_artifacts (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ka_agent_scope
  ON knowledge_artifacts (site_config_id, agent_id)
  WHERE agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ka_swarm_role_scope
  ON knowledge_artifacts (site_config_id, swarm_role)
  WHERE swarm_role IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ka_conflict_priority
  ON knowledge_artifacts (site_config_id, conflict_priority DESC);

-- ── 4. Knowledge audit log ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS knowledge_audit_log (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  site_config_id varchar NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  session_id varchar,
  channel text NOT NULL DEFAULT 'chat',
  preset_key text,
  policy_gate text,

  total_candidates integer NOT NULL DEFAULT 0,
  admitted_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  disclaimer_count integer NOT NULL DEFAULT 0,

  allowed_levels text[] NOT NULL DEFAULT '{}',
  allowed_source_types text[] NOT NULL DEFAULT '{}',

  admitted_ids text[] NOT NULL DEFAULT '{}',
  rejected_ids text[] NOT NULL DEFAULT '{}',
  rejection_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,

  knowledge_block_chars integer NOT NULL DEFAULT 0,
  filter_duration_ms integer,

  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE knowledge_audit_log IS 'Doctrine 11 audit trail — what knowledge was admitted/filtered per prompt assembly';

CREATE INDEX IF NOT EXISTS idx_kal_site_created
  ON knowledge_audit_log (site_config_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kal_session
  ON knowledge_audit_log (session_id)
  WHERE session_id IS NOT NULL;

-- ── 5. Backfill existing artifacts with derived certification ────────────

UPDATE knowledge_artifacts
SET
  certification_level = CASE
    WHEN trust_weight >= 8 THEN 'approved'
    WHEN trust_weight >= 5 THEN 'trusted'
    WHEN trust_weight >= 2 THEN 'unverified'
    ELSE 'rejected'
  END,
  source_type = CASE
    WHEN trust_weight >= 8 THEN 'system'
    WHEN trust_weight >= 5 THEN 'owner'
    WHEN trust_weight >= 2 THEN 'web'
    ELSE 'external'
  END,
  conflict_priority = CASE
    WHEN trust_weight >= 8 THEN 100
    WHEN trust_weight >= 5 THEN 75
    WHEN trust_weight >= 2 THEN 50
    ELSE 25
  END,
  certified_at = COALESCE(updated_at, created_at),
  last_validated_at = COALESCE(updated_at, created_at)
WHERE certification_level = 'unverified'
  AND source_type = 'owner'
  AND trust_weight IS NOT NULL;
