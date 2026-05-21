# 灵气、模型与古侠客户端设计

## 背景

Ice Cola 下一阶段需要把 client 的使用额度产品化：用户从 server 获取或兑换“灵气”，选择不同模型，并在聊天、工具调用、专家/技能、后台任务中按不同规则消耗灵气。第一版不接真实支付，使用兑换码完成可用闭环；客户端整体采用中国古侠融合风格。

## 目标

第一版交付一个可端到端使用的闭环：

1. client 能通过兑换码从 server 获得灵气。
2. server 能维护 team 维度的灵气余额、流水和套餐权益。
3. client 能查看当前灵气、套餐权益、模型目录和模型可用状态。
4. client 能选择可用模型，并在关键操作前看到预计消耗。
5. 聊天模型、工具调用、专家/技能、后台任务都有 server 统一计价和扣费规则。
6. client 关键页面具备中国古侠融合视觉风格。
7. E2E 覆盖兑换、选择模型、发送消息并消耗灵气的主路径。

## 非目标

第一版不做以下能力：

- 真实支付、自动续费或第三方支付回调。
- token 级精准计费。
- 复杂冻结、退款或多账户清算系统。
- 多币种或财务报表。
- 管理后台完整商业化运营面板。
- 全量主题系统重构。

## 产品概念

### 灵气

“灵气”是 client 面向用户展示的统一使用额度。后端仍可以复用现有 quota 能力作为基础，但新增代码和 UI 应使用“灵气”语义。灵气余额只能由 server 在数据库事务中变更，client 不拥有计价或扣费权。

### 修炼境界

修炼境界是 team 基于累计灵气消耗获得的成长等级，用于把“花掉的灵气”转化为长期身份感。境界只由 `total_consumed_amt` 推导，不因当前余额降低而回退。第一版只展示境界和下一境界进度，并在数据结构中预留特权配置；后续版本可把不同境界映射到模型权限、折扣、并发任务数、专家/技能解锁等特权。

第一版境界阶梯：

| 境界 | 最低累计消耗 |
|------|--------------|
| 凡人 | 0 |
| 练气境 | 100 |
| 筑基境 | 500 |
| 金丹境 | 2000 |
| 元婴境 | 8000 |
| 化神境 | 20000 |

### 兑换码

兑换码是第一版灵气获取入口。第一版由 server 数据库种子或脚本预置兑换码，包含：

- 兑换码字符串。
- 可获得灵气数量。
- 可选绑定套餐。
- 过期时间。
- 使用次数上限。
- 单个 team 是否只能使用一次。

### 套餐权益

套餐权益表示 team 当前拥有的订阅能力。第一版不处理真实周期扣费，只维护权益状态：

- 套餐名称。
- 有效期。
- 每月或本期附赠灵气。
- 模型访问等级。
- 消耗折扣倍率。

套餐命名可使用古侠风格，例如“散修”“外门弟子”“内门弟子”“亲传”“长老供奉”。

### 模型 / 功法

模型在 client 中以“功法”意象展示，但实际字段仍应保持工程语义清晰，例如 `modelId`、`modelName`、`provider`、`rank`、`costMultiplier`、`requiredPlanLevel`。模型目录由 server 返回，client 只展示可见模型和不可用原因。

### 事务类型

第一版覆盖四类灵气消费事务：

1. `chat_message`：聊天模型调用。
2. `tool_call`：工具调用。
3. `expert_skill`：专家或技能调用。
4. `background_task`：后台任务。

## 后端设计

### 领域边界

后端以“灵气账户 + 灵气流水 + 计价规则”为核心。第一版在现有 quota 模块内扩展 REST controller，并新增内部 service 聚合计价逻辑；所有消费入口都必须经过同一个 server-side 计价与扣费服务。

### 数据模型

第一版新增以下表。表名按本文列出的 snake_case 命名落地，避免实现计划阶段重新分歧。

#### lingqi_accounts

按 team 维度维护当前余额和累计值。境界不需要冗余存储，由 `total_consumed_amt` 和 `cultivation_realms` 推导。

