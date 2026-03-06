-- Investor report: track who viewed and session for SMS-gated access
CREATE TABLE IF NOT EXISTS "investor_report_views" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "phone" text NOT NULL,
  "viewed_at" timestamp DEFAULT now() NOT NULL,
  "ip_address" text,
  "user_agent" text
);

CREATE TABLE IF NOT EXISTS "investor_report_sessions" (
  "token" varchar PRIMARY KEY,
  "phone" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "investor_report_views_phone" ON "investor_report_views" ("phone");
CREATE INDEX IF NOT EXISTS "investor_report_views_viewed_at" ON "investor_report_views" ("viewed_at");
CREATE INDEX IF NOT EXISTS "investor_report_sessions_expires_at" ON "investor_report_sessions" ("expires_at");
