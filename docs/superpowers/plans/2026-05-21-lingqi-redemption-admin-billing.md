# Lingqi Redemption Admin Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Lingqi redemption-code generation and billing traceability into Admin while keeping Client limited to recharge, model selection, chat, balance, and ledger consumption.

**Architecture:** Reuse the existing `QuotaModule` and Lingqi tables for redemption and ledger state. Add Admin-only controller/service methods for code generation, listing, disable, and ledger search; add Admin React pages/hooks/services; keep Client changes minimal and focused on billing-state correctness.

**Tech Stack:** NestJS, PostgreSQL SQL migrations, React 18, TypeScript, Vite, TanStack Query, Zustand, Vitest/Jest, Playwright MCP/Chrome DevTools MCP.

---

## Swarm execution mode

Run implementation in Swarm slices, but keep writes coordinated on `main`:

1. Backend slice: database + `QuotaService` + Admin controller + server tests.
2. Admin slice: API service + hooks + pages + routes/nav/i18n + Admin tests.
3. Client slice: minimal Lingqi/Chat billing feedback hardening + Client tests.
4. QA/security slice: checks, browser E2E, report generation, review agents.

Do not commit unless the user explicitly requests a commit. Do not write the real provider API key to source, docs, tests, reports, logs, screenshots, or git history.

## File structure

### Backend

- Modify: `packages/server/src/database/migrations/004_add_lingqi_subscription_model_catalog.sql`
  - Add idempotent `ALTER TABLE` statements for Admin audit fields on `redemption_codes`.
  - Add one-time redemption uniqueness index so a code cannot be redeemed by a second team.
- Modify: `packages/server/src/quota/quota.service.ts`
  - Add typed Admin views/DTO input interfaces.
  - Add `createAdminRedemptionCode`, `listAdminRedemptionCodes`, `getAdminRedemptionCode`, `disableAdminRedemptionCode`, and `listAdminLingqiLedgerEntries`.
  - Keep plaintext redemption code return limited to create response.
- Create: `packages/server/src/quota/admin-lingqi.controller.ts`
  - Expose `/admin/lingqi/redemption-codes`, `/admin/lingqi/redemption-codes/:id`, `/admin/lingqi/redemption-codes/:id/disable`, and `/admin/lingqi/ledger`.
- Modify: `packages/server/src/quota/quota.module.ts`
  - Register `AdminLingqiController`.
- Create: `packages/server/src/quota/admin-lingqi.controller.spec.ts`
  - Controller auth-independent unit tests with mocked service.
- Modify: `packages/server/src/quota/quota.service.spec.ts`
  - Service tests for create/list/detail/disable/ledger and one-time redemption semantics.

### Admin frontend

- Create: `packages/admin/src/services/redemptionCodesApi.ts`
  - API types and calls for Admin redemption code and ledger endpoints.
- Create: `packages/admin/src/hooks/useRedemptionCodes.ts`
  - TanStack Query hooks and invalidation.
- Create: `packages/admin/src/pages/RedemptionCodes.tsx`
  - List, status filter, create dialog, one-time plaintext result dialog, disable action.
- Create: `packages/admin/src/pages/RedemptionCodeDetail.tsx`
  - Detail and redemption state view.
- Create: `packages/admin/src/pages/LingqiLedger.tsx`
  - Lightweight ledger tracking table with filters and metadata summary.
- Modify: `packages/admin/src/App.tsx`
  - Add protected routes.
- Modify: `packages/admin/src/components/Layout.tsx`
  - Add Admin navigation entries.
- Modify: `packages/admin/src/i18n/locales/zh.json`
  - Add Chinese nav/page copy.
- Modify: `packages/admin/src/i18n/locales/en.json`
  - Add English nav/page copy.
- Create: `packages/admin/src/services/redemptionCodesApi.test.ts`
  - API path and payload tests.

### Client frontend

- Modify: `packages/client/src/pages/Chat.tsx`
  - Verify balance refresh after successful stream completion and user-facing no-charge message on model failure.
- Modify: `packages/client/src/components/LingqiCostPreview.tsx`
  - Only if needed, improve failure/insufficient-balance text without changing provider/API key responsibilities.
- Modify: `packages/client/src/services/lingqi-service.test.ts`
  - Add response-shape coverage if Admin-generated code payload changes require it.
- Create or modify: `packages/client/src/pages/Chat.test.tsx`
  - Add component/integration coverage if project test setup supports page-level Chat tests.

### QA artifacts

- Create: `reports/LINGQI_REDEMPTION_AND_MODEL_BILLING_E2E_TEST_REPORT_20260521.md`
  - Include sanitized screenshots/paths, masked identifiers, no secrets and no full plaintext redemption codes.

---

## Task 1: Backend migration and one-time redemption constraints

**Files:**
- Modify: `packages/server/src/database/migrations/004_add_lingqi_subscription_model_catalog.sql:74-100`

- [ ] **Step 1: Add the failing service test for cross-team one-time redemption**

Add this test to `packages/server/src/quota/quota.service.spec.ts` near the existing redemption tests:

```ts
it('rejects redemption when a one-time code was already redeemed by another team', async () => {
  const code = 'ICE-ONE-TIME-CODE';
  const codeHash = service.hashRedemptionCode(code);
  await db.query(
    `INSERT INTO redemption_codes (code_hash, display_label, lingqi_amount, max_uses)
     VALUES ($1, $2, $3, 1)`,
    [codeHash, 'unit-test-code', '1000'],
  );

  await service.redeemLingqiCode(teamId, userId, code);

  await expect(service.redeemLingqiCode(otherTeamId, otherUserId, code)).rejects.toMatchObject({
    code: 'LINGQI_REDEMPTION_CODE_EXHAUSTED',
  });
});
```

If the current test harness does not expose `teamId`, `otherTeamId`, `userId`, or `otherUserId`, create them in the existing test setup using the same helper style already used in `quota.service.spec.ts`.

- [ ] **Step 2: Run the focused failing test**

Run:

```bash
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/server" test -- quota.service.spec.ts -t "rejects redemption when a one-time code was already redeemed by another team"
```

Expected: FAIL before implementation if cross-team reuse is still allowed by database uniqueness or service logic.

