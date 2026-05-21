# Lingqi Model Subscription Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a usable Lingqi MVP where client users redeem server-issued codes, view Lingqi balance and cultivation realm progression, select available models, and spend Lingqi through chat and other transaction categories.

**Architecture:** Extend the existing NestJS quota module into the Lingqi domain with transactional accounts, ledger entries, redemption codes, subscription plans, cultivation realms, model catalog access, and billing estimates. Keep client state in a dedicated Lingqi service/store, surface status in the sidebar, add a Lingqi page, and integrate model selection plus pre-send cost estimates into Chat. Follow existing team-scoped REST routes (`/teams/:teamId/...`) rather than introducing unscoped quota routes.

**Tech Stack:** NestJS, PostgreSQL, `pg`, Jest, React 18, Vite, Zustand, Vitest, Tailwind/shadcn UI, Playwright MCP.

**Commit policy:** This plan intentionally omits commit steps because the current instruction is not to commit code unless the user explicitly authorizes it.

---

## File Structure

### Server

- Create: `packages/server/src/database/migrations/004_add_lingqi_subscription_model_catalog.sql` — creates Lingqi accounts, realms, ledger, redemption, subscription, model catalog, and selected model tables.
- Modify: `init.sql` — mirrors the new schema for fresh Docker database initialization.
- Modify: `packages/server/src/quota/quota.service.ts` — adds Lingqi status, redemption, estimate, consume, model selection, and realm derivation while preserving existing quota methods.
- Modify: `packages/server/src/quota/quota.controller.ts` — exposes team-scoped Lingqi quota endpoints.
- Create: `packages/server/src/quota/model-catalog.controller.ts` — exposes team-scoped model catalog and selection endpoints.
- Modify: `packages/server/src/quota/quota.module.ts` — registers the model catalog controller.
- Modify: `packages/server/src/quota/quota.service.spec.ts` — covers redemption, realms, estimate, model access, and consume behavior.
- Create: `packages/server/src/quota/quota.controller.spec.ts` — covers endpoint wiring and user/team params.
- Create: `packages/server/src/quota/model-catalog.controller.spec.ts` — covers model catalog and selection endpoint wiring.
- Modify: `packages/server/src/hermes/hermes.service.ts` — consumes Lingqi before external chat execution with selected model context.
- Modify: `packages/server/src/hermes/hermes.service.spec.ts` — covers chat pre-charge model cost.

### Client

- Create: `packages/client/src/services/lingqi-service.ts` — REST client for Lingqi status, redemption, model catalog, model selection, and billing estimate.
- Create: `packages/client/src/services/lingqi-service.test.ts` — tests endpoints, auth headers, and response mapping.
- Create: `packages/client/src/stores/lingqi.ts` — Zustand store for status, models, selected model, estimates, redeem action, and refresh.
- Create: `packages/client/src/stores/lingqi.test.ts` — tests store state transitions and failed requests.
- Create: `packages/client/src/components/LingqiStatusCard.tsx` — compact sidebar status card with balance and cultivation realm progress.
- Create: `packages/client/src/components/LingqiModelSelector.tsx` — Chat model selector with availability and cost multiplier.
- Create: `packages/client/src/components/LingqiCostPreview.tsx` — estimated cost and insufficient-balance messaging.
- Create: `packages/client/src/pages/Lingqi.tsx` — Lingqi Pavilion page for redemption, realm progress, subscription, models, and recent ledger.
- Modify: `packages/client/src/App.tsx` — adds `/lingqi` protected route.
- Modify: `packages/client/src/components/Sidebar.tsx` — adds Lingqi navigation and sidebar status card.
- Modify: `packages/client/src/pages/Chat.tsx` — loads Lingqi status/models, selects model, estimates chat cost, blocks insufficient balance, and refreshes status after send.

### Verification Artifacts

- Create after E2E: `reports/lingqi_E2E_TEST_REPORT_20260520.md` — project-required E2E report.

---

## Route Decisions

Use existing team-scoped REST style:

- `GET /teams/:teamId/quota/status`
- `POST /teams/:teamId/quota/redeem`
- `POST /teams/:teamId/quota/estimate`
- `GET /teams/:teamId/models/catalog`
- `POST /teams/:teamId/models/select`

This differs from the conceptual spec paths (`/quota/status`, `/models/catalog`, `/billing/estimate`) only by adding the existing team prefix and grouping estimate under quota to match the current NestJS module layout.

---

### Task 1: Database Migration and Fresh Init Schema

**Files:**
- Create: `packages/server/src/database/migrations/004_add_lingqi_subscription_model_catalog.sql`
- Modify: `init.sql`

- [ ] **Step 1: Create the migration file**

Write `packages/server/src/database/migrations/004_add_lingqi_subscription_model_catalog.sql` with this schema:

```sql
CREATE TABLE IF NOT EXISTS lingqi_accounts (
    team_id VARCHAR(36) PRIMARY KEY,
    balance_amt BIGINT NOT NULL DEFAULT 0,
    total_granted_amt BIGINT NOT NULL DEFAULT 0,
    total_consumed_amt BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lingqi_account_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cultivation_realms (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    min_total_consumed_amt BIGINT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lingqi_ledger_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_lingqi_ledger_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    level INTEGER NOT NULL UNIQUE,
    period_lingqi_amt BIGINT NOT NULL DEFAULT 0,
    cost_discount_rate NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    model_rank_limit INTEGER NOT NULL DEFAULT 1,
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
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_team_subscription_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_team_subscription_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS redemption_codes (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    code_hash VARCHAR(64) NOT NULL UNIQUE,
    display_label VARCHAR(100) NOT NULL,
    lingqi_amount BIGINT NOT NULL CHECK (lingqi_amount > 0),
    plan_id VARCHAR(36),
    max_uses INTEGER NOT NULL DEFAULT 1,
    used_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_redemption_code_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL
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

CREATE TABLE IF NOT EXISTS model_catalog (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    provider_id VARCHAR(36),
    model_name VARCHAR(120) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    description TEXT,
    rank INTEGER NOT NULL DEFAULT 1,
    cost_multiplier NUMERIC(6, 2) NOT NULL DEFAULT 1.00,
    required_plan_level INTEGER NOT NULL DEFAULT 0,
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

INSERT INTO cultivation_realms (name, display_name, min_total_consumed_amt, sort_order, privileges)
VALUES
    ('mortal', '凡人', 0, 1, '{}'::jsonb),
    ('qi_refining', '练气境', 100, 2, '{}'::jsonb),
    ('foundation', '筑基境', 500, 3, '{}'::jsonb),
    ('golden_core', '金丹境', 2000, 4, '{}'::jsonb),
    ('nascent_soul', '元婴境', 8000, 5, '{}'::jsonb),
    ('spirit_transformation', '化神境', 20000, 6, '{}'::jsonb)
ON CONFLICT (name) DO NOTHING;

INSERT INTO subscription_plans (name, display_name, level, period_lingqi_amt, cost_discount_rate, model_rank_limit)
VALUES
    ('wanderer', '散修', 0, 0, 1.00, 1),
    ('outer_disciple', '外门弟子', 1, 1000, 0.95, 2),
    ('inner_disciple', '内门弟子', 2, 3000, 0.90, 3),
    ('direct_disciple', '亲传', 3, 8000, 0.85, 4),
    ('elder_patron', '长老供奉', 4, 20000, 0.80, 5)
ON CONFLICT (name) DO NOTHING;

INSERT INTO model_catalog (model_name, display_name, description, rank, cost_multiplier, required_plan_level)
VALUES
    ('demo-basic', '入门心法', '日常问答与轻量任务', 1, 1.00, 0),
    ('demo-advanced', '玄阶功法', '复杂推理与代码辅助', 2, 1.80, 1),
    ('demo-master', '宗师真诀', '高阶规划与长任务', 3, 3.00, 2)
ON CONFLICT (model_name) DO NOTHING;
```

- [ ] **Step 2: Add a seeded test redemption code without storing the raw code in SQL comments**

Append this deterministic hash seed. Keep the raw development code outside the repository in local secrets or test setup notes.

```sql
INSERT INTO redemption_codes (code_hash, display_label, lingqi_amount, plan_id, max_uses, expires_at)
SELECT
    '<sha256-of-local-dev-code>',
    '本地开发灵符',
    1000,
    id,
    100,
    NOW() + INTERVAL '365 days'
FROM subscription_plans
WHERE name = 'outer_disciple'
ON CONFLICT (code_hash) DO NOTHING;
```

- [ ] **Step 3: Mirror the same schema and seed in `init.sql`**

Add the same SQL after the existing core tables and before sample data inserts. Keep it idempotent with `CREATE TABLE IF NOT EXISTS` and `ON CONFLICT`.

- [ ] **Step 4: Verify SQL is parseable by applying it to a local database**

Run:

```bash
psql "$DATABASE_URL" -f packages/server/src/database/migrations/004_add_lingqi_subscription_model_catalog.sql
```

Expected: command exits with code 0 and reports `CREATE TABLE` / `INSERT 0 n` without syntax errors.

---

### Task 2: Server Lingqi Types and Service Tests

