-- Migration: 007 - Add conversation expert and extension selections

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS expert_id VARCHAR(36);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_conversations_expert'
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT fk_conversations_expert FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS conversation_extensions (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    conversation_id VARCHAR(36) NOT NULL,
    extension_id VARCHAR(36) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversation_extensions_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversation_extensions_extension FOREIGN KEY (extension_id) REFERENCES extensions(id) ON DELETE CASCADE,
    CONSTRAINT unique_conversation_extension UNIQUE (conversation_id, extension_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_extensions_conversation ON conversation_extensions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_extensions_extension ON conversation_extensions(extension_id);
CREATE INDEX IF NOT EXISTS idx_conversations_expert ON conversations(expert_id);
