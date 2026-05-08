-- Add conversation_mcp_servers table for MCP-to-chat integration
-- This table tracks which MCP servers are enabled for each conversation

CREATE TABLE IF NOT EXISTS conversation_mcp_servers (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    conversation_id VARCHAR(36) NOT NULL,
    server_id VARCHAR(36) NOT NULL,
    server_name VARCHAR(255) NOT NULL,
    server_type VARCHAR(50) NOT NULL DEFAULT 'stdio',
    config JSONB,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversation_mcp_conversation FOREIGN KEY (conversation_id)
        REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversation_mcp_server FOREIGN KEY (server_id)
        REFERENCES mcp_servers(id) ON DELETE CASCADE,
    CONSTRAINT unique_conversation_mcp_server UNIQUE (conversation_id, server_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversation_mcp_conversation
    ON conversation_mcp_servers(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_mcp_server
    ON conversation_mcp_servers(server_id);