**Files:**
- Modify: `packages/server/src/quota/quota.service.spec.ts`
- Modify later: `packages/server/src/quota/quota.service.ts`

- [ ] **Step 1: Add test fixtures to `QuotaService` spec**

Extend the `beforeEach` mocked `DatabaseService` with `query`, `queryOne`, and transaction client rows:

```ts
useValue: {
  findQuotaByTeamId: jest.fn(),
  createQuota: jest.fn(),
  incrementQuotaUsed: jest.fn(),
  updateQuota: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  transaction: jest.fn(async (callback: (client: PoolClient) => Promise<unknown>) => callback(transactionClient as PoolClient)),
}
```

- [ ] **Step 2: Write failing tests for cultivation realm derivation**

Add under `describe('getLingqiStatus')`:

```ts
it('returns cultivation realm progress from total consumed amount', async () => {
  db.queryOne.mockResolvedValue({
    team_id: 'team-1',
    balance_amt: '900',
    total_granted_amt: '1000',
    total_consumed_amt: '600',
  });
  db.query.mockResolvedValue([
    { name: 'mortal', display_name: '凡人', min_total_consumed_amt: '0', sort_order: 1, privileges: {} },
    { name: 'qi_refining', display_name: '练气境', min_total_consumed_amt: '100', sort_order: 2, privileges: {} },
    { name: 'foundation', display_name: '筑基境', min_total_consumed_amt: '500', sort_order: 3, privileges: {} },
    { name: 'golden_core', display_name: '金丹境', min_total_consumed_amt: '2000', sort_order: 4, privileges: {} },
  ]);

  const result = await service.getLingqiStatus('team-1');

  expect(result.balance).toBe(900);
  expect(result.totalConsumed).toBe(600);
  expect(result.cultivationRealm.displayName).toBe('筑基境');
  expect(result.nextCultivationRealm?.displayName).toBe('金丹境');
  expect(result.realmProgress.current).toBe(100);
  expect(result.realmProgress.required).toBe(1500);
});
```

- [ ] **Step 3: Write failing tests for redemption success**

Add:

```ts
it('redeems a code and grants Lingqi in one transaction', async () => {
  const codeHash = 'hash-1';
  jest.spyOn(service, 'hashRedemptionCode').mockReturnValue(codeHash);
  (transactionClient.query as jest.Mock)
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ id: 'code-1', lingqi_amount: '1000', plan_id: 'plan-1', max_uses: 1, used_count: 0, expires_at: null }] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '0', total_granted_amt: '0', total_consumed_amt: '0' }] })
    .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '1000', total_granted_amt: '1000', total_consumed_amt: '0' }] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] });
  db.query.mockResolvedValue([{ name: 'mortal', display_name: '凡人', min_total_consumed_amt: '0', sort_order: 1, privileges: {} }]);

  const result = await service.redeemLingqiCode('team-1', 'user-1', '<local-test-redemption-code>');

  expect(result.grantedAmount).toBe(1000);
  expect(result.status.balance).toBe(1000);
});
```

- [ ] **Step 4: Write failing tests for redemption errors**

Add three tests:

```ts
it('rejects an invalid redemption code', async () => {
  jest.spyOn(service, 'hashRedemptionCode').mockReturnValue('missing-hash');
  (transactionClient.query as jest.Mock)
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] });

  await expect(service.redeemLingqiCode('team-1', 'user-1', 'bad-code')).rejects.toMatchObject({
    code: 'LINGQI_REDEMPTION_CODE_INVALID',
  });
});

it('rejects an exhausted redemption code', async () => {
  jest.spyOn(service, 'hashRedemptionCode').mockReturnValue('hash-1');
  (transactionClient.query as jest.Mock)
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ id: 'code-1', lingqi_amount: '1000', plan_id: null, max_uses: 1, used_count: 1, expires_at: null }] });

  await expect(service.redeemLingqiCode('team-1', 'user-1', '<local-test-redemption-code>')).rejects.toMatchObject({
    code: 'LINGQI_REDEMPTION_CODE_EXHAUSTED',
  });
});

it('rejects a code already used by the team', async () => {
  jest.spyOn(service, 'hashRedemptionCode').mockReturnValue('hash-1');
  (transactionClient.query as jest.Mock)
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ id: 'code-1', lingqi_amount: '1000', plan_id: null, max_uses: 5, used_count: 1, expires_at: null }] })
    .mockResolvedValueOnce({ rows: [{ id: 'redemption-1' }] });

  await expect(service.redeemLingqiCode('team-1', 'user-1', '<local-test-redemption-code>')).rejects.toMatchObject({
    code: 'LINGQI_REDEMPTION_CODE_ALREADY_USED',
  });
});
```

- [ ] **Step 5: Write failing tests for estimates and consumption**

Add:

```ts
it('estimates chat message cost from selected model and subscription discount', async () => {
  db.queryOne
    .mockResolvedValueOnce({ level: 1, cost_discount_rate: '0.95', model_rank_limit: 2 })
    .mockResolvedValueOnce({ id: 'model-1', model_name: 'demo-advanced', display_name: '玄阶功法', rank: 2, cost_multiplier: '1.80', required_plan_level: 1, is_active: true })
    .mockResolvedValueOnce({ team_id: 'team-1', balance_amt: '1000', total_granted_amt: '1000', total_consumed_amt: '0' });

  const result = await service.estimateLingqiCost('team-1', {
    transactionType: 'chat_message',
    modelId: 'model-1',
    context: { conversationId: 'conv-1' },
  });

  expect(result.estimatedCost).toBe(18);
  expect(result.canAfford).toBe(true);
});

it('consumes Lingqi and writes ledger entry when balance is enough', async () => {
  (transactionClient.query as jest.Mock)
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '1000', total_granted_amt: '1000', total_consumed_amt: '0' }] })
    .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '982', total_granted_amt: '1000', total_consumed_amt: '18' }] })
    .mockResolvedValueOnce({ rows: [] });

  await expect(service.consumeLingqi('team-1', 'user-1', {
    amount: 18,
    transactionType: 'chat_message',
    sourceType: 'chat',
    sourceId: 'conv-1',
    description: '聊天模型调用',
    metadata: { modelId: 'model-1' },
  })).resolves.toEqual(expect.objectContaining({ balance: 982, totalConsumed: 18 }));
});
```

- [ ] **Step 6: Run the server quota tests and verify RED**

Run:

```bash
pnpm --filter @ice-cola/server test -- quota.service.spec.ts
```

Expected: FAIL with TypeScript or runtime errors because `getLingqiStatus`, `redeemLingqiCode`, `estimateLingqiCost`, `consumeLingqi`, and `hashRedemptionCode` do not exist yet.

---

### Task 3: Implement Server Lingqi Service

**Files:**
- Modify: `packages/server/src/quota/quota.service.ts`

- [ ] **Step 1: Add public Lingqi types near the top of `quota.service.ts`**

Add after `QuotaCheckResult`:

```ts
export type LingqiTransactionType = 'chat_message' | 'tool_call' | 'expert_skill' | 'background_task';
export type LingqiDirection = 'grant' | 'consume';

export interface CultivationRealmView {
  name: string;
  displayName: string;
  minTotalConsumed: number;
  privileges: Record<string, unknown>;
}

export interface LingqiStatus {
  teamId: string;
  balance: number;
  totalGranted: number;
  totalConsumed: number;
  cultivationRealm: CultivationRealmView;
  nextCultivationRealm: CultivationRealmView | null;
  realmProgress: {
    current: number;
    required: number;
    percentage: number;
  };
  subscription: {
    planName: string;
    displayName: string;
    level: number;
    costDiscountRate: number;
    modelRankLimit: number;
    expiresAt: Date | null;
  };
  warningThreshold: number;
}

export interface LingqiEstimateRequest {
  transactionType: LingqiTransactionType;
  modelId?: string;
  context?: {
    conversationId?: string;
    toolId?: string;
    skillId?: string;
    taskType?: string;
  };
}

export interface LingqiEstimateResult {
  estimatedCost: number;
  balanceAfterEstimate: number;
  canAfford: boolean;
  reason: string | null;
}

export interface ConsumeLingqiRequest {
  amount: number;
  transactionType: LingqiTransactionType;
  sourceType: string;
  sourceId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}
```

- [ ] **Step 2: Add constants for first-version pricing**

Add below interfaces:

```ts
const INITIAL_LINGQI_BALANCE = 0;
const WARNING_THRESHOLD = 0.2;
const CHAT_BASE_COST = 10;
const SKILL_BASE_COST = 20;
const TOOL_COSTS: Record<string, number> = {
  light: 5,
  medium: 15,
  heavy: 30,
};
const TASK_PHASE_COSTS: Record<string, number> = {
  create: 10,
  execute: 25,
  artifact: 15,
};
```

- [ ] **Step 3: Add code hashing without logging raw codes**

Import `createHash`:

```ts
import { createHash, randomUUID } from 'crypto';
```

Add method:

```ts
hashRedemptionCode(code: string): string {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}
```

- [ ] **Step 4: Add `getLingqiStatus`**

Implement:

