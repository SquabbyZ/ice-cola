# Admin AI 与 Client 问道打通设计

## 背景

Admin 的 AI 配置目前维护 `/admin/ai/*` 下的 provider、model、API key 和 default model 配置；client 问道页模型选择读取 `/teams/:teamId/models/catalog`。两边没有显式共享数据源，导致 admin 页面配置的模型不稳定地影响 client 问道。

当前 client 问道链路是：client 选择 `model_catalog.id`，server `QuotaService` 将其解析成 `model_catalog.model_name`，Gateway 再用该值匹配 `ai_models.model_id` 找 provider 执行配置。这个桥接依赖字符串相等，但 admin UI 不维护 `model_catalog`，所以配置无法可靠打通。

## 目标

- Admin AI 模型配置成为模型配置入口。
- Client 问道继续通过 Lingqi 模型目录读取可用模型，保留现有团队权限、订阅等级、余额和估算逻辑。
- Admin 保存模型时同步生成或更新 client 可见的 `model_catalog` 投影。
- Admin AI 配置页完成高频 shadcn/ui 组件整改，移除 raw textarea/button/badge 和不必要的 `any`。

## 非目标

- 不让 client 直接调用 `/admin/ai/*`。
- 不重做 Lingqi 计费、兑换码、订阅体系。
- 不重构 Hermes Agent 协议。
- 不引入新的模型配置服务或外部依赖。

## 推荐架构

以 `ai_models` 作为 admin 可编辑的运行时模型配置源，`model_catalog` 作为 client 问道可见的 Lingqi 目录投影。

```text
Admin AI UI
  -> /admin/ai/models
  -> ai_models
  -> sync model_catalog
  -> /teams/:teamId/models/catalog
  -> Client Chat model selector
  -> QuotaService resolves model_catalog.model_name
  -> Gateway finds ai_models.model_id
  -> Hermes provider execution
```

## 数据模型约定

### `ai_models`

继续保存 provider 执行所需信息：

- `provider_id`
- `name`
- `model_id`
- `description`
- `capabilities`
- `pricing`
- `sort_order`
- `status` / enabled 状态
- 运行参数：`temperature`、`max_tokens`、`top_p` 等已有字段

### `model_catalog`

作为 client 可见投影：

- `provider_id` 对应 `ai_models.provider_id`
- `model_name` 对应 `ai_models.model_id`
- `display_name` 对应 admin 表单展示名
- `description` 对应 admin 模型描述
- `rank` 决定模型阶位
- `cost_multiplier` 决定 Lingqi 消耗倍率
- `required_plan_level` 决定订阅门槛
- `is_active` 对应模型是否对 client 可见

## 后端设计

### Admin model DTO

为 admin 模型创建/更新请求补齐 client 目录字段：

- `displayName?: string`
- `rank?: number`
- `costMultiplier?: number`
- `requiredPlanLevel?: number`
- `isCatalogVisible?: boolean`

默认值：

- `displayName` 默认使用 `name`
- `rank` 默认 `1`
- `costMultiplier` 默认 `1`
- `requiredPlanLevel` 默认 `0`
- `isCatalogVisible` 默认跟随模型 active/enabled 状态

### 同步策略

在 `AiModelsService.createModel` 成功写入 `ai_models` 后，同步 upsert `model_catalog`：

- 匹配键：优先用 `model_name = ai_models.model_id`
- 更新字段：`provider_id`、`display_name`、`description`、`rank`、`cost_multiplier`、`required_plan_level`、`is_active`
- 禁用模型时设置 `model_catalog.is_active = false`

更新模型时保持同样同步规则。如果 `model_id` 被修改，需要确保旧 `model_catalog.model_name` 不再误暴露；优先禁止修改已存在模型的 `model_id`，如果必须支持修改，则同步禁用旧目录项并 upsert 新目录项。

### 运行时路径

保留现有路径：

- Client catalog: `GET /teams/:teamId/models/catalog`
- Client select: `POST /teams/:teamId/models/select`
- Estimate: `POST /teams/:teamId/quota/estimate`
- Gateway execution: `model_catalog.model_name -> ai_models.model_id`

这样 client 不需要知道 admin 配置接口，权限边界保持清晰。

### 需要修复的一致性问题

