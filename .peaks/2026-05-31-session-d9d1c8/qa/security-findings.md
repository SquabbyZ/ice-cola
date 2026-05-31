# Security Findings: chat-lingqi-model-unavailable

**Session:** 2026-05-31-session-d9d1c8  
**Request ID:** chat-lingqi-model-unavailable  
**Type:** bugfix  
**Date:** 2026-05-31  
**Reviewer:** peaks-qa

## Scope

审查 LINGQI_MODEL_UNAVAILABLE 错误处理修复的安全影响。

## Changed Files

1. `packages/server/src/gateway/gateway.service.ts`
2. `packages/server/src/ai-models/ai-models.service.ts`
3. `packages/server/src/gateway/gateway.service.spec.ts`

## Findings

### Security Checks

### 1. Information Disclosure

**Status:** ✅ PASS

**Findings:**
- 错误消息不泄露敏感信息（API 密钥、数据库结构、内部路径）
- 错误消息仅包含用户需要知道的信息（模型 ID、配置状态）
- 日志记录适当，不包含敏感数据

**Evidence:**
- 错误消息示例：`模型 xxx 配置缺失或未激活，请联系管理员`
- 日志示例：`[resolveProviderModelForLingqiCharge] No active model found for model_id: xxx`
- 未发现 API 密钥、token 或其他敏感信息泄露

### 2. Input Validation

**Status:** ✅ PASS

**Findings:**
- `executionModelName` 在使用前进行空值检查
- 数据库查询使用参数化查询（现有代码，未修改）
- 错误消息中的模型 ID 来自可信源

**Evidence:**
```typescript
if (!lingqiCharge.executionModelName) {
  this.logger.warn('[resolveProviderModelForLingqiCharge] executionModelName is empty or undefined');
  return null;
}
```

### 3. Authentication & Authorization

**Status:** ✅ PASS

**Findings:**
- 不修改认证逻辑
- 不修改授权检查
- 不绕过现有安全控制

**Evidence:**
- 代码审查确认无认证/授权相关变更

### 4. Error Handling

**Status:** ✅ PASS

**Findings:**
- 错误处理安全（不泄露堆栈跟踪）
- 种子数据失败时重新抛出错误（fail-fast）
- 错误消息不泄露内部实现细节

**Evidence:**
- 所有错误消息都是用户友好的中文提示
- 无堆栈跟踪泄露到前端

### 5. Logging Security

**Status:** ✅ PASS

**Findings:**
- 日志不记录敏感信息（API 密钥、用户消息内容）
- 日志级别适当（warn 用于错误场景）
- 日志包含足够的调试信息但不过度

**Evidence:**
```typescript
this.logger.log(`[resolveProviderModelForLingqiCharge] Resolving provider model for: ${lingqiCharge.executionModelName}`);
this.logger.warn(`[sendHermesMessage] No active API key for provider ${providerModel.provider_name}`);
```

### 6. Denial of Service

**Status:** ✅ PASS

**Findings:**
- 无新增循环或递归
- 无新增外部 API 调用
- 日志记录频率合理

**Evidence:**
- 代码审查确认无 DoS 风险

### 7. Dependency Security

**Status:** ✅ PASS

**Findings:**
- 无新增依赖
- 无依赖版本变更

**Evidence:**
- `package.json` 未修改

## Summary

- **Total checks:** 7
- **Pass:** 7
- **Fail:** 0
- **Warnings:** 0

## Verdict

**PASS** - 无安全问题发现。所有安全检查通过。

## Recommendations

无强制性建议。可选的未来增强：
1. 考虑对错误消息添加速率限制，防止错误消息洪水攻击
2. 考虑将模型配置错误记录到审计日志
