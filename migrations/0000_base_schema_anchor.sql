-- Base schema anchor for fresh-db bootstrap.
-- Source of truth: shared/schema.ts
-- Purpose: create the foundational AI OS world before replaying overlay/evolution migrations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE public.onboarding_status AS ENUM(
    'PENDING_MSA',
    'PENDING_COMPLIANCE',
    'ACTIVE',
    'SUSPENDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.compliance_status AS ENUM(
    'NOT_SUBMITTED',
    'PENDING',
    'APPROVED',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.account_type AS ENUM(
    'DIRECT',
    'RESELLER',
    'SUB_ACCOUNT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.users (
  id character varying DEFAULT gen_random_uuid() NOT NULL,
  username text NOT NULL,
  password text NOT NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_username_unique UNIQUE (username)
);

CREATE TABLE IF NOT EXISTS public.associations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  short_code text NOT NULL,
  mls_code text,
  sponsor_billing boolean DEFAULT false,
  sponsor_limit integer,
  default_persona text DEFAULT 'real_estate_sovereign'::text,
  default_industry text DEFAULT 'real_estate'::text,
  contact_email text,
  website text,
  master_brand_sid text,
  master_ein text,
  allowed_ip_ranges text[],
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT associations_pkey PRIMARY KEY (id),
  CONSTRAINT associations_short_code_unique UNIQUE (short_code)
);

CREATE TABLE IF NOT EXISTS public.resellers (
  id character varying DEFAULT gen_random_uuid() NOT NULL,
  parent_reseller_id character varying,
  stripe_account_id text,
  commission_rate numeric(5,4) DEFAULT 0.10 NOT NULL,
  name text,
  email text,
  phone text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT resellers_pkey PRIMARY KEY (id),
  CONSTRAINT resellers_parent_reseller_id_fkey FOREIGN KEY (parent_reseller_id) REFERENCES public.resellers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_resellers_parent ON public.resellers USING btree (parent_reseller_id);

CREATE TABLE IF NOT EXISTS public.admin_users (
  id character varying DEFAULT gen_random_uuid() NOT NULL,
  phone text NOT NULL,
  name text,
  role text DEFAULT 'admin'::text,
  is_active boolean DEFAULT true,
  last_login_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  reseller_id character varying,
  CONSTRAINT admin_users_pkey PRIMARY KEY (id),
  CONSTRAINT admin_users_phone_unique UNIQUE (phone),
  CONSTRAINT admin_users_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id)
);

