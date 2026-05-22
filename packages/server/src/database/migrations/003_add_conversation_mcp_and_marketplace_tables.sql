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

CREATE TABLE IF NOT EXISTS conversation_mcp_servers (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    conversation_id VARCHAR(36) NOT NULL,
    server_id VARCHAR(36) NOT NULL,
    server_name VARCHAR(255) NOT NULL,
    server_type VARCHAR(50) DEFAULT 'stdio',
    config JSONB,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversation_mcp_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversation_mcp_server FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE,
    CONSTRAINT unique_conversation_mcp_server UNIQUE (conversation_id, server_id)
);

CREATE TABLE IF NOT EXISTS marketplace_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    item_type VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_marketplace_category_slug_type UNIQUE (slug, item_type)
);

CREATE TABLE IF NOT EXISTS marketplace_items (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) DEFAULT '1.0.0',
    author_id VARCHAR(36),
    status VARCHAR(50) DEFAULT 'draft',
    icon VARCHAR(500),
    color VARCHAR(20),
    category_id INTEGER,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB,
    source_id VARCHAR(255),
    homepage TEXT,
    repository TEXT,
    config_schema JSONB,
    instructions TEXT,
    install_count INTEGER DEFAULT 0,
    rating DECIMAL(3, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_marketplace_item_category FOREIGN KEY (category_id) REFERENCES marketplace_categories(id) ON DELETE SET NULL,
    CONSTRAINT unique_marketplace_item_slug_type UNIQUE (slug, type)
);

CREATE TABLE IF NOT EXISTS marketplace_submissions (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL,
    version VARCHAR(50) NOT NULL,
    submitter_id VARCHAR(36) NOT NULL,
    note TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_marketplace_submission_item FOREIGN KEY (item_id) REFERENCES marketplace_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_marketplace_submission_submitter FOREIGN KEY (submitter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS marketplace_approvals (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    approver_id VARCHAR(36) NOT NULL,
    result VARCHAR(50) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_marketplace_approval_submission FOREIGN KEY (submission_id) REFERENCES marketplace_submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_marketplace_approval_item FOREIGN KEY (item_id) REFERENCES marketplace_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_marketplace_approval_approver FOREIGN KEY (approver_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS marketplace_installations (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    config JSONB,
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_marketplace_installation_item FOREIGN KEY (item_id) REFERENCES marketplace_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_marketplace_installation_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_marketplace_installation UNIQUE (item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_mcp_servers_conversation ON conversation_mcp_servers(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_mcp_servers_server ON conversation_mcp_servers(server_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_type ON marketplace_items(type);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_status ON marketplace_items(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_slug_type ON marketplace_items(slug, type);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_category ON marketplace_items(category_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_submissions_status ON marketplace_submissions(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_submissions_submitter ON marketplace_submissions(submitter_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_installations_user ON marketplace_installations(user_id);