```ts
async getLingqiStatus(teamId: string): Promise<LingqiStatus> {
  const account = await this.ensureLingqiAccount(teamId);
  const realms = await this.getCultivationRealms();
  const subscription = await this.getActiveSubscription(teamId);
  const realmProgress = this.deriveRealmProgress(Number(account.total_consumed_amt), realms);

  return {
    teamId,
    balance: Number(account.balance_amt),
    totalGranted: Number(account.total_granted_amt),
    totalConsumed: Number(account.total_consumed_amt),
    cultivationRealm: realmProgress.currentRealm,
    nextCultivationRealm: realmProgress.nextRealm,
    realmProgress: realmProgress.progress,
    subscription,
    warningThreshold: WARNING_THRESHOLD,
  };
}
```

- [ ] **Step 5: Add account and realm helpers**

Add private helpers:

```ts
private async ensureLingqiAccount(teamId: string) {
  const existing = await this.db.queryOne(
    'SELECT * FROM lingqi_accounts WHERE team_id = $1',
    [teamId],
  );
  if (existing) return existing;

  return this.db.queryOne(
    `INSERT INTO lingqi_accounts (team_id, balance_amt, total_granted_amt, total_consumed_amt, created_at, updated_at)
     VALUES ($1, $2, $2, 0, NOW(), NOW())
     RETURNING *`,
    [teamId, INITIAL_LINGQI_BALANCE],
  );
}

private async getCultivationRealms(): Promise<CultivationRealmView[]> {
  const rows = await this.db.query(
    `SELECT name, display_name, min_total_consumed_amt, privileges
     FROM cultivation_realms
     WHERE is_active = true
     ORDER BY sort_order ASC`,
  );

  return rows.map((row) => ({
    name: row.name,
    displayName: row.display_name,
    minTotalConsumed: Number(row.min_total_consumed_amt),
    privileges: row.privileges || {},
  }));
}

private deriveRealmProgress(totalConsumed: number, realms: CultivationRealmView[]) {
  const currentRealm = realms.reduce(
    (current, realm) => realm.minTotalConsumed <= totalConsumed ? realm : current,
    realms[0],
  );
  const nextRealm = realms.find((realm) => realm.minTotalConsumed > totalConsumed) || null;
  const current = totalConsumed - currentRealm.minTotalConsumed;
  const required = nextRealm ? nextRealm.minTotalConsumed - currentRealm.minTotalConsumed : 0;

  return {
    currentRealm,
    nextRealm,
    progress: {
      current,
      required,
      percentage: required > 0 ? Math.min(100, Math.round((current / required) * 100)) : 100,
    },
  };
}
```

- [ ] **Step 6: Add subscription helper**

Add:

```ts
private async getActiveSubscription(teamId: string) {
  const row = await this.db.queryOne(
    `SELECT sp.name, sp.display_name, sp.level, sp.cost_discount_rate, sp.model_rank_limit, ts.expires_at
     FROM team_subscriptions ts
     JOIN subscription_plans sp ON sp.id = ts.plan_id
     WHERE ts.team_id = $1 AND ts.status = 'active' AND ts.expires_at > NOW()
     ORDER BY sp.level DESC, ts.expires_at DESC
     LIMIT 1`,
    [teamId],
  );

  if (!row) {
    return {
      planName: 'wanderer',
      displayName: '散修',
      level: 0,
      costDiscountRate: 1,
      modelRankLimit: 1,
      expiresAt: null,
    };
  }

  return {
    planName: row.name,
    displayName: row.display_name,
    level: Number(row.level),
    costDiscountRate: Number(row.cost_discount_rate),
    modelRankLimit: Number(row.model_rank_limit),
    expiresAt: row.expires_at,
  };
}
```

- [ ] **Step 7: Implement `redeemLingqiCode` transactionally**

Add:

```ts
async redeemLingqiCode(teamId: string, userId: string, code: string) {
  const codeHash = this.hashRedemptionCode(code);

  const grantedAmount = await this.db.transaction(async (client) => {
    await this.lockQuotaTeam(client, teamId);
    const codeResult = await client.query(
      'SELECT * FROM redemption_codes WHERE code_hash = $1 FOR UPDATE',
      [codeHash],
    );
    const redemptionCode = codeResult.rows[0];

    if (!redemptionCode || !redemptionCode.is_active) {
      throw new AppError('LINGQI_REDEMPTION_CODE_INVALID', '灵符无效，请核对后重试', 404);
    }

    if (redemptionCode.expires_at && new Date(redemptionCode.expires_at).getTime() < Date.now()) {
      throw new AppError('LINGQI_REDEMPTION_CODE_EXPIRED', '此灵符灵效已散', 400);
    }

    if (Number(redemptionCode.used_count) >= Number(redemptionCode.max_uses)) {
      throw new AppError('LINGQI_REDEMPTION_CODE_EXHAUSTED', '此灵符已被使用', 400);
    }

    const usedResult = await client.query(
      'SELECT id FROM redemption_redemptions WHERE code_id = $1 AND team_id = $2',
      [redemptionCode.id, teamId],
    );
    if (usedResult.rows.length > 0) {
      throw new AppError('LINGQI_REDEMPTION_CODE_ALREADY_USED', '此灵符已被当前团队使用', 400);
    }

    await this.ensureLingqiAccountInTransaction(client, teamId);
    await client.query(
      `UPDATE lingqi_accounts
       SET balance_amt = balance_amt + $1,
           total_granted_amt = total_granted_amt + $1,
           updated_at = NOW()
       WHERE team_id = $2`,
      [redemptionCode.lingqi_amount, teamId],
    );
    await client.query(
      `INSERT INTO redemption_redemptions (code_id, team_id, user_id)
       VALUES ($1, $2, $3)`,
      [redemptionCode.id, teamId, userId],
    );
    await client.query(
      `INSERT INTO lingqi_ledger_entries (team_id, user_id, direction, amount, transaction_type, source_type, source_id, description, metadata)
       VALUES ($1, $2, 'grant', $3, 'redemption', 'redemption_code', $4, $5, '{}'::jsonb)`,
      [teamId, userId, redemptionCode.lingqi_amount, redemptionCode.id, '兑换灵符获得灵气'],
    );
    await client.query(
      'UPDATE redemption_codes SET used_count = used_count + 1, updated_at = NOW() WHERE id = $1',
      [redemptionCode.id],
    );

    if (redemptionCode.plan_id) {
      await client.query(
        `INSERT INTO team_subscriptions (team_id, plan_id, starts_at, expires_at, status, source_type, source_id)
         VALUES ($1, $2, NOW(), NOW() + INTERVAL '30 days', 'active', 'redemption_code', $3)`,
        [teamId, redemptionCode.plan_id, redemptionCode.id],
      );
    }

    return Number(redemptionCode.lingqi_amount);
  });

  return {
    grantedAmount,
    status: await this.getLingqiStatus(teamId),
  };
}
```

- [ ] **Step 8: Add transaction account helper**

Add:

```ts
private async ensureLingqiAccountInTransaction(client: PoolClient, teamId: string) {
  const existing = await client.query('SELECT * FROM lingqi_accounts WHERE team_id = $1 FOR UPDATE', [teamId]);
  if (existing.rows[0]) return existing.rows[0];

  const created = await client.query(
    `INSERT INTO lingqi_accounts (team_id, balance_amt, total_granted_amt, total_consumed_amt, created_at, updated_at)
     VALUES ($1, $2, $2, 0, NOW(), NOW())
     RETURNING *`,
    [teamId, INITIAL_LINGQI_BALANCE],
  );
  return created.rows[0];
}
```

- [ ] **Step 9: Implement `estimateLingqiCost` and model access**

Add:

```ts
async estimateLingqiCost(teamId: string, request: LingqiEstimateRequest): Promise<LingqiEstimateResult> {
  const subscription = await this.getActiveSubscription(teamId);
  const model = request.modelId
    ? await this.getModelCatalogItem(request.modelId)
    : await this.getSelectedModelForTeam(teamId);

  if (model.requiredPlanLevel > subscription.level) {
    return {
      estimatedCost: 0,
      balanceAfterEstimate: (await this.getLingqiStatus(teamId)).balance,
      canAfford: false,
      reason: 'SUBSCRIPTION_REQUIRED',
    };
  }

  const baseCost = this.getBaseCost(request.transactionType, request.context);
  const estimatedCost = Math.ceil(baseCost * Number(model.costMultiplier) * subscription.costDiscountRate);
  const status = await this.getLingqiStatus(teamId);

  return {
    estimatedCost,
    balanceAfterEstimate: status.balance - estimatedCost,
    canAfford: status.balance >= estimatedCost,
    reason: status.balance >= estimatedCost ? null : 'LINGQI_INSUFFICIENT_BALANCE',
  };
}

private getBaseCost(transactionType: LingqiTransactionType, context?: LingqiEstimateRequest['context']): number {
  if (transactionType === 'chat_message') return CHAT_BASE_COST;
  if (transactionType === 'expert_skill') return SKILL_BASE_COST;
  if (transactionType === 'tool_call') return TOOL_COSTS[context?.toolId || 'medium'] || TOOL_COSTS.medium;
  if (transactionType === 'background_task') return TASK_PHASE_COSTS[context?.taskType || 'execute'] || TASK_PHASE_COSTS.execute;
  return CHAT_BASE_COST;
}
```

