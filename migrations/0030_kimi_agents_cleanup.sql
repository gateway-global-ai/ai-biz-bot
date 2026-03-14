-- One-time cleanup: any agent using KIMI is switched to Gemini (model monoculture).
-- Run once; safe to re-run (idempotent).
UPDATE agents
SET ai_model_provider = 'gemini',
    ai_model_id = COALESCE(NULLIF(TRIM(ai_model_id), ''), ''),
    updated_at = NOW()
WHERE ai_model_provider = 'kimi';