- `AiModelsService.createModel` 插入和查询执行模型时要统一 active 字段语义，避免 create 写 `enabled` 而 runtime 查 `status = 'active'`。
- `capabilities` 与 `pricing` 的读写结构要统一，避免 create 写 JSON、update 写列字段导致 admin 回显和 runtime 不一致。
- Admin controller 当前多数 `/admin/ai/*` 路由调用 `requirePlatformAdmin()` 并直接抛 `ForbiddenException`；需要明确平台管理员能力。如果当前产品没有平台管理员身份，应改成团队 owner/admin 可管理团队 AI 配置，或实现真实平台管理员判断。

## Admin UI 设计

### Models 列表

整改 [Models.tsx](../../../packages/admin/src/pages/ai/Models.tsx)：

- 使用 `Badge` 展示模型类型、状态、capability。
- 使用 `TableRow` / `TableCell` 展示空状态，不再混用 raw `<tr>` / `<td>`。
- 去掉 `model: any` 和 `as any` i18n key 拼接。
- 增加 catalog 字段展示：阶位、消耗倍率、订阅等级、client 可见状态。

### ModelDialog

整改 [ModelDialog.tsx](../../../packages/admin/src/components/ai/ModelDialog.tsx)：

- raw `<textarea>` 改为 shadcn `Textarea`。
- capability chip raw `<button>` 改为 `Button` variant 组合。
- 新增 Lingqi/client catalog 字段：展示名、阶位、消耗倍率、订阅等级、client 可见。
- 使用明确 `ModelDialogInitialData` 类型替换 `initialData as any`。
- 使用固定 key 映射替代动态 i18n key 拼接。

### Providers / API Keys

对同目录高频 AI 配置组件做一致整改：

- raw textarea 改 `Textarea`。
- raw 状态 badge 改 `Badge`。
- raw action button 改 `Button`。
- 移除不必要 `any`。

## Client UI 设计

Client 不新增 admin 依赖，只验证现有问道页模型下拉读取同步后的 catalog。

需要覆盖：

- admin 新增 active 模型后，client catalog 返回该模型。
- admin 禁用模型后，client catalog 不再返回或返回 unavailable，取决于当前 catalog 语义；推荐不返回 inactive 模型。
- 选择模型后 Hermes/Gateway 能解析到 provider 配置。

## 错误处理

- Admin 保存模型时，如果 `model_catalog` 同步失败，整个保存应失败并回滚，避免 admin 显示已配置但 client 不可用。
- 如果 Gateway 找不到对应 `ai_models.model_id`，返回明确的模型配置错误，不要进入 provider 调用。
- Client 仍展示已有模型切换失败提示。

## 测试计划

### Server unit / integration

- 创建 admin model 会写入 `ai_models` 并 upsert `model_catalog`。
- 更新 admin model 会同步 `model_catalog` 展示名、描述、阶位、倍率、订阅等级和 active 状态。
- 禁用 admin model 后，`GET /teams/:teamId/models/catalog` 不再返回 active catalog。
- Gateway 根据 `model_catalog.model_name` 能找到 `ai_models.model_id`。
- 配置缺失时返回明确错误。

### Admin frontend tests

- `ModelDialog` 提交包含 catalog 字段的 payload。
- capability 选择使用 shadcn Button 行为并保持可访问。
- Models 列表正确渲染 Badge、catalog 字段和空状态。
- i18n key parity 保持通过。

### E2E

按项目要求使用 Playwright MCP，并在 `reports/` 生成报告：

- Admin 创建/更新模型。
- Client 问道模型下拉能看到该模型。
- 选择模型后发送消息，服务端使用对应 provider model。
- 禁用模型后 client 不再可选。

## 风险

- 现有数据库字段可能在不同迁移中存在 `enabled` 与 `status` 双轨，需要先用测试锁定当前 schema 行为。
- 如果产品未来需要团队级模型目录，而非全局目录，需要在 `model_catalog` 增加 team 维度或引入 team-model join 表；本设计先不做。
- Admin API 当前平台管理员判断未实现，权限模型需要和现有 admin auth 保持一致。

## 验收标准

- Admin AI 模型保存后，client 问道模型目录使用同一模型配置投影。
- Hermes/Gateway 发送时能通过 client 选择的模型解析到 admin 配置的 provider model。
- Admin AI 配置页高频控件使用项目 shadcn/ui primitives。
- 新增/修改行为有测试覆盖。
- 完成后 Playwright MCP E2E 通过或报告中记录已知阻塞。