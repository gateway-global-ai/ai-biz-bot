-- Gateway Bot Matrix - Supabase Schema
-- Run this in Supabase SQL Editor to set up the database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- =====================================================
-- TABLES
-- =====================================================

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pages (websites/pages where bots are deployed)
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(url, org_id)
);

-- Bot Templates (pre-configured bots)
CREATE TABLE IF NOT EXISTS bot_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('sales', 'support', 'onboarding', 'custom')),
  default_system_prompt TEXT NOT NULL,
  default_model TEXT DEFAULT 'openai' CHECK (default_model IN ('openai', 'anthropic', 'kimi')),
  default_tools JSONB DEFAULT '{}',
  default_ui_config JSONB DEFAULT '{}',
  icon TEXT DEFAULT 'Bot',
  is_public BOOLEAN DEFAULT true,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Page Bots (deployed bots on specific pages)
CREATE TABLE IF NOT EXISTS page_bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  model_provider TEXT DEFAULT 'openai' CHECK (model_provider IN ('openai', 'anthropic', 'kimi')),
  model_name TEXT,
  tools_config JSONB DEFAULT '{}',
  ui_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bot Snapshots (version history)
CREATE TABLE IF NOT EXISTS bot_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES page_bots(id) ON DELETE CASCADE,
  config JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES page_bots(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  messages JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Uploads (for RAG)
CREATE TABLE IF NOT EXISTS document_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES page_bots(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content_vector VECTOR(1536),
  content_text TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys (for embed authentication)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  permissions JSONB DEFAULT '["read"]',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_pages_org_id ON pages(org_id);
CREATE INDEX IF NOT EXISTS idx_page_bots_page_id ON page_bots(page_id);
CREATE INDEX IF NOT EXISTS idx_page_bots_active ON page_bots(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_chat_sessions_bot_id ON chat_sessions(bot_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_visitor ON chat_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_bot_snapshots_bot_id ON bot_snapshots(bot_id);
CREATE INDEX IF NOT EXISTS idx_document_uploads_bot_id ON document_uploads(bot_id);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_document_vectors ON document_uploads 
  USING ivfflat (content_vector vector_cosine_ops);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Organizations: members can read, admins can write
CREATE POLICY org_select ON organizations
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE org_id = organizations.id
    )
  );

CREATE POLICY org_insert ON organizations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY org_update ON organizations
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM users WHERE org_id = organizations.id AND role = 'admin'
    )
  );

-- Users: users can read/update their own record
CREATE POLICY users_select ON users
  FOR SELECT USING (
    auth.uid() = id OR 
    auth.uid() IN (
      SELECT id FROM users u2 WHERE u2.org_id = users.org_id
    )
  );

CREATE POLICY users_update ON users
  FOR UPDATE USING (auth.uid() = id);

-- Pages: org members can access
CREATE POLICY pages_select ON pages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE org_id = pages.org_id
    )
  );

CREATE POLICY pages_insert ON pages
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE org_id = pages.org_id AND role IN ('editor', 'admin')
    )
  );

CREATE POLICY pages_update ON pages
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM users WHERE org_id = pages.org_id AND role IN ('editor', 'admin')
    )
  );

CREATE POLICY pages_delete ON pages
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM users WHERE org_id = pages.org_id AND role = 'admin'
    )
  );

-- Bot Templates: public templates + org templates
CREATE POLICY bot_templates_select ON bot_templates
  FOR SELECT USING (
    is_public = true OR 
    org_id IS NULL OR
    auth.uid() IN (
      SELECT id FROM users WHERE org_id = bot_templates.org_id
    )
  );

CREATE POLICY bot_templates_insert ON bot_templates
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE org_id = bot_templates.org_id AND role IN ('editor', 'admin')
    )
  );

-- Page Bots: org members can access
CREATE POLICY page_bots_select ON page_bots
  FOR SELECT USING (
    auth.uid() IN (
      SELECT u.id FROM users u
      JOIN pages p ON p.org_id = u.org_id
      WHERE p.id = page_bots.page_id
    )
  );

CREATE POLICY page_bots_insert ON page_bots
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT u.id FROM users u
      JOIN pages p ON p.org_id = u.org_id
      WHERE p.id = page_bots.page_id AND u.role IN ('editor', 'admin')
    )
  );

CREATE POLICY page_bots_update ON page_bots
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT u.id FROM users u
      JOIN pages p ON p.org_id = u.org_id
      WHERE p.id = page_bots.page_id AND u.role IN ('editor', 'admin')
    )
  );

CREATE POLICY page_bots_delete ON page_bots
  FOR DELETE USING (
    auth.uid() IN (
      SELECT u.id FROM users u
      JOIN pages p ON p.org_id = u.org_id
      WHERE p.id = page_bots.page_id AND u.role = 'admin'
    )
  );

-- Chat Sessions: bot owners can access
CREATE POLICY chat_sessions_select ON chat_sessions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT u.id FROM users u
      JOIN pages p ON p.org_id = u.org_id
      WHERE p.id = chat_sessions.page_id
    )
  );

