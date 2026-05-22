# Admin AI Client Chat Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Admin AI model configuration the source for Client 问道 model availability and execution, while remediating high-traffic Admin AI UI surfaces to use local shadcn/ui primitives.

**Architecture:** Keep `ai_models` as the admin-editable runtime provider model source and synchronize a `model_catalog` projection for Client/Lingqi. Client continues to call `/teams/:teamId/models/catalog`; Gateway continues resolving `model_catalog.model_name` to `ai_models.model_id`. Admin UI sends catalog projection fields through the existing `/admin/ai/models` API.

**Tech Stack:** NestJS, PostgreSQL, Jest, React, Vite, Vitest, React Testing Library, TanStack Query, local shadcn/ui components, Playwright MCP.

---

## File Structure

**Backend**
- Modify: `packages/server/src/ai-models/dto/model.dto.ts` — add validated catalog projection fields.
- Modify: `packages/server/src/ai-models/ai-models.service.ts` — wrap model create/update/delete in transactions, call catalog sync, align active status semantics.
- Create: `packages/server/src/ai-models/model-catalog-projection.ts` — focused helpers for catalog defaults, row mapping, and transactional upsert/deactivate SQL.
- Modify: `packages/server/src/ai-models/ai-models.service.spec.ts` — tests for create/update/delete catalog sync and executable model lookup.
- Modify: `packages/server/src/ai-models/ai-models.controller.ts` — remove fake platform-admin hard block from AI config routes while keeping API key plaintext export blocked.
- Modify: `packages/server/src/ai-models/ai-models.controller.spec.ts` — tests for owner/admin access to admin AI config and team-scoped quota guard behavior.

**Admin frontend**
- Modify: `packages/admin/src/services/aiModelsApi.ts` — add catalog fields to create/update/model response types and replace local `any` where touched.
- Modify: `packages/admin/src/hooks/useAiModels.ts` — type model/provider transforms, include catalog fields, remove touched `any` mutation shapes.
- Modify: `packages/admin/src/components/ai/ModelDialog.tsx` — add catalog fields, use `Textarea`, use `Button` for capability chips, remove dynamic i18n key casts.
- Modify: `packages/admin/src/pages/ai/Models.tsx` — use `Badge`, `TableRow`/`TableCell` for empty/expanded rows, show catalog fields, remove touched `any` casts.
- Modify: `packages/admin/src/pages/ai/Providers.tsx` — use `Badge`, proper table empty row primitives, remove touched `any` casts.
- Modify: `packages/admin/src/components/ai/AddProviderDialog.tsx` — replace raw API key textarea with `Textarea`.
- Modify: `packages/admin/src/components/ai/ApiKeyDialog.tsx` — replace raw API key textarea with `Textarea`.
- Create: `packages/admin/src/pages/ai/Models.test.tsx` — behavior tests for catalog payload and list rendering.
- Create: `packages/admin/src/components/ai/ModelDialog.test.tsx` — behavior tests for catalog fields and shadcn-style capability buttons.
- Modify: `packages/admin/src/i18n/locales/zh.json` — add admin AI catalog labels.
- Modify: `packages/admin/src/i18n/locales/en.json` — add matching admin AI catalog labels.

**Validation artifact**
- Create: `reports/Admin_AI_Client_Chat_Integration_E2E_TEST_REPORT_20260522.md` — Playwright MCP result report after implementation.

---

## Task 1: Backend tests for AI model catalog projection

**Files:**
- Modify: `packages/server/src/ai-models/ai-models.service.spec.ts`

- [ ] **Step 1: Add failing create sync test**

Add this test inside the existing `describe('Model CRUD')` block:

```ts
it('creates a model and upserts its client catalog projection in one transaction', async () => {
  const createdModel = {
    ...mockModel,
    status: 'active',
    enabled: true,
  };
  const transactionQueryOne = jest.fn().mockResolvedValue(createdModel);
  const transactionQuery = jest.fn().mockResolvedValue([]);

  db.transaction.mockImplementation(async (callback) =>
    callback({ query: transactionQuery, queryOne: transactionQueryOne } as never),
  );

  const result = await service.createModel({
    providerId: 'provider-1',
    name: 'GPT-4',
    modelId: 'gpt-4',
    modelType: 'chat',
    description: 'GPT-4 model',
    contextWindow: 128000,
    inputPricePer1m: 30,
    outputPricePer1m: 60,
    sortOrder: 1,
    capabilities: ['chat', 'streaming'],
    displayName: 'GPT-4 Client',
    rank: 2,
    costMultiplier: 1.5,
    requiredPlanLevel: 1,
    isCatalogVisible: true,
  });

  expect(result).toEqual(createdModel);
  expect(db.transaction).toHaveBeenCalledTimes(1);
  expect(transactionQueryOne).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO ai_models'),
    expect.arrayContaining(['provider-1', 'GPT-4', 'gpt-4']),
  );
  expect(transactionQuery).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO model_catalog'),
    expect.arrayContaining([
      'provider-1',
      'gpt-4',
      'GPT-4 Client',
      'GPT-4 model',
      2,
      1.5,
      1,
      true,
    ]),
  );
});
```