- [ ] **Step 3: Extend the migration idempotently**

Append these statements after the existing `redemption_codes` and `redemption_redemptions` indexes in `packages/server/src/database/migrations/004_add_lingqi_subscription_model_catalog.sql`:

```sql
ALTER TABLE redemption_codes
ADD COLUMN IF NOT EXISTS code_preview VARCHAR(32),
ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR(36),
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS disabled_by_user_id VARCHAR(36),
ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

UPDATE redemption_codes
SET code_preview = display_label
WHERE code_preview IS NULL;

ALTER TABLE redemption_codes
ALTER COLUMN code_preview SET NOT NULL;

ALTER TABLE redemption_codes
ADD CONSTRAINT fk_redemption_code_created_by
FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE redemption_codes
ADD CONSTRAINT fk_redemption_code_disabled_by
FOREIGN KEY (disabled_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_redemption_redemptions_code_once
ON redemption_redemptions(code_id);
```

If PostgreSQL reports an existing constraint name on rerun, replace direct `ADD CONSTRAINT` with a `DO $$ BEGIN IF NOT EXISTS (...) THEN ALTER TABLE ... END IF; END $$;` block for each foreign key.

- [ ] **Step 4: Update redemption lookup to respect one-time semantics**

In `packages/server/src/quota/quota.service.ts`, change the duplicate-use query from team-scoped to code-scoped inside `redeemLingqiCode`:

```ts
const usedResult = await client.query(
  `SELECT id
   FROM redemption_redemptions
   WHERE code_id = $1
   LIMIT 1`,
  [redemptionCode.id],
);

if (usedResult.rows.length > 0) {
  throw new AppError('LINGQI_REDEMPTION_CODE_EXHAUSTED', '灵气兑换码已用尽', 400);
}
```

- [ ] **Step 5: Run the focused test again**

Run:

```bash
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/server" test -- quota.service.spec.ts -t "rejects redemption when a one-time code was already redeemed by another team"
```

Expected: PASS.

---

## Task 2: Backend Admin redemption-code service methods

**Files:**
- Modify: `packages/server/src/quota/quota.service.ts`
- Test: `packages/server/src/quota/quota.service.spec.ts`

- [ ] **Step 1: Add failing tests for Admin code creation**

Add tests to `packages/server/src/quota/quota.service.spec.ts`:

```ts
it('creates an Admin redemption code and only returns plaintext once', async () => {
  const result = await service.createAdminRedemptionCode(userId, {
    type: 'lingqi_only',
    lingqiAmount: 1200,
    expiresAt: '2026-06-01T00:00:00.000Z',
    note: 'unit test grant',
  });

  expect(result.code).toMatch(/^[A-Z0-9_-]{24,}$/);
  expect(result.codePreview).toContain('...');
  expect(result.lingqiAmount).toBe(1200);
  expect(result.maxUses).toBe(1);

  const rows = await db.query<{ code_hash: string; code_preview: string; note: string }>(
    `SELECT code_hash, code_preview, note FROM redemption_codes WHERE id = $1`,
    [result.id],
  );

  expect(rows.rows[0].code_hash).toHaveLength(64);
  expect(rows.rows[0].code_preview).toBe(result.codePreview);
  expect(rows.rows[0].note).toBe('unit test grant');
  expect(rows.rows[0].code_hash).not.toContain(result.code);
});

it('requires a plan id when creating a plan with Lingqi redemption code', async () => {
  await expect(service.createAdminRedemptionCode(userId, {
    type: 'plan_with_lingqi',
    lingqiAmount: 1000,
  })).rejects.toMatchObject({ code: 'LINGQI_REDEMPTION_PLAN_REQUIRED' });
});
```

- [ ] **Step 2: Run the focused failing tests**

Run:

```bash
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/server" test -- quota.service.spec.ts -t "Admin redemption code"
```

Expected: FAIL because service methods do not exist.

- [ ] **Step 3: Add Admin types and constants**

In `packages/server/src/quota/quota.service.ts`, add these exported interfaces after the existing Lingqi interfaces:

```ts
export type AdminRedemptionCodeType = 'lingqi_only' | 'plan_with_lingqi';
export type AdminRedemptionCodeStatus = 'active' | 'redeemed' | 'expired' | 'disabled';

export interface CreateAdminRedemptionCodeRequest {
  type: AdminRedemptionCodeType;
  lingqiAmount: number;
  planId?: string;
  expiresAt?: string;
  note?: string;
}

export interface AdminRedemptionCodeView {
  id: string;
  type: AdminRedemptionCodeType;
  codePreview: string;
  lingqiAmount: number;
  planId: string | null;
  maxUses: number;
  usedCount: number;
  status: AdminRedemptionCodeStatus;
  expiresAt: Date | null;
  note: string | null;
  createdByUserId: string | null;
  disabledAt: Date | null;
  disabledByUserId: string | null;
  disabledReason: string | null;
  redeemedTeamId: string | null;
  redeemedUserId: string | null;
  redeemedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatedAdminRedemptionCodeView extends AdminRedemptionCodeView {
  code: string;
}

export interface ListAdminRedemptionCodesQuery {
  status?: AdminRedemptionCodeStatus;
  limit?: number;
  offset?: number;
}

export interface AdminLingqiLedgerQuery {
  teamId?: string;
  userId?: string;
  direction?: LingqiDirection;
  transactionType?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}
```

Add a code generator constant near redemption constants:

```ts
const GENERATED_REDEMPTION_CODE_BYTES = 24;
```

- [ ] **Step 4: Implement create method**

Add these methods inside `QuotaService`:

