# 灵气兑换码 Admin 管理与模型扣费闭环设计

## 背景

当前项目已经具备部分灵气兑换、模型目录、账本和对话扣费能力，但职责边界需要收敛：平台级模型供应商、API Key、模型管理和兑换码生成应在 Admin 平台；Client 只负责用户侧兑换、选择可用模型、对话和查看团队账务。

本设计采用方案 A：复用现有 `redemption_codes`、`redemption_redemptions`、`lingqi_accounts`、`lingqi_ledger_entries`、`team_subscriptions`、`ai_providers`、`ai_models`、`ai_api_keys` 等体系，在现有基础上补齐 Admin 管理、端到端兑换和模型扣费追踪。

真实模型 API Key 只用于本地临时验证，不写入仓库、文档、报告或测试快照。

## 目标

- Admin 可配置 MiniMax Anthropic 兼容 provider、保存加密 API Key、自动拉取模型并设置默认可用模型。
- Admin 可生成一次性兑换码，支持“仅灵气”和“套餐 + 灵气”。
- Client 可使用 Admin 生成的兑换码充值团队灵气。
- 同一个兑换码只能兑换一次，兑换后失效。
- Client 对话使用 Admin 配置的模型，不在 Client 管理平台 API Key。
- 对话成功后扣费并写入消费流水；失败场景不误扣费。
- Admin 和 Client 都可追踪充值、消费和问题排查所需账务记录。
- 完成 Playwright/浏览器端到端验证，并按项目要求生成 `reports/` 测试报告。

## 非目标

- 不重建独立卡密系统。
- 不把模型供应商密钥管理迁到 Client。
- 不在代码或文档中保存明文外部 API Key。
- 不实现复杂营销活动码、无限复用码或跨项目通用优惠券系统。

## 职责边界

### Admin 平台

Admin 负责平台配置和管理：

- 模型供应商管理：provider base URL、协议类型、状态。
- API Key 管理：创建、更新、启用/禁用、加密保存、必要时解密查看。
- 模型管理：自动拉取模型、手动兜底添加模型、配置默认模型、启用状态和灵气计费参数。
- 兑换码管理：创建、列表、详情、禁用、查看核销状态。
- 账务追踪：查看兑换充值流水、模型消费流水、某次对话扣费详情。

### Client

Client 负责用户侧消费体验：

- 输入兑换码充值团队灵气。
- 查看团队余额、充值记录和消费记录。
- 获取后端发布的可用模型目录。
- 发起对话并展示余额不足、扣费成功、模型失败未扣费等状态。
- 不展示或管理 provider/API Key。

### Server

Server 负责可信状态和事务一致性：

- 生成高熵兑换码、哈希存储、只返回明文一次。
- 在事务中核销兑换码、充值、激活套餐、写账本。
- 加密保存 provider API Key，并代表 Client 调用模型 provider。
- 估算成本、执行模型调用、扣费、写消费流水。
- 记录审计字段和 metadata，支撑成本核算和消费问题追踪。

## 数据模型

### 复用表

优先复用现有表：

- `redemption_codes`
- `redemption_redemptions`
- `lingqi_accounts`
- `lingqi_ledger_entries`
- `team_subscriptions`
- `ai_providers`
- `ai_models`
- `ai_api_keys`
- 默认模型/模型配置相关现有表

### `redemption_codes`

用于 Admin 发码。若字段缺失，通过迁移补齐：

- `id`
- `code_hash`
- `code_preview`
- `lingqi_amount`
- `plan_id`
- `max_uses`，本需求固定为 `1`
- `used_count`
- `expires_at`
- `is_active`
- `created_by_user_id`
- `note`
- `created_at`
- `updated_at`

明文兑换码只在创建接口响应中返回一次。后续列表和详情只展示 `code_preview`。

### `redemption_redemptions`

用于核销记录：

- `code_id`
- `team_id`
- `user_id`
- `redeemed_at`

同一个兑换码只能有一次成功核销。

### `lingqi_ledger_entries`

用于团队灵气账本：

- 兑换充值：`direction = grant`，`transaction_type = redemption_code`。
- 模型消费：`direction = consume`，`transaction_type = chat_message`。