Also extend the mocked `DatabaseService` in the test module setup:

```ts
transaction: jest.fn(),
```

- [ ] **Step 2: Add failing update sync test**

Add this test in the same block:

```ts
it('updates a model and synchronizes catalog display fields', async () => {
  const existingModel = {
    ...mockModel,
    status: 'active',
  };
  const updatedModel = {
    ...existingModel,
    name: 'GPT-4 Turbo',
    description: 'Updated description',
  };
  const transactionQueryOne = jest
    .fn()
    .mockResolvedValueOnce(existingModel)
    .mockResolvedValueOnce(updatedModel);
  const transactionQuery = jest.fn().mockResolvedValue([updatedModel]);

  db.transaction.mockImplementation(async (callback) =>
    callback({ query: transactionQuery, queryOne: transactionQueryOne } as never),
  );

  const result = await service.updateModel('model-1', {
    name: 'GPT-4 Turbo',
    description: 'Updated description',
    displayName: 'Turbo Client',
    rank: 3,
    costMultiplier: 2,
    requiredPlanLevel: 2,
    isCatalogVisible: false,
  });

  expect(result).toEqual(updatedModel);
  expect(transactionQueryOne).toHaveBeenCalledWith(
    expect.stringContaining('SELECT * FROM ai_models WHERE id = $1'),
    ['model-1'],
  );
  expect(transactionQuery).toHaveBeenCalledWith(
    expect.stringContaining('UPDATE ai_models SET'),
    expect.arrayContaining(['GPT-4 Turbo', 'Updated description', 'model-1']),
  );
  expect(transactionQuery).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO model_catalog'),
    expect.arrayContaining([
      'provider-1',
      'gpt-4',
      'Turbo Client',
      'Updated description',
      3,
      2,
      2,
      false,
    ]),
  );
});
```

- [ ] **Step 3: Add failing deactivate/delete projection test**

Add this test in the same block:

```ts
it('deactivates the catalog projection when deleting an admin model', async () => {
  const existingModel = {
    ...mockModel,
    status: 'active',
  };
  const deactivatedModel = {
    ...existingModel,
    status: 'inactive',
  };
  const transactionQueryOne = jest
    .fn()
    .mockResolvedValueOnce(existingModel)
    .mockResolvedValueOnce(deactivatedModel);
  const transactionQuery = jest.fn().mockResolvedValue([]);

  db.transaction.mockImplementation(async (callback) =>
    callback({ query: transactionQuery, queryOne: transactionQueryOne } as never),
  );

  const result = await service.deleteModel('model-1');

  expect(result).toEqual(deactivatedModel);
  expect(transactionQueryOne).toHaveBeenCalledWith(
    expect.stringContaining("UPDATE ai_models SET status = 'inactive'"),
    ['model-1'],
  );
  expect(transactionQuery).toHaveBeenCalledWith(
    expect.stringContaining('UPDATE model_catalog SET is_active = false'),
    ['gpt-4'],
  );
});
```

- [ ] **Step 4: Add failing executable lookup consistency test**

Add or update this test so runtime lookup accepts the same active field written by create/update:

```ts
it('finds executable active models by provider model id', async () => {
  db.queryOne.mockResolvedValue(mockModel);

  await service.findExecutableModelByModelId('gpt-4');

  expect(db.queryOne).toHaveBeenCalledWith(
    expect.stringContaining("WHERE m.model_id = $1 AND m.status = 'active'"),
    ['gpt-4'],
  );
});
```

- [ ] **Step 5: Run tests to verify they fail**

Run:

```bash
pnpm --filter @ice-cola/server test -- ai-models.service.spec.ts
```

Expected: FAIL because `db.transaction` is not used by model CRUD, catalog projection SQL does not exist, and `deleteModel` still physically deletes rows.

---

## Task 2: Implement backend catalog projection sync

**Files:**
- Create: `packages/server/src/ai-models/model-catalog-projection.ts`
- Modify: `packages/server/src/ai-models/dto/model.dto.ts`
- Modify: `packages/server/src/ai-models/ai-models.service.ts`