- [ ] **Step 10: Implement model helpers**

Add:

```ts
private async getModelCatalogItem(modelId: string) {
  const row = await this.db.queryOne(
    `SELECT id, model_name, display_name, description, rank, cost_multiplier, required_plan_level, is_active
     FROM model_catalog
     WHERE id = $1 AND is_active = true`,
    [modelId],
  );
  if (!row) {
    throw new AppError('MODEL_NOT_AVAILABLE', '所选功法不可用', 404);
  }
  return {
    id: row.id,
    modelName: row.model_name,
    displayName: row.display_name,
    description: row.description,
    rank: Number(row.rank),
    costMultiplier: Number(row.cost_multiplier),
    requiredPlanLevel: Number(row.required_plan_level),
    isActive: row.is_active,
  };
}

private async getSelectedModelForTeam(teamId: string) {
  const row = await this.db.queryOne(
    `SELECT mc.*
     FROM team_selected_models tsm
     JOIN model_catalog mc ON mc.id = tsm.model_catalog_id
     WHERE tsm.team_id = $1 AND mc.is_active = true`,
    [teamId],
  );
  if (row) {
    return {
      id: row.id,
      modelName: row.model_name,
      displayName: row.display_name,
      description: row.description,
      rank: Number(row.rank),
      costMultiplier: Number(row.cost_multiplier),
      requiredPlanLevel: Number(row.required_plan_level),
      isActive: row.is_active,
    };
  }

  const fallback = await this.db.queryOne(
    `SELECT * FROM model_catalog WHERE is_active = true ORDER BY required_plan_level ASC, rank ASC LIMIT 1`,
  );
  if (!fallback) {
    throw new AppError('MODEL_NOT_AVAILABLE', '暂无可用功法', 404);
  }
  return {
    id: fallback.id,
    modelName: fallback.model_name,
    displayName: fallback.display_name,
    description: fallback.description,
    rank: Number(fallback.rank),
    costMultiplier: Number(fallback.cost_multiplier),
    requiredPlanLevel: Number(fallback.required_plan_level),
    isActive: fallback.is_active,
  };
}
```

- [ ] **Step 11: Implement `consumeLingqi`**

Add:

```ts
async consumeLingqi(teamId: string, userId: string, request: ConsumeLingqiRequest): Promise<{ balance: number; totalConsumed: number }> {
  if (!Number.isInteger(request.amount) || request.amount <= 0) {
    throw new AppError('LINGQI_INVALID_AMOUNT', '灵气消耗数量必须是正整数', 400);
  }

  return this.db.transaction(async (client) => {
    await this.lockQuotaTeam(client, teamId);
    const account = await this.ensureLingqiAccountInTransaction(client, teamId);
    const balance = BigInt(account.balance_amt);
    const amount = BigInt(request.amount);

    if (balance < amount) {
      throw new AppError('LINGQI_INSUFFICIENT_BALANCE', `灵气不足，当前剩余 ${balance}`, 403);
    }

    const updated = await client.query(
      `UPDATE lingqi_accounts
       SET balance_amt = balance_amt - $1,
           total_consumed_amt = total_consumed_amt + $1,
           updated_at = NOW()
       WHERE team_id = $2
       RETURNING *`,
      [amount.toString(), teamId],
    );

    await client.query(
      `INSERT INTO lingqi_ledger_entries (team_id, user_id, direction, amount, transaction_type, source_type, source_id, description, metadata)
       VALUES ($1, $2, 'consume', $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        teamId,
        userId,
        amount.toString(),
        request.transactionType,
        request.sourceType,
        request.sourceId || null,
        request.description,
        JSON.stringify(request.metadata || {}),
      ],
    );

    return {
      balance: Number(updated.rows[0].balance_amt),
      totalConsumed: Number(updated.rows[0].total_consumed_amt),
    };
  });
}
```

- [ ] **Step 12: Run quota tests and verify GREEN**

Run:

```bash
pnpm --filter @ice-cola/server test -- quota.service.spec.ts
```

Expected: PASS for existing quota tests and new Lingqi tests.

---

### Task 4: Server Controller Endpoints

**Files:**
- Create: `packages/server/src/quota/quota.controller.spec.ts`
- Modify: `packages/server/src/quota/quota.controller.ts`

- [ ] **Step 1: Write controller tests**

Create `packages/server/src/quota/quota.controller.spec.ts`:

```ts
import { QuotaController } from './quota.controller';
import { QuotaService } from './quota.service';

describe('QuotaController Lingqi endpoints', () => {
  let controller: QuotaController;
  let quotaService: jest.Mocked<Pick<QuotaService, 'getLingqiStatus' | 'redeemLingqiCode' | 'estimateLingqiCost'>>;

  beforeEach(() => {
    quotaService = {
      getLingqiStatus: jest.fn(),
      redeemLingqiCode: jest.fn(),
      estimateLingqiCost: jest.fn(),
    };
    controller = new QuotaController(quotaService as unknown as QuotaService);
  });

  it('returns Lingqi status for a team', async () => {
    quotaService.getLingqiStatus.mockResolvedValue({ balance: 1000 } as any);

    const result = await controller.getLingqiStatus('team-1');

    expect(quotaService.getLingqiStatus).toHaveBeenCalledWith('team-1');
    expect(result).toEqual({ success: true, data: { balance: 1000 } });
  });

  it('redeems a code for the current user', async () => {
    quotaService.redeemLingqiCode.mockResolvedValue({ grantedAmount: 1000, status: { balance: 1000 } } as any);

    const result = await controller.redeemLingqi('team-1', { code: '<local-test-redemption-code>' }, { sub: 'user-1' } as any);

    expect(quotaService.redeemLingqiCode).toHaveBeenCalledWith('team-1', 'user-1', '<local-test-redemption-code>');
    expect(result.success).toBe(true);
  });

  it('estimates Lingqi cost', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue({ estimatedCost: 18, balanceAfterEstimate: 982, canAfford: true, reason: null });

    const result = await controller.estimateLingqiCost('team-1', { transactionType: 'chat_message', modelId: 'model-1' } as any);

    expect(quotaService.estimateLingqiCost).toHaveBeenCalledWith('team-1', { transactionType: 'chat_message', modelId: 'model-1' });
    expect(result.data.estimatedCost).toBe(18);
  });
});
```

- [ ] **Step 2: Run controller tests and verify RED**

Run:

```bash
pnpm --filter @ice-cola/server test -- quota.controller.spec.ts
```

Expected: FAIL because controller methods do not exist.

- [ ] **Step 3: Add endpoints to `QuotaController`**

Add methods below existing `getQuota`:

```ts
@Get('status')
async getLingqiStatus(@Param('teamId') teamId: string) {
  const status = await this.quotaService.getLingqiStatus(teamId);
  return { success: true, data: status };
}

@Post('redeem')
async redeemLingqi(
  @Param('teamId') teamId: string,
  @Body() body: { code: string },
  @CurrentUser() user: CurrentAuthUser,
) {
  const result = await this.quotaService.redeemLingqiCode(teamId, user.sub, body.code);
  return { success: true, data: result };
}

