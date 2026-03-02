CREATE TABLE IF NOT EXISTS "review_signals" (
    "signal_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "review_id" text NOT NULL,
    "data_id" text NOT NULL,
    "topic" text NOT NULL,
    "aspect" text NOT NULL,
    "sentiment" text NOT NULL,
    "emotion" text NOT NULL,
    "key_phrases" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "friction_phrases" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "differentiator_phrases" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "context" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "review_artifacts" (
    "artifact_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "artifact_type" text NOT NULL,
    "tenant_id" text NOT NULL,
    "generated_by" text NOT NULL,
    "evidence_review_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "evidence_signal_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "evidence_summary" text NOT NULL,
    "target_metric" text NOT NULL,
    "metric_source" text NOT NULL,
    "status" text NOT NULL,
    "frontmatter" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
