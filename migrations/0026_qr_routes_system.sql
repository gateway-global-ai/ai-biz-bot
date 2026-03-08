-- QR Routes: shadow telecom routing table (QR code = virtual phone number)
CREATE TABLE IF NOT EXISTS qr_routes (
  id SERIAL PRIMARY KEY,
  variable UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  destination TEXT,
  site_config_id VARCHAR REFERENCES site_configs(id) ON DELETE SET NULL,
  label TEXT,
  qr_code_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  scan_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_routes_site_config_id ON qr_routes(site_config_id) WHERE site_config_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_routes_variable ON qr_routes(variable);
CREATE INDEX IF NOT EXISTS idx_qr_routes_is_active ON qr_routes(is_active);

-- Firewall rules: allow/deny by IP, UA, or rate limit
CREATE TABLE IF NOT EXISTS qr_firewall (
  id SERIAL PRIMARY KEY,
  qr_route_id INTEGER REFERENCES qr_routes(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('allow_ip', 'deny_ip', 'allow_ua', 'deny_ua', 'rate_limit')),
  value TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_firewall_route_id ON qr_firewall(qr_route_id);

-- Access log: every scan (or blocked attempt)
CREATE TABLE IF NOT EXISTS qr_access (
  id BIGSERIAL PRIMARY KEY,
  qr_route_id INTEGER NOT NULL REFERENCES qr_routes(id) ON DELETE CASCADE,
  accessed_at TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  destination TEXT,
  was_blocked BOOLEAN NOT NULL DEFAULT false,
  response_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_qr_access_route_id ON qr_access(qr_route_id);
CREATE INDEX IF NOT EXISTS idx_qr_access_accessed_at ON qr_access(accessed_at DESC);