- [ ] **Step 1: Add DTO catalog fields**

In `packages/server/src/ai-models/dto/model.dto.ts`, update the import:

```ts
import { IsString, IsNumber, IsOptional, IsNotEmpty, IsArray, IsBoolean, Min } from 'class-validator';
```

Add these fields to both `CreateModelDto` and `UpdateModelDto`:

```ts
@IsString()
@IsOptional()
displayName?: string;

@IsNumber()
@Min(1)
@IsOptional()
rank?: number;

@IsNumber()
@Min(0.01)
@IsOptional()
costMultiplier?: number;

@IsNumber()
@Min(0)
@IsOptional()
requiredPlanLevel?: number;

@IsBoolean()
@IsOptional()
isCatalogVisible?: boolean;
```

Replace `Record<string, any>` in touched DTOs with:

```ts
metadata?: Record<string, unknown>;
```

- [ ] **Step 2: Create projection helper**

Create `packages/server/src/ai-models/model-catalog-projection.ts`:

```ts
import { PoolClient } from 'pg';
import { CreateModelDto, UpdateModelDto } from './dto/model.dto';

interface AiModelCatalogSource {
  provider_id: string;
  name: string;
  model_id: string;
  description?: string | null;
  status?: string | null;
  enabled?: boolean | null;
}

interface CatalogProjectionInput {
  providerId: string;
  modelName: string;
  displayName: string;
  description: string | null;
  rank: number;
  costMultiplier: number;
  requiredPlanLevel: number;
  isActive: boolean;
}

function modelIsActive(model: AiModelCatalogSource): boolean {
  if (model.status) {
    return model.status === 'active';
  }

  return model.enabled !== false;
}

export function buildCatalogProjection(
  model: AiModelCatalogSource,
  data: CreateModelDto | UpdateModelDto,
): CatalogProjectionInput {
  const isActive = data.isCatalogVisible ?? modelIsActive(model);

  return {
    providerId: model.provider_id,
    modelName: model.model_id,
    displayName: data.displayName?.trim() || model.name,
    description: data.description === undefined ? model.description ?? null : data.description ?? null,
    rank: data.rank ?? 1,
    costMultiplier: data.costMultiplier ?? 1,
    requiredPlanLevel: data.requiredPlanLevel ?? 0,
    isActive,
  };
}

export async function upsertModelCatalogProjection(
  client: PoolClient,
  projection: CatalogProjectionInput,
): Promise<void> {
  await client.query(
    `INSERT INTO model_catalog (
       provider_id,
       model_name,
       display_name,
       description,
       rank,
       cost_multiplier,
       required_plan_level,
       is_active,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (model_name)
     DO UPDATE SET provider_id = EXCLUDED.provider_id,
                   display_name = EXCLUDED.display_name,
                   description = EXCLUDED.description,
                   rank = EXCLUDED.rank,
                   cost_multiplier = EXCLUDED.cost_multiplier,
                   required_plan_level = EXCLUDED.required_plan_level,
                   is_active = EXCLUDED.is_active,
                   updated_at = CURRENT_TIMESTAMP`,
    [
      projection.providerId,
      projection.modelName,
      projection.displayName,
      projection.description,
      projection.rank,
      projection.costMultiplier,
      projection.requiredPlanLevel,
      projection.isActive,
    ],
  );
}

export async function deactivateModelCatalogProjection(
  client: PoolClient,
  modelName: string,
): Promise<void> {
  await client.query(
    `UPDATE model_catalog SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE model_name = $1`,
    [modelName],
  );
}
```

- [ ] **Step 3: Use transactions in model create**

In `packages/server/src/ai-models/ai-models.service.ts`, import helpers:

```ts
import {
  buildCatalogProjection,
  deactivateModelCatalogProjection,
  upsertModelCatalogProjection,
} from './model-catalog-projection';
```

Replace `createModel` with a transaction that writes `status = 'active'` and upserts the catalog projection:

```ts
async createModel(data: CreateModelDto) {
  const id = this.generateUUID();
  const pricing = {
    inputPricePer1m: data.inputPricePer1m || null,
    outputPricePer1m: data.outputPricePer1m || null,
  };

  return this.db.transaction(async (client) => {
    const result = await client.query(
      `INSERT INTO ai_models (id, provider_id, name, model_id, description, capabilities, pricing, sort_order, status, enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', true, NOW(), NOW())
       RETURNING *`,
      [
        id,
        data.providerId,
        data.name,
        data.modelId,
        data.description || null,
        data.capabilities ? JSON.stringify(data.capabilities) : JSON.stringify({ type: data.modelType, contextWindow: data.contextWindow }),
        JSON.stringify(pricing),
        data.sortOrder || 0,
      ],
    );
    const model = result.rows[0];

    await upsertModelCatalogProjection(client, buildCatalogProjection(model, data));

    return model;
  });
}
```

- [ ] **Step 4: Use transactions in model update**

At the start of `updateModel`, keep a transaction-scoped read of the existing row and run the existing dynamic update through `client.query`. After `updatedModel` is returned, call:

```ts
await upsertModelCatalogProjection(client, buildCatalogProjection(updatedModel, data));
```

The method should return the updated model. If no model exists for the id, return `null` without syncing.

- [ ] **Step 5: Deactivate instead of physical delete for model delete**

Replace `deleteModel` with:

```ts
async deleteModel(id: string) {
  return this.db.transaction(async (client) => {
    const existingResult = await client.query('SELECT * FROM ai_models WHERE id = $1', [id]);
    const existing = existingResult.rows[0];

    if (!existing) {
      return null;
    }

    const result = await client.query(
      `UPDATE ai_models SET status = 'inactive', enabled = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );
    const model = result.rows[0];

    await deactivateModelCatalogProjection(client, existing.model_id);

    return model;
  });
}
```

- [ ] **Step 6: Run backend model tests**

Run:

```bash
pnpm --filter @ice-cola/server test -- ai-models.service.spec.ts
```

Expected: PASS for the new catalog projection tests and existing model CRUD tests.

---

## Task 3: Backend controller authorization alignment

**Files:**
- Modify: `packages/server/src/ai-models/ai-models.controller.spec.ts`
- Modify: `packages/server/src/ai-models/ai-models.controller.ts`

- [ ] **Step 1: Replace platform-admin rejection tests with owner/admin access tests**

In `packages/server/src/ai-models/ai-models.controller.spec.ts`, replace tests that expect `Platform admin privileges required` for AI model config with direct success tests:

```ts
it('allows team owners and admins to read global AI model configuration', async () => {
  const { controller, service } = createController();
  service.findAllModels.mockResolvedValue([{ id: 'model-1', model_id: 'gpt-4' }]);

  await expect(controller.findAllModels()).resolves.toEqual({
    success: true,
    data: [{ id: 'model-1', modelId: 'gpt-4' }],
  });
  expect(service.findAllModels).toHaveBeenCalledTimes(1);
});

