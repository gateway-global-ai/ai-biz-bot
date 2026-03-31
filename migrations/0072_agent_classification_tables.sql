-- Agent classification v1 — templates, swarm schematics, members; extend agents.
-- See docs-governance/canonical/AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md

CREATE TABLE IF NOT EXISTS agent_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  name text NOT NULL,
  primary_actor_class text NOT NULL,
  secondary_actor_classes jsonb NOT NULL DEFAULT '[]'::jsonb,
  primary_stage_class text NOT NULL,
  secondary_stage_classes jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_operational_mode text NOT NULL,
  default_capability_set_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_skill_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  resource_profile_id text,
  deployment_contract_id text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS swarm_schematics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schematic_key text NOT NULL UNIQUE,
  name text NOT NULL,
  industry_group text NOT NULL,
  min_agents integer NOT NULL DEFAULT 1,
  default_agents integer NOT NULL DEFAULT 4,
  max_agents integer NOT NULL DEFAULT 12,
  hard_max_agents integer NOT NULL DEFAULT 24,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS swarm_schematic_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swarm_schematic_id uuid NOT NULL REFERENCES swarm_schematics(id) ON DELETE CASCADE,
  role_key text NOT NULL,
  name text NOT NULL,
  agent_template_id uuid NOT NULL REFERENCES agent_templates(id) ON DELETE RESTRICT,
  primary_actor_class text NOT NULL,
  secondary_actor_classes jsonb NOT NULL DEFAULT '[]'::jsonb,
  primary_stage_class text NOT NULL,
  secondary_stage_classes jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_operational_mode text NOT NULL,
  capability_set_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  skill_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_probe_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  deploy_posture text NOT NULL DEFAULT 'draft',
  position_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (swarm_schematic_id, role_key)
);

CREATE INDEX IF NOT EXISTS idx_swarm_schematic_members_schematic
  ON swarm_schematic_members(swarm_schematic_id);

ALTER TABLE agents ADD COLUMN IF NOT EXISTS agent_template_id uuid REFERENCES agent_templates(id) ON DELETE SET NULL;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS swarm_schematic_member_id uuid REFERENCES swarm_schematic_members(id) ON DELETE SET NULL;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS primary_actor_class text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS secondary_actor_classes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS primary_stage_class text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS secondary_stage_classes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS deployment_status text NOT NULL DEFAULT 'legacy';

CREATE INDEX IF NOT EXISTS idx_agents_agent_template_id ON agents(agent_template_id);
CREATE INDEX IF NOT EXISTS idx_agents_swarm_schematic_member_id ON agents(swarm_schematic_member_id);

COMMENT ON COLUMN agents.deployment_status IS 'legacy | draft | active_deployable | simulation_only | disabled_overflow';
