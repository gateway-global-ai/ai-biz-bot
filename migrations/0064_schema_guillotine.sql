-- Schema Guillotine: drop ghost tables + legacy feature tables
-- This migration is the result of a full architectural audit.
-- Row counts were logged before execution (see SCHEMA_GUILLOTINE_AUDIT_LOG.md).
-- Order respects FK dependencies: children before parents.

-- 6 Ghost Tables (already removed from schema.ts, may still exist in DB)
DROP TABLE IF EXISTS tour_specifications CASCADE;
DROP TABLE IF EXISTS swot_analyses CASCADE;
DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS vlm_prospects CASCADE;
DROP TABLE IF EXISTS vlm_campaigns CASCADE;
DROP TABLE IF EXISTS vlm_call_attempts CASCADE;

-- 14 Legacy Tables (full feature deprecation — code removal completed in same commit)
-- FK-safe order: dependents first

-- Knowledge Base v1 (depends on agent_knowledge_base)
DROP TABLE IF EXISTS research_tasks CASCADE;
DROP TABLE IF EXISTS api_documentation CASCADE;
DROP TABLE IF EXISTS agent_knowledge_base CASCADE;

-- E-Commerce Cart
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;

-- Featured Partners
DROP TABLE IF EXISTS featured_partners CASCADE;

-- Classroom System (lesson_sessions → lesson_plans → knowledge_topics)
DROP TABLE IF EXISTS lesson_sessions CASCADE;
DROP TABLE IF EXISTS lesson_plans CASCADE;
DROP TABLE IF EXISTS knowledge_topics CASCADE;

-- Project Management (project_tasks → projects → organizations)
DROP TABLE IF EXISTS project_tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Bot Builder v1
DROP TABLE IF EXISTS bot_templates CASCADE;

-- MVP Tasks
DROP TABLE IF EXISTS tasks CASCADE;