it('allows team owners and admins to create models through the admin AI endpoint', async () => {
  const { controller, service } = createController();
  service.createModel.mockResolvedValue({ id: 'model-1', model_id: 'gpt-4' });

  await expect(
    controller.createModel({
      providerId: 'provider-1',
      name: 'GPT-4',
      modelId: 'gpt-4',
      modelType: 'chat',
    }),
  ).resolves.toEqual({
    success: true,
    data: { id: 'model-1', modelId: 'gpt-4' },
  });
});
```

Keep the API key plaintext export test:

```ts
await expect(controller.decryptApiKey()).rejects.toThrow(ForbiddenException);
```

- [ ] **Step 2: Run controller tests to verify failure**

Run:

```bash
pnpm --filter @ice-cola/server test -- ai-models.controller.spec.ts
```

Expected: FAIL because `requirePlatformAdmin()` still throws for AI config routes.

- [ ] **Step 3: Remove the fake platform-admin hard block**

In `packages/server/src/ai-models/ai-models.controller.ts`:

1. Remove `private requirePlatformAdmin(): never`.
2. Remove `this.requirePlatformAdmin();` from providers, models, fetch-models, API key create/status/update/delete, endpoints, model-configs, and default-models routes.
3. Keep `decryptApiKey()` as:

```ts
@Get('api-keys/:id/decrypt')
@Roles(TeamRole.OWNER, TeamRole.ADMIN)
async decryptApiKey() {
  throw new ForbiddenException('API key plaintext export is not allowed');
}
```

Do not change team quota and usage routes beyond preserving their same-team checks.

- [ ] **Step 4: Run controller tests**

Run:

```bash
pnpm --filter @ice-cola/server test -- ai-models.controller.spec.ts
```

Expected: PASS.

---

## Task 4: Admin frontend API and hook typing

**Files:**
- Modify: `packages/admin/src/services/aiModelsApi.ts`
- Modify: `packages/admin/src/hooks/useAiModels.ts`

- [ ] **Step 1: Add typed catalog fields to frontend DTOs**

In `packages/admin/src/services/aiModelsApi.ts`, add to `CreateModelDto`, `UpdateModelDto`, and `Model`:

```ts
displayName?: string;
rank?: number;
costMultiplier?: number;
requiredPlanLevel?: number;
isCatalogVisible?: boolean;
```

Replace touched `Record<string, any>` with `Record<string, unknown>` in model DTOs and model response type.

- [ ] **Step 2: Add typed transform helpers**

In `packages/admin/src/hooks/useAiModels.ts`, import `Model`, `Provider`, `UpdateApiKeyDto`, `UpdateEndpointDto`, and `UpdateModelConfigDto` from `aiModelsApi`, then add:

```ts
interface RawProvider extends Provider {
  website?: string;
  enabled?: boolean;
}