-- Document Uploads: bot owners can access
CREATE POLICY document_uploads_select ON document_uploads
  FOR SELECT USING (
    auth.uid() IN (
      SELECT u.id FROM users u
      JOIN page_bots pb ON pb.page_id IN (
        SELECT p.id FROM pages p WHERE p.org_id = u.org_id
      )
      WHERE pb.id = document_uploads.bot_id
    )
  );

-- API Keys: admins only
CREATE POLICY api_keys_select ON api_keys
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE org_id = api_keys.org_id AND role = 'admin'
    )
  );

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_templates_updated_at
  BEFORE UPDATE ON bot_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_page_bots_updated_at
  BEFORE UPDATE ON page_bots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create snapshot on bot config change
CREATE OR REPLACE FUNCTION create_bot_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO bot_snapshots (bot_id, config, created_by)
  VALUES (OLD.id, row_to_json(OLD), auth.uid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER bot_config_change_snapshot
  BEFORE UPDATE ON page_bots
  FOR EACH ROW
  WHEN (OLD.system_prompt IS DISTINCT FROM NEW.system_prompt OR
        OLD.model_provider IS DISTINCT FROM NEW.model_provider OR
        OLD.tools_config IS DISTINCT FROM NEW.tools_config OR
        OLD.ui_config IS DISTINCT FROM NEW.ui_config)
  EXECUTE FUNCTION create_bot_snapshot();

-- Vector similarity search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  bot_id UUID
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_uploads.id,
    document_uploads.content_text as content,
    1 - (document_uploads.content_vector <=> query_embedding) as similarity
  FROM document_uploads
  WHERE document_uploads.bot_id = match_documents.bot_id
    AND 1 - (document_uploads.content_vector <=> query_embedding) > match_threshold
  ORDER BY document_uploads.content_vector <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default bot templates
INSERT INTO bot_templates (name, description, category, default_system_prompt, default_model, default_tools, default_ui_config, icon, is_public, org_id)
VALUES 
  (
    'Sales Assistant',
    'Convert visitors into customers with intelligent product recommendations and pricing guidance.',
    'sales',
    'You are a helpful Sales Assistant. Your goal is to understand customer needs, recommend relevant products, address objections professionally, and guide toward a purchase decision. Always be friendly and persuasive but not pushy.',
    'openai',
    '{"webSearch": true, "fileUpload": false, "codeInterpreter": false, "apiCalls": true}'::jsonb,
    '{"interface": "chat", "position": "bottom-right", "primaryColor": "#10b981", "greetingMessage": "Hi there! Looking for something specific? I can help you find the perfect solution.", "placeholderText": "Ask about our products..."}'::jsonb,
    'ShoppingCart',
    true,
    NULL
  ),
  (
    'Support Agent',
    'Provide instant technical support and troubleshoot issues 24/7.',
    'support',
    'You are a technical Support Agent. Your role is to listen carefully to user issues, ask clarifying questions to diagnose problems, provide step-by-step troubleshooting guidance, and escalate complex issues when necessary. Always be patient, empathetic, and professional.',
    'anthropic',
    '{"webSearch": true, "fileUpload": true, "codeInterpreter": false, "apiCalls": true}'::jsonb,
    '{"interface": "chat", "position": "bottom-right", "primaryColor": "#3b82f6", "greetingMessage": "Hello! I''m here to help. What issue are you experiencing today?", "placeholderText": "Describe your problem..."}'::jsonb,
    'Headphones',
    true,
    NULL
  ),
  (
    'Onboarding Guide',
    'Walk new users through product features and help them achieve their first success.',
    'onboarding',
    'You are an Onboarding Guide. Your mission is to welcome new users warmly, understand their goals and use case, guide them through key features step-by-step, celebrate their progress and milestones, and ensure they achieve their "aha moment" quickly. Keep responses concise and actionable.',
    'kimi',
    '{"webSearch": false, "fileUpload": true, "codeInterpreter": true, "apiCalls": false}'::jsonb,
    '{"interface": "chat", "position": "bottom-right", "primaryColor": "#8b5cf6", "greetingMessage": "Welcome! I''m your personal onboarding guide. Let''s get you set up for success!", "placeholderText": "What would you like to learn?"}'::jsonb,
    'Sparkles',
    true,
    NULL
  ),
  (
    'Blank Canvas',
    'Start from scratch and build a custom bot tailored to your exact needs.',
    'custom',
    'You are a helpful AI assistant.',
    'openai',
    '{"webSearch": false, "fileUpload": false, "codeInterpreter": false, "apiCalls": false}'::jsonb,
    '{"interface": "chat", "position": "bottom-right", "primaryColor": "#6b7280", "greetingMessage": "Hello! How can I assist you today?", "placeholderText": "Type your message..."}'::jsonb,
    'Palette',
    true,
    NULL
  )
ON CONFLICT DO NOTHING;