CREATE TABLE IF NOT EXISTS public.otp_codes (
  id character varying DEFAULT gen_random_uuid() NOT NULL,
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamp without time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT otp_codes_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.customer_accounts (
  id character varying DEFAULT gen_random_uuid() NOT NULL,
  phone text NOT NULL,
  name text,
  email text,
  plan text DEFAULT 'free'::text NOT NULL,
  plan_started_at timestamp without time zone DEFAULT now(),
  stripe_customer_id text,
  is_active boolean DEFAULT true,
  last_login_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  onboarding_status public.onboarding_status DEFAULT 'PENDING_MSA'::public.onboarding_status NOT NULL,
  activation_date timestamp without time zone,
  trial_end_date timestamp without time zone,
  msa_accepted_at timestamp without time zone,
  msa_version text,
  compliance_status public.compliance_status DEFAULT 'NOT_SUBMITTED'::public.compliance_status NOT NULL,
  business_name text,
  ein text,
  physical_address jsonb,
  sms_use_case text,
  compliance_rejection_reason text,
  account_type public.account_type DEFAULT 'DIRECT'::public.account_type NOT NULL,
  parent_account_id character varying,
  wholesale_rate numeric(10,2) DEFAULT 49.00,
  markup_rate jsonb,
  reseller_commission_balance numeric(12,2) DEFAULT 0.00,
  stripe_connected_account_id text,
  reseller_msa_confirmed_at timestamp without time zone,
  a2p_content_provider jsonb,
  CONSTRAINT customer_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT customer_accounts_phone_unique UNIQUE (phone),
  CONSTRAINT customer_accounts_parent_account_id_customer_accounts_id_fk FOREIGN KEY (parent_account_id) REFERENCES public.customer_accounts(id)
);

CREATE TABLE IF NOT EXISTS public.customer_sessions (
  id character varying DEFAULT gen_random_uuid() NOT NULL,
  customer_account_id character varying NOT NULL,
  token text NOT NULL,
  expires_at timestamp without time zone NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT customer_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT customer_sessions_token_unique UNIQUE (token),
  CONSTRAINT customer_sessions_customer_account_id_customer_accounts_id_fk FOREIGN KEY (customer_account_id) REFERENCES public.customer_accounts(id)
);

CREATE TABLE IF NOT EXISTS public.site_configs (
  id character varying DEFAULT gen_random_uuid() NOT NULL,
  owner_id character varying,
  name text NOT NULL,
  domain text,
  place_id text,
  place_data jsonb,
  assigned_agent_id character varying,
  bot_template_id character varying,
  system_prompt_override text,
  model_provider text DEFAULT 'gemini'::text,
  model_name text,
  chatbot_enabled boolean DEFAULT true,
  voice_concierge_enabled boolean DEFAULT true,
  widget_position text DEFAULT 'bottom-right'::text,
  widget_color text DEFAULT '#2563eb'::text,
  greeting_message text,
  placeholder_text text DEFAULT 'Type a message...'::text,
  knowledge_library jsonb,
  structured_guardrails jsonb DEFAULT '{}'::jsonb,
  reviews_harvested integer DEFAULT 0,
  plan text DEFAULT 'free'::text,
  hero_image_url text,
  hero_image_prompt text,
  brand_theme text DEFAULT 'gateway-dark'::text,
  agent_config jsonb,
  voice_config jsonb,
  theme_config jsonb,
  voice_phone_ai_minutes integer DEFAULT 0 NOT NULL,
  voice_web_ai_minutes integer DEFAULT 0 NOT NULL,
  sms_messages integer DEFAULT 0 NOT NULL,
  chat_bot_messages integer DEFAULT 0 NOT NULL,
  twilio_sub_account_sid text,
  provisioned_phone_number text,
  provisioned_phone_sid text,
  workspace_state text DEFAULT 'demo'::text NOT NULL,
  claimed_at timestamp without time zone,
  created_by_type text,
  reseller_id character varying,
  last_nudge_sent_at timestamp with time zone,
  claim_token character varying(64),
  claim_token_expires_at timestamp with time zone,
  assigned_to_phone text,
  claim_status text DEFAULT 'unclaimed'::text NOT NULL,
  claim_checkout_session_id text,
  voice_plan_active boolean DEFAULT false NOT NULL,
  voice_plan_activated_at timestamp without time zone,
  voice_sub_account_sid text,
  voice_sub_account_auth_token text,
  voice_sub_account_friendly_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  domain_verified_at timestamp without time zone,
  slug character varying,
  share_count integer DEFAULT 0 NOT NULL,
  qr_code_url text,
  social_sharing jsonb DEFAULT '{}'::jsonb,
  static_routes jsonb,
  service_menu jsonb,
  faqs jsonb,
  crm_config jsonb,
  task_order jsonb DEFAULT '[]'::jsonb,
  business_type text DEFAULT 'google_maps'::text NOT NULL,
  business_description text,
  logo_url text,
  website text,
  brand_governance jsonb,
  sales_funnels jsonb,
  strategy_config jsonb,
  communication_governance jsonb DEFAULT '{}'::jsonb NOT NULL,
  platform_license_sku text,
  platform_license_activated_at timestamp with time zone,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT site_configs_pkey PRIMARY KEY (id),
  CONSTRAINT site_configs_owner_id_customer_accounts_id_fk FOREIGN KEY (owner_id) REFERENCES public.customer_accounts(id),
  CONSTRAINT site_configs_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id)
);

