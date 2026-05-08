-- AI Models Configuration Schema
-- Phase 1: Database Tables for AI Model Configuration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: ai_providers
-- ============================================
CREATE TABLE IF NOT EXISTS ai_providers (
  id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  logo_url TEXT,
  website_url TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_providers_code ON ai_providers(code);
CREATE INDEX IF NOT EXISTS idx_ai_providers_status ON ai_providers(status);

-- ============================================
-- Table: ai_models
-- ============================================
CREATE TABLE IF NOT EXISTS ai_models (
  id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  provider_id VARCHAR(36) NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  model_id VARCHAR(100) NOT NULL,
  model_type VARCHAR(50) NOT NULL,
  description TEXT,
  context_window INTEGER,
  input_price_per_1m DECIMAL(10,4),
  output_price_per_1m DECIMAL(10,4),
  sort_order INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  capabilities JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_status ON ai_models(status);
CREATE INDEX IF NOT EXISTS idx_ai_models_type ON ai_models(model_type);

-- ============================================
-- Table: ai_api_keys
-- ============================================
CREATE TABLE IF NOT EXISTS ai_api_keys (
  id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  provider_id VARCHAR(36) NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  key_name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  encrypted_key TEXT NOT NULL,
  iv VARCHAR(32) NOT NULL,
  auth_tag VARCHAR(32) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_api_keys_provider ON ai_api_keys(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_hash ON ai_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_active ON ai_api_keys(is_active);

-- ============================================
-- Table: ai_endpoints
-- ============================================
CREATE TABLE IF NOT EXISTS ai_endpoints (
  id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  provider_id VARCHAR(36) NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  base_url VARCHAR(500) NOT NULL,
  headers JSONB,
  timeout_ms INTEGER DEFAULT 60000,
  retry_count INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_endpoints_provider ON ai_endpoints(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_endpoints_default ON ai_endpoints(provider_id, is_default);

-- ============================================
-- Table: ai_model_configs
-- ============================================
CREATE TABLE IF NOT EXISTS ai_model_configs (
  id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  model_id VARCHAR(36) NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
  config_name VARCHAR(100) NOT NULL,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4096,
  top_p DECIMAL(3,2) DEFAULT 1.0,
  top_k INTEGER DEFAULT 100,
  frequency_penalty DECIMAL(3,2) DEFAULT 0.0,
  presence_penalty DECIMAL(3,2) DEFAULT 0.0,
  stop_sequences JSONB,
  response_format JSONB,
  extra_params JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_model_configs_model ON ai_model_configs(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_configs_active ON ai_model_configs(is_active);

-- ============================================
-- Table: ai_default_models
-- ============================================
CREATE TABLE IF NOT EXISTS ai_default_models (
  id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  provider_id VARCHAR(36) NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  model_id VARCHAR(36) NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
  config_id VARCHAR(36) REFERENCES ai_model_configs(id) ON DELETE SET NULL,
  use_case VARCHAR(50) NOT NULL,
  is_system_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider_id, use_case)
);

CREATE INDEX IF NOT EXISTS idx_ai_default_models_use_case ON ai_default_models(use_case);

-- ============================================
-- Table: ai_team_quotas
-- ============================================
CREATE TABLE IF NOT EXISTS ai_team_quotas (
  id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  team_id VARCHAR(36) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  daily_token_limit BIGINT DEFAULT 1000000,
  monthly_token_limit BIGINT DEFAULT 10000000,
  daily_request_limit INTEGER DEFAULT 1000,
  monthly_request_limit INTEGER DEFAULT 50000,
  used_today BIGINT DEFAULT 0,
  used_this_month BIGINT DEFAULT 0,
  requests_today INTEGER DEFAULT 0,
  requests_this_month INTEGER DEFAULT 0,
  quota_reset_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_team_quotas_team ON ai_team_quotas(team_id);

-- ============================================
-- Table: ai_usage_logs
-- ============================================
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  team_id VARCHAR(36) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id VARCHAR(36),
  model_id VARCHAR(36) NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
  provider_id VARCHAR(36) NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  conversation_id VARCHAR(36),
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost DECIMAL(10,6) DEFAULT 0,
  latency_ms INTEGER,
  endpoint VARCHAR(100),
  model_params JSONB,
  response_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_team_created ON ai_usage_logs(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_model_created ON ai_usage_logs(model_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_provider_created ON ai_usage_logs(provider_id, created_at DESC);

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE ai_providers IS 'AI provider definitions (OpenAI, Anthropic, Google, etc.)';
COMMENT ON TABLE ai_models IS 'Model definitions per provider';
COMMENT ON TABLE ai_api_keys IS 'Encrypted API keys for AI providers';
COMMENT ON TABLE ai_endpoints IS 'Custom endpoint configurations for providers';
COMMENT ON TABLE ai_model_configs IS 'Model parameters and configurations';
COMMENT ON TABLE ai_default_models IS 'System default model selections';
COMMENT ON TABLE ai_team_quotas IS 'Team-based quota management for AI usage';
COMMENT ON TABLE ai_usage_logs IS 'Usage tracking for AI models';