消费流水的 `metadata` 应包含：

- `conversationId`
- `messageId`
- `modelId`
- `providerId`
- `apiKeyId` 或 endpoint 标识
- `estimatedCost`
- `actualCost`
- `inputTokens`
- `outputTokens`
- `requestStatus`
- `failureReason`

若 `metadata` 已是 jsonb，优先放入 metadata，减少迁移范围。

## API 设计

### Admin 兑换码接口

新增 Admin 专用接口，建议挂在 `/admin/redemption-codes`。

#### `POST /admin/redemption-codes`

创建兑换码。

Body：

```json
{
  "type": "lingqi_only | plan_with_lingqi",
  "lingqiAmount": 1000,
  "planId": "optional-plan-id",
  "expiresAt": "2026-06-01T00:00:00.000Z",
  "note": "发放说明"
}
```

行为：

- 仅 Admin/Owner 可调用。
- 生成高熵随机 code。
- 保存 hash 和 preview。
- `max_uses = 1`。
- 创建成功返回明文 code 一次。

#### `GET /admin/redemption-codes`

列表查询，支持状态筛选：

- `active`
- `redeemed`
- `expired`
- `disabled`

返回 code preview、类型、面额、套餐、状态、创建人、创建时间、兑换团队/用户/时间。

#### `GET /admin/redemption-codes/:id`

查看单个兑换码详情和核销状态，不返回明文 code。

#### `POST /admin/redemption-codes/:id/disable`

禁用未兑换兑换码。

### Admin 账务接口

#### `GET /admin/lingqi-ledger`

查询充值和消费流水，支持：

- `teamId`
- `userId`
- `direction`
- `transactionType`
- `dateRange`

返回流水基础信息和 metadata 摘要，便于追踪模型调用消费。

### Client 兑换接口

复用现有：

- `POST /teams/:teamId/quota/redeem`
- `GET /teams/:teamId/quota/status`
- `GET /teams/:teamId/quota/ledger`

Server 在 `redeem` 事务中完成核销、充值、套餐激活和 grant 流水写入。

### 模型配置接口

复用现有 Admin AI model APIs：

- provider 创建/更新
- API Key 创建/更新
- fetch models
- default models
- model configs/pricing

Client 仅消费后端发布的可用模型目录，不调用 provider/API Key 管理接口。

## 端到端流程

### Admin 生成兑换码，Client 充值

1. Admin 进入兑换码管理页。
2. 选择兑换类型：仅灵气，或套餐 + 灵气。
3. 填写灵气数量、套餐、过期时间和备注。
4. Server 生成兑换码，保存 hash 和 preview。
5. Admin 弹窗只展示明文 code 一次，并提供复制按钮。
6. Client 用户进入灵气页，输入兑换码。
7. Server 在事务内校验兑换码有效、未过期、未使用、未禁用。
8. Server 给团队增加灵气，必要时激活/更新套餐。
9. Server 写入核销记录和 grant 账本。
10. Client 刷新余额和账本，展示充值成功。

### Admin 配置 MiniMax provider 并拉取模型

1. Admin 创建 provider，base URL 为 MiniMax Anthropic 兼容地址。
2. Admin 保存 API Key。
3. Server 加密保存 API Key。
4. Admin 点击拉取模型。
5. Server 使用 provider URL + API Key 请求模型列表。
6. Server 写入或更新 `ai_models`。
7. Admin 配置默认模型和灵气计费参数。

安全约束：

- provider URL 必须是 HTTPS。
- 拒绝 localhost、private IP、file URL 等 SSRF 风险目标。
- API Key 不写日志、不写文档、不返回给 Client。

### Client 对话扣费

1. Client 拉取可用模型目录。
2. 用户选择模型或使用默认模型。
3. 发送前请求成本预估。
4. 余额不足时不调用模型，提示兑换。
5. 余额足够时由 Server/Gateway 调用模型 provider。
6. 模型成功后按实际用量或估算成本扣费。
7. Server 写入 consume 账本，metadata 关联 conversation/message/model/provider/cost/status。
8. Client 收到回复后刷新余额和账本。

失败规则：

