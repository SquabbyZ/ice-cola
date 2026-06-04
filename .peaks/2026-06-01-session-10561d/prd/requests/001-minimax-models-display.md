# PRD: 显示所有MiniMax模型到Client对话选择器

**Date:** 2026-06-01
**Session:** 2026-06-01-session-10561d
**Type:** feature

## Problem Statement

Admin AI配置页面填写了 MiniMax API Key 后，可以获取到 MiniMax 的全部模型。但在 Client 对话页面（灵气阁）的模型选择器只能选择 2 个模型。

**根本原因：**

1. `model_catalog` 表仅通过 seed 数据初始化，仅包含 3 个 MiniMax 模型（rank 1/2/3）：
   - MiniMax 2.7 (rank=1, costMultiplier=1)
   - MiniMax Text-01 (rank=2, costMultiplier=1)
   - MiniMax Speech-02 (rank=3, costMultiplier=1)

2. `subscription_plans` 表中 `wanderer`（散修）套餐的 `model_rank_limit=1`，只允许查看 rank≤1 的模型。

3. 用户实际可以在 Admin 的"获取模型"功能中从 MiniMax API 拉取更多模型存入 `ai_models`，但这些模型不会自动出现在 `model_catalog` 中（需要手动在 Admin 中点击"同步模型"）。

4. Client 的模型选择器来自 `GET /teams/:teamId/models/catalog`，返回 `model_catalog` 中 `is_active=true` 且满足 `rank <= modelRankLimit` 的模型。

**用户期望：** 无论订阅等级，所有 MiniMax 模型都应显示在选择器中，只是不同模型消耗灵气倍率不同。

## Goals

1. Client 模型选择器显示该 Provider 下的**全部活跃模型**，不受订阅等级 `modelRankLimit` 限制
2. 模型按 `costMultiplier` 显示不同的灵气消耗倍率
3. 订阅等级仍然限制**执行**（estimateLingqiCost / consumeLingqi），但不限制**浏览**模型列表

## Non-Goals

- 修改 `subscription_plans` 表的 `model_rank_limit` 逻辑
- 修改 Admin 的"获取模型"功能
- 修改 `ai_models` → `model_catalog` 的同步逻辑

## Proposed Solution

### Backend Change: `quota.service.ts` → `getModelCatalogForTeam`

**修改前：**
```typescript
async getModelCatalogForTeam(teamId: string): Promise<AvailableModelCatalogView[]> {
  const subscription = await this.getActiveSubscription(teamId);
  const rows = await this.db.query<ModelCatalogRow>(
    `SELECT id, model_name, display_name, description, rank, cost_multiplier, required_plan_level, is_active
     FROM model_catalog
     WHERE is_active = true
     ORDER BY required_plan_level ASC, rank ASC, display_name ASC`,
  );
  return rows.map((row) => this.toAvailableModelCatalogView(row, subscription));
}
```

**修改后：**
- 查询时**不过滤 `rank <= modelRankLimit`** — 所有活跃模型都返回
- `isAvailable` 和 `unavailableReason` 字段指示该模型是否可用于执行（受订阅等级限制）
- Client UI 根据 `isAvailable` 显示可用/不可用状态，但仍然展示所有模型

```typescript
async getModelCatalogForTeam(teamId: string): Promise<AvailableModelCatalogView[]> {
  const subscription = await this.getActiveSubscription(teamId);
  const rows = await this.db.query<ModelCatalogRow>(
    `SELECT id, model_name, display_name, description, rank, cost_multiplier, required_plan_level, is_active
     FROM model_catalog
     WHERE is_active = true
     ORDER BY required_plan_level ASC, rank ASC, display_name ASC`,
  );
  // All active models are returned for browsing, but isAvailable reflects execution eligibility
  return rows.map((row) => this.toAvailableModelCatalogView(row, subscription));
}
```

`toAvailableModelCatalogView` 逻辑保持不变 — `isAvailable=false` 的模型在 UI 中显示为灰色/不可选择，但仍然可见。

### Frontend Change: `Lingqi.tsx` 模型选择器

- 显示所有返回的模型（不仅仅是 `isAvailable=true` 的模型）
- 对于 `isAvailable=false` 的模型，显示 `unavailableReason`（例如"需要更高订阅等级"）
- 显示每模型的 `costMultiplier`（如 "×1.0" / "×2.0" / "×5.0" 等）

### Data Fix: 补充现有 MiniMax 模型的 catalog 投影

运行一次 seed 后，手动将所有 MiniMax 模型插入 `model_catalog`：

```sql
-- 将所有 minimax provider 的活跃模型插入 model_catalog
INSERT INTO model_catalog (provider_id, model_name, display_name, description, rank, cost_multiplier, required_plan_level, is_active, created_at, updated_at)
SELECT 
  p.id as provider_id,
  m.model_id as model_name,
  m.name as display_name,
  m.description,
  m.sort_order as rank,
  1.0 as cost_multiplier,     -- 默认倍率，可按需调整
  0 as required_plan_level,    -- 所有模型对所有订阅开放浏览
  true as is_active,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM ai_models m
JOIN ai_providers p ON m.provider_id = p.id
WHERE p.code = 'minimax' AND m.status = 'active'
ON CONFLICT (model_name) DO NOTHING;
```

## Acceptance Criteria

1. Client 模型选择器显示 **所有** MiniMax 模型（包括通过"获取模型"从 API 拉取的模型）
2. 模型列表中显示每模型的灵气消耗倍率 `costMultiplier`
3. 订阅等级不足的模型显示为不可选择状态（灰色），并标注原因
4. 选择不可用模型时，给出明确的错误提示
5. 已订阅用户执行模型时，灵气消耗按 `costMultiplier` 正确计算

## Affected Files

- `packages/server/src/quota/quota.service.ts` — `getModelCatalogForTeam` 移除 rank 过滤逻辑
- `packages/client/src/pages/Lingqi.tsx` — UI 显示所有模型
- `packages/client/src/services/lingqi-service.ts` — `LingqiModel` 类型已支持 `costMultiplier`，无需修改

## Test Scenarios

1. **浏览所有模型**：以 wanderer（modelRankLimit=1）账号登录，应看到所有 MiniMax 模型，而不仅仅是 rank≤1 的
2. **不可用模型标注**：rank > modelRankLimit 的模型显示为灰色/禁用状态
3. **灵气计算**：选择不同 `costMultiplier` 的模型，灵气估算正确反映倍率
4. **新模型同步后**：Admin 点击"获取模型"同步新模型后，Client 刷新页面能看到新模型

## Status

- state: handed-off
- last update: 2026-06-01T08:30:38.519Z