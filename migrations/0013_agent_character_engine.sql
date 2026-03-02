-- Migration 0013: Agent Character Engine
-- Adds three-layer behavioral system columns to agents table.
-- Layer 1 (Character): shortTermMemory, longTermMemory
-- Layer 3 (Conversation Mechanics): archProfile
-- Layer 2 (Behavioral Signature): DISC columns already exist.

ALTER TABLE "agents"
  ADD COLUMN IF NOT EXISTS "short_term_memory" jsonb,
  ADD COLUMN IF NOT EXISTS "long_term_memory" jsonb,
  ADD COLUMN IF NOT EXISTS "arch_profile" jsonb;

COMMENT ON COLUMN "agents"."short_term_memory" IS
  '{ specialty, focus, method, differentiator, discAnalysis, archBehavior }';
COMMENT ON COLUMN "agents"."long_term_memory" IS
  '{ dominantTrait, years, originStory, unbreakableRule, ruleReason, primaryIntent, happySeeing, sadSeeing, priorityOverMoney, philosophyPeople, philosophyLife, philosophyToday }';
COMMENT ON COLUMN "agents"."arch_profile" IS
  '{ acknowledge, reflect, context, handoff } — each 0-100';
