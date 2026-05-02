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
    category VARCHAR(100),
    rating DECIMAL(3, 2) DEFAULT 0.00,
    is_default BOOLEAN DEFAULT false,
    call_count INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expert_team FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE SET NULL
);

-- Create expert_usage table for tracking expert usage statistics
CREATE TABLE IF NOT EXISTS expert_usage (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    expert_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    team_id VARCHAR(36),
    tokens INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expert_usage_expert FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE,
    CONSTRAINT fk_expert_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_expert_usage_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- Create expert_categories table for marketplace categorization
CREATE TABLE IF NOT EXISTS expert_categories (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Create mcp_servers table for MCP marketplace
CREATE TABLE IF NOT EXISTS mcp_servers (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    author VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    icon VARCHAR(500),
    color VARCHAR(20),
    tags TEXT[],
    homepage TEXT,
    repository TEXT,
    enabled BOOLEAN DEFAULT true,
    config_schema JSONB,
    instructions TEXT,
    ratings DECIMAL(3, 2) DEFAULT 0.00,
    installs INTEGER DEFAULT 0,
    team_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mcp_server_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- Create user_mcp_connections table for tracking user MCP server connections
CREATE TABLE IF NOT EXISTS user_mcp_connections (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL,
    server_id VARCHAR(36) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'disconnected',
    config JSONB,
    connected_at TIMESTAMP,
    disconnected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_mcp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_mcp_server FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_mcp_connection UNIQUE (user_id, server_id)
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
CREATE INDEX IF NOT EXISTS idx_mcp_servers_category ON mcp_servers(category);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_team ON mcp_servers(team_id);
CREATE INDEX IF NOT EXISTS idx_user_mcp_connections_user ON user_mcp_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mcp_connections_server ON user_mcp_connections(server_id);
CREATE INDEX IF NOT EXISTS idx_experts_team ON experts("teamId");
CREATE INDEX IF NOT EXISTS idx_experts_category ON experts(category);
CREATE INDEX IF NOT EXISTS idx_experts_enabled ON experts(enabled);
CREATE INDEX IF NOT EXISTS idx_experts_is_default ON experts(is_default);
CREATE INDEX IF NOT EXISTS idx_expert_usage_expert ON expert_usage(expert_id);
CREATE INDEX IF NOT EXISTS idx_expert_usage_user ON expert_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_expert_usage_team ON expert_usage(team_id);
CREATE INDEX IF NOT EXISTS idx_expert_usage_created ON expert_usage("createdAt");
CREATE INDEX IF NOT EXISTS idx_expert_categories_name ON expert_categories(name);

-- Create workorders table for approval workflow
CREATE TABLE IF NOT EXISTS workorders (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    type VARCHAR(50) NOT NULL DEFAULT 'skill',
    target_id VARCHAR(36) NOT NULL,
    target_name VARCHAR(255) NOT NULL,
    target_icon VARCHAR(100),
    applicant_id VARCHAR(36) NOT NULL,
    applicant_name VARCHAR(255),
    team_id VARCHAR(36) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    note TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workorder_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Create workorder_history table for approval records
CREATE TABLE IF NOT EXISTS workorder_history (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "workorderId" VARCHAR(36) NOT NULL,
    "teamId" VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    target_name VARCHAR(255) NOT NULL,
    approver_id VARCHAR(36) NOT NULL,
    approver_name VARCHAR(255),
    result VARCHAR(50) NOT NULL,
    comment TEXT,
    "processedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_workorder FOREIGN KEY ("workorderId") REFERENCES workorders(id) ON DELETE CASCADE
);

-- Create indexes for workorders
CREATE INDEX IF NOT EXISTS idx_workorders_team ON workorders(team_id);
CREATE INDEX IF NOT EXISTS idx_workorders_status ON workorders(status);
CREATE INDEX IF NOT EXISTS idx_workorders_type ON workorders(type);
CREATE INDEX IF NOT EXISTS idx_workorder_history_team ON workorder_history("teamId");
CREATE INDEX IF NOT EXISTS idx_workorder_history_workorder ON workorder_history("workorderId");

-- Create client_verification_codes table for email verification during registration
CREATE TABLE IF NOT EXISTS client_verification_codes (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'register',
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for client_verification_codes
CREATE INDEX IF NOT EXISTS idx_client_verification_codes_email ON client_verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_client_verification_codes_expires ON client_verification_codes(expires_at);

-- Create admin users table
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

-- Seed default admin owner account
INSERT INTO admin_users (id, email, password, name, role, verified, "createdAt", "updatedAt")
VALUES (
    uuid_generate_v4()::text,
    '601709253@qq.com',
    '$2a$10$hqTi18RDqe.MgD3SL3bgYuZ.FhUX7ywty1CBmQe0TNoliLmhgc8EG',
    'Owner',
    'OWNER',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Create admin invitations table
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

-- Create team_invitations table for team invitation workflow
CREATE TABLE IF NOT EXISTS team_invitations (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    team_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    invited_by VARCHAR(36) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for team_invitations
CREATE INDEX IF NOT EXISTS idx_team_invitations_team ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);

-- System configuration table
CREATE TABLE IF NOT EXISTS system_config (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email templates table for configurable email content
CREATE TABLE IF NOT EXISTS email_templates (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default verification code template
INSERT INTO email_templates (key, name, subject, body, variables, is_active)
VALUES (
    'verification_code',
    '注册验证码',
    '您的注册验证码',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Microsoft YaHei,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 30px;text-align:center;">
                            <h1 style="color:#ffffff;font-size:24px;font-weight:600;margin:0;">加冰可乐</h1>
                            <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0;">AI 办公助手</p>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding:40px 30px;">
                            <h2 style="color:#333333;font-size:20px;font-weight:600;margin:0 0 20px;">您好</h2>
                            <p style="color:#666666;font-size:15px;line-height:1.8;margin:0 0 30px;">
                                您的注册验证码是：
                            </p>
                            <div style="background:#f8f9ff;border:2px dashed #667eea;border-radius:12px;padding:30px;text-align:center;margin:0 0 30px;">
                                <span style="font-size:36px;font-weight:700;color:#667eea;letter-spacing:8px;">{{code}}</span>
                            </div>
                            <p style="color:#999999;font-size:13px;margin:0;">
                                验证码 5 分钟内有效，请勿泄露给他人。
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background:#f8f9ff;padding:20px 30px;text-align:center;">
                            <p style="color:#999999;font-size:12px;margin:0;">
                                此邮件由系统自动发送，请勿回复。
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    '["code"]',
    true
) ON CONFLICT (key) DO NOTHING;

-- Seed default MCP servers
INSERT INTO mcp_servers (id, name, description, version, author, category, icon, color, tags, homepage, repository, config_schema, instructions, ratings, installs)
VALUES
    ('mcp-filesystem-001', '文件系统', '访问和管理本地文件系统，读取、写入文件和目录', '1.0.0', 'OpenClaw Team', 'tool', '📁', '#3B82F6', ARRAY['filesystem', 'file', 'storage'], 'https://github.com/openclaw/mcp-filesystem', 'https://github.com/openclaw/mcp-filesystem', '{"basePath": {"type": "string", "description": "允许访问的基础目录路径", "required": true, "default": "/"}}', '使用此服务器可以读取和写入本地文件系统。支持文件浏览、创建、编辑和删除操作。', 4.9, 34521),
    ('mcp-github-001', 'GitHub', '与 GitHub API 集成，管理仓库、PR、Issues 和 Actions', '2.1.0', 'OpenClaw Team', 'development', '🐙', '#24292F', ARRAY['github', 'git', 'repository', 'pr', 'issues'], 'https://github.com/openclaw/mcp-github', 'https://github.com/openclaw/mcp-github', '{"token": {"type": "string", "description": "GitHub Personal Access Token", "required": true, "default": ""}}', '集成 GitHub API，可以查看仓库、创建和管理 PR、Issues，支持 GitHub Actions 状态查询。', 4.8, 28934),
    ('mcp-sqlite-001', 'SQLite 数据库', '连接 SQLite 数据库，执行查询和管理数据', '1.2.0', 'Community', 'data', '🗄️', '#334155', ARRAY['database', 'sqlite', 'sql', 'data'], NULL, NULL, '{"dbPath": {"type": "string", "description": "SQLite 数据库文件路径", "required": true, "default": "./data.db"}}', '连接本地 SQLite 数据库，执行 SQL 查询和管理数据库结构。', 4.6, 15678),
    ('mcp-slack-001', 'Slack', '与 Slack 工作区集成，发送消息和管理频道', '1.5.0', 'OpenClaw Team', 'communication', '💬', '#4A154B', ARRAY['slack', 'chat', 'team', 'message'], NULL, NULL, '{"botToken": {"type": "string", "description": "Slack Bot User OAuth Token", "required": true, "default": ""}, "defaultChannel": {"type": "string", "description": "默认发布消息的频道", "required": false, "default": "#general"}}', '连接 Slack 工作区，发送频道消息、创建线程和管理频道成员。', 4.7, 19876),
    ('mcp-brave-search-001', 'Brave 搜索', '使用 Brave Search API 进行网络搜索', '1.0.0', 'Community', 'tool', '🔍', '#FB722F', ARRAY['search', 'web', 'brave', 'internet'], NULL, NULL, '{"apiKey": {"type": "string", "description": "Brave Search API Key", "required": true, "default": ""}}', '使用 Brave Search API 进行网络搜索，获取实时搜索结果。', 4.5, 12345),
    ('mcp-sentry-001', 'Sentry 监控', '集成 Sentry 监控，获取错误报告和性能数据', '0.9.0', 'Community', 'development', '🐘', '#FF4757', ARRAY['sentry', 'monitoring', 'error', 'performance'], NULL, NULL, '{"dsn": {"type": "string", "description": "Sentry DSN URL", "required": true, "default": ""}}', '连接 Sentry 获取项目错误报告、性能监控数据和用户反馈。', 4.4, 8765),
    ('mcp-postgres-001', 'PostgreSQL', '连接 PostgreSQL 数据库，执行高级查询和数据管理', '1.3.0', 'OpenClaw Team', 'data', '🐘', '#336791', ARRAY['database', 'postgresql', 'sql', 'data'], NULL, NULL, '{"host": {"type": "string", "description": "数据库主机地址", "required": true, "default": "localhost"}, "port": {"type": "string", "description": "数据库端口", "required": false, "default": "5432"}, "database": {"type": "string", "description": "数据库名称", "required": true, "default": "postgres"}, "username": {"type": "string", "description": "数据库用户名", "required": true, "default": "postgres"}, "password": {"type": "string", "description": "数据库密码", "required": true, "default": ""}}', '连接 PostgreSQL 数据库，支持复杂查询、事务处理和数据库管理。', 4.8, 21345),
    ('mcp-fetch-001', 'HTTP 请求', '发送 HTTP 请求，访问外部 API 和网页内容', '1.1.0', 'OpenClaw Team', 'tool', '🌐', '#10B981', ARRAY['http', 'api', 'fetch', 'web', 'request'], NULL, NULL, '{"timeout": {"type": "string", "description": "请求超时时间（毫秒）", "required": false, "default": "30000"}, "userAgent": {"type": "string", "description": "User-Agent 头信息", "required": false, "default": "IceCola/1.0"}}', '发送 HTTP/HTTPS 请求，访问外部 API 和获取网页内容。支持 GET、POST、PUT、DELETE 等方法。', 4.9, 45678)
ON CONFLICT (id) DO NOTHING;
