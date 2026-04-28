-- 创建任务规划表
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_plans_conversation ON task_plans(conversation_id);
CREATE INDEX IF NOT EXISTS idx_plans_status ON task_plans(status);
CREATE INDEX IF NOT EXISTS idx_plans_created_at ON task_plans(created_at DESC);

-- 添加注释
COMMENT ON TABLE task_plans IS 'Hermes Core 任务规划记录表';
COMMENT ON COLUMN task_plans.id IS '计划唯一标识';
COMMENT ON COLUMN task_plans.conversation_id IS '关联的会话ID';
COMMENT ON COLUMN task_plans.user_input IS '用户原始输入';
COMMENT ON COLUMN task_plans.plan_data IS '完整的任务计划JSON数据';
COMMENT ON COLUMN task_plans.status IS '计划状态: planning/executing/completed/failed';
COMMENT ON COLUMN task_plans.created_at IS '创建时间';
COMMENT ON COLUMN task_plans.updated_at IS '更新时间';
