-- Initialize Ice Cola Database
-- This script runs automatically when PostgreSQL container starts

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
DO $$ BEGIN
    CREATE TYPE team_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE quota_transaction_type AS ENUM ('RECHARGE', 'USAGE', 'REFUND');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    "teamId" VARCHAR(36),
    role team_role DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_team FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE SET NULL
);

-- Create quotas table
CREATE TABLE IF NOT EXISTS quotas (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "teamId" VARCHAR(36) UNIQUE NOT NULL,
    "totalAmt" BIGINT DEFAULT 1000,
    "usedAmt" BIGINT DEFAULT 0,
    "period" INTEGER DEFAULT 30,
    "resetDay" INTEGER DEFAULT 1,
    "resetAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_quota_team FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE CASCADE
);

-- Create quota_transactions table
CREATE TABLE IF NOT EXISTS quota_transactions (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "quotaId" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "userName" VARCHAR(255) NOT NULL,
    "amount" BIGINT NOT NULL,
    "balanceBefore" BIGINT NOT NULL,
    "balanceAfter" BIGINT NOT NULL,
    "type" quota_transaction_type NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_quota_transaction_quota FOREIGN KEY ("quotaId") REFERENCES quotas(id) ON DELETE CASCADE,
    CONSTRAINT fk_quota_transaction_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "teamId" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    platform VARCHAR(50) DEFAULT 'hermes',
    "sessionId" VARCHAR(255),
    title VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversation_team FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversation_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "conversationId" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36),
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    model VARCHAR(100),
    usage JSONB,
    metadata JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_message_conversation FOREIGN KEY ("conversationId") REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_message_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL
);

-- Create usage table for tracking API usage stats
CREATE TABLE IF NOT EXISTS usage (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "teamId" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36),
    model VARCHAR(100) NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost DECIMAL(10, 4) DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usage_team FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_usage_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL
);

-- Create experts table for managing AI expert prompts
CREATE TABLE IF NOT EXISTS experts (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "teamId" VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "systemPrompt" TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    call_count INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expert_team FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_team ON users("teamId");
CREATE INDEX IF NOT EXISTS idx_quotas_team ON quotas("teamId");
CREATE INDEX IF NOT EXISTS idx_quota_transactions_quota ON quota_transactions("quotaId");
CREATE INDEX IF NOT EXISTS idx_conversations_team ON conversations("teamId");
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages("conversationId");
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages("createdAt");