- `team_id`
- `balance_amt`
- `total_granted_amt`
- `total_consumed_amt`
- `created_at`
- `updated_at`

#### cultivation_realms

记录境界阶梯和后续特权预留。

- `id`
- `name`
- `display_name`
- `min_total_consumed_amt`
- `sort_order`
- `privileges`
- `is_active`

第一版种子数据：凡人 `0`、练气境 `100`、筑基境 `500`、金丹境 `2000`、元婴境 `8000`、化神境 `20000`。

#### lingqi_ledger_entries

记录不可变流水。

- `id`
- `team_id`
- `user_id`
- `direction`：`grant` 或 `consume`
- `amount`
- `transaction_type`
- `source_type`：兑换码、套餐、聊天、工具、专家、后台任务、管理员调整等。
- `source_id`
- `description`
- `metadata`
- `created_at`

#### redemption_codes

记录兑换码定义。

- `id`
- `code_hash`
- `display_label`
- `lingqi_amount`
- `plan_id`
- `max_uses`
- `used_count`
- `expires_at`
- `is_active`
- `created_at`
- `updated_at`

兑换码明文不应作为主要查询值长期暴露。第一版可以通过 hash lookup 存储和匹配，避免数据库直接泄露可用兑换码。

#### redemption_redemptions

记录兑换使用情况。

- `id`
- `code_id`
- `team_id`
- `user_id`
- `redeemed_at`

#### subscription_plans

记录套餐定义。

- `id`
- `name`
- `display_name`
- `level`
- `period_lingqi_amt`
- `cost_discount_rate`
- `model_rank_limit`
- `is_active`

#### team_subscriptions

记录 team 当前套餐权益。

- `id`
- `team_id`
- `plan_id`
- `starts_at`
- `expires_at`
- `status`
- `source_type`
- `source_id`

#### model_catalog

第一版新增轻量模型目录表，并通过现有 ai-models/provider 能力执行真实调用。

- `id`
- `provider_id`
- `model_name`
- `display_name`
- `description`
- `rank`
- `cost_multiplier`
- `required_plan_level`
- `is_active`

### 计价规则

server 统一提供估算和实际扣费。client 传入上下文，server 计算金额。

#### 聊天模型

第一版采用按消息计费，默认 `base_chat_cost = 10`：

```text
cost = ceil(10 * model.cost_multiplier * subscription.discount_rate)
```

token-based 计费不属于第一版实现范围。

#### 工具调用

工具调用按工具类别计费，第一版三档为轻量 `5`、中等 `15`、重型 `30`：

```text
cost = ceil(tool_rule.base_cost * subscription.discount_rate)
```

#### 专家/技能

专家/技能消耗由技能基础成本、模型倍率和套餐折扣组成，默认 `skill.base_cost = 20`：

```text
cost = ceil(skill.base_cost * model.cost_multiplier * subscription.discount_rate)
```

如果技能内部调用工具，工具消耗单独写流水。

#### 后台任务

后台任务按任务阶段计费，第一版任务创建 `10`、执行阶段 `25`、产物生成 `15`：

```text
cost = ceil(task_phase.base_cost * subscription.discount_rate)
```

第一版不实现冻结余额。后台任务在创建时扣除任务创建成本，在执行阶段开始前扣除执行阶段成本，在产物生成前扣除产物生成成本。

### 兑换流程

1. client 调用兑换接口提交兑换码。
2. server 对兑换码做 hash lookup。
3. server 校验兑换码存在、启用、未过期、未超过使用次数。
4. server 校验当前 team 是否已使用过该兑换码。
5. server 在数据库事务中：
   - 锁定兑换码记录。
   - 创建兑换记录。
   - 增加灵气账户余额。
   - 如绑定套餐，则激活或延长 team 套餐。
   - 写入灵气 grant 流水。
   - 更新兑换码使用次数。
6. server 返回最新灵气状态、套餐状态和提示文案。

### 消费流程

