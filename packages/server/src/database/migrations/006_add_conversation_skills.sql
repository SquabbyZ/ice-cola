-- Migration: 006 - Add conversation_skills table for conversation-scoped skill selection
-- Mirrors the conversation_mcp_servers pattern so chats can opt-in to specific skills.

CREATE TABLE IF NOT EXISTS conversation_skills (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    conversation_id VARCHAR(36) NOT NULL,
    skill_id VARCHAR(36) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversation_skills_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversation_skills_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    CONSTRAINT unique_conversation_skill UNIQUE (conversation_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_skills_conversation ON conversation_skills(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_skills_skill ON conversation_skills(skill_id);
