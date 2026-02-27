-- Phase 1: Mixing Board — agent, voice, and theme config columns
-- Applied via: doppler run -- npm run db:push

ALTER TABLE "site_configs"
  ADD COLUMN IF NOT EXISTS "agent_config" jsonb,
  ADD COLUMN IF NOT EXISTS "voice_config" jsonb,
  ADD COLUMN IF NOT EXISTS "theme_config" jsonb;
