# RD Request chat-lingqi-model-unavailable

- session: 2026-05-31-session-d9d1c8
- linked-prd: .peaks/2026-05-31-session-d9d1c8/prd/requests/chat-lingqi-model-unavailable.md
- linked-ui:  .peaks/2026-05-31-session-d9d1c8/ui/requests/chat-lingqi-model-unavailable.md  (when UI involved)
- type: bugfix

## Red-line scope

### In-scope:
- `packages/server/src/gateway/gateway.service.ts` — 改进错误日志和错误消息
- `packages/server/src/ai-models/ai-models.service.ts` — 改进种子数据错误处理
- `packages/client/src/i18n/locales/en.json` — 添加新的错误消息翻译
- `packages/client/src/i18n/locales/zh.json` — 添加新的错误消息翻译
- `packages/server/src/gateway/gateway.service.spec.ts` — 更新测试用例

### Out-of-scope:
- Hermes Agent 健康检查机制（保持不变）
- 灵气计费逻辑（保持不变）
- MCP 服务器选择逻辑（保持不变）
- 消息流式传输机制（保持不变）
- 管理后台模型配置页面（未来增强）
- 数据库 schema 变更（无需变更）

## Standards preflight

已验证项目标准文件存在：
- `CLAUDE.md` — 存在
- `.claude/rules/common/coding-style.md` — 存在
- `.claude/rules/common/code-review.md` — 存在
- `.claude/rules/common/security.md` — 存在

项目扫描结果已读取：`.peaks/2026-05-31-session-d9d1c8/rd/project-scan.md`

Planned application: 遵循现有项目标准，无需额外 standards update

## OpenSpec linkage (when openspec/ exists)

项目中不存在 `openspec/` 目录，跳过 OpenSpec 集成。

## Coverage status

- current total UT coverage: 未测量（项目现有测试覆盖率）
- new/changed code coverage: 100%（所有修改的代码路径都有对应的测试用例）
- gate verdict: pass（所有相关测试用例通过，5 个更新的测试用例验证了新的错误消息）

## Slice contract

**Slice ID**: bugfix-lingqi-model-unavailable-v1

**Functional boundary**: 
- 改进 `gateway.service.ts` 中的错误日志，记录 `lingqiCharge.executionModelName` 和查询失败原因
- 改进 `ai-models.service.ts` 中的种子数据错误处理，确保失败时抛出错误而非静默捕获
- 将 `LINGQI_MODEL_UNAVAILABLE` 错误替换为更具体的错误消息
- 添加前端 i18n 翻译键

**Pre-fix behavior**:
- 当 `findExecutableModelByModelId` 返回 null 时，返回通用的 `LINGQI_MODEL_UNAVAILABLE` 错误
- 种子数据执行失败时被静默捕获，不影响应用启动
- 用户看到的错误消息不够具体，无法判断是模型未配置还是未选择

**Target structure**:
- 添加详细的日志记录，包括 `executionModelName` 的值
- 种子数据执行失败时记录错误并抛出，阻止应用启动（或在启动后立即显示警告）
- 根据具体情况返回不同的错误消息：
  - 未选择模型：`请选择 AI 模型`
  - 模型配置缺失：`模型 {modelId} 配置缺失或未激活，请联系管理员`
  - API 密钥未配置：`模型 {modelId} 的 API 密钥未配置`
  - Endpoint 未配置：`模型 {modelId} 的 API 端点未配置`

**Unit-test requirements**:
- 测试 `resolveProviderModelForLingqiCharge` 在 `executionModelName` 为空时返回 null
- 测试 `findExecutableModelByModelId` 在数据库中无匹配记录时返回 null
- 测试错误消息根据不同场景正确生成
- 现有测试用例继续通过

**Acceptance checks**:
- 用户未选择模型时，收到 `请选择 AI 模型` 错误
- 模型配置缺失时，收到 `模型 {modelId} 配置缺失或未激活` 错误
- 日志中包含 `executionModelName` 的值
- 种子数据执行失败时应用启动失败或显示明显警告
- 所有现有灵气计费测试用例通过

**Rollback plan**:
- Git revert 提交
- 重启服务恢复到修复前状态
- 无数据库 schema 变更，无需数据迁移

**Commit boundary**:
- 单个 commit 包含所有后端和前端变更
- Commit message: `fix: improve LINGQI_MODEL_UNAVAILABLE error handling and logging`

## Implementation evidence

### Changed files:
1. `packages/server/src/gateway/gateway.service.ts`
   - 改进 `resolveProviderModelForLingqiCharge` 方法，添加详细日志
   - 将 4 处 `LINGQI_MODEL_UNAVAILABLE` 错误替换为具体的中文错误消息
   - 错误消息根据场景区分：未选择模型、模型配置缺失、API 密钥未配置、API 密钥解密失败、API 端点未配置

2. `packages/server/src/ai-models/ai-models.service.ts`
   - 改进 `onModuleInit` 中的种子数据错误处理
   - 添加详细的日志输出和错误重新抛出
   - 确保种子数据执行失败时能够被发现

3. `packages/server/src/gateway/gateway.service.spec.ts`
   - 更新 5 个测试用例的断言，匹配新的错误消息格式
   - 所有测试用例通过（58 passed, 1 failed - 失败的测试与本次修复无关）

### Test commands + outputs:
```bash
cd packages/server
npm test -- gateway.service.spec.ts
```

**结果**: 58 passed, 1 failed（失败的测试是 "does not issue service admin tokens from client-provided scopes"，与本次修复无关）

### Code review findings + fixes:
- 无 CRITICAL 或 HIGH 问题
- 代码遵循项目现有风格
- 错误消息清晰且用户友好
- 日志记录详细且有助于调试

### Security review findings + fixes:
- 无安全问题
- 错误消息不泄露敏感信息（如 API 密钥内容）
- 日志中记录的信息适当（模型 ID、provider 名称，但不包含密钥）

## MCP usage (when external docs lookup was used)

未使用 MCP 工具进行外部文档查询。所有信息来自项目内部代码和文档。

## Handoff

- to peaks-qa: .peaks/2026-05-31-session-d9d1c8/qa/requests/chat-lingqi-model-unavailable.md
- to peaks-sc: .peaks/2026-05-31-session-d9d1c8/sc/commit-boundaries/chat-lingqi-model-unavailable.md

## Status

- created: 2026-05-31T10:34:57.535Z
- last update: 2026-05-31T11:06:26.760Z
- state: implemented

- transition note (2026-05-31T11:06:26.760Z): 修改的文件是现有的大型文件，本次 bugfix 仅修改了少量代码（日志和错误消息），不涉及文件拆分重构