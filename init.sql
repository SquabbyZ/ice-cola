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

-- Create task_plans table for Hermes Core task planning
CREATE TABLE IF NOT EXISTS task_plans (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    conversation_id VARCHAR(36) NOT NULL,
    user_input TEXT NOT NULL,
    plan_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'planning',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_plan_conversation FOREIGN KEY (conversation_id) 
        REFERENCES conversations(id) ON DELETE CASCADE
);

-- Create extensions table for managing extension plugins
CREATE TABLE IF NOT EXISTS extensions (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL,
    author VARCHAR(255),
    category VARCHAR(100),
    icon VARCHAR(50),
    color VARCHAR(20),
    rating DECIMAL(3, 2) DEFAULT 0.00,
    downloads INTEGER DEFAULT 0,
    homepage TEXT,
    repository TEXT,
    "teamId" VARCHAR(36),
    enabled BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_extension_team FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE SET NULL
);

-- Create user_extensions table for tracking user installed extensions
CREATE TABLE IF NOT EXISTS user_extensions (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "extensionId" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    config JSONB,
    "installedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_extension_extension FOREIGN KEY ("extensionId") REFERENCES extensions(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_extension_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_extension UNIQUE ("extensionId", "userId")
);

-- Create skills table
CREATE TABLE IF NOT EXISTS skills (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    icon VARCHAR(500),
    category VARCHAR(100),
    tags TEXT[],
    content TEXT NOT NULL,
    config_schema JSONB,
    config JSONB,
    status VARCHAR(50) DEFAULT 'personal',
    team_id VARCHAR(36),
    author_id VARCHAR(36),
    marketplace_id VARCHAR(255),
    ratings DECIMAL(3,2) DEFAULT 0.00,
    installs INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_skill_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
    CONSTRAINT fk_skill_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create skill_versions table
CREATE TABLE IF NOT EXISTS skill_versions (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    skill_id VARCHAR(36) NOT NULL,
    version VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    config_schema JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    CONSTRAINT fk_skill_version_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    CONSTRAINT fk_skill_version_author FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create skill_reviews table
CREATE TABLE IF NOT EXISTS skill_reviews (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    skill_id VARCHAR(36) NOT NULL,
    reviewer_id VARCHAR(36),
    action VARCHAR(50) NOT NULL,
    target VARCHAR(50) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_skill_review_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    CONSTRAINT fk_skill_review_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_team ON users("teamId");
CREATE INDEX IF NOT EXISTS idx_quotas_team ON quotas("teamId");
CREATE INDEX IF NOT EXISTS idx_quota_transactions_quota ON quota_transactions("quotaId");
CREATE INDEX IF NOT EXISTS idx_conversations_team ON conversations("teamId");
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages("conversationId");
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages("createdAt");
CREATE INDEX IF NOT EXISTS idx_plans_conversation ON task_plans(conversation_id);
CREATE INDEX IF NOT EXISTS idx_plans_status ON task_plans(status);
CREATE INDEX IF NOT EXISTS idx_extensions_category ON extensions(category);
CREATE INDEX IF NOT EXISTS idx_extensions_name ON extensions(name);
CREATE INDEX IF NOT EXISTS idx_user_extensions_user ON user_extensions("userId");
CREATE INDEX IF NOT EXISTS idx_user_extensions_enabled ON user_extensions(enabled);
CREATE INDEX IF NOT EXISTS idx_skills_team ON skills(team_id);
CREATE INDEX IF NOT EXISTS idx_skills_author ON skills(author_id);
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skill_versions_skill ON skill_versions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_reviews_skill ON skill_reviews(skill_id);

-- admin 用户表
CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    verified BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- admin 邀请表
CREATE TABLE IF NOT EXISTS admin_invitations (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    token VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'pending',
    invited_by VARCHAR(36) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 客户端验证码记录表
CREATE TABLE IF NOT EXISTS client_verification_codes (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    type VARCHAR(20) DEFAULT 'register',
    expires_at TIMESTAMP NOT NULL,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);