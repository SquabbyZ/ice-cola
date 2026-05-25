-- 005: Project MiniMax models into model_catalog so Client 问道 can list them.
--
-- Background: migration 004 seeded model_catalog with three OpenAI/Anthropic
-- models only. AI models seeded into ai_models (including MiniMax) skip the
-- TypeScript-level upsertModelCatalogProjection path, so they never appear in
-- the Client model catalog. This migration retroactively projects MiniMax
-- chat models so admin-configured MiniMax credentials can drive the 问道
-- (chat) flow end-to-end.
--
-- Pricing is expressed via cost_multiplier only (per current 灵气 consumption
-- model). Token-plan-based billing remains a future iteration.

INSERT INTO model_catalog (
    provider_id,
    model_name,
    display_name,
    description,
    rank,
    cost_multiplier,
    required_plan_level,
    is_active
)
SELECT
    p.id,
    'MiniMax-M2.7',
    '问道 · MiniMax M2.7',
    'MiniMax 编码与代理工作流模型，Anthropic 兼容端点',
    1,
    1.50,
    0,
    true
FROM ai_providers p
WHERE p.code = 'minimax'
ON CONFLICT (model_name) DO UPDATE SET
    provider_id = EXCLUDED.provider_id,
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    rank = EXCLUDED.rank,
    cost_multiplier = EXCLUDED.cost_multiplier,
    required_plan_level = EXCLUDED.required_plan_level,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO model_catalog (
    provider_id,
    model_name,
    display_name,
    description,
    rank,
    cost_multiplier,
    required_plan_level,
    is_active
)
SELECT
    p.id,
    'abab6.5s-chat',
    '问道 · MiniMax abab6.5s',
    'MiniMax 通用对话模型，Anthropic 兼容端点',
    5,
    1.20,
    0,
    true
FROM ai_providers p
WHERE p.code = 'minimax'
ON CONFLICT (model_name) DO UPDATE SET
    provider_id = EXCLUDED.provider_id,
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    rank = EXCLUDED.rank,
    cost_multiplier = EXCLUDED.cost_multiplier,
    required_plan_level = EXCLUDED.required_plan_level,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;