```ts
async createAdminRedemptionCode(
  createdByUserId: string,
  request: CreateAdminRedemptionCodeRequest,
): Promise<CreatedAdminRedemptionCodeView> {
  if (request.type === 'plan_with_lingqi' && !request.planId) {
    throw new AppError('LINGQI_REDEMPTION_PLAN_REQUIRED', '套餐兑换码必须选择套餐', 400);
  }

  if (!Number.isInteger(request.lingqiAmount) || request.lingqiAmount <= 0) {
    throw new AppError('LINGQI_REDEMPTION_AMOUNT_INVALID', '灵气数量必须为正整数', 400);
  }

  const code = this.generateRedemptionCode();
  const codeHash = this.hashRedemptionCode(code);
  const codePreview = this.toRedemptionCodePreview(code);

  const result = await this.db.query<AdminRedemptionCodeRow>(
    `INSERT INTO redemption_codes (
       code_hash, display_label, code_preview, lingqi_amount, plan_id, max_uses,
       expires_at, created_by_user_id, note
     )
     VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $8)
     RETURNING *`,
    [
      codeHash,
      codePreview,
      codePreview,
      request.lingqiAmount.toString(),
      request.planId ?? null,
      request.expiresAt ? new Date(request.expiresAt) : null,
      createdByUserId,
      request.note ?? null,
    ],
  );

  return {
    ...this.toAdminRedemptionCodeView(result.rows[0]),
    code,
  };
}

private generateRedemptionCode(): string {
  return randomUUID().replace(/-/g, '').slice(0, GENERATED_REDEMPTION_CODE_BYTES).toUpperCase();
}

private toRedemptionCodePreview(code: string): string {
  return `${code.slice(0, 4)}...${code.slice(-4)}`;
}
```

Add `AdminRedemptionCodeRow` near the existing row interfaces with snake_case columns matching the SQL query. If TypeScript complains about `randomUUID` import already present, reuse the existing import from `crypto`.

- [ ] **Step 5: Run the focused tests**

Run:

```bash
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/server" test -- quota.service.spec.ts -t "Admin redemption code"
```

Expected: creation tests PASS after mapper methods are added.

---

## Task 3: Backend Admin list/detail/disable/ledger methods

**Files:**
- Modify: `packages/server/src/quota/quota.service.ts`
- Test: `packages/server/src/quota/quota.service.spec.ts`

- [ ] **Step 1: Add failing tests for list/detail/disable/ledger**

Add tests to `packages/server/src/quota/quota.service.spec.ts`:

```ts
it('lists Admin redemption codes with derived active and disabled statuses', async () => {
  const active = await service.createAdminRedemptionCode(userId, {
    type: 'lingqi_only',
    lingqiAmount: 500,
  });
  const disabled = await service.createAdminRedemptionCode(userId, {
    type: 'lingqi_only',
    lingqiAmount: 600,
  });

  await service.disableAdminRedemptionCode(disabled.id, userId, 'no longer needed');

  const result = await service.listAdminRedemptionCodes({ limit: 20, offset: 0 });

  expect(result.items.find((item) => item.id === active.id)?.status).toBe('active');
  expect(result.items.find((item) => item.id === disabled.id)?.status).toBe('disabled');
});

it('returns Admin ledger entries for redemption grants', async () => {
  const created = await service.createAdminRedemptionCode(userId, {
    type: 'lingqi_only',
    lingqiAmount: 700,
  });

  await service.redeemLingqiCode(teamId, userId, created.code);

  const ledger = await service.listAdminLingqiLedgerEntries({
    teamId,
    transactionType: 'redemption_code',
  });

  expect(ledger.items[0]).toMatchObject({
    teamId,
    userId,
    direction: 'grant',
    amount: 700,
    transactionType: 'redemption_code',
  });
});
```

- [ ] **Step 2: Run the focused failing tests**

Run:

```bash
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/server" test -- quota.service.spec.ts -t "Admin ledger entries|lists Admin redemption codes"
```

Expected: FAIL because list/detail/disable/ledger methods are not implemented.

- [ ] **Step 3: Implement list/detail/disable methods**

Add `listAdminRedemptionCodes`, `getAdminRedemptionCode`, and `disableAdminRedemptionCode` to `QuotaService` using parameterized queries only:

```ts
async disableAdminRedemptionCode(id: string, disabledByUserId: string, reason?: string): Promise<AdminRedemptionCodeView> {
  const existing = await this.getAdminRedemptionCode(id);

  if (existing.status === 'redeemed') {
    throw new AppError('LINGQI_REDEMPTION_CODE_REDEEMED', '已兑换的兑换码不能禁用', 400);
  }

  const result = await this.db.query<AdminRedemptionCodeRow>(
    `UPDATE redemption_codes
     SET is_active = false,
         disabled_at = CURRENT_TIMESTAMP,
         disabled_by_user_id = $2,
         disabled_reason = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [id, disabledByUserId, reason ?? null],
  );

  return this.toAdminRedemptionCodeView(result.rows[0]);
}
```

For list/detail, use a shared select with `LEFT JOIN redemption_redemptions rr ON rr.code_id = rc.id`, return `total` plus paginated `items`, and derive status in TypeScript:

```ts
private deriveAdminRedemptionCodeStatus(row: AdminRedemptionCodeRow): AdminRedemptionCodeStatus {
  if (row.used_count >= row.max_uses || row.redeemed_at) return 'redeemed';
  if (row.is_active === false) return 'disabled';
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return 'expired';
  return 'active';
}
```

- [ ] **Step 4: Implement Admin ledger search**

Add `listAdminLingqiLedgerEntries(query: AdminLingqiLedgerQuery)` using validated filter construction:

```ts
const conditions: string[] = [];
const values: unknown[] = [];

if (query.teamId) {
  values.push(query.teamId);
  conditions.push(`team_id = $${values.length}`);
}
```

Select these columns:

```sql
SELECT id, team_id, user_id, direction, amount, transaction_type, source_type, source_id, description, metadata, created_at
FROM lingqi_ledger_entries
```

Order by `created_at DESC`, with `limit` capped to 100 and `offset` defaulting to 0. Return `{ items, total, limit, offset }`.

- [ ] **Step 5: Run focused service tests**

Run:

```bash
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/server" test -- quota.service.spec.ts -t "Admin ledger entries|lists Admin redemption codes"
```

Expected: PASS.

---

## Task 4: Backend Admin controller

**Files:**
- Create: `packages/server/src/quota/admin-lingqi.controller.ts`
- Modify: `packages/server/src/quota/quota.module.ts:1-24`
- Create: `packages/server/src/quota/admin-lingqi.controller.spec.ts`

- [ ] **Step 1: Write failing controller tests**

Create `packages/server/src/quota/admin-lingqi.controller.spec.ts`:

```ts
import { AdminLingqiController } from './admin-lingqi.controller';
import { QuotaService } from './quota.service';

