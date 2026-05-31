-- Add missing columns to redemption_codes table
ALTER TABLE redemption_codes
ADD COLUMN IF NOT EXISTS code_preview VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS disabled_by_user_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

-- Create redemption_redemptions table if not exists
CREATE TABLE IF NOT EXISTS redemption_redemptions (
  id VARCHAR(255) PRIMARY KEY,
  redemption_code_id VARCHAR(255) REFERENCES redemption_codes(id),
  team_id VARCHAR(255),
  user_id VARCHAR(255),
  redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create redemption_attempt_limits table if not exists
CREATE TABLE IF NOT EXISTS redemption_attempt_limits (
  id VARCHAR(255) PRIMARY KEY,
  ip_address VARCHAR(45),
  email VARCHAR(255),
  attempt_count INTEGER DEFAULT 1,
  last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
