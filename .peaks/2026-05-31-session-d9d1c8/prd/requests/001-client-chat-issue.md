# PRD Request client-chat-issue

- session: 2026-05-31-session-d9d1c8
- type: bugfix
- source: verbal "client页面的对话不能使用"
- raw input (sanitized): 用户报告 client 桌面应用的对话页面无法发送消息，每次打开对话页面都会出现此问题，且页面显示错误提示。

## Goals

- 修复 client 对话页面无法发送消息的问题
- 确保用户可以正常输入消息并成功发送
- 确保消息发送后能正常接收 AI 回复
- 消除页面显示的错误提示

## Non-goals

- 不涉及 admin 管理后台的对话功能（admin 对话功能正常）
- 不涉及新功能开发，仅修复现有功能
- 不涉及 UI/UX 改进，仅恢复正常功能

## Preserved behavior

- 对话历史加载功能保持不变
- 对话列表显示和切换功能保持不变
- WebSocket 连接和重连机制保持不变
- 专家选择、MCP 服务器、技能、扩展选择功能保持不变
- 模型选择和灵气配额显示功能保持不变
- 附件上传功能保持不变

## Acceptance criteria

- 用户可以在对话输入框中输入文本
- 点击发送按钮后消息成功发送到后端
- 发送的消息显示在对话历史中
- AI 回复能正常接收并显示
- 页面不再显示错误提示
- WebSocket 连接状态显示为"已连接"
- 新建对话和切换对话功能正常
- 浏览器控制台无 JavaScript 错误

## Frontend delta (only when target is frontend)

- **影响页面**: packages/client/src/pages/Chat.tsx
- **影响组件**: 
  - packages/client/src/pages/chat/ChatWorkspace.tsx
  - packages/client/src/components/chat/ChatComposer.tsx
  - packages/client/src/components/chat/ChatMessages.tsx
- **状态管理**: 
  - useChatStore (packages/client/src/stores/chat.ts)
  - useGatewayStore (packages/client/src/stores/gateway.ts)
- **服务层**:
  - useGateway hook (packages/client/src/hooks/useGateway.ts)
  - GatewayClient (packages/client/src/services/gateway-client.ts)
- **数据依赖**: 
  - WebSocket 连接到 Gateway (端口 3001)
  - 用户认证状态 (JWT token)
  - 团队 ID (teamId)
  - 灵气配额状态
- **边界情况**:
  - Gateway 未启动或连接失败
  - 用户未登录或 token 过期
  - 团队 ID 缺失
  - 灵气配额不足
  - 网络断开重连
- 待联调态: 需要确认具体的错误信息和复现步骤
- API contracts pending: 无（使用现有 WebSocket RPC 协议）

## Diagnosis (已完成)

**错误信息**：
```
POST http://localhost:1420/teams/ac2480e7-e074-44c0-8ad9-72ff5c133fd0/quota/estimate
Response: {"message":"Forbidden resource","error":"Forbidden","statusCode":403}
```

**根本原因**：
用户在数据库中的 `teamId` 字段为 `null`，导致后端 `QuotaController.assertTeamAccess()` 方法验证失败。

**技术细节**：
1. 接口路径：`POST /teams/:teamId/quota/estimate`
2. 后端验证逻辑：`packages/server/src/quota/quota.controller.ts:33-36`
   ```typescript
   private assertTeamAccess(teamId: string, user: CurrentAuthUser): void {
     if (user.teamId !== teamId) {
       throw new ForbiddenException('不能访问其他团队的灵气额度');
     }
   }
   ```
3. JWT 策略返回：`packages/server/src/auth/jwt.strategy.ts:47-54`
   - `teamId: user.teamId` 从数据库查询，可能为 `null`
4. 当 `user.teamId === null` 时，`null !== teamId` 为 true，抛出 403

**可能原因**：
- 用户是在团队关联功能添加之前注册的老用户
- 数据库迁移未正确执行
- 注册流程中 `createUserWithPersonalTeam` 方法失败

## Solution (已确定)

**采用方案 A + C 组合**：

### 方案 C：前端防御（立即生效）
在 client 应用中检测 teamId 缺失，引导用户重新登录。

**实施内容**：
1. 在 `packages/client/src/pages/Chat.tsx` 中添加 teamId 检测
2. 当 `teamId === null` 时，显示友好提示并引导用户重新登录
3. 阻止发送消息和配额查询等需要 teamId 的操作

### 方案 A：数据修复（彻底解决）
为数据库中 teamId 为 null 的用户创建个人团队并更新关联。

**实施内容**：
1. 创建数据库迁移脚本 `packages/server/src/database/migrations/011_fix_null_team_ids.sql`
2. 查询所有 teamId 为 null 的用户
3. 为每个用户调用 `createUserWithPersonalTeam` 逻辑创建团队
4. 更新用户的 teamId 字段
5. 记录迁移日志

## Risks and open questions

- **已确认**: 问题根源是用户 teamId 为 null
- **修复方案**: 方案 A + C 组合
- **风险控制**: 
  - 前端防御确保用户体验不会更差
  - 数据迁移前先备份数据库
  - 迁移脚本需要幂等性（可重复执行）

## Handoff

- to peaks-rd: .peaks/2026-05-31-session-d9d1c8/rd/requests/client-chat-issue.md
- to peaks-qa: .peaks/2026-05-31-session-d9d1c8/qa/requests/client-chat-issue.md
- to peaks-ui: .peaks/2026-05-31-session-d9d1c8/ui/requests/client-chat-issue.md  (when UI involved)

## Status

- created: 2026-05-31T08:28:40.952Z
- last update: 2026-05-31T08:40:42.729Z
- state: handed-off
