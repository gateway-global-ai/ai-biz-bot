CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id varchar NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  vendor_type text NOT NULL,
  name text NOT NULL,
  normalized_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendors_site_type ON vendors(site_config_id, vendor_type);
CREATE INDEX IF NOT EXISTS idx_vendors_site_normkey ON vendors(site_config_id, normalized_key);

CREATE TABLE IF NOT EXISTS patient_vendor_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id varchar NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  patient_id varchar NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  vendor_type text NOT NULL,
  relationship_type text NOT NULL,
  consent_granted boolean NOT NULL DEFAULT false,
  consent_document_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pvr_site_patient ON patient_vendor_relationships(site_config_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_pvr_vendor ON patient_vendor_relationships(vendor_id);

CREATE TABLE IF NOT EXISTS consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id varchar NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  patient_id varchar NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
  consent_type text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  signature_hash text NOT NULL,
  document_id text,
  expiration_date timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_site_patient ON consent_records(site_config_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_consent_vendor ON consent_records(vendor_id);

CREATE TABLE IF NOT EXISTS intake_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id varchar NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  patient_id varchar NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  requested_value jsonb NOT NULL,
  write_mode text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewer_role text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_requests_site_status ON intake_change_requests(site_config_id, status);
CREATE INDEX IF NOT EXISTS idx_intake_requests_patient ON intake_change_requests(patient_id);