@Post('estimate')
async estimateLingqiCost(
  @Param('teamId') teamId: string,
  @Body() body: LingqiEstimateRequest,
) {
  const result = await this.quotaService.estimateLingqiCost(teamId, body);
  return { success: true, data: result };
}
```

Also import `LingqiEstimateRequest` from `./quota.service`.

- [ ] **Step 4: Run controller tests and verify GREEN**

Run:

```bash
pnpm --filter @ice-cola/server test -- quota.controller.spec.ts
```

Expected: PASS.

---

### Task 5: Model Catalog and Selection Endpoints

**Files:**
- Modify: `packages/server/src/quota/quota.service.ts`
- Create: `packages/server/src/quota/model-catalog.controller.ts`
- Create: `packages/server/src/quota/model-catalog.controller.spec.ts`
- Modify: `packages/server/src/quota/quota.module.ts`
- Modify: `packages/server/src/quota/quota.service.spec.ts`

- [ ] **Step 1: Add model catalog tests to `quota.service.spec.ts`**

Add:

```ts
it('returns model catalog with availability by subscription level', async () => {
  db.queryOne.mockResolvedValue({ level: 1, cost_discount_rate: '0.95', model_rank_limit: 2, name: 'outer_disciple', display_name: '外门弟子', expires_at: null });
  db.query.mockResolvedValue([
    { id: 'basic', model_name: 'demo-basic', display_name: '入门心法', description: '轻量', rank: 1, cost_multiplier: '1.00', required_plan_level: 0, is_active: true },
    { id: 'master', model_name: 'demo-master', display_name: '宗师真诀', description: '高阶', rank: 3, cost_multiplier: '3.00', required_plan_level: 2, is_active: true },
  ]);

  const result = await service.getModelCatalogForTeam('team-1');

  expect(result[0]).toMatchObject({ id: 'basic', isAvailable: true });
  expect(result[1]).toMatchObject({ id: 'master', isAvailable: false, unavailableReason: 'SUBSCRIPTION_REQUIRED' });
});
```

- [ ] **Step 2: Add `getModelCatalogForTeam` to `QuotaService`**

Add:

```ts
async getModelCatalogForTeam(teamId: string) {
  const subscription = await this.getActiveSubscription(teamId);
  const rows = await this.db.query(
    `SELECT id, model_name, display_name, description, rank, cost_multiplier, required_plan_level, is_active
     FROM model_catalog
     WHERE is_active = true
     ORDER BY required_plan_level ASC, rank ASC, display_name ASC`,
  );

  return rows.map((row) => {
    const requiredPlanLevel = Number(row.required_plan_level);
    const isAvailable = requiredPlanLevel <= subscription.level;
    return {
      id: row.id,
      modelName: row.model_name,
      displayName: row.display_name,
      description: row.description,
      rank: Number(row.rank),
      costMultiplier: Number(row.cost_multiplier),
      requiredPlanLevel,
      isAvailable,
      unavailableReason: isAvailable ? null : 'SUBSCRIPTION_REQUIRED',
    };
  });
}
```

- [ ] **Step 3: Add selected model persistence methods**

Add:

```ts
async selectModel(teamId: string, modelId: string, conversationId?: string) {
  const catalog = await this.getModelCatalogForTeam(teamId);
  const model = catalog.find((item) => item.id === modelId);
  if (!model || !model.isAvailable) {
    throw new AppError('MODEL_NOT_AVAILABLE', '所选功法不可用', 403);
  }

  if (conversationId) {
    const conversation = await this.db.queryOne(
      'SELECT id FROM conversations WHERE id = $1 AND "teamId" = $2',
      [conversationId, teamId],
    );
    if (!conversation) {
      throw new AppError('CONVERSATION_NOT_FOUND', '会话不存在', 404);
    }

    await this.db.queryOne(
      `INSERT INTO conversation_selected_models (conversation_id, model_catalog_id, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (conversation_id)
       DO UPDATE SET model_catalog_id = EXCLUDED.model_catalog_id, updated_at = NOW()
       RETURNING *`,
      [conversationId, modelId],
    );
  } else {
    await this.db.queryOne(
      `INSERT INTO team_selected_models (team_id, model_catalog_id, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (team_id)
       DO UPDATE SET model_catalog_id = EXCLUDED.model_catalog_id, updated_at = NOW()
       RETURNING *`,
      [teamId, modelId],
    );
  }

  return model;
}
```

- [ ] **Step 4: Add `ModelCatalogController` tests**

Create `packages/server/src/quota/model-catalog.controller.spec.ts`:

```ts
import { ModelCatalogController } from './model-catalog.controller';
import { QuotaService } from './quota.service';

