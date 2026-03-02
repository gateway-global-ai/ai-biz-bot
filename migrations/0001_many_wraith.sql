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
--> statement-breakpoint
ALTER TABLE "a2p_brands" ADD COLUMN "association_id" uuid;--> statement-breakpoint
ALTER TABLE "a2p_brands" ADD COLUMN "legal_name_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "a2p_brands" ADD COLUMN "legal_name_confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "association_id" uuid;--> statement-breakpoint
ALTER TABLE "site_configs" ADD COLUMN "agent_config" jsonb;--> statement-breakpoint
ALTER TABLE "site_configs" ADD COLUMN "voice_config" jsonb;--> statement-breakpoint
ALTER TABLE "site_configs" ADD COLUMN "theme_config" jsonb;--> statement-breakpoint
ALTER TABLE "a2p_brands" ADD CONSTRAINT "a2p_brands_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_customers_association_id" ON "customers" USING btree ("association_id");