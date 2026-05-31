-- Create ai_api_keys table
CREATE TABLE IF NOT EXISTS ai_api_keys (
  id VARCHAR(255) PRIMARY KEY,
  provider_id VARCHAR(255) NOT NULL,
  key_name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  encrypted_key TEXT NOT NULL,
  iv VARCHAR(255) NOT NULL,
  auth_tag VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_provider_id ON ai_api_keys(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_key_hash ON ai_api_keys(key_hash);
