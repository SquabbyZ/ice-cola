# PRD Request chat-lingqi-model-unavailable

- session: 2026-05-31-session-d9d1c8
- type: bugfix
- source: verbal "页面返回❌ LINGQI_MODEL_UNAVAILABLE，本次请求未完成，未扣除灵气。"
- raw input (sanitized): 用户在 client 页面发送对话消息时，收到 LINGQI_MODEL_UNAVAILABLE 错误，导致消息发送失败且未扣除灵气。错误发生在 gateway.service.ts 的 sendHermesMessage 方法中，当 Hermes Agent 不健康且无法解析 provider model 时返回此错误。

## Goals

- 修复 LINGQI_MODEL_UNAVAILABLE 错误，确保用户可以正常发送对话消息
- 识别并解决导致 `resolveProviderModelForLingqiCharge` 返回 null 的根本原因
- 确保在 Hermes Agent 不可用时，系统能够正确降级到直接调用 provider API
- 提供清晰的用户错误提示，说明具体问题和解决方案

## Non-goals

- 不改变灵气计费逻辑（已正确退款）
- 不修改 Hermes Agent 本身的健康检查机制
- 不重构整个 gateway.service.ts 架构

## Preserved behavior

- 灵气预扣和退款机制保持不变
- Hermes Agent 健康检查逻辑保持不变
- MCP 服务器选择逻辑保持不变
- 消息流式传输机制保持不变

## Acceptance criteria

- 用户在 client 页面发送消息时，不再收到 LINGQI_MODEL_UNAVAILABLE 错误（正常场景）
- 当 Hermes Agent 不健康时，系统能够成功降级到直接调用 provider API
- 当 provider model 无法解析时，返回更具体的错误信息（如 "模型配置缺失" 或 "API 密钥未配置"）
- 错误消息在前端正确显示，用户能够理解问题并采取行动
- 所有现有的灵气计费测试用例继续通过
- 新增测试用例覆盖 provider model 解析失败的场景

## Frontend delta (only when target is frontend)

- pages / routes / components / states / permissions / data deps / edge cases
  - **Chat.tsx**: 可能需要更新错误处理逻辑，将 LINGQI_MODEL_UNAVAILABLE 映射到更友好的用户提示
  - **useHermesStreamEvents.tsx**: 可能需要处理新的错误类型
  - **i18n locales**: 需要添加新的错误消息翻译键
  
- 待联调态: 
  - 前端需要等待后端修复 `resolveProviderModelForLingqiCharge` 逻辑后进行联调
  - 需要验证错误消息在中英文环境下的显示效果
  
- API contracts pending: 
  - WebSocket 事件 `hermes.error` 的 error 字段可能会有新的错误码
  - 需要确认是否需要新增错误码或复用现有错误码

## Risks and open questions

- **风险1**: 修复可能涉及数据库查询逻辑，需要确保不影响性能
- **风险2**: 如果 provider model 配置确实缺失，需要管理员手动配置，用户无法自行解决
- **开放问题1**: 是否需要在管理后台添加 provider model 配置检查工具？
- **开放问题2**: 是否需要在系统启动时预检查 provider model 配置完整性？
- **开放问题3**: `findExecutableModelByModelId` 返回 null 的具体原因是什么？是数据库中没有记录，还是查询条件不匹配？

## Handoff

- to peaks-rd: .peaks/2026-05-31-session-d9d1c8/rd/requests/chat-lingqi-model-unavailable.md
- to peaks-qa: .peaks/2026-05-31-session-d9d1c8/qa/requests/chat-lingqi-model-unavailable.md
- to peaks-ui: .peaks/2026-05-31-session-d9d1c8/ui/requests/chat-lingqi-model-unavailable.md  (when UI involved)

## Status

- created: 2026-05-31T10:30:23.826Z
- last update: 2026-05-31T10:34:16.648Z
- state: handed-off
