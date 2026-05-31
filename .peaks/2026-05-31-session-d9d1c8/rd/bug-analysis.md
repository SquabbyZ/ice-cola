# Bug Analysis: LINGQI_MODEL_UNAVAILABLE

**Session:** 2026-05-31-session-d9d1c8  
**Request ID:** chat-lingqi-model-unavailable  
**Type:** bugfix  
**Date:** 2026-05-31

## Problem Statement

用户在 client 页面发送对话消息时收到 `LINGQI_MODEL_UNAVAILABLE` 错误，导致消息发送失败。错误发生在后端 `gateway.service.ts` 的 `sendHermesMessage` 方法中。

## Root Cause Analysis

### Error Flow

1. 用户在 client 页面发送消息
2. 前端通过 WebSocket 发送 `hermes.send` 事件到后端
3. 后端 `gateway.service.ts` 的 `sendHermesMessage` 方法处理请求
4. 方法检查 Hermes Agent 健康状态
5. 如果 Hermes Agent 不健康，尝试降级到直接调用 provider API
6. 调用 `resolveProviderModelForLingqiCharge(lingqiCharge)` 解析 provider model
7. **关键问题**：`resolveProviderModelForLingqiCharge` 返回 `null`
8. 返回 `LINGQI_MODEL_UNAVAILABLE` 错误给前端

### Code Location

**文件**: `packages/server/src/gateway/gateway.service.ts`

**关键代码段** (行 1116-1125):
```typescript
const providerModel = await this.resolveProviderModelForLingqiCharge(lingqiCharge);

if (!providerModel) {
  const result = await this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, {
    ok: false,
    messageId,
    error: 'LINGQI_MODEL_UNAVAILABLE',
  });
  return result;
}
```

**resolveProviderModelForLingqiCharge 方法** (行 1612-1618):
```typescript
private async resolveProviderModelForLingqiCharge(lingqiCharge: LingqiChargeDecision): Promise<ProviderModelRow | null> {
  if (!lingqiCharge.executionModelName) {
    return null;
  }

  return this.aiModelsService.findExecutableModelByModelId(lingqiCharge.executionModelName);
}
```

**findExecutableModelByModelId 方法** (`packages/server/src/ai-models/ai-models.service.ts` 行 193-203):
```typescript
async findExecutableModelByModelId(modelId: string) {
  return this.db.queryOne(
    `SELECT m.*, p.name as provider_name, p.code as provider_code
     FROM ai_models m
     JOIN ai_providers p ON m.provider_id = p.id
     WHERE m.model_id = $1 AND m.status = 'active'
     ORDER BY p.sort_order ASC, m.sort_order ASC, m.name ASC
     LIMIT 1`,
    [modelId],
  );
}
```

### Root Cause Hypotheses

基于代码分析，`findExecutableModelByModelId` 返回 `null` 的可能原因：

1. **数据库中没有对应的 model 记录**
   - 种子数据未执行或执行失败
   - 数据库迁移未完成
   
2. **model_id 不匹配**
   - `lingqiCharge.executionModelName` 的值与数据库中的 `model_id` 不一致
   - 可能是大小写问题、格式问题或命名不一致
   
3. **model status 不是 'active'**
   - 模型记录存在但 status 字段不是 'active'
   - 可能是 'inactive', 'deprecated', 或其他状态
   
4. **provider 关联问题**
   - ai_providers 表中没有对应的 provider 记录
   - provider_id 外键关联失败

5. **lingqiCharge.executionModelName 为空或 undefined**
   - 上游逻辑未正确设置 executionModelName
   - 用户未选择模型或模型选择未正确传递

## Verification Steps

需要验证以下内容来确定具体原因：

1. **检查数据库中的 ai_models 和 ai_providers 表**
   ```sql
   SELECT COUNT(*) FROM ai_providers;
   SELECT COUNT(*) FROM ai_models WHERE status = 'active';
   SELECT model_id, name, status FROM ai_models LIMIT 10;
   ```

2. **检查 lingqiCharge.executionModelName 的实际值**
   - 添加日志输出 `lingqiCharge.executionModelName`
   - 检查前端发送的模型 ID 格式

3. **检查种子数据是否已执行**
   ```bash
   # 查看种子数据脚本
   ls packages/server/src/ai-models/seed/
   # 检查 package.json 中的种子数据命令
   grep "seed" packages/server/package.json
   ```

4. **检查数据库迁移状态**
   ```bash
   cd packages/server
   npx prisma migrate status
   ```

## Proposed Fix

### 方案 1: 确保种子数据已执行（最可能）

如果数据库中没有模型数据，需要执行种子数据脚本：

```bash
cd packages/server
pnpm db:seed:models  # 或类似命令
```

### 方案 2: 添加更详细的错误日志

在 `resolveProviderModelForLingqiCharge` 和 `findExecutableModelByModelId` 中添加日志：

```typescript
private async resolveProviderModelForLingqiCharge(lingqiCharge: LingqiChargeDecision): Promise<ProviderModelRow | null> {
  if (!lingqiCharge.executionModelName) {
    this.logger.warn('lingqiCharge.executionModelName is empty');
    return null;
  }

  this.logger.log(`Resolving provider model for: ${lingqiCharge.executionModelName}`);
  const result = await this.aiModelsService.findExecutableModelByModelId(lingqiCharge.executionModelName);
  
  if (!result) {
    this.logger.warn(`No active model found for model_id: ${lingqiCharge.executionModelName}`);
  }
  
  return result;
}
```