interface RawModel extends Model {
  capabilities?: Model['capabilities'] | { type?: string; contextWindow?: number };
  pricing?: {
    inputPricePer1m?: number;
    outputPricePer1m?: number;
  };
}

function transformProvider(provider: RawProvider): Provider {
  return {
    ...provider,
    websiteUrl: provider.website || provider.websiteUrl,
    status: provider.enabled === false ? 'inactive' : provider.status,
  };
}

function transformModel(model: RawModel): Model {
  const capabilities = Array.isArray(model.capabilities) ? model.capabilities : [];
  const capabilityShape = Array.isArray(model.capabilities) ? undefined : model.capabilities;

  return {
    ...model,
    capabilities,
    modelType: capabilityShape?.type || model.modelType || 'chat',
    contextWindow: capabilityShape?.contextWindow || model.contextWindow,
    inputPricePer1m: model.pricing?.inputPricePer1m ?? model.inputPricePer1m,
    outputPricePer1m: model.pricing?.outputPricePer1m ?? model.outputPricePer1m,
  };
}
```

Update `useProviders` and `useModels` to call these helpers without `any`.

- [ ] **Step 3: Type mutation payloads**

Replace touched mutation signatures:

```ts
mutationFn: ({ id, data }: { id: string; data: UpdateApiKeyDto }) =>
mutationFn: ({ id, data }: { id: string; data: UpdateEndpointDto }) =>
mutationFn: ({ id, data }: { id: string; data: UpdateModelConfigDto }) =>
```

- [ ] **Step 4: Run admin typecheck through build**

Run:

```bash
pnpm --filter openclaw-admin build
```

Expected before UI changes: build may fail on missing i18n keys from later tasks if fields are already referenced; after this task alone, type errors from edited API/hook files should be resolved.

---

## Task 5: Admin ModelDialog tests and implementation

**Files:**
- Create: `packages/admin/src/components/ai/ModelDialog.test.tsx`
- Modify: `packages/admin/src/components/ai/ModelDialog.tsx`
- Modify: `packages/admin/src/i18n/locales/zh.json`
- Modify: `packages/admin/src/i18n/locales/en.json`

- [ ] **Step 1: Write failing ModelDialog tests**

Create `packages/admin/src/components/ai/ModelDialog.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { ModelDialog } from './ModelDialog';

function renderDialog(onSubmit = vi.fn()) {
  render(
    <I18nextProvider i18n={i18n}>
      <ModelDialog
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        providers={[{ id: 'provider-1', name: 'OpenAI' }]}
      />
    </I18nextProvider>,
  );

  return { onSubmit };
}