describe('ModelCatalogController', () => {
  let controller: ModelCatalogController;
  let quotaService: jest.Mocked<Pick<QuotaService, 'getModelCatalogForTeam' | 'selectModel'>>;

  beforeEach(() => {
    quotaService = {
      getModelCatalogForTeam: jest.fn(),
      selectModel: jest.fn(),
    };
    controller = new ModelCatalogController(quotaService as unknown as QuotaService);
  });

  it('returns model catalog for a team', async () => {
    quotaService.getModelCatalogForTeam.mockResolvedValue([{ id: 'model-1', isAvailable: true }] as any);

    const result = await controller.getModelCatalog('team-1');

    expect(quotaService.getModelCatalogForTeam).toHaveBeenCalledWith('team-1');
    expect(result).toEqual({ success: true, data: [{ id: 'model-1', isAvailable: true }] });
  });

  it('selects a model for a team or conversation', async () => {
    quotaService.selectModel.mockResolvedValue({ id: 'model-1', isAvailable: true } as any);

    const result = await controller.selectModel('team-1', { modelId: 'model-1', conversationId: 'conv-1' });

    expect(quotaService.selectModel).toHaveBeenCalledWith('team-1', 'model-1', 'conv-1');
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 5: Add `ModelCatalogController`**

Create `packages/server/src/quota/model-catalog.controller.ts`:

```ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { QuotaService } from './quota.service';

@Controller('teams/:teamId/models')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModelCatalogController {
  constructor(private readonly quotaService: QuotaService) {}

  @Get('catalog')
  async getModelCatalog(@Param('teamId') teamId: string) {
    const result = await this.quotaService.getModelCatalogForTeam(teamId);
    return { success: true, data: result };
  }

  @Post('select')
  async selectModel(
    @Param('teamId') teamId: string,
    @Body() body: { modelId: string; conversationId?: string },
  ) {
    const result = await this.quotaService.selectModel(teamId, body.modelId, body.conversationId);
    return { success: true, data: result };
  }
}
```

- [ ] **Step 6: Register `ModelCatalogController` in `QuotaModule`**

Modify the controllers list:

```ts
controllers: [QuotaController, ModelCatalogController],
```

- [ ] **Step 7: Run quota service and controller tests**

Run:

```bash
pnpm --filter @ice-cola/server test -- quota.service.spec.ts quota.controller.spec.ts model-catalog.controller.spec.ts
```

Expected: PASS.

---

### Task 6: Hermes Chat Lingqi Pre-Charge

**Files:**
- Modify: `packages/server/src/hermes/hermes.service.spec.ts`
- Modify: `packages/server/src/hermes/hermes.service.ts`

- [ ] **Step 1: Add failing test for chat estimate and consume**

In `packages/server/src/hermes/hermes.service.spec.ts`, mock `quotaService.estimateLingqiCost`, `quotaService.consumeLingqi`, and `quotaService.getSelectedModelForExecution`. Add:

```ts
it('pre-charges Lingqi before calling Hermes agent', async () => {
  quotaService.estimateLingqiCost.mockResolvedValue({ estimatedCost: 18, balanceAfterEstimate: 982, canAfford: true, reason: null });
  quotaService.consumeLingqi.mockResolvedValue({ balance: 982, totalConsumed: 18 });
  quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'demo-advanced' });
  conversationService.create.mockResolvedValue({ id: 'conv-1' });
  conversationService.addMessage.mockResolvedValue({});
  jest.spyOn(service as any, 'callHermesAgent').mockResolvedValue({ success: true, response: 'ok', sessionId: 'conv-1', model: 'demo-basic' });

  await service.chat('user-1', 'team-1', { message: 'hello', model: 'model-1' } as any);

  expect(quotaService.estimateLingqiCost).toHaveBeenCalledWith('team-1', {
    transactionType: 'chat_message',
    modelId: 'model-1',
    context: { conversationId: 'conv-1' },
  });
  expect(quotaService.consumeLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
    amount: 18,
    transactionType: 'chat_message',
    sourceType: 'chat',
    sourceId: 'conv-1',
  }));
});
```

- [ ] **Step 2: Run Hermes tests and verify RED**

Run:

```bash
pnpm --filter @ice-cola/server test -- hermes.service.spec.ts
```

Expected: FAIL because Hermes still calls `consumeQuota(teamId, 1)`.

- [ ] **Step 3: Add execution model helper to `QuotaService`**

Add a public helper that resolves the selected model catalog row to the real provider model name used by Hermes:

```ts
async getSelectedModelForExecution(teamId: string, modelId?: string, conversationId?: string): Promise<{ id: string; modelName: string }> {
  if (modelId) {
    const explicitModel = await this.getModelCatalogItem(modelId);
    return { id: explicitModel.id, modelName: explicitModel.modelName };
  }

  if (conversationId) {
    const conversationModel = await this.db.queryOne(
      `SELECT mc.id, mc.model_name
       FROM conversation_selected_models csm
       JOIN conversations c ON c.id = csm.conversation_id
       JOIN model_catalog mc ON mc.id = csm.model_catalog_id
       WHERE csm.conversation_id = $1 AND c."teamId" = $2 AND mc.is_active = true`,
      [conversationId, teamId],
    );
    if (conversationModel) {
      return { id: conversationModel.id, modelName: conversationModel.model_name };
    }
  }

  const teamModel = await this.getSelectedModelForTeam(teamId);
  return { id: teamModel.id, modelName: teamModel.modelName };
}
```

- [ ] **Step 4: Replace legacy quota consumption in `HermesService.chat`**

Replace:

```ts
await this.quotaService.consumeQuota(teamId, 1);
```

With:

```ts
const estimate = await this.quotaService.estimateLingqiCost(teamId, {
  transactionType: 'chat_message',
  modelId: dto.model,
  context: { conversationId: activeConversation.id },
});

if (!estimate.canAfford) {
  throw new HttpException(
    {
      success: false,
      error: estimate.reason || 'LINGQI_INSUFFICIENT_BALANCE',
    },
    HttpStatus.FORBIDDEN,
  );
}

await this.quotaService.consumeLingqi(teamId, userId, {
  amount: estimate.estimatedCost,
  transactionType: 'chat_message',
  sourceType: 'chat',
  sourceId: activeConversation.id,
  description: '聊天模型调用',
  metadata: { modelId: dto.model || null },
});

const executionModel = await this.quotaService.getSelectedModelForExecution(
  teamId,
  dto.model,
  activeConversation.id,
);
```

When calling Hermes, pass `executionModel.modelName` instead of the catalog id:

```ts
model: executionModel.modelName,
```

- [ ] **Step 5: Run server tests**

Run:

```bash
pnpm --filter @ice-cola/server test -- quota.service.spec.ts quota.controller.spec.ts hermes.service.spec.ts
```

Expected: PASS.

---

### Task 7: Client Lingqi Service Tests and Service

**Files:**
- Create: `packages/client/src/services/lingqi-service.test.ts`
- Create: `packages/client/src/services/lingqi-service.ts`

- [ ] **Step 1: Write failing service tests**

Create `packages/client/src/services/lingqi-service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lingqiService } from './lingqi-service';

vi.mock('axios', () => {
  const mAxios = {
    get: vi.fn(),
    post: vi.fn(),
  };
  return { default: mAxios };
});

import axios from 'axios';

describe('LingqiService', () => {
  const mockAxios = axios as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => localStorage.clear());

  it('loads Lingqi status with auth header', async () => {
    localStorage.setItem('accessToken', 'token-1');
    mockAxios.get.mockResolvedValue({ data: { data: { balance: 1000 } } });

    const result = await lingqiService.getStatus('team-1');

    expect(mockAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/teams/team-1/quota/status'),
      expect.objectContaining({ headers: { Authorization: 'Bearer token-1' } }),
    );
    expect(result.balance).toBe(1000);
  });

  it('redeems Lingqi code', async () => {
    mockAxios.post.mockResolvedValue({ data: { data: { grantedAmount: 1000, status: { balance: 1000 } } } });

    const result = await lingqiService.redeem('team-1', '<local-test-redemption-code>');

    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/teams/team-1/quota/redeem'),
      { code: '<local-test-redemption-code>' },
      expect.any(Object),
    );
    expect(result.grantedAmount).toBe(1000);
  });

  it('loads model catalog and estimates cost', async () => {
    mockAxios.get.mockResolvedValue({ data: { data: [{ id: 'model-1', isAvailable: true }] } });
    mockAxios.post.mockResolvedValue({ data: { data: { estimatedCost: 18, canAfford: true } } });

    const models = await lingqiService.getModelCatalog('team-1');
    const estimate = await lingqiService.estimate('team-1', { transactionType: 'chat_message', modelId: 'model-1' });

    expect(models[0].id).toBe('model-1');
    expect(estimate.estimatedCost).toBe(18);
  });
});
```

- [ ] **Step 2: Run client service test and verify RED**

Run:

```bash
pnpm --filter openclaw-desktop test -- lingqi-service.test.ts
```

Expected: FAIL because `lingqi-service.ts` does not exist.

- [ ] **Step 3: Implement `lingqi-service.ts`**

Create `packages/client/src/services/lingqi-service.ts`:

```ts
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type LingqiTransactionType = 'chat_message' | 'tool_call' | 'expert_skill' | 'background_task';

export interface CultivationRealm {
  name: string;
  displayName: string;
  minTotalConsumed: number;
  privileges: Record<string, unknown>;
}

export interface LingqiStatus {
  teamId: string;
  balance: number;
  totalGranted: number;
  totalConsumed: number;
  cultivationRealm: CultivationRealm;
  nextCultivationRealm: CultivationRealm | null;
  realmProgress: {
    current: number;
    required: number;
    percentage: number;
  };
  subscription: {
    planName: string;
    displayName: string;
    level: number;
    costDiscountRate: number;
    modelRankLimit: number;
    expiresAt: string | null;
  };
  warningThreshold: number;
}

export interface LingqiModel {
  id: string;
  modelName: string;
  displayName: string;
  description: string | null;
  rank: number;
  costMultiplier: number;
  requiredPlanLevel: number;
  isAvailable: boolean;
  unavailableReason: string | null;
}

export interface LingqiEstimateRequest {
  transactionType: LingqiTransactionType;
  modelId?: string;
  context?: {
    conversationId?: string;
    toolId?: string;
    skillId?: string;
    taskType?: string;
  };
}

export interface LingqiEstimate {
  estimatedCost: number;
  balanceAfterEstimate: number;
  canAfford: boolean;
  reason: string | null;
}

class LingqiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getStatus(teamId: string): Promise<LingqiStatus> {
    const response = await axios.get(`${API_BASE}/teams/${teamId}/quota/status`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async redeem(teamId: string, code: string): Promise<{ grantedAmount: number; status: LingqiStatus }> {
    const response = await axios.post(
      `${API_BASE}/teams/${teamId}/quota/redeem`,
      { code },
      { headers: this.getAuthHeaders() },
    );
    return response.data.data;
  }

  async getModelCatalog(teamId: string): Promise<LingqiModel[]> {
    const response = await axios.get(`${API_BASE}/teams/${teamId}/models/catalog`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async selectModel(teamId: string, modelId: string, conversationId?: string): Promise<LingqiModel> {
    const response = await axios.post(
      `${API_BASE}/teams/${teamId}/models/select`,
      { modelId, conversationId },
      { headers: this.getAuthHeaders() },
    );
    return response.data.data;
  }

  async estimate(teamId: string, request: LingqiEstimateRequest): Promise<LingqiEstimate> {
    const response = await axios.post(
      `${API_BASE}/teams/${teamId}/quota/estimate`,
      request,
      { headers: this.getAuthHeaders() },
    );
    return response.data.data;
  }
}

export const lingqiService = new LingqiService();
```

- [ ] **Step 4: Run client service tests and verify GREEN**

Run:

```bash
pnpm --filter openclaw-desktop test -- lingqi-service.test.ts
```

Expected: PASS.

---

### Task 8: Client Lingqi Store

**Files:**
- Create: `packages/client/src/stores/lingqi.test.ts`
- Create: `packages/client/src/stores/lingqi.ts`

- [ ] **Step 1: Write failing store tests**

Create `packages/client/src/stores/lingqi.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLingqiStore } from './lingqi';
import { lingqiService } from '@/services/lingqi-service';

vi.mock('@/services/lingqi-service', () => ({
  lingqiService: {
    getStatus: vi.fn(),
    redeem: vi.fn(),
    getModelCatalog: vi.fn(),
    selectModel: vi.fn(),
    estimate: vi.fn(),
  },
}));

describe('useLingqiStore', () => {
  const service = lingqiService as unknown as {
    getStatus: ReturnType<typeof vi.fn>;
    redeem: ReturnType<typeof vi.fn>;
    getModelCatalog: ReturnType<typeof vi.fn>;
    selectModel: ReturnType<typeof vi.fn>;
    estimate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useLingqiStore.setState({
      status: null,
      models: [],
      selectedModel: null,
      estimate: null,
      isLoading: false,
      error: null,
    });
  });

  it('refreshes status and model catalog', async () => {
    service.getStatus.mockResolvedValue({ balance: 1000, cultivationRealm: { displayName: '凡人' } });
    service.getModelCatalog.mockResolvedValue([{ id: 'model-1', isAvailable: true }]);

    await useLingqiStore.getState().loadLingqi('team-1');

    expect(useLingqiStore.getState().status?.balance).toBe(1000);
    expect(useLingqiStore.getState().models).toHaveLength(1);
  });

  it('redeems a code and replaces status', async () => {
    service.redeem.mockResolvedValue({ grantedAmount: 1000, status: { balance: 1500 } });

    await useLingqiStore.getState().redeemCode('team-1', '<local-test-redemption-code>');

    expect(useLingqiStore.getState().status?.balance).toBe(1500);
  });

  it('stores estimate result', async () => {
    service.estimate.mockResolvedValue({ estimatedCost: 18, canAfford: true, balanceAfterEstimate: 982, reason: null });

    await useLingqiStore.getState().estimateCost('team-1', { transactionType: 'chat_message', modelId: 'model-1' });

    expect(useLingqiStore.getState().estimate?.estimatedCost).toBe(18);
  });
});
```

- [ ] **Step 2: Run store tests and verify RED**

Run:

```bash
pnpm --filter openclaw-desktop test -- lingqi.test.ts
```

Expected: FAIL because `stores/lingqi.ts` does not exist.

- [ ] **Step 3: Implement `stores/lingqi.ts`**

Create:

```ts
import { create } from 'zustand';
import {
  lingqiService,
  type LingqiEstimate,
  type LingqiEstimateRequest,
  type LingqiModel,
  type LingqiStatus,
} from '@/services/lingqi-service';

interface LingqiState {
  status: LingqiStatus | null;
  models: LingqiModel[];
  selectedModel: LingqiModel | null;
  estimate: LingqiEstimate | null;
  isLoading: boolean;
  error: string | null;
  loadLingqi: (teamId: string) => Promise<void>;
  redeemCode: (teamId: string, code: string) => Promise<number>;
  selectModel: (teamId: string, modelId: string, conversationId?: string) => Promise<void>;
  estimateCost: (teamId: string, request: LingqiEstimateRequest) => Promise<LingqiEstimate>;
  refreshStatus: (teamId: string) => Promise<void>;
  clearEstimate: () => void;
  clearError: () => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '灵气阁暂不可用，请稍后再试。';
}

export const useLingqiStore = create<LingqiState>((set) => ({
  status: null,
  models: [],
  selectedModel: null,
  estimate: null,
  isLoading: false,
  error: null,

  loadLingqi: async (teamId) => {
    set({ isLoading: true, error: null });
    try {
      const [status, models] = await Promise.all([
        lingqiService.getStatus(teamId),
        lingqiService.getModelCatalog(teamId),
      ]);
      const selectedModel = models.find((model) => model.isAvailable) || null;
      set({ status, models, selectedModel, isLoading: false });
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },

  redeemCode: async (teamId, code) => {
    set({ isLoading: true, error: null });
    try {
      const result = await lingqiService.redeem(teamId, code);
      set({ status: result.status, isLoading: false });
      return result.grantedAmount;
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  selectModel: async (teamId, modelId, conversationId) => {
    const selectedModel = await lingqiService.selectModel(teamId, modelId, conversationId);
    set({ selectedModel });
  },

  estimateCost: async (teamId, request) => {
    const estimate = await lingqiService.estimate(teamId, request);
    set({ estimate });
    return estimate;
  },

  refreshStatus: async (teamId) => {
    const status = await lingqiService.getStatus(teamId);
    set({ status });
  },

  clearEstimate: () => set({ estimate: null }),
  clearError: () => set({ error: null }),
}));
```

- [ ] **Step 4: Run store tests and verify GREEN**

Run:

```bash
pnpm --filter openclaw-desktop test -- lingqi.test.ts
```

Expected: PASS.

---

### Task 9: Client Lingqi UI Components and Page

**Files:**
- Create: `packages/client/src/components/LingqiStatusCard.tsx`
- Create: `packages/client/src/components/LingqiModelSelector.tsx`
- Create: `packages/client/src/components/LingqiCostPreview.tsx`
- Create: `packages/client/src/pages/Lingqi.tsx`
- Modify: `packages/client/src/App.tsx`
- Modify: `packages/client/src/components/Sidebar.tsx`

- [ ] **Step 1: Create `LingqiStatusCard.tsx`**

```tsx
import { Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { LingqiStatus } from '@/services/lingqi-service';

interface LingqiStatusCardProps {
  status: LingqiStatus | null;
  isCollapsed?: boolean;
  onOpen: () => void;
}

export function LingqiStatusCard({ status, isCollapsed = false, onOpen }: LingqiStatusCardProps) {
  if (!status) {
    return (
      <button onClick={onOpen} className="w-full rounded-xl border border-amber-200/70 bg-amber-50/70 p-3 text-left text-xs text-amber-900">
        灵气阁
      </button>
    );
  }

  if (isCollapsed) {
    return (
      <button onClick={onOpen} className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-100 to-emerald-100 text-amber-800 flex items-center justify-center">
        <Sparkles className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button onClick={onOpen} className="w-full rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50 p-3 text-left shadow-sm">
      <div className="flex items-center justify-between text-xs text-stone-500">
        <span>灵气</span>
        <span>{status.subscription.displayName}</span>
      </div>
      <div className="mt-1 flex items-end justify-between">
        <span className="text-xl font-semibold text-stone-900">{status.balance}</span>
        <span className="text-xs text-emerald-700">{status.cultivationRealm.displayName}</span>
      </div>
      <Progress value={status.realmProgress.percentage} className="mt-2 h-1.5" />
      <div className="mt-1 text-[10px] text-stone-500">
        {status.nextCultivationRealm ? `距 ${status.nextCultivationRealm.displayName} 还需 ${Math.max(status.realmProgress.required - status.realmProgress.current, 0)} 灵气历练` : '已至当前最高境界'}
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Create `LingqiModelSelector.tsx`**

```tsx
import type { LingqiModel } from '@/services/lingqi-service';

interface LingqiModelSelectorProps {
  models: LingqiModel[];
  selectedModelId?: string;
  onSelect: (modelId: string) => void;
}

export function LingqiModelSelector({ models, selectedModelId, onSelect }: LingqiModelSelectorProps) {
  return (
    <select
      value={selectedModelId || ''}
      onChange={(event) => onSelect(event.target.value)}
      className="rounded-xl border border-amber-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
    >
      {models.map((model) => (
        <option key={model.id} value={model.id} disabled={!model.isAvailable}>
          {model.displayName} · {model.costMultiplier}x{model.isAvailable ? '' : ' · 需更高套餐'}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 3: Create `LingqiCostPreview.tsx`**

```tsx
import type { LingqiEstimate } from '@/services/lingqi-service';

interface LingqiCostPreviewProps {
  estimate: LingqiEstimate | null;
}

export function LingqiCostPreview({ estimate }: LingqiCostPreviewProps) {
  if (!estimate) return null;

  if (!estimate.canAfford) {
    return <span className="text-xs text-red-600">灵气不足，本次预计消耗 {estimate.estimatedCost}</span>;
  }

  return <span className="text-xs text-emerald-700">预计消耗 {estimate.estimatedCost} 灵气</span>;
}
```

- [ ] **Step 4: Create `Lingqi.tsx` page**

Create `packages/client/src/pages/Lingqi.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/stores/authStore';
import { useLingqiStore } from '@/stores/lingqi';
import { getTeamId } from '@/lib/team';

export default function Lingqi() {
  const user = useAuthStore((state) => state.user);
  const teamId = getTeamId(user);
  const { status, models, isLoading, error, loadLingqi, redeemCode } = useLingqiStore();
  const [code, setCode] = useState('');

  useEffect(() => {
    if (teamId) void loadLingqi(teamId);
  }, [teamId, loadLingqi]);

  const handleRedeem = async () => {
    if (!teamId || !code.trim()) return;
    const amount = await redeemCode(teamId, code.trim());
    setCode('');
    toast.success(`灵符已化入丹田，获得 ${amount} 灵气`);
  };

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_top_left,#f8e7b7,transparent_30%),linear-gradient(135deg,#faf7ef,#edf7f0)] p-8">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-amber-200/70 bg-stone-50/90 p-8 shadow-xl shadow-amber-900/5">
        <div className="mb-8">
          <p className="text-sm text-amber-700">灵气阁</p>
          <h1 className="text-3xl font-semibold text-stone-950">丹田灵海与功法宝阁</h1>
          <p className="mt-2 text-sm text-stone-600">兑换灵符、查看境界，并选择当前可用功法模型。</p>
        </div>

        {status && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-amber-200 bg-white/80 p-5">
              <div className="text-sm text-stone-500">当前灵气</div>
              <div className="mt-2 text-4xl font-semibold text-stone-950">{status.balance}</div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-white/80 p-5">
              <div className="text-sm text-stone-500">修炼境界</div>
              <div className="mt-2 text-2xl font-semibold text-emerald-800">{status.cultivationRealm.displayName}</div>
              <Progress value={status.realmProgress.percentage} className="mt-3 h-2" />
            </div>
            <div className="rounded-2xl border border-yellow-200 bg-white/80 p-5">
              <div className="text-sm text-stone-500">门派身份</div>
              <div className="mt-2 text-2xl font-semibold text-yellow-800">{status.subscription.displayName}</div>
            </div>
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-amber-200 bg-white/75 p-5">
          <h2 className="text-lg font-semibold text-stone-900">兑换灵符</h2>
          <div className="mt-4 flex gap-3">
            <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="输入兑换码" />
            <Button onClick={handleRedeem} disabled={isLoading || !code.trim()}>兑换</Button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {models.map((model) => (
            <div key={model.id} className={`rounded-2xl border p-5 ${model.isAvailable ? 'border-emerald-200 bg-white/80' : 'border-stone-200 bg-stone-100/70 opacity-70'}`}>
              <div className="text-sm text-stone-500">品阶 {model.rank}</div>
              <div className="mt-1 text-lg font-semibold text-stone-900">{model.displayName}</div>
              <p className="mt-2 text-sm text-stone-600">{model.description}</p>
              <div className="mt-3 text-xs text-amber-700">消耗倍率 {model.costMultiplier}x</div>
              {!model.isAvailable && <div className="mt-2 text-xs text-red-600">需更高套餐</div>}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Add route in `App.tsx`**

Import:

```ts
import Lingqi from './pages/Lingqi';
```

Add route inside protected layout:

```tsx
<Route path="lingqi" element={<Lingqi />} />
```

- [ ] **Step 6: Add sidebar nav and status card**

In `Sidebar.tsx`, import:

```ts
import { useEffect } from 'react';
import { LingqiStatusCard } from '@/components/LingqiStatusCard';
import { useLingqiStore } from '@/stores/lingqi';
```

Add a menu item:

```ts
{ path: '/lingqi', icon: Sparkles, labelKey: '灵气阁', descKey: '境界与功法' },
```

Because current `menuItems` expects translation keys, adjust `renderNavItem` to support plain labels:

```ts
const label = item.labelKey.includes('.') ? t(item.labelKey) : item.labelKey;
const description = item.descKey.includes('.') ? t(item.descKey) : item.descKey;
```

Use `label` and `description` instead of repeated `t(item.labelKey)` and `t(item.descKey)`.

After `const teamId = getTeamId(user);`, add:

```ts
const { status: lingqiStatus, loadLingqi } = useLingqiStore();

useEffect(() => {
  if (teamId) void loadLingqi(teamId);
}, [teamId, loadLingqi]);
```

Render before navigation:

```tsx
<div className="px-2.5 pb-2">
  <LingqiStatusCard
    status={lingqiStatus}
    isCollapsed={isCollapsed}
    onOpen={() => navigate('/lingqi')}
  />
</div>
```

- [ ] **Step 7: Run client tests and build**

Run:

```bash
pnpm --filter openclaw-desktop test -- lingqi-service.test.ts lingqi.test.ts
pnpm --filter openclaw-desktop build
```

Expected: tests PASS and build completes.

---

### Task 10: Chat Model Selection and Cost Estimate

**Files:**
- Modify: `packages/client/src/pages/Chat.tsx`

- [ ] **Step 1: Import Lingqi store/components**

Add imports:

```ts
import { LingqiModelSelector } from '@/components/LingqiModelSelector';
import { LingqiCostPreview } from '@/components/LingqiCostPreview';
import { useLingqiStore } from '@/stores/lingqi';
```

- [ ] **Step 2: Add Lingqi state inside `Chat` component**

After `const hasTeamAccess = !!teamId;`, add:

```ts
const {
  status: lingqiStatus,
  models: lingqiModels,
  selectedModel,
  estimate,
  loadLingqi,
  selectModel,
  estimateCost,
  refreshStatus,
  clearEstimate,
} = useLingqiStore();
```

- [ ] **Step 3: Load Lingqi data for the team**

Add effect:

```ts
useEffect(() => {
  if (teamId) void loadLingqi(teamId);
}, [teamId, loadLingqi]);
```

- [ ] **Step 4: Estimate chat cost when message or model changes**

Add effect:

```ts
useEffect(() => {
  if (!teamId || !message.trim() || !selectedModel) {
    clearEstimate();
    return;
  }

  const timeoutId = window.setTimeout(() => {
    void estimateCost(teamId, {
      transactionType: 'chat_message',
      modelId: selectedModel.id,
      context: { conversationId: currentConversationId || undefined },
    });
  }, 250);

  return () => window.clearTimeout(timeoutId);
}, [teamId, message, selectedModel, currentConversationId, estimateCost, clearEstimate]);
```

- [ ] **Step 5: Add model select handler**

Add:

```ts
const handleModelSelect = async (modelId: string) => {
  if (!teamId) return;
  await selectModel(teamId, modelId, currentConversationId || undefined);
};
```

- [ ] **Step 6: Block send when estimate is unaffordable**

Find the send handler and before sending to gateway add:

```ts
if (estimate && !estimate.canAfford) {
  addMessage({
    id: `lingqi-error-${Date.now()}`,
    role: 'assistant',
    content: `灵气不足，本次预计消耗 ${estimate.estimatedCost}，当前剩余 ${lingqiStatus?.balance ?? 0}。请前往灵气阁兑换。`,
    timestamp: Date.now(),
    status: 'error',
  });
  return;
}
```

When calling `send`, pass the selected model id where `dto.model` or gateway payload is built:

```ts
model: selectedModel?.id,
```

After assistant completion or after the send request settles successfully, call:

```ts
if (teamId) void refreshStatus(teamId);
```

- [ ] **Step 7: Render selector and cost preview above chat input**

In the input toolbar area, add:

```tsx
<div className="flex items-center justify-between gap-3 border-t border-amber-100 bg-stone-50/80 px-4 py-2">
  <LingqiModelSelector
    models={lingqiModels}
    selectedModelId={selectedModel?.id}
    onSelect={handleModelSelect}
  />
  <LingqiCostPreview estimate={estimate} />
</div>
```

Place it immediately above the textarea/input composer so users see cost before sending.

- [ ] **Step 8: Run client build**

Run:

```bash
pnpm --filter openclaw-desktop build
```

Expected: build passes with no TypeScript errors.

---

### Task 11: Server and Client Verification

**Files:**
- No code changes unless tests reveal defects.

- [ ] **Step 1: Run focused server tests**

Run:

```bash
pnpm --filter @ice-cola/server test -- quota.service.spec.ts quota.controller.spec.ts hermes.service.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run focused client tests**

Run:

```bash
pnpm --filter openclaw-desktop test -- lingqi-service.test.ts lingqi.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run package builds**

Run:

```bash
pnpm --filter @ice-cola/server build
pnpm --filter openclaw-desktop build
```

Expected: both builds pass.

- [ ] **Step 4: If a build fails, use the build resolver**

If the server build fails, use `build-error-resolver` for TypeScript/NestJS errors. If the client build fails, use `build-error-resolver` for TypeScript/Vite errors. Apply minimal diffs only.

---

### Task 12: Browser E2E and Report

**Files:**
- Create: `reports/lingqi_E2E_TEST_REPORT_20260520.md`

- [ ] **Step 1: Start services**

Run:

```bash
pm2 start ecosystem.config.cjs --update-env
```

Expected: client is available at `http://localhost:1420` and server at `http://localhost:3000`.

- [ ] **Step 2: Use Playwright MCP for the happy path**

Execute this path in browser automation:

1. Navigate to `http://localhost:1420`.
2. Log in with a local test account.
3. Open `/lingqi`.
4. Enter a locally provisioned redemption code that is not committed to the repository.
5. Confirm Lingqi balance increases and cultivation realm/next realm progress displays.
6. Open `/chat`.
7. Select an available model.
8. Type and send a message.
9. Confirm a response or demo response appears.
10. Confirm Lingqi balance decreases after the send path.
11. Select or view an unavailable model and confirm it is disabled with “需更高套餐”.

- [ ] **Step 3: Create the E2E report**

Write `reports/lingqi_E2E_TEST_REPORT_20260520.md`:

```markdown
# 灵气功能 E2E 测试报告

## 测试信息
- **测试时间**: 2026-05-20 HH:mm:ss
- **测试工程师**: Claude Code
- **功能版本**: Lingqi MVP

## 测试环境
- **浏览器**: Chrome
- **viewport**: 1920x1080
- **Client**: http://localhost:1420
- **Server**: http://localhost:3000
- **测试兑换码**: 本地临时兑换码（不写入报告）

## 测试功能
client 通过兑换码获得灵气，展示修炼境界，选择模型，并在聊天发送后消耗灵气。

## 测试步骤

### Step 1: 登录客户端
- 操作：打开 client 并使用本地测试账号登录
- 预期：进入受保护页面
- 结果：PASS/FAIL

### Step 2: 兑换灵气
- 操作：进入灵气阁，输入测试兑换码并提交
- 预期：余额增加，套餐和境界信息刷新
- 结果：PASS/FAIL

### Step 3: 选择模型并发送消息
- 操作：进入聊天页，选择可用模型，发送消息
- 预期：显示预计消耗，消息发送成功，余额减少
- 结果：PASS/FAIL

### Step 4: 验证不可用模型状态
- 操作：查看不可用模型
- 预期：模型置灰并显示需要更高套餐
- 结果：PASS/FAIL

## 测试结果

| 测试项 | 状态 | 备注 |
|--------|------|------|
| 登录 | PASS/FAIL | |
| 兑换码兑换 | PASS/FAIL | |
| 修炼境界展示 | PASS/FAIL | |
| 模型选择 | PASS/FAIL | |
| 聊天消耗灵气 | PASS/FAIL | |
| 不可用模型提示 | PASS/FAIL | |

## 发现的问题

| 优先级 | 问题描述 | 状态 |
|--------|----------|------|
| - | 无 | - |

## 结论

PASS/FAIL
```

- [ ] **Step 4: Mark failures explicitly**

If E2E cannot run because local auth/database/service state is missing, write the report with `FAIL` or `BLOCKED`, include the exact blocker, and do not claim completion.

---

### Task 13: Required Review Passes

**Files:**
- Review only unless fixes are required.

- [ ] **Step 1: Run TypeScript code review agent**

Use `typescript-reviewer` on all changed TypeScript/TSX files. Required focus:

- No new `any` in application code.
- API types are explicit.
- React props are typed.
- Store updates are immutable.
- Async errors are surfaced, not silently swallowed.

- [ ] **Step 2: Run security review agent**

Use `security-reviewer` because the work touches auth-protected endpoints, redemption codes, database writes, model access, and quota/credit accounting. Required focus:

- Raw redemption codes are not logged or stored as queryable plaintext.
- All SQL uses parameters.
- Team authorization is preserved by guards.
- Client cannot choose cost amount.
- Lingqi balance updates are transactional.

- [ ] **Step 3: Address CRITICAL and HIGH findings**

Fix any CRITICAL/HIGH findings. Re-run focused tests after fixes.

---

## Self-Review Notes

- Spec coverage: database schema, redemption, subscription, model catalog, model selection, estimate, consume, cultivation realm display, client Lingqi page, Chat integration, E2E report, and security requirements are mapped to tasks.
- Scope boundary: first version shows realm progression and stores future privileges but does not enforce realm privileges.
- Route consistency: implementation uses existing `teams/:teamId` route style and a dedicated model catalog controller instead of fragile relative controller paths.
- Accounting consistency: newly created Lingqi accounts start at `0`; first usable balance comes from redemption or explicit grants.
- Authorization consistency: conversation-scoped model selection and execution model resolution verify the conversation belongs to the current team.
- Commit boundary: no commit steps are included because the current instruction forbids committing without explicit authorization.