CREATE INDEX IF NOT EXISTS idx_site_configs_assigned_phone ON public.site_configs USING btree (assigned_to_phone) WHERE (assigned_to_phone IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_site_configs_brand_governance_approved ON public.site_configs USING btree (((brand_governance ->> 'ownerApproved'::text)));
CREATE INDEX IF NOT EXISTS idx_site_configs_brand_governance_score ON public.site_configs USING btree (((brand_governance ->> 'completionScore'::text)));
CREATE INDEX IF NOT EXISTS idx_site_configs_claim_status ON public.site_configs USING btree (claim_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_configs_claim_token ON public.site_configs USING btree (claim_token) WHERE (claim_token IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_site_configs_owner_place ON public.site_configs USING btree (owner_id, place_id);
CREATE INDEX IF NOT EXISTS idx_site_configs_place_id ON public.site_configs USING btree (place_id);
CREATE INDEX IF NOT EXISTS idx_site_configs_place_state ON public.site_configs USING btree (place_id, workspace_state);
CREATE INDEX IF NOT EXISTS idx_site_configs_plan ON public.site_configs USING btree (plan);
CREATE INDEX IF NOT EXISTS idx_site_configs_qr_code_url ON public.site_configs USING btree (qr_code_url) WHERE (qr_code_url IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_configs_slug ON public.site_configs USING btree (slug) WHERE (slug IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.telephony_configs (
  id character varying DEFAULT gen_random_uuid() NOT NULL,
  account_sid text,
  auth_token text,
  is_sub_account boolean DEFAULT false,
  parent_account_sid text,
  phone_number text,
  phone_sid text,
  friendly_name text DEFAULT 'AI Agent Trunk'::text,
  messaging_service_sid text,
  voice_url text,
  voice_fallback_url text,
  status_callback_url text,
  sms_url text,
  sms_fallback_url text,
  error_url text,
  firewall_enabled boolean DEFAULT true,
  allowed_numbers text[] DEFAULT ARRAY[]::text[],
  max_call_duration integer DEFAULT 60,
  timeout integer DEFAULT 30,
  caller_id_name text,
  owner_phone text,
  owner_email text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  site_config_id character varying,
  CONSTRAINT telephony_configs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.agents (
  id character varying DEFAULT gen_random_uuid() NOT NULL,
  site_config_id character varying,
  role_type text,
  name text NOT NULL,
  voice_id text NOT NULL,
  voice_name text NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  visibility text DEFAULT 'private'::text,
  dominance integer DEFAULT 50,
  influence integer DEFAULT 50,
  steadiness integer DEFAULT 50,
  conscientiousness integer DEFAULT 50,
  avatar_id text DEFAULT 'avatar1'::text,
  system_prompt text,
  phone_number text,
  phone_sid text,
  ai_model_provider text DEFAULT 'gemini'::text,
  ai_model_id text DEFAULT ''::text,
  ai_temperature integer DEFAULT 60,
  ai_max_tokens integer DEFAULT 4096,
  hf_token text,
  voice_model text DEFAULT 'gemini-2.5-flash-native-audio-preview-12-2025'::text,
  voice_role text DEFAULT 'AI Business Assistant'::text,
  voice_company_name text DEFAULT 'AI Biz Bot'::text,
  voice_persona text DEFAULT 'friendly'::text,
  default_emotion text,
  budget_amount_usd numeric(10,2) DEFAULT '0'::numeric,
  budget_period text DEFAULT 'monthly'::text,
  budget_spent_usd numeric(10,2) DEFAULT '0'::numeric,
  budget_reset_at timestamp without time zone,
  short_term_memory jsonb,
  long_term_memory jsonb,
  arch_profile jsonb,
  structured_controls jsonb DEFAULT '{}'::jsonb,
  operational_mode text DEFAULT 'SAFE'::text,
  verification_level text,
  no_drift_mode boolean DEFAULT false,
  startup_script text,
  startup_budget_usd numeric(10,2) DEFAULT '0'::numeric,
  startup_status text DEFAULT 'pending'::text,
  startup_result_summary text,
  startup_last_run_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT agents_pkey PRIMARY KEY (id),
  CONSTRAINT agents_site_config_id_fkey FOREIGN KEY (site_config_id) REFERENCES public.site_configs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_agents_site_config_id ON public.agents USING btree (site_config_id);
CREATE INDEX IF NOT EXISTS idx_agents_site_config_role ON public.agents USING btree (site_config_id, role_type);

CREATE TABLE IF NOT EXISTS public.call_logs (
  id character varying DEFAULT gen_random_uuid() NOT NULL,
  config_id character varying,
  direction text NOT NULL,
  phone_number text NOT NULL,
  duration integer DEFAULT 0,
  status text NOT NULL,
  recording_url text,
  call_sid text,
  customer_name text,
  customer_email text,
  notes text,
  "timestamp" timestamp without time zone DEFAULT now(),
  call_start timestamp without time zone,
  call_end timestamp without time zone,
  actual_seconds integer,
  site_config_id character varying,
  CONSTRAINT call_logs_pkey PRIMARY KEY (id),
  CONSTRAINT call_logs_config_id_telephony_configs_id_fk FOREIGN KEY (config_id) REFERENCES public.telephony_configs(id)
);

CREATE INDEX IF NOT EXISTS idx_call_logs_call_sid ON public.call_logs USING btree (call_sid);
CREATE INDEX IF NOT EXISTS idx_call_logs_site_config ON public.call_logs USING btree (site_config_id);

CREATE TABLE IF NOT EXISTS public.customers (
  id character varying DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  city text,
  state text,
  country text,
  source text,
  status text DEFAULT 'new'::text NOT NULL,
  notes text,
  stripe_customer_id text,
  subscription_id text,
  subscription_status text DEFAULT 'none'::text,
  agent_id character varying,
  association_id uuid,
  last_contact_at timestamp without time zone,
  follow_up_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_agent_id_agents_id_fk FOREIGN KEY (agent_id) REFERENCES public.agents(id),
  CONSTRAINT customers_association_id_associations_id_fk FOREIGN KEY (association_id) REFERENCES public.associations(id)
);

CREATE INDEX IF NOT EXISTS idx_customers_association_id ON public.customers USING btree (association_id);

CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id character varying DEFAULT gen_random_uuid() NOT NULL,
  admin_user_id character varying NOT NULL,
  token text NOT NULL,
  expires_at timestamp without time zone NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT auth_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT auth_sessions_token_unique UNIQUE (token),
  CONSTRAINT auth_sessions_admin_user_id_admin_users_id_fk FOREIGN KEY (admin_user_id) REFERENCES public.admin_users(id)
);