describe('ModelDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage('zh');
  });

  it('submits client catalog projection fields with the model payload', () => {
    const { onSubmit } = renderDialog();

    fireEvent.change(screen.getByLabelText('模型名称 *'), { target: { value: 'GPT-4o' } });
    fireEvent.change(screen.getByLabelText('模型 ID *'), { target: { value: 'gpt-4o' } });
    fireEvent.change(screen.getByLabelText('Client 展示名'), { target: { value: '问道 GPT-4o' } });
    fireEvent.change(screen.getByLabelText('阶位'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('消耗倍率'), { target: { value: '1.5' } });
    fireEvent.change(screen.getByLabelText('订阅等级'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Client 可见' }));
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'provider-1',
        name: 'GPT-4o',
        modelId: 'gpt-4o',
        displayName: '问道 GPT-4o',
        rank: 2,
        costMultiplier: 1.5,
        requiredPlanLevel: 1,
        isCatalogVisible: false,
      }),
    );
  });

  it('uses button semantics for capability chips and no raw textarea styling', () => {
    const { container } = renderDialog();

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: '聊天' })).toBeVisible();
    expect(container.querySelector('textarea')).toHaveClass('rounded-md');
  });
});
```

- [ ] **Step 2: Run dialog test to verify failure**

Run:

```bash
pnpm --filter openclaw-admin test -- src/components/ai/ModelDialog.test.tsx
```

Expected: FAIL because catalog fields do not render and raw textarea/button code remains.

- [ ] **Step 3: Add fixed i18n keys**

Add matching keys under `ai.models` in both locale files:

```json
{
  "clientCatalog": "Client 模型目录",
  "displayName": "Client 展示名",
  "displayNamePlaceholder": "例如：问道 GPT-4o",
  "rank": "阶位",
  "rankHint": "数字越小越靠前，同等级按名称排序。",
  "costMultiplier": "消耗倍率",
  "costMultiplierHint": "Lingqi 估算费用的倍率，默认 1。",
  "requiredPlanLevel": "订阅等级",
  "requiredPlanLevelHint": "0 表示所有团队可用。",
  "isCatalogVisible": "Client 可见",
  "visible": "可见",
  "hidden": "隐藏"
}
```

Use English values in `en.json` with the same keys.

- [ ] **Step 4: Implement ModelDialog catalog fields and shadcn controls**

In `ModelDialog.tsx`:

1. Import `Textarea`:
   ```ts
   import { Textarea } from '../ui/textarea';
   ```
2. Extend `FormState` with:
   ```ts
   displayName: string;
   rank: number;
   costMultiplier: number;
   requiredPlanLevel: number;
   isCatalogVisible: boolean;
   ```
3. Replace `initialData as any` by extending `ModelDialogInitialData`:
   ```ts
   interface ModelDialogInitialData extends UpdateModelDto {
     id?: string;
     providerId?: string;
     modelId?: string;
     modelType?: 'chat' | 'vision' | 'embedding' | 'text';
   }
   ```
4. Replace dynamic model type i18n with:
   ```ts
   const MODEL_TYPE_LABEL_KEYS = {
     chat: 'ai.models.typeChat',
     vision: 'ai.models.typeVision',
     embedding: 'ai.models.typeEmbedding',
     text: 'ai.models.typeText',
   } as const;
   ```
5. Replace raw capability `<button>` with local `Button`:
   ```tsx
   <Button
     key={key}
     type="button"
     variant={form.capabilities.includes(key) ? 'default' : 'outline'}
     size="sm"
     className="rounded-full"
     onClick={() => handleCapabilityToggle(key)}
   >
     {label}
   </Button>
   ```
6. Replace description `<textarea>` with `<Textarea />`.
7. Add catalog field section before description.
8. Include catalog fields in both create and update payloads.

- [ ] **Step 5: Run dialog tests**

Run:

```bash
pnpm --filter openclaw-admin test -- src/components/ai/ModelDialog.test.tsx
```

Expected: PASS.

---

## Task 6: Admin Models list tests and implementation

**Files:**
- Create: `packages/admin/src/pages/ai/Models.test.tsx`
- Modify: `packages/admin/src/pages/ai/Models.tsx`

- [ ] **Step 1: Write failing Models page tests**

Create `packages/admin/src/pages/ai/Models.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import Models from './Models';

const models = [
  {
    id: 'model-1',
    providerId: 'provider-1',
    name: 'GPT-4o',
    modelId: 'gpt-4o',
    modelType: 'chat',
    description: 'Fast model',
    contextWindow: 128000,
    inputPricePer1m: 5,
    outputPricePer1m: 15,
    sortOrder: 1,
    status: 'active',
    capabilities: ['chat', 'streaming'],
    providerName: 'OpenAI',
    providerCode: 'openai',
    displayName: '问道 GPT-4o',
    rank: 2,
    costMultiplier: 1.5,
    requiredPlanLevel: 1,
    isCatalogVisible: true,
    createdAt: '2026-05-22T00:00:00.000Z',
    updatedAt: '2026-05-22T00:00:00.000Z',
  },
];

vi.mock('../../hooks/useAiModels', () => ({
  useModels: () => ({ data: models, isLoading: false }),
  useProviders: () => ({ data: [{ id: 'provider-1', name: 'OpenAI' }] }),
  useCreateModel: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateModel: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteModel: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: (state: { user: { role: string } }) => unknown) => selector({ user: { role: 'OWNER' } }),
}));

