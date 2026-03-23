-- Guest-scoped OTP verification sessions (NOVA platform plane; Twilio Verify behind service layer)
CREATE TABLE IF NOT EXISTS guest_verification_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id varchar NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  phone_e164 text NOT NULL,
  otp_verified boolean NOT NULL DEFAULT false,
  verification_token_hash text,
  token_expires_at timestamptz,
  flow_type text NOT NULL DEFAULT 'guest_phone',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_verification_site_phone
  ON guest_verification_sessions(site_config_id, phone_e164);

CREATE INDEX IF NOT EXISTS idx_guest_verification_token_expires
  ON guest_verification_sessions(site_config_id, token_expires_at)
  WHERE otp_verified = true;