### 方案 3: 改进错误消息

将 `LINGQI_MODEL_UNAVAILABLE` 替换为更具体的错误消息：

```typescript
if (!providerModel) {
  const errorMessage = lingqiCharge.executionModelName 
    ? `模型 ${lingqiCharge.executionModelName} 配置缺失或未激活`
    : '未选择 AI 模型';
    
  this.sendStreamEvent('hermes.error', {
    messageId,
    error: errorMessage,
  }, senderWs);
  
  return this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, {
    ok: false,
    messageId,
    error: errorMessage,
  });
}
```

### 方案 4: 添加模型配置检查工具

在管理后台添加模型配置检查页面，显示：
- 已配置的 providers 数量
- 已配置的 active models 数量
- 缺失的 API keys
- 缺失的 endpoints

## Regression Test Plan

修复后需要验证：

1. **正常场景**：用户选择有效模型发送消息，消息成功发送
2. **Hermes Agent 不健康场景**：Hermes Agent 不可用时，系统降级到直接调用 provider API
3. **模型未配置场景**：返回清晰的错误消息，提示用户或管理员配置模型
4. **模型未选择场景**：返回清晰的错误消息，提示用户选择模型
5. **灵气计费**：所有场景下灵气预扣和退款机制正常工作

## Impact Assessment

- **影响范围**: 所有使用对话功能的用户
- **严重程度**: CRITICAL（核心功能完全不可用）
- **影响时长**: 自部署以来（如果是种子数据问题）
- **数据风险**: 无（灵气正确退款）

## Fix approach

基于根本原因分析，采用以下修复方案：

### 1. 改进错误日志（方案 2）

**目标**: 使问题可诊断

**实施**:
- 在 `resolveProviderModelForLingqiCharge` 方法中添加详细日志
- 记录 `executionModelName` 的值
- 记录查询失败的原因

**代码变更**:
```typescript
private async resolveProviderModelForLingqiCharge(lingqiCharge: LingqiChargeDecision): Promise<ProviderModelRow | null> {
  if (!lingqiCharge.executionModelName) {
    this.logger.warn('[resolveProviderModelForLingqiCharge] executionModelName is empty or undefined');
    return null;
  }

  this.logger.log(`[resolveProviderModelForLingqiCharge] Resolving provider model for: ${lingqiCharge.executionModelName}`);
  const result = await this.aiModelsService.findExecutableModelByModelId(lingqiCharge.executionModelName);

  if (!result) {
    this.logger.warn(`[resolveProviderModelForLingqiCharge] No active model found for model_id: ${lingqiCharge.executionModelName}`);
  }

  return result;
}
```

### 2. 改进错误消息（方案 3）

**目标**: 让用户理解问题并知道如何解决

**实施**:
- 将通用的 `LINGQI_MODEL_UNAVAILABLE` 替换为具体的错误消息
- 根据不同场景返回不同的错误消息：
  - 未选择模型：`请选择 AI 模型`
  - 模型配置缺失：`模型 {modelId} 配置缺失或未激活，请联系管理员`
  - API 密钥未配置：`模型 {modelId} 的 API 密钥未配置，请联系管理员`
  - API 密钥解密失败：`模型 {modelId} 的 API 密钥解密失败，请联系管理员`
  - API 端点未配置：`模型 {modelId} 的 API 端点未配置，请联系管理员`

**代码变更**: 更新 4 处错误返回点，使用具体的错误消息

### 3. 改进种子数据错误处理

**目标**: 确保种子数据执行失败时能够被发现

**实施**:
- 在 `ai-models.service.ts` 的 `onModuleInit` 中改进错误处理
- 添加详细的日志输出
- 重新抛出错误而非静默捕获

**代码变更**:
```typescript
async onModuleInit() {
  try {
    console.log('[AiModelsService] Starting AI models seed...');
    await seedAiModels(this.db, this.encryption);
    console.log('[AiModelsService] AI models seed completed successfully');
  } catch (error) {
    console.error('[AiModelsService] CRITICAL: Failed to seed AI models:', error);
    console.error('[AiModelsService] This may cause LINGQI_MODEL_UNAVAILABLE errors when users try to send messages');
    console.error('[AiModelsService] Please check database connection and migrations');
    throw error;
  }
}
```

### 4. 更新测试用例

**目标**: 确保新的错误消息被正确测试

**实施**:
- 更新 5 个测试用例的断言，匹配新的错误消息格式
- 保持测试覆盖率

**测试文件**: `packages/server/src/gateway/gateway.service.spec.ts`

### 实施顺序

1. 先实施日志改进（方案 2），便于调试
2. 再实施错误消息改进（方案 3），改善用户体验
3. 然后实施种子数据错误处理改进，确保问题可见
4. 最后更新测试用例，确保回归测试有效

### 不实施的方案

**方案 1（确保种子数据已执行）**: 这是运维操作，不是代码修复。种子数据应该在应用启动时自动执行（已有 `onModuleInit` 钩子）。

**方案 4（添加模型配置检查工具）**: 这是未来增强功能，不在本次 bugfix 范围内。可以作为后续 feature 请求。

## Next Steps

1. 连接到数据库，检查 ai_models 和 ai_providers 表的实际数据
2. 确认种子数据是否已执行
3. 根据验证结果选择修复方案
4. 实施修复
5. 编写单元测试覆盖所有场景
6. 执行回归测试
7. 更新前端错误消息翻译