describe('Models page', () => {
  beforeEach(() => {
    i18n.changeLanguage('zh');
  });

  it('renders catalog projection fields and shadcn badge text', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <Models />
      </I18nextProvider>,
    );

    expect(screen.getByText('问道 GPT-4o')).toBeVisible();
    expect(screen.getByText('1.5x')).toBeVisible();
    expect(screen.getByText('L1')).toBeVisible();
    expect(screen.getByText('可见')).toBeVisible();
  });

  it('renders expanded capability badges with fixed i18n labels', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <Models />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /展开|收起|Toggle/i }));

    const table = screen.getByRole('table');
    expect(within(table).getByText('聊天')).toBeVisible();
    expect(within(table).getByText('流式')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run Models page tests to verify failure**

Run:

```bash
pnpm --filter openclaw-admin test -- src/pages/ai/Models.test.tsx
```

Expected: FAIL because catalog columns and fixed badge rendering do not exist.

- [ ] **Step 3: Implement Models list rendering**

In `Models.tsx`:

1. Import `Badge` and `Model`:
   ```ts
   import { Badge } from '../../components/ui/badge';
   import { CreateModelDto, Model, UpdateModelDto } from '../../services/aiModelsApi';
   ```
2. Replace `handleEdit(model: any)` with:
   ```ts
   const handleEdit = (model: Model) => {
     setEditData(model);
     setDialogOpen(true);
   };
   ```
3. Use immutable update in `toggleRow`:
   ```ts
   setExpandedRows((current) => {
     const next = new Set(current);
     if (next.has(id)) next.delete(id);
     else next.add(id);
     return next;
   });
   ```
4. Replace raw empty row with:
   ```tsx
   <TableRow>
     <TableCell colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
       {t('ai.models.noModels')}
     </TableCell>
   </TableRow>
   ```
5. Replace raw model type span with `<Badge variant="info">`.
6. Add columns for `displayName`, `costMultiplier`, `requiredPlanLevel`, and `isCatalogVisible`.
7. Replace expanded row raw `<td>` with `<TableCell colSpan={10}>`.
8. Replace capability raw spans with `<Badge variant="secondary">`.
9. Replace dynamic i18n casts with maps:
   ```ts
   const MODEL_TYPE_LABEL_KEYS = { chat: 'ai.models.typeChat', vision: 'ai.models.typeVision', embedding: 'ai.models.typeEmbedding', text: 'ai.models.typeText' } as const;
   const CAPABILITY_LABEL_KEYS = { chat: 'ai.models.capChat', vision: 'ai.models.capVision', function_calling: 'ai.models.capFunctionCalling', json_mode: 'ai.models.capJsonMode', streaming: 'ai.models.capStreaming' } as const;
   ```
10. Remove `onSubmit={... as any}` by using a typed wrapper:
   ```tsx
   onSubmit={(data) => {
     if (editData?.id) handleUpdate(data as UpdateModelDto);
     else handleCreate(data as CreateModelDto);
   }}
   ```

- [ ] **Step 4: Run Models page tests**

Run:

```bash
pnpm --filter openclaw-admin test -- src/pages/ai/Models.test.tsx
```

Expected: PASS.

---

## Task 7: Providers and API key shadcn remediation

**Files:**
- Modify: `packages/admin/src/pages/ai/Providers.tsx`
- Modify: `packages/admin/src/components/ai/AddProviderDialog.tsx`
- Modify: `packages/admin/src/components/ai/ApiKeyDialog.tsx`

- [ ] **Step 1: Update Providers list primitives**

In `Providers.tsx`:

1. Import `Badge` and `Provider`:
   ```ts
   import { Badge } from '../../components/ui/badge';
   import { CreateProviderDto, Provider, UpdateProviderDto } from '../../services/aiModelsApi';
   ```
2. Replace `handleEdit(provider: any)` with `handleEdit(provider: Provider)`.
3. Replace empty raw row with `TableRow`/`TableCell`.
4. Replace status raw span with:
   ```tsx
   <Badge variant={provider.status === 'active' ? 'success' : 'secondary'}>
     {provider.status === 'active' ? t('ai.providers.active') : t('ai.providers.inactive')}
   </Badge>
   ```
5. Remove `onSubmit={... as any}` with a typed submit wrapper like the Models page.

- [ ] **Step 2: Replace raw API key textareas**

In `AddProviderDialog.tsx` and `ApiKeyDialog.tsx`:

1. Import:
   ```ts
   import { Textarea } from '../ui/textarea';
   ```
2. Replace each `<textarea>` for API key entry with:
   ```tsx
   <Textarea
     id="apiKey"
     value={apiKey}
     onChange={(event) => setApiKey(event.target.value)}
     required
     placeholder={t('ai.apiKeys.apiKeyPlaceholder')}
     className="font-mono"
   />
   ```
   In `ApiKeyDialog`, use `form.apiKey` and immutable `setForm`.

- [ ] **Step 3: Run admin tests and build**

Run:

```bash
pnpm --filter openclaw-admin test -- src/components/ai/ModelDialog.test.tsx src/pages/ai/Models.test.tsx src/i18n/admin-key-parity.test.ts
pnpm --filter openclaw-admin build
```

Expected: PASS. If i18n parity fails, add the missing key to the opposite locale with the matching path.

---

## Task 8: Backend integration validation for Client catalog path

**Files:**
- Modify: `packages/server/src/ai-models/ai-models.service.spec.ts`
- Modify: `packages/server/src/quota/model-catalog.controller.spec.ts` if needed for inactive filtering regression coverage

- [ ] **Step 1: Add regression test for inactive catalog filtering if not already covered**

In `packages/server/src/quota/model-catalog.controller.spec.ts` or the existing quota service spec, ensure there is coverage equivalent to:

```ts
it('does not return inactive catalog models to client catalog callers', async () => {
  db.query.mockResolvedValue([]);

  await quotaService.getModelCatalogForTeam('team-1');

  expect(db.query).toHaveBeenCalledWith(
    expect.stringContaining('WHERE is_active = true'),
  );
});
```

- [ ] **Step 2: Run targeted server tests**

Run:

```bash
pnpm --filter @ice-cola/server test -- ai-models.service.spec.ts ai-models.controller.spec.ts model-catalog.controller.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Run server build**

Run:

```bash
pnpm --filter @ice-cola/server build
```

Expected: PASS.

---

## Task 9: End-to-end validation and report

**Files:**
- Create: `reports/Admin_AI_Client_Chat_Integration_E2E_TEST_REPORT_20260522.md`

- [ ] **Step 1: Start local services**

Run only if services are not already running:

```bash
pm2 start ecosystem.config.cjs --update-env
```

Confirm Admin and Client are reachable:

- Admin: `http://localhost:1992`
- Client: `http://localhost:1420`
- Server API: `http://localhost:3000`

- [ ] **Step 2: Execute Playwright MCP E2E**

Using Playwright MCP, verify:

1. Admin AI model dialog opens from the Models page.
2. Admin can create or update a model with catalog fields: display name, rank, cost multiplier, required plan level, visibility.
3. Client 问道 model selector reads the synchronized catalog entry from `/teams/:teamId/models/catalog`.
4. Selecting the model sends the selected `model_catalog.id` through the existing Chat flow.
5. Disabling/deleting the model in Admin makes it disappear from the Client catalog or become unavailable according to current catalog semantics.

Do not read `.env` files or invent credentials. If authentication blocks E2E, document it as a blocker in the report and include the exact page/step where it blocks.

- [ ] **Step 3: Write E2E report**

Create `reports/Admin_AI_Client_Chat_Integration_E2E_TEST_REPORT_20260522.md` with:

```md
# Admin AI Client Chat Integration E2E Test Report

## Test Time
2026-05-22 local time

## Feature
Admin AI model configuration synchronizes to Client 问道 model catalog and execution path.

## Environment
- Admin: http://localhost:1992
- Client: http://localhost:1420
- Server: http://localhost:3000

## Steps
1. Open Admin AI Models page.
2. Create or update model with catalog fields.
3. Open Client 问道 page.
4. Open model selector.
5. Select synchronized model.
6. Send a message.
7. Disable/delete model in Admin.
8. Refresh Client catalog.

## Result
PASS or BLOCKED.

## Evidence
- Browser snapshots or screenshots collected during Playwright MCP run.

## Issues
- List each issue with priority and status.
```

- [ ] **Step 4: Run final checks**

Run:

```bash
pnpm --filter @ice-cola/server test -- ai-models.service.spec.ts ai-models.controller.spec.ts model-catalog.controller.spec.ts
pnpm --filter @ice-cola/server build
pnpm --filter openclaw-admin test -- src/components/ai/ModelDialog.test.tsx src/pages/ai/Models.test.tsx src/i18n/admin-key-parity.test.ts
pnpm --filter openclaw-admin build
```

Expected: all PASS, or any blocker must be recorded in the E2E report and final handoff.

---

## Self-Review Checklist

- Spec coverage:
  - Admin model create/update/delete synchronizes `model_catalog`: Tasks 1-2.
  - Client keeps using `/teams/:teamId/models/catalog`: Tasks 2 and 8.
  - Gateway can resolve `model_catalog.model_name -> ai_models.model_id`: Task 1 executable lookup test and Task 2 active status alignment.
  - Admin AI route usability: Task 3.
  - Admin shadcn UI remediation: Tasks 5-7.
  - Tests and E2E report: Tasks 1, 3, 5, 6, 8, 9.
- No implementation commits are included because the user requested direct working-tree changes and no automatic commits.
- The plan avoids creating new external dependencies and keeps Client free of `/admin/ai/*` calls.