- 模型认证失败、超时、5xx：不扣费。
- 余额不足：不调用模型、不扣费。
- 若未来做预扣，失败必须写冲正流水。
- 模型成功但账本写入失败时，整体视为失败，避免无账可查。

## UI 设计

### Admin：兑换码管理页

新增入口可放在 Admin 侧边栏的 AI/运营相关区域。

页面包含：

- 兑换码列表
- 状态筛选
- 创建按钮
- 详情查看
- 禁用按钮

创建弹窗字段：

- 类型：仅灵气 / 套餐 + 灵气
- 灵气数量
- 套餐选择，仅套餐类型显示
- 过期时间
- 备注

创建成功弹窗：

- 展示明文兑换码一次
- 复制按钮
- 提示“关闭后无法再次查看明文”

### Admin：账务追踪

可先做轻量入口：

- 充值/消费流水表
- 按团队、类型、时间筛选
- 展开行展示 metadata 摘要

### Client：灵气页

复用现有兑换输入和账本展示，补齐状态文案：

- 兑换成功：展示到账数量并刷新余额。
- 重复兑换：提示兑换码已使用。
- 过期/禁用/无效：明确提示。

### Client：对话页

保留模型选择和成本预估：

- 余额不足时提示去灵气页兑换。
- 对话成功后展示余额变化或扣费成功提示。
- 模型失败时明确提示未扣费。

## 测试策略

### Unit/Integration

Server：

- Admin 创建仅灵气兑换码成功。
- Admin 创建套餐 + 灵气兑换码成功。
- 明文 code 只在创建响应中返回。
- 数据库只保存 hash 和 preview。
- 非 Admin 无法创建。
- 一次性兑换成功后 `used_count = 1`。
- 第二次兑换同一码失败。
- 过期码、禁用码失败。
- 兑换成功写入 grant ledger。
- 套餐码兑换成功写入或更新订阅。
- 余额不足不调用模型。
- 模型成功后写 consume ledger。
- 模型失败不扣费。
- token usage 存在时按实际用量；不存在时按估算。

Admin：

- 兑换码列表展示状态。
- 创建兑换码弹窗展示明文 code 一次。
- 禁用按钮只对未兑换、未过期、未禁用码可用。
- 模型 provider/API Key 配置入口仍在 Admin。

Client：

- 灵气页输入兑换码后刷新余额与账本。
- 余额不足时对话页阻止发送并提示兑换。
- 对话成功后刷新余额并展示消费记录。
- 模型 API 失败时不显示扣费成功。

### E2E

报告文件：

`reports/LINGQI_REDEMPTION_AND_MODEL_BILLING_E2E_TEST_REPORT_20260521.md`

场景：

1. Admin 登录。
2. 配置 MiniMax provider/API Key。
3. 自动拉取模型并设置默认模型。
4. Admin 创建仅灵气兑换码。
5. Admin 创建套餐 + 灵气兑换码。
6. Client 兑换 Admin 生成的兑换码。
7. Client 余额增加，账本出现充值记录。
8. Client 再次兑换同一码失败。
9. Client 发起对话并收到模型回复。
10. Client 余额减少，账本出现模型消费记录。
11. Admin 查看兑换码已兑换状态。
12. Admin 查看充值流水和消费流水，可追踪模型/provider/conversation/message/cost。

## 验收标准

- 模型/API Key 管理入口只在 Admin。
- Client 不承担平台模型密钥管理。
- Admin 可生成一次性兑换码。
- Client 可用 Admin 生成的兑换码充值。
- 同一个兑换码不能重复兑换。
- Client 对话能使用 Admin 配置的 MiniMax 模型。
- 对话成功后扣费并写消费流水。
- 失败场景不误扣费。
- Admin 和 Client 都能看到对应账务记录。
- E2E 测试报告写入 `reports/`。

## 风险与约束

- 明文兑换码和外部 API Key 都是敏感信息，不可落库明文，不可写日志或报告。
- 真实模型接口可能不支持标准模型列表接口，需要保留手动添加模型 fallback。
- 对话扣费必须和模型调用成功/失败状态绑定，否则无法解释消费争议。
- 现有数据库 seed 报过 provider/model 外键错误，实施前需要修复或规避，否则会影响模型目录验证。