describe('AdminLingqiController', () => {
  const quotaService = {
    createAdminRedemptionCode: jest.fn(),
    listAdminRedemptionCodes: jest.fn(),
    getAdminRedemptionCode: jest.fn(),
    disableAdminRedemptionCode: jest.fn(),
    listAdminLingqiLedgerEntries: jest.fn(),
  } as unknown as jest.Mocked<QuotaService>;

  let controller: AdminLingqiController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AdminLingqiController(quotaService);
  });

  it('creates a redemption code for the authenticated admin user', async () => {
    quotaService.createAdminRedemptionCode.mockResolvedValue({ id: 'code-1', code: 'ABCD1234EFGH5678IJKL9999' } as any);

    const result = await controller.createRedemptionCode({ sub: 'admin-1' } as any, {
      type: 'lingqi_only',
      lingqiAmount: 1000,
    });

    expect(quotaService.createAdminRedemptionCode).toHaveBeenCalledWith('admin-1', {
      type: 'lingqi_only',
      lingqiAmount: 1000,
    });
    expect(result).toEqual({ success: true, data: { id: 'code-1', code: 'ABCD1234EFGH5678IJKL9999' } });
  });

  it('disables a redemption code for the authenticated admin user', async () => {
    quotaService.disableAdminRedemptionCode.mockResolvedValue({ id: 'code-1', status: 'disabled' } as any);

    const result = await controller.disableRedemptionCode('code-1', { sub: 'admin-1' } as any, { reason: 'mistake' });

    expect(quotaService.disableAdminRedemptionCode).toHaveBeenCalledWith('code-1', 'admin-1', 'mistake');
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the failing controller tests**

Run:

```bash
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/server" test -- admin-lingqi.controller.spec.ts
```

Expected: FAIL because controller file does not exist.

- [ ] **Step 3: Create the controller**

Create `packages/server/src/quota/admin-lingqi.controller.ts`:

```ts
import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AdminLingqiLedgerQuery,
  CreateAdminRedemptionCodeRequest,
  ListAdminRedemptionCodesQuery,
  QuotaService,
  TeamRole,
} from './quota.service';

interface AuthenticatedRequest {
  user: {
    sub: string;
  };
}

interface DisableRedemptionCodeBody {
  reason?: string;
}

@Controller('admin/lingqi')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(TeamRole.OWNER, TeamRole.ADMIN)
export class AdminLingqiController {
  constructor(private readonly quotaService: QuotaService) {}

  @Post('redemption-codes')
  async createRedemptionCode(@Req() req: AuthenticatedRequest, @Body() body: CreateAdminRedemptionCodeRequest) {
    return {
      success: true,
      data: await this.quotaService.createAdminRedemptionCode(req.user.sub, body),
    };
  }

  @Get('redemption-codes')
  async listRedemptionCodes(@Query() query: ListAdminRedemptionCodesQuery) {
    return {
      success: true,
      data: await this.quotaService.listAdminRedemptionCodes(query),
    };
  }

  @Get('redemption-codes/:id')
  async getRedemptionCode(@Param('id') id: string) {
    return {
      success: true,
      data: await this.quotaService.getAdminRedemptionCode(id),
    };
  }

  @Post('redemption-codes/:id/disable')
  async disableRedemptionCode(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: DisableRedemptionCodeBody,
  ) {
    return {
      success: true,
      data: await this.quotaService.disableAdminRedemptionCode(id, req.user.sub, body.reason),
    };
  }

  @Get('ledger')
  async listLedger(@Query() query: AdminLingqiLedgerQuery) {
    return {
      success: true,
      data: await this.quotaService.listAdminLingqiLedgerEntries(query),
    };
  }
}
```

- [ ] **Step 4: Register the controller**

Modify `packages/server/src/quota/quota.module.ts`:

```ts
import { AdminLingqiController } from './admin-lingqi.controller';
```

Change controllers to:

```ts
controllers: [QuotaController, ModelCatalogController, AdminLingqiController],
```

- [ ] **Step 5: Run controller and server build checks**

Run:

```bash
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/server" test -- admin-lingqi.controller.spec.ts
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/server" build
```

Expected: tests and build PASS.

---

## Task 5: Admin API service and hooks

**Files:**
- Create: `packages/admin/src/services/redemptionCodesApi.ts`
- Create: `packages/admin/src/hooks/useRedemptionCodes.ts`
- Create: `packages/admin/src/services/redemptionCodesApi.test.ts`

- [ ] **Step 1: Write failing API service tests**

Create `packages/admin/src/services/redemptionCodesApi.test.ts`:

```ts
import api from './api';
import { redemptionCodesApi } from './redemptionCodesApi';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('redemptionCodesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an Admin redemption code', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: { id: 'code-1' } } });

    await redemptionCodesApi.createRedemptionCode({ type: 'lingqi_only', lingqiAmount: 1000 });

    expect(api.post).toHaveBeenCalledWith('/api/admin/lingqi/redemption-codes', {
      type: 'lingqi_only',
      lingqiAmount: 1000,
    });
  });

  it('lists Admin Lingqi ledger entries with filters', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: { items: [] } } });

    await redemptionCodesApi.getLedger({ teamId: 'team-1', transactionType: 'redemption_code' });

    expect(api.get).toHaveBeenCalledWith('/api/admin/lingqi/ledger', {
      params: { teamId: 'team-1', transactionType: 'redemption_code' },
    });
  });
});
```

- [ ] **Step 2: Run the failing Admin service test**

Run:

```bash
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/admin" test -- redemptionCodesApi.test.ts
```

Expected: FAIL because service file does not exist.

- [ ] **Step 3: Create the API service**

Create `packages/admin/src/services/redemptionCodesApi.ts`:

```ts
import api from './api';

export type RedemptionCodeType = 'lingqi_only' | 'plan_with_lingqi';
export type RedemptionCodeStatus = 'active' | 'redeemed' | 'expired' | 'disabled';

export interface CreateRedemptionCodeDto {
  type: RedemptionCodeType;
  lingqiAmount: number;
  planId?: string;
  expiresAt?: string;
  note?: string;
}

export interface RedemptionCode {
  id: string;
  type: RedemptionCodeType;
  codePreview: string;
  lingqiAmount: number;
  planId: string | null;
  maxUses: number;
  usedCount: number;
  status: RedemptionCodeStatus;
  expiresAt: string | null;
  note: string | null;
  redeemedTeamId: string | null;
  redeemedUserId: string | null;
  redeemedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatedRedemptionCode extends RedemptionCode {
  code: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface LedgerEntry {
  id: string;
  teamId: string;
  userId: string | null;
  direction: 'grant' | 'consume';
  amount: number;
  transactionType: string;
  sourceType: string;
  sourceId: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export const redemptionCodesApi = {
  createRedemptionCode: (data: CreateRedemptionCodeDto) =>
    api.post<{ success: boolean; data: CreatedRedemptionCode }>('/api/admin/lingqi/redemption-codes', data),

  getRedemptionCodes: (params?: { status?: RedemptionCodeStatus; limit?: number; offset?: number }) =>
    api.get<{ success: boolean; data: PaginatedResult<RedemptionCode> }>('/api/admin/lingqi/redemption-codes', { params }),

  getRedemptionCode: (id: string) =>
    api.get<{ success: boolean; data: RedemptionCode }>(`/api/admin/lingqi/redemption-codes/${id}`),

  disableRedemptionCode: (id: string, reason?: string) =>
    api.post<{ success: boolean; data: RedemptionCode }>(`/api/admin/lingqi/redemption-codes/${id}/disable`, { reason }),

  getLedger: (params?: { teamId?: string; userId?: string; direction?: 'grant' | 'consume'; transactionType?: string; from?: string; to?: string; limit?: number; offset?: number }) =>
    api.get<{ success: boolean; data: PaginatedResult<LedgerEntry> }>('/api/admin/lingqi/ledger', { params }),
};
```

- [ ] **Step 4: Create TanStack Query hooks**

Create `packages/admin/src/hooks/useRedemptionCodes.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateRedemptionCodeDto, RedemptionCodeStatus, redemptionCodesApi } from '../services/redemptionCodesApi';

export function useRedemptionCodes(params?: { status?: RedemptionCodeStatus; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['lingqi', 'redemption-codes', params],
    queryFn: () => redemptionCodesApi.getRedemptionCodes(params).then((res) => res.data.data),
  });
}

export function useRedemptionCode(id: string) {
  return useQuery({
    queryKey: ['lingqi', 'redemption-codes', id],
    queryFn: () => redemptionCodesApi.getRedemptionCode(id).then((res) => res.data.data),
    enabled: Boolean(id),
  });
}

export function useCreateRedemptionCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRedemptionCodeDto) => redemptionCodesApi.createRedemptionCode(data).then((res) => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lingqi', 'redemption-codes'] });
    },
  });
}

export function useDisableRedemptionCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      redemptionCodesApi.disableRedemptionCode(id, reason).then((res) => res.data.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['lingqi', 'redemption-codes'] });
      queryClient.invalidateQueries({ queryKey: ['lingqi', 'redemption-codes', id] });
    },
  });
}

export function useLingqiLedger(params?: { teamId?: string; userId?: string; direction?: 'grant' | 'consume'; transactionType?: string; from?: string; to?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['lingqi', 'ledger', params],
    queryFn: () => redemptionCodesApi.getLedger(params).then((res) => res.data.data),
  });
}
```

- [ ] **Step 5: Run Admin service tests**

Run:

```bash
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/admin" test -- redemptionCodesApi.test.ts
```

Expected: PASS.

---

## Task 6: Admin redemption-code and ledger pages

**Files:**
- Create: `packages/admin/src/pages/RedemptionCodes.tsx`
- Create: `packages/admin/src/pages/RedemptionCodeDetail.tsx`
- Create: `packages/admin/src/pages/LingqiLedger.tsx`
- Modify: `packages/admin/src/App.tsx:1-90`
- Modify: `packages/admin/src/components/Layout.tsx:1-52`
- Modify: `packages/admin/src/i18n/locales/zh.json`
- Modify: `packages/admin/src/i18n/locales/en.json`

- [ ] **Step 1: Add route/nav import failing build target**

Modify `packages/admin/src/App.tsx` imports:

```tsx
import RedemptionCodes from './pages/RedemptionCodes';
import RedemptionCodeDetail from './pages/RedemptionCodeDetail';
import LingqiLedger from './pages/LingqiLedger';
```

Add routes inside the protected layout:

```tsx
<Route
  path="redemption-codes"
  element={
    <ProtectedRoute roles={['OWNER', 'ADMIN']}>
      <RedemptionCodes />
    </ProtectedRoute>
  }
/>
<Route
  path="redemption-codes/:id"
  element={
    <ProtectedRoute roles={['OWNER', 'ADMIN']}>
      <RedemptionCodeDetail />
    </ProtectedRoute>
  }
/>
<Route
  path="lingqi-ledger"
  element={
    <ProtectedRoute roles={['OWNER', 'ADMIN']}>
      <LingqiLedger />
    </ProtectedRoute>
  }
/>
```

Run:

```bash
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/admin" build
```

Expected: FAIL because pages do not exist.

- [ ] **Step 2: Create `RedemptionCodes.tsx`**

Create a page that follows the existing table/dialog style from `Marketplace.tsx`:

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Plus, ShieldOff } from 'lucide-react';
import { useCreateRedemptionCode, useDisableRedemptionCode, useRedemptionCodes } from '../hooks/useRedemptionCodes';
import { CreatedRedemptionCode, RedemptionCodeStatus, RedemptionCodeType } from '../services/redemptionCodesApi';
import { Button } from '../components/ui/button';

const statusOptions: Array<{ value: RedemptionCodeStatus | ''; label: string }> = [
  { value: '', label: '全部' },
  { value: 'active', label: '可用' },
  { value: 'redeemed', label: '已兑换' },
  { value: 'expired', label: '已过期' },
  { value: 'disabled', label: '已禁用' },
];

export default function RedemptionCodes() {
  const [status, setStatus] = useState<RedemptionCodeStatus | ''>('');
  const [type, setType] = useState<RedemptionCodeType>('lingqi_only');
  const [lingqiAmount, setLingqiAmount] = useState('1000');
  const [planId, setPlanId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [note, setNote] = useState('');
  const [createdCode, setCreatedCode] = useState<CreatedRedemptionCode | null>(null);
  const { data, isLoading, error } = useRedemptionCodes({ status: status || undefined, limit: 50, offset: 0 });
  const createMutation = useCreateRedemptionCode();
  const disableMutation = useDisableRedemptionCode();

  const handleCreate = async () => {
    const result = await createMutation.mutateAsync({
      type,
      lingqiAmount: Number(lingqiAmount),
      planId: type === 'plan_with_lingqi' ? planId : undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      note: note || undefined,
    });
    setCreatedCode(result);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">灵气兑换码</h1>
          <p className="text-muted-foreground">生成一次性兑换码，并追踪兑换状态。</p>
        </div>
        <Button onClick={handleCreate} disabled={createMutation.isPending}>
          <Plus className="mr-2 h-4 w-4" />
          创建兑换码
        </Button>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          <select value={status} onChange={(event) => setStatus(event.target.value as RedemptionCodeStatus | '')} className="rounded-lg border bg-background px-3 py-2">
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={type} onChange={(event) => setType(event.target.value as RedemptionCodeType)} className="rounded-lg border bg-background px-3 py-2">
            <option value="lingqi_only">仅灵气</option>
            <option value="plan_with_lingqi">套餐 + 灵气</option>
          </select>
          <input value={lingqiAmount} onChange={(event) => setLingqiAmount(event.target.value)} className="rounded-lg border bg-background px-3 py-2" placeholder="灵气数量" />
          <input value={planId} onChange={(event) => setPlanId(event.target.value)} disabled={type !== 'plan_with_lingqi'} className="rounded-lg border bg-background px-3 py-2 disabled:opacity-50" placeholder="套餐 ID" />
          <input value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} type="datetime-local" className="rounded-lg border bg-background px-3 py-2" />
        </div>
        <input value={note} onChange={(event) => setNote(event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2" placeholder="备注" />
      </div>

      {createdCode && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <div className="font-semibold">请立即复制兑换码，关闭后无法再次查看明文。</div>
          <div className="mt-2 flex items-center gap-3 font-mono text-lg">
            {createdCode.code}
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(createdCode.code)}>
              <Copy className="mr-2 h-4 w-4" />复制
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card">
        {isLoading ? <div className="p-6">加载中...</div> : null}
        {error ? <div className="p-6 text-destructive">加载兑换码失败</div> : null}
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Preview</th>
              <th className="p-3">类型</th>
              <th className="p-3">灵气</th>
              <th className="p-3">状态</th>
              <th className="p-3">创建时间</th>
              <th className="p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3 font-mono">{item.codePreview}</td>
                <td className="p-3">{item.type === 'lingqi_only' ? '仅灵气' : '套餐 + 灵气'}</td>
                <td className="p-3">{item.lingqiAmount}</td>
                <td className="p-3">{item.status}</td>
                <td className="p-3">{new Date(item.createdAt).toLocaleString()}</td>
                <td className="p-3 flex gap-2">
                  <Button asChild variant="outline" size="sm"><Link to={`/redemption-codes/${item.id}`}>详情</Link></Button>
                  <Button variant="outline" size="sm" disabled={item.status !== 'active' || disableMutation.isPending} onClick={() => disableMutation.mutate({ id: item.id, reason: 'admin disabled' })}>
                    <ShieldOff className="mr-2 h-4 w-4" />禁用
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

If the project has an existing Dialog component available in Admin, replace the inline create panel and plaintext result panel with that Dialog while preserving the same states.

- [ ] **Step 3: Create detail and ledger pages**

Create `packages/admin/src/pages/RedemptionCodeDetail.tsx`:

```tsx
import { useParams } from 'react-router-dom';
import { useRedemptionCode } from '../hooks/useRedemptionCodes';

export default function RedemptionCodeDetail() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useRedemptionCode(id);

  if (isLoading) return <div className="p-6">加载中...</div>;
  if (error || !data) return <div className="p-6 text-destructive">加载兑换码详情失败</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">兑换码详情</h1>
        <p className="text-muted-foreground">仅展示预览值，不返回明文兑换码。</p>
      </div>
      <div className="rounded-2xl border bg-card p-6 grid gap-4 md:grid-cols-2">
        <div><span className="text-muted-foreground">Preview</span><div className="font-mono">{data.codePreview}</div></div>
        <div><span className="text-muted-foreground">状态</span><div>{data.status}</div></div>
        <div><span className="text-muted-foreground">灵气</span><div>{data.lingqiAmount}</div></div>
        <div><span className="text-muted-foreground">兑换团队</span><div>{data.redeemedTeamId ?? '-'}</div></div>
        <div><span className="text-muted-foreground">兑换用户</span><div>{data.redeemedUserId ?? '-'}</div></div>
        <div><span className="text-muted-foreground">兑换时间</span><div>{data.redeemedAt ? new Date(data.redeemedAt).toLocaleString() : '-'}</div></div>
        <div className="md:col-span-2"><span className="text-muted-foreground">备注</span><div>{data.note ?? '-'}</div></div>
      </div>
    </div>
  );
}
```

Create `packages/admin/src/pages/LingqiLedger.tsx`:

```tsx
import { useState } from 'react';
import { useLingqiLedger } from '../hooks/useRedemptionCodes';

export default function LingqiLedger() {
  const [teamId, setTeamId] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const { data, isLoading, error } = useLingqiLedger({
    teamId: teamId || undefined,
    transactionType: transactionType || undefined,
    limit: 50,
    offset: 0,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">灵气账务追踪</h1>
        <p className="text-muted-foreground">查看充值、消费和模型调用关联信息。</p>
      </div>
      <div className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-2">
        <input value={teamId} onChange={(event) => setTeamId(event.target.value)} className="rounded-lg border bg-background px-3 py-2" placeholder="Team ID" />
        <input value={transactionType} onChange={(event) => setTransactionType(event.target.value)} className="rounded-lg border bg-background px-3 py-2" placeholder="transaction type" />
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card">
        {isLoading ? <div className="p-6">加载中...</div> : null}
        {error ? <div className="p-6 text-destructive">加载账务失败</div> : null}
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">时间</th>
              <th className="p-3">团队</th>
              <th className="p-3">方向</th>
              <th className="p-3">数量</th>
              <th className="p-3">类型</th>
              <th className="p-3">说明</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((entry) => (
              <tr key={entry.id} className="border-t align-top">
                <td className="p-3">{new Date(entry.createdAt).toLocaleString()}</td>
                <td className="p-3 font-mono">{entry.teamId}</td>
                <td className="p-3">{entry.direction}</td>
                <td className="p-3">{entry.amount}</td>
                <td className="p-3">{entry.transactionType}</td>
                <td className="p-3">
                  <div>{entry.description ?? '-'}</div>
                  <pre className="mt-2 max-w-xl overflow-x-auto rounded-lg bg-muted p-2 text-xs">{JSON.stringify(entry.metadata, null, 2)}</pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add navigation and i18n**

Modify `packages/admin/src/components/Layout.tsx` import:

```tsx
import { Menu, X, LogOut, User, ChevronDown, Cpu, LayoutDashboard, Users as UsersIcon, Mail, Settings, ShoppingBag, ShieldCheck, Ticket, ScrollText } from 'lucide-react';
```

Add Admin-only nav entries to `navItems`:

```tsx
{ path: '/redemption-codes', label: t('nav.redemptionCodes'), icon: Ticket },
{ path: '/lingqi-ledger', label: t('nav.lingqiLedger'), icon: ScrollText },
```

Add to `zh.json` `nav`:

```json
"redemptionCodes": "兑换码",
"lingqiLedger": "灵气账务"
```

Add to `en.json` `nav`:

```json
"redemptionCodes": "Redemption Codes",
"lingqiLedger": "Lingqi Ledger"
```

- [ ] **Step 5: Run Admin checks**

Run:

```bash
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/admin" test
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/admin" build
```

Expected: tests and build PASS.

---

## Task 7: Client chat billing feedback hardening

**Files:**
- Modify: `packages/client/src/pages/Chat.tsx`
- Modify only if needed: `packages/client/src/components/LingqiCostPreview.tsx`
- Test: `packages/client/src/services/lingqi-service.test.ts` or `packages/client/src/pages/Chat.test.tsx`

- [ ] **Step 1: Add failing test for post-success balance refresh timing**

If page-level Chat tests already exist, add a test to that file. Otherwise create `packages/client/src/pages/Chat.test.tsx` with Vitest + React Testing Library matching existing test setup:

```tsx
it('refreshes Lingqi status after a successful chat completion', async () => {
  const refreshStatus = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useLingqiStore).mockReturnValue({
    selectedModel: { id: 'model-1', displayName: '入门心法' },
    estimate: { canAfford: true, estimatedCost: 10 },
    refreshStatus,
  } as any);

  render(<Chat />);

  await userEvent.type(screen.getByRole('textbox'), 'hello');
  await userEvent.click(screen.getByRole('button', { name: /发送|send/i }));
  await act(async () => finishMockHermesStreamSuccessfully());

  expect(refreshStatus).toHaveBeenCalled();
});
```

Replace `finishMockHermesStreamSuccessfully` with the actual Hermes mock helper used by existing Chat tests. If no existing helper exists, keep this coverage at service/store level and verify UI via E2E in Task 10.

- [ ] **Step 2: Run the focused Client test**

Run:

```bash
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/client" test -- Chat.test.tsx
```

Expected: FAIL if balance refresh currently happens too early or test harness is missing.

- [ ] **Step 3: Move success refresh to stream completion if needed**

In `packages/client/src/pages/Chat.tsx`, keep the pre-send affordability check. Ensure `refreshStatus` is called after a successful final response/completion event, not only immediately after accepted send. Preserve existing failure behavior and add user-facing text for provider failure:

```tsx
if (streamFinishedSuccessfully) {
  await refreshStatus(currentTeamId);
}

if (streamFailed) {
  toast.error('模型调用失败，本次未扣费');
}
```

Use the actual stream success/failure variables/events already present in `Chat.tsx`; do not introduce a duplicate chat state machine.

- [ ] **Step 4: Run Client checks**

Run:

```bash
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/client" test:coverage
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/client" build
```

Expected: tests and build PASS.

---

## Task 8: MiniMax provider configuration safety verification

**Files:**
- Modify only if needed: `packages/server/src/ai-models/api-client.ts`
- Modify only if needed: `packages/server/src/ai-models/ai-models.service.ts`
- Test: `packages/server/src/ai-models/api-client.spec.ts`
- Test: `packages/server/src/ai-models/ai-models.service.spec.ts`

- [ ] **Step 1: Add focused tests for provider URL safety if missing**

Inspect existing `api-client.spec.ts`. If there is no SSRF/base URL coverage, add tests:

```ts
it.each([
  'http://api.example.com/anthropic',
  'file:///etc/passwd',
  'https://localhost/anthropic',
  'https://127.0.0.1/anthropic',
  'https://10.0.0.1/anthropic',
])('rejects unsafe provider base URL %s', async (baseUrl) => {
  await expect(client.fetchModels({ baseUrl, apiKey: 'test-key' })).rejects.toThrow();
});
```

Do not use the real MiniMax API key in tests.

- [ ] **Step 2: Run AI model safety tests**

Run:

```bash
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/server" test -- api-client.spec.ts ai-models.service.spec.ts
```

Expected: PASS if safety already exists, otherwise FAIL and implement minimal URL validation at provider boundary.

- [ ] **Step 3: Validate manual provider setup locally**

Use Admin UI at `http://localhost:1992/ai/settings` to configure the provider with the user-provided MiniMax Anthropic-compatible URL and API key. Enter the key only through the Admin UI or local environment. Do not write it into files, commands, reports, tests, or screenshots.

Expected: provider and API key saved by backend encryption flow, and model fetch either succeeds or fails with a user-safe message. If model list fetch is unsupported by provider, use the existing manual model fallback in Admin AI settings.

---

## Task 9: Full automated checks and code reviews

**Files:**
- Review all modified files.

- [ ] **Step 1: Run full package checks**

Run:

```bash
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/server" test
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/server" build
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/admin" test
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/admin" build
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/client" test:coverage
pnpm --dir "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/packages/client" build
```

Expected: all PASS.

- [ ] **Step 2: Use reviewer agents**

Run these reviews after code changes:

1. `code-reviewer` for general diff correctness.
2. `typescript-reviewer` for TS/React/Nest type safety.
3. `security-reviewer` for redemption code, API key, external provider URL, auth, and SQL safety.
4. `database-reviewer` for migration, indexes, transaction semantics, and ledger queries.

Expected: no CRITICAL/HIGH findings remain. Fix any CRITICAL/HIGH findings and rerun focused checks.

---

## Task 10: Browser E2E and report

**Files:**
- Create: `reports/LINGQI_REDEMPTION_AND_MODEL_BILLING_E2E_TEST_REPORT_20260521.md`

- [ ] **Step 1: Restart local services**

Run:

```bash
pm2 restart "c:/Users/smallMark/Desktop/peaksclaw/ice-cola/ecosystem.config.cjs" --update-env
pm2 status
```

If backend Docker services need restart:

```bash
docker compose up -d
```

Expected: Admin is reachable at `http://localhost:1992`, Client at `http://localhost:1420`, Server at `http://localhost:3000`.

- [ ] **Step 2: Verify Admin redemption flow in browser**

Using Chrome DevTools MCP or Playwright MCP:

1. Open `http://localhost:1992/login`.
2. Log in with local test Admin credentials.
3. Open `/redemption-codes`.
4. Create a one-time `lingqi_only` code.
5. Copy the plaintext code for immediate local use only.
6. Verify the list shows only preview and `active` status.

Expected: plaintext appears only in the creation result panel; list/detail never reveal full code.

- [ ] **Step 3: Verify Client redemption flow in browser**

1. Open `http://localhost:1420/login`.
2. Log in as a local Client test user and select/create a team.
3. Open Lingqi page.
4. Redeem the Admin-generated code.
5. Verify balance increases and grant ledger row appears.
6. Attempt to redeem the same code again.

Expected: first redemption succeeds; second redemption fails with an exhausted/already-used message.

- [ ] **Step 4: Verify chat billing flow in browser**

1. In Admin, configure MiniMax provider/API key through UI only.
2. Fetch or manually add a model and ensure it is available to Client model catalog.
3. In Client chat, select the model.
4. Send a successful message.
5. Verify response appears, balance decreases, and consume ledger row appears.
6. Force a failure path using invalid model/provider state or insufficient balance.

Expected: successful chat writes consume ledger; failed provider call or insufficient balance does not incorrectly charge.

- [ ] **Step 5: Write E2E report**

Create `reports/LINGQI_REDEMPTION_AND_MODEL_BILLING_E2E_TEST_REPORT_20260521.md` with this structure:

```md
# 灵气兑换码 Admin 管理与模型扣费闭环 E2E 测试报告

## 测试信息
- **测试时间**: 2026-05-21 HH:mm:ss
- **测试工程师**: Claude Code
- **功能版本**: v1.0.0

## 测试环境
- **浏览器**: Chrome
- **viewport**: 1920x1080
- **Admin**: http://localhost:1992
- **Client**: http://localhost:1420
- **Server**: http://localhost:3000

## 测试功能
Admin 生成一次性灵气兑换码，Client 兑换充值，Client 使用 Admin 配置模型对话并完成扣费账本追踪。

## 测试步骤

### Step 1: Admin 创建兑换码
- 操作：创建仅灵气一次性兑换码
- 预期：仅创建结果显示明文，列表显示 preview
- 结果：PASS/FAIL

### Step 2: Client 兑换充值
- 操作：输入 Admin 生成兑换码
- 预期：余额增加，账本出现 grant 记录
- 结果：PASS/FAIL

### Step 3: 重复兑换拦截
- 操作：再次兑换同一码
- 预期：提示兑换码已用尽或已使用
- 结果：PASS/FAIL

### Step 4: 模型对话扣费
- 操作：选择模型并发送消息
- 预期：成功回复，余额减少，账本出现 consume 记录
- 结果：PASS/FAIL

### Step 5: 失败不扣费
- 操作：触发余额不足或模型失败
- 预期：不调用或不误扣费
- 结果：PASS/FAIL

## 测试结果

| 测试项 | 状态 | 备注 |
|--------|------|------|
| Admin 兑换码创建 | PASS/FAIL | |
| Client 兑换充值 | PASS/FAIL | |
| 重复兑换拦截 | PASS/FAIL | |
| 模型对话扣费 | PASS/FAIL | |
| 失败不扣费 | PASS/FAIL | |
| Admin 账务追踪 | PASS/FAIL | |

## 发现的问题

| 优先级 | 问题描述 | 状态 |
|--------|----------|------|
| - | - | - |

## 安全处理

- 未在报告中记录真实 API Key。
- 未在报告中记录完整明文兑换码。
- 截图如包含敏感值，已遮挡或不纳入报告。

## 结论

PASS/FAIL
```

Expected: report exists, contains no real API key and no full plaintext redemption code.

---

## Self-review checklist

- Spec coverage:
  - Admin provider/API key ownership: covered by Tasks 8 and 10.
  - Admin redemption create/list/detail/disable: covered by Tasks 2, 3, 4, 5, 6.
  - Client recharge with Admin code: covered by Tasks 1, 10.
  - One-time code: covered by Task 1.
  - Ledger tracking: covered by Tasks 3, 6, 10.
  - Chat billing success/failure: covered by Tasks 7, 8, 10.
  - E2E report: covered by Task 10.
- Security coverage:
  - Plaintext redemption code returns only at create.
  - Code hash is stored; API key is never written into repo artifacts.
  - SQL is parameterized.
  - Provider URL SSRF checks are verified before real provider use.
- No planned commits are included because the user has not asked for a commit.
