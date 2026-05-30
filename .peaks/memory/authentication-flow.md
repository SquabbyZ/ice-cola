---
name: authentication-flow
description: JWT-based authentication with team/quota system, user registration, login, token refresh.
metadata:
  type: project
---

Ice Cola 认证流程基于 JWT Bearer Token，集成团队和配额系统：

**核心流程：**

1. **用户注册** (`POST /auth/register`)
   - 创建用户账号
   - 自动创建关联的团队（Team）
   - 分配初始配额
   - 返回 JWT access token 和 refresh token

2. **用户登录** (`POST /auth/login`)
   - 验证邮箱和密码
   - 返回 JWT access token 和 refresh token
   - Token 包含用户 ID、团队 ID 等信息

3. **Token 刷新** (`POST /auth/refresh`)
   - 使用 refresh token 获取新的 access token
   - 延长会话有效期

4. **Token 验证**
   - 所有受保护的 API 端点要求 `Authorization: Bearer <token>` 头
   - NestJS Guards 自动验证 token 并注入用户信息

**配额系统集成：**
- 每个团队有独立的配额池
- Hermes AI 调用前检查配额 (`quota.check()`)
- 调用后消耗配额 (`quota.consume()`)
- 管理员可充值配额 (`POST /teams/:teamId/quota/recharge`)

**环境配置：**
```bash
JWT_SECRET="icecola-local-dev-jwt-secret-not-for-production"
JWT_EXPIRES_IN="7d"
```

**Why:** JWT 无状态认证便于横向扩展；团队配额系统支持多用户协作和资源管理。

**How to apply:**
- 新增受保护端点时使用 `@UseGuards(JwtAuthGuard)`
- 需要配额检查的操作调用 `quotaService.check()` 和 `quotaService.consume()`
- 本地开发使用示例 JWT_SECRET，生产环境必须使用强随机密钥
- 参考 [[tech-stack]] 了解 NestJS 和 Prisma 集成