1. 业务模块请求消费服务估算或扣费。
2. 消费服务读取 team 套餐、模型、事务规则。
3. 消费服务计算实际消耗。
4. 消费服务在事务中锁定灵气账户。
5. 如果余额不足，抛出业务错误并阻止业务继续执行。
6. 如果余额充足，扣减余额、增加累计消耗、写入 consume 流水。
7. 业务模块继续执行或返回成功。

第一版统一采用执行前扣费。聊天、工具、专家/技能和后台任务在开始外部调用或耗时执行前完成扣费；如果扣费失败，业务不执行。

### API

第一版 API 挂在现有 server REST 层，使用当前认证和 team 权限机制。路径按以下名称落地。

#### `GET /quota/status`

返回当前 team 的灵气状态：

- `balance`
- `totalGranted`
- `totalConsumed`
- `cultivationRealm`
- `nextCultivationRealm`
- `realmProgress`
- `subscription`
- `warningThreshold`

#### `POST /quota/redeem`

请求：

- `code`

响应：

- 最新灵气状态。
- 套餐状态。
- 本次获得灵气。
- 成功文案。

#### `GET /models/catalog`

返回当前 team 可见模型：

- 模型 id。
- 展示名。
- 品阶。
- 消耗倍率。
- 是否可用。
- 不可用原因。

#### `POST /models/select`

请求：

- `modelId`
- `conversationId`：可选；存在时设置 conversation 当前模型，不存在时设置 team 默认模型。

响应：

- 已选模型。
- 当前可用状态。

#### `POST /billing/estimate`

请求：

- `transactionType`
- `modelId`
- `context`：按事务类型包含 `toolId`、`skillId`、`taskType` 或 `conversationId`。

响应：

- `estimatedCost`
- `balanceAfterEstimate`
- `canAfford`
- `reason`

## Client 设计

### 全局灵气状态

client 在主界面可见位置展示：

- 当前灵气余额。
- 当前套餐身份。
- 当前修炼境界。
- 下一境界进度。
- 余额预警状态。
- 进入“灵气阁”的入口。

第一版把该组件放在 client shell/sidebar 顶部，确保 Dashboard、Chat、Skills、Profile 等页面都能看到同一份余额状态。

### 灵气阁

灵气阁用于兑换码、套餐权益和流水展示。

核心功能：

- 输入兑换码。
- 兑换成功后展示获得灵气和套餐变化。
- 展示当前套餐权益。
- 展示当前修炼境界、累计消耗和下一境界进度。
- 展示最近灵气流水。
- 展示余额不足时的引导文案。

错误文案采用古侠风格但保持清晰：

- 无效兑换码：`灵符无效，请核对后重试。`
- 已过期：`此灵符灵效已散。`
- 已用尽：`此灵符已被使用。`
- 网络或服务失败：`灵气阁暂不可用，请稍后再试。`

### 模型选择

第一版在 Chat 页输入区上方提供模型下拉，并在灵气阁中提供“功法阁”只读模型目录。模型默认值优先使用当前 conversation 选择，其次使用 team 默认模型。

模型卡片展示：

- 展示名。
- 能力说明。
- 品阶。
- 消耗倍率。
- 可用状态。
- 不可用原因。

不可用模型置灰，不能被选择。

### 聊天发送路径

聊天输入区在发送前展示：

- 当前模型。
- 本次预计消耗灵气。
- 当前余额。

发送前如果余额不足，禁用发送并引导兑换。

发送成功后刷新灵气状态。若流式回复过程中出现消费或权限错误，消息区展示明确错误，而不是静默失败。

### 工具、专家和后台任务

第一版不为每个入口重做复杂 UI，但所有入口都必须显示统一的消费提示：

- “预计消耗 X 灵气”。
- “余额不足，需补充 Y 灵气”。
- “此能力需要更高套餐”。

## 古侠融合视觉系统

### 视觉关键词

整体方向是“水墨江湖 + 仙侠灵境 + 门派宝阁 + 悬赏令”。界面仍是生产力工具，不做重度游戏化。

### 颜色

第一版设计 token：

- 墨黑：主要文字和深色背景。
- 宣纸米白：主内容背景。
- 青玉：可交互主色。
- 朱砂：强调、危险或不足状态。
- 鎏金：套餐、稀有模型、成功获得。
- 雾青灰：分隔、弱化信息。

### 形态

- 主内容容器使用卷轴、宣纸、玉牌的轻量隐喻。
- 灵气余额使用“丹田 / 灵海”意象。
- 修炼境界使用“境界铭牌 + 进度灵脉”意象。
- 模型使用“功法品阶”意象。
- 工具调用使用“符箓 / 令牌”意象。
- 后台任务使用“悬赏榜”意象。

### 动效

- Streaming 状态采用墨迹落笔效果。
- Hover / focus 使用轻微浮起、玉光或墨线显现。
- 动画只使用 `transform`、`opacity`、`filter` 等 compositor-friendly 属性。

### 可访问性

- 古风纹理不得影响正文可读性。
- 所有关键按钮保持明确文字标签。
- 颜色不能作为唯一状态表达。
- focus 状态必须可见。

## 错误处理

server 错误码覆盖：

- `LINGQI_REDEMPTION_CODE_INVALID`
- `LINGQI_REDEMPTION_CODE_EXPIRED`
- `LINGQI_REDEMPTION_CODE_EXHAUSTED`
- `LINGQI_REDEMPTION_CODE_ALREADY_USED`
- `LINGQI_INSUFFICIENT_BALANCE`
- `MODEL_NOT_AVAILABLE`
- `SUBSCRIPTION_REQUIRED`
- `LINGQI_TRANSACTION_FAILED`

client 根据错误码展示本地化文案。server 不返回堆栈或敏感内部细节。

## 安全要求

- 兑换码明文不写入日志。
- 兑换码使用 hash lookup，避免数据库直接暴露可兑换明文。
- 所有兑换和扣费必须校验当前用户对 team 的权限。
- client 传入的消耗数量不可信，server 必须自行计价。
- 所有余额变更必须在事务中完成。
- 所有数据库查询使用参数化查询。
- 不在源码、示例配置或文档中加入真实密钥。

## 测试计划

### 后端单元/集成测试

覆盖：

1. 成功兑换兑换码并增加灵气。
2. 无效兑换码失败。
3. 过期兑换码失败。
4. 用尽兑换码失败。
5. 同一 team 重复兑换受限兑换码失败。
6. 兑换码绑定套餐时激活套餐。
7. 模型目录根据套餐返回可用和不可用状态。
8. 聊天模型计价正确。
9. 工具调用计价正确。
10. 专家/技能计价正确。
11. 后台任务计价正确。
12. 灵气不足时拒绝消费。
13. 扣费后余额和流水一致。

### Client 单元测试

覆盖：

1. 灵气状态组件展示余额和预警。
2. 兑换码表单成功和失败状态。
3. 模型卡片展示倍率、品阶和不可用原因。
4. 聊天发送区根据估算结果展示预计消耗。
5. 灵气不足时禁用发送。
6. 境界进度根据累计消耗正确显示当前境界和下一境界。

### E2E 测试

必须生成 `reports/` 下的测试报告。主路径：

1. 登录 client。
2. 打开灵气阁。
3. 输入测试兑换码获得灵气。
4. 查看余额、套餐状态和修炼境界进度更新。
5. 进入聊天页选择可用模型。
6. 发送消息。
7. 验证回复出现并且灵气减少。
8. 尝试选择不可用模型或余额不足路径，验证正确提示。

## 验收标准

- 本地 server 和 client 可启动。
- 测试兑换码能完成兑换。
- 灵气余额能在 client 展示并刷新。
- 修炼境界能按累计消耗展示当前境界和下一境界进度。
- 至少一个模型可选择并用于聊天。
- 至少一种不可用模型状态能正确展示原因。
- 聊天发送后能产生灵气消耗流水。
- 工具调用、专家/技能、后台任务具有 server-side 计价入口，即使第一版 UI 只覆盖最小提示。
- E2E 报告已生成到 `reports/`。
- 无 hardcoded secrets 或真实凭据。
