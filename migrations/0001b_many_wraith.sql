CREATE TABLE "associations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"short_code" text NOT NULL,
	"mls_code" text,
	"sponsor_billing" boolean DEFAULT false,
	"sponsor_limit" integer,
	"default_persona" text DEFAULT 'real_estate_sovereign',
	"default_industry" text DEFAULT 'real_estate',
	"contact_email" text,
	"website" text,
	"master_brand_sid" text,
	"master_ein" text,
	"allowed_ip_ranges" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "associations_short_code_unique" UNIQUE("short_code")
);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'a2p_brands'
  ) THEN
    ALTER TABLE "a2p_brands" ADD COLUMN IF NOT EXISTS "association_id" uuid;
    ALTER TABLE "a2p_brands" ADD COLUMN IF NOT EXISTS "legal_name_confirmed" boolean DEFAULT false NOT NULL;
    ALTER TABLE "a2p_brands" ADD COLUMN IF NOT EXISTS "legal_name_confirmed_at" timestamp;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'a2p_brands'
        AND constraint_name = 'a2p_brands_association_id_associations_id_fk'
    ) THEN
      ALTER TABLE "a2p_brands"
        ADD CONSTRAINT "a2p_brands_association_id_associations_id_fk"
        FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE no action ON UPDATE no action;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customers'
  ) THEN
    ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "association_id" uuid;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'customers'
        AND constraint_name = 'customers_association_id_associations_id_fk'
    ) THEN
      ALTER TABLE "customers"
        ADD CONSTRAINT "customers_association_id_associations_id_fk"
        FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE no action ON UPDATE no action;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'idx_customers_association_id'
    ) THEN
      CREATE INDEX "idx_customers_association_id" ON "customers" USING btree ("association_id");
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'site_configs'
  ) THEN
    ALTER TABLE "site_configs" ADD COLUMN IF NOT EXISTS "agent_config" jsonb;
    ALTER TABLE "site_configs" ADD COLUMN IF NOT EXISTS "voice_config" jsonb;
    ALTER TABLE "site_configs" ADD COLUMN IF NOT EXISTS "theme_config" jsonb;
  END IF;
END $$;