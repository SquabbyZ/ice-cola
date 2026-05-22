CREATE TABLE IF NOT EXISTS lingqi_accounts (
    team_id VARCHAR(36) PRIMARY KEY,
    balance_amt BIGINT NOT NULL DEFAULT 0 CHECK (balance_amt >= 0),
    total_granted_amt BIGINT NOT NULL DEFAULT 0 CHECK (total_granted_amt >= 0),
    total_consumed_amt BIGINT NOT NULL DEFAULT 0 CHECK (total_consumed_amt >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lingqi_account_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT check_lingqi_account_totals CHECK (balance_amt = total_granted_amt - total_consumed_amt)
);

CREATE TABLE IF NOT EXISTS cultivation_realms (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    min_total_consumed_amt BIGINT NOT NULL UNIQUE CHECK (min_total_consumed_amt >= 0),
    sort_order INTEGER NOT NULL CHECK (sort_order > 0),
    privileges JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lingqi_ledger_entries (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    team_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('grant', 'consume')),
    amount BIGINT NOT NULL CHECK (amount > 0),
    transaction_type VARCHAR(50) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(100),
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key VARCHAR(160),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lingqi_ledger_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_lingqi_ledger_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lingqi_ledger_team_idempotency
ON lingqi_ledger_entries(team_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    level INTEGER NOT NULL UNIQUE CHECK (level >= 0),
    period_lingqi_amt BIGINT NOT NULL DEFAULT 0 CHECK (period_lingqi_amt >= 0),
    cost_discount_rate NUMERIC(5, 2) NOT NULL DEFAULT 1.00 CHECK (cost_discount_rate > 0),
    model_rank_limit INTEGER NOT NULL DEFAULT 1 CHECK (model_rank_limit > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_subscriptions (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    team_id VARCHAR(36) NOT NULL,
    plan_id VARCHAR(36) NOT NULL,
    starts_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_team_subscription_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_team_subscription_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    CONSTRAINT check_team_subscription_period CHECK (expires_at > starts_at)
);

CREATE TABLE IF NOT EXISTS redemption_codes (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    code_hash VARCHAR(64) NOT NULL UNIQUE CHECK (code_hash ~ '^[a-f0-9]{64}$'),
    display_label VARCHAR(100) NOT NULL,
    lingqi_amount BIGINT NOT NULL CHECK (lingqi_amount > 0),
    plan_id VARCHAR(36),
    max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
    used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_redemption_code_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL,
    CONSTRAINT check_redemption_code_uses CHECK (used_count <= max_uses)
);

CREATE TABLE IF NOT EXISTS redemption_redemptions (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    code_id VARCHAR(36) NOT NULL,
    team_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_redemption_code FOREIGN KEY (code_id) REFERENCES redemption_codes(id) ON DELETE CASCADE,
    CONSTRAINT fk_redemption_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_redemption_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_redemption_code_team UNIQUE (code_id, team_id)
);

CREATE TABLE IF NOT EXISTS redemption_attempt_limits (
    team_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    reset_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, user_id),
    CONSTRAINT fk_redemption_attempt_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_redemption_attempt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS model_catalog (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    provider_id VARCHAR(36),
    model_name VARCHAR(120) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    description TEXT,
    rank INTEGER NOT NULL DEFAULT 1 CHECK (rank > 0),
    cost_multiplier NUMERIC(6, 2) NOT NULL DEFAULT 1.00 CHECK (cost_multiplier > 0),
    required_plan_level INTEGER NOT NULL DEFAULT 0 CHECK (required_plan_level >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_selected_models (
    team_id VARCHAR(36) PRIMARY KEY,
    model_catalog_id VARCHAR(36) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_selected_model_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_selected_model_catalog FOREIGN KEY (model_catalog_id) REFERENCES model_catalog(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS conversation_selected_models (
    conversation_id VARCHAR(36) PRIMARY KEY,
    model_catalog_id VARCHAR(36) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversation_selected_model_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversation_selected_model_catalog FOREIGN KEY (model_catalog_id) REFERENCES model_catalog(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_lingqi_ledger_team_created ON lingqi_ledger_entries(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lingqi_ledger_created_id ON lingqi_ledger_entries(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_lingqi_ledger_user ON lingqi_ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_team_subscriptions_team_status_expires ON team_subscriptions(team_id, status, expires_at);
DO $$
DECLARE
    duplicate_team_ids TEXT;
BEGIN
    SELECT string_agg(team_id, ', ')
    INTO duplicate_team_ids
    FROM (
        SELECT team_id
        FROM team_subscriptions
        WHERE status = 'active'
        GROUP BY team_id
        HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_team_ids IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot create one-active-subscription constraint; duplicate active subscriptions exist for team_id(s): %', duplicate_team_ids;
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_subscriptions_one_active ON team_subscriptions(team_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_team_subscriptions_plan ON team_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_redemption_redemptions_team ON redemption_redemptions(team_id);
CREATE INDEX IF NOT EXISTS idx_redemption_redemptions_user ON redemption_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemption_redemptions_code ON redemption_redemptions(code_id);
DO $$
DECLARE
    duplicate_code_ids TEXT;
BEGIN
    SELECT string_agg(code_id, ', ')
    INTO duplicate_code_ids
    FROM (
        SELECT code_id
        FROM redemption_redemptions
        GROUP BY code_id
        HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_code_ids IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot create one-time redemption constraint; duplicate redemptions exist for code_id(s): %', duplicate_code_ids;
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_redemption_redemptions_code_once ON redemption_redemptions(code_id);
CREATE INDEX IF NOT EXISTS idx_redemption_attempt_limits_reset ON redemption_attempt_limits(reset_at);
CREATE INDEX IF NOT EXISTS idx_redemption_attempt_limits_user ON redemption_attempt_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_plan ON redemption_codes(plan_id);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_active_expires ON redemption_codes(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_model_catalog_active_rank ON model_catalog(is_active, rank);

ALTER TABLE redemption_codes
ADD COLUMN IF NOT EXISTS code_preview VARCHAR(32),
ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR(36),
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS disabled_by_user_id VARCHAR(36),
ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

UPDATE redemption_codes
SET code_preview = LEFT(display_label, 32)
WHERE code_preview IS NULL;

ALTER TABLE redemption_codes
ALTER COLUMN code_preview SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_redemption_codes_created_by ON redemption_codes(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_disabled_by ON redemption_codes(disabled_by_user_id);

ALTER TABLE redemption_codes
DROP CONSTRAINT IF EXISTS fk_redemption_code_created_by,
DROP CONSTRAINT IF EXISTS fk_redemption_code_disabled_by;

ALTER TABLE redemption_codes
ADD CONSTRAINT fk_redemption_code_created_by
FOREIGN KEY (created_by_user_id) REFERENCES admin_users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_redemption_code_disabled_by
FOREIGN KEY (disabled_by_user_id) REFERENCES admin_users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_team_selected_models_catalog ON team_selected_models(model_catalog_id);
CREATE INDEX IF NOT EXISTS idx_conversation_selected_models_catalog ON conversation_selected_models(model_catalog_id);

INSERT INTO cultivation_realms (name, display_name, min_total_consumed_amt, sort_order, privileges)
VALUES
    ('mortal', '凡人', 0, 1, '{}'::jsonb),
    ('qi_refining', '练气境', 100, 2, '{}'::jsonb),
    ('foundation', '筑基境', 500, 3, '{}'::jsonb),
    ('golden_core', '金丹境', 2000, 4, '{}'::jsonb),
    ('nascent_soul', '元婴境', 8000, 5, '{}'::jsonb),
    ('spirit_transformation', '化神境', 20000, 6, '{}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    min_total_consumed_amt = EXCLUDED.min_total_consumed_amt,
    sort_order = EXCLUDED.sort_order,
    privileges = EXCLUDED.privileges,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO subscription_plans (name, display_name, level, period_lingqi_amt, cost_discount_rate, model_rank_limit)
VALUES
    ('wanderer', '散修', 0, 0, 1.00, 1),
    ('outer_disciple', '外门弟子', 1, 1000, 0.95, 2),
    ('inner_disciple', '内门弟子', 2, 3000, 0.90, 3),
    ('direct_disciple', '亲传', 3, 8000, 0.85, 4),
    ('elder_patron', '长老供奉', 4, 20000, 0.80, 5)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    level = EXCLUDED.level,
    period_lingqi_amt = EXCLUDED.period_lingqi_amt,
    cost_discount_rate = EXCLUDED.cost_discount_rate,
    model_rank_limit = EXCLUDED.model_rank_limit,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO model_catalog (model_name, display_name, description, rank, cost_multiplier, required_plan_level)
VALUES
    ('gpt-4o-mini', '入门心法', '日常问答与轻量任务', 1, 1.00, 0),
    ('gpt-4o', '玄阶功法', '复杂推理与代码辅助', 2, 1.80, 1),
    ('claude-3-5-sonnet-20241022', '宗师真诀', '高阶规划与长任务', 3, 3.00, 2)
ON CONFLICT (model_name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    rank = EXCLUDED.rank,
    cost_multiplier = EXCLUDED.cost_multiplier,
    required_plan_level = EXCLUDED.required_plan_level,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO redemption_codes (code_hash, display_label, code_preview, lingqi_amount, plan_id, max_uses, expires_at)
SELECT
    seed.code_hash,
    '本地开发灵符',
    'DEV...SEED',
    1000,
    id,
    1,
    NOW() + INTERVAL '365 days'
FROM subscription_plans
CROSS JOIN LATERAL (
    SELECT NULLIF(current_setting('icecola.seed_dev_redemption_code_hash', true), '') AS code_hash
) seed
WHERE name = 'outer_disciple'
  AND current_setting('icecola.seed_dev_data', true) = 'true'
  AND seed.code_hash ~ '^[a-f0-9]{64}$'
ON CONFLICT (code_hash) DO UPDATE SET
    display_label = EXCLUDED.display_label,
    code_preview = EXCLUDED.code_preview,
    lingqi_amount = EXCLUDED.lingqi_amount,
    plan_id = EXCLUDED.plan_id,
    max_uses = EXCLUDED.max_uses,
    updated_at = CURRENT_TIMESTAMP;
