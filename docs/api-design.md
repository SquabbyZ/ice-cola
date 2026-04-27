# OpenClaw Server API 设计

## 1. API 概述

### 1.1 基础信息

| 项目 | 说明 |
|------|------|
| **Base URL** | `https://api.openclaw-server.com/v1` |
| **认证方式** | Bearer Token (JWT) |
| **数据格式** | JSON |
| **时区** | UTC |

### 1.2 通用响应格式

```typescript
// 成功响应
{
  "success": true,
  "data": { ... }
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "QUOTA_INSUFFICIENT",
    "message": "额度不足",
    "details": { "required": 1000, "available": 500 }
  }
}
```

### 1.3 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器错误 |

---

## 2. Auth 模块

### 2.1 注册

```
POST /auth/register
```

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "张三"
}
```

**响应 (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_123456",
      "email": "user@example.com",
      "name": "张三",
      "createdAt": "2026-04-26T10:00:00Z"
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

### 2.2 登录

```
POST /auth/login
```

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_123456",
      "email": "user@example.com",
      "name": "张三",
      "teamId": "team_789"
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "expiresIn": 900
  }
}
```

### 2.3 刷新 Token

```
POST /auth/refresh
```

**请求体:**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "expiresIn": 900
  }
}
```

### 2.4 登出

```
POST /auth/logout
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "success": true,
  "data": null
}
```

---

## 3. User 模块

### 3.1 获取当前用户信息

```
GET /users/me
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "id": "usr_123456",
    "email": "user@example.com",
    "name": "张三",
    "team": {
      "id": "team_789",
      "name": "我的团队",
      "role": "ADMIN"
    },
    "createdAt": "2026-04-26T10:00:00Z"
  }
}
```

### 3.2 更新用户信息

```
PUT /users/me
Authorization: Bearer <token>
```

**请求体:**
```json
{
  "name": "李四"
}
```

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "id": "usr_123456",
    "name": "李四",
    "updatedAt": "2026-04-26T11:00:00Z"
  }
}
```

---

## 4. Team 模块

### 4.1 创建团队

```
POST /teams
Authorization: Bearer <token>
```

**请求体:**
```json
{
  "name": "AI 效率团队"
}
```

**响应 (201):**
```json
{
  "success": true,
  "data": {
    "id": "team_789",
    "name": "AI 效率团队",
    "ownerId": "usr_123456",
    "createdAt": "2026-04-26T10:00:00Z"
  }
}
```

### 4.2 获取团队信息

```
GET /teams/:teamId
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "id": "team_789",
    "name": "AI 效率团队",
    "ownerId": "usr_123456",
    "memberCount": 5,
    "createdAt": "2026-04-26T10:00:00Z",
    "updatedAt": "2026-04-26T10:00:00Z"
  }
}
```

### 4.3 获取团队成员列表

```
GET /teams/:teamId/members
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "usr_123456",
        "name": "张三",
        "email": "user@example.com",
        "role": "ADMIN",
        "joinedAt": "2026-04-26T10:00:00Z"
      },
      {
        "id": "usr_654321",
        "name": "李四",
        "email": "li@example.com",
        "role": "MEMBER",
        "joinedAt": "2026-04-26T11:00:00Z"
      }
    ],
    "total": 2
  }
}
```

### 4.4 邀请成员

```
POST /teams/:teamId/members
Authorization: Bearer <token> (需要 ADMIN+)
```

**请求体:**
```json
{
  "email": "newmember@example.com",
  "role": "MEMBER"
}
```

**响应 (201):**
```json
{
  "success": true,
  "data": {
    "invitationId": "inv_abc123",
    "email": "newmember@example.com",
    "role": "MEMBER",
    "expiresAt": "2026-04-27T10:00:00Z"
  }
}
```

### 4.5 更新成员角色

```
PUT /teams/:teamId/members/:userId
Authorization: Bearer <token> (需要 ADMIN+)
```

**请求体:**
```json
{
  "role": "ADMIN"
}
```

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "userId": "usr_654321",
    "role": "ADMIN",
    "updatedAt": "2026-04-26T12:00:00Z"
  }
}
```

### 4.6 移除成员

```
DELETE /teams/:teamId/members/:userId
Authorization: Bearer <token> (需要 ADMIN+)
```

**响应 (200):**
```json
{
  "success": true,
  "data": null
}
```

---

## 5. Quota 模块

### 5.1 获取当前团队额度

```
GET /teams/:teamId/quota
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "teamId": "team_789",
    "totalAmt": 1000000,
    "usedAmt": 250000,
    "remainingAmt": 750000,
    "period": "MONTHLY",
    "resetDay": 1,
    "resetAt": "2026-05-01T00:00:00Z",
    "isUnlimited": false
  }
}
```

**无限额度响应:**
```json
{
  "success": true,
  "data": {
    "teamId": "team_789",
    "totalAmt": -1,
    "usedAmt": 500000,
    "remainingAmt": -1,
    "period": "MONTHLY",
    "resetDay": 1,
    "resetAt": null,
    "isUnlimited": true
  }
}
```

### 5.2 获取额度交易记录

```
GET /teams/:teamId/quota/transactions
Authorization: Bearer <token>
```

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码，默认 1 |
| pageSize | number | 每页数量，默认 20 |
| type | string | 筛选类型: USAGE, RECHARGE, RESET |
| userId | string | 筛选用户 |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_001",
        "userId": "usr_123456",
        "userName": "张三",
        "amount": -1000,
        "type": "USAGE",
        "note": null,
        "createdAt": "2026-04-26T10:30:00Z"
      },
      {
        "id": "txn_002",
        "userId": "usr_123456",
        "userName": "张三",
        "amount": 50000,
        "type": "RECHARGE",
        "note": "月度充值",
        "createdAt": "2026-04-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 5.3 管理员调整额度

```
POST /teams/:teamId/quota/recharge
Authorization: Bearer <token> (需要 ADMIN+)
```

**请求体:**
```json
{
  "amount": 100000,
  "note": "月度充值"
}
```

**响应 (201):**
```json
{
  "success": true,
  "data": {
    "transactionId": "txn_003",
    "amount": 100000,
    "newTotalAmt": 1100000,
    "balanceBefore": 1000000,
    "balanceAfter": 1100000
  }
}
```

### 5.4 获取用户用量统计

```
GET /teams/:teamId/quota/users/:userId/usage
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "userId": "usr_123456",
    "periodUsage": 50000,
    "periodLimit": -1,
    "last30Days": [
      { "date": "2026-04-01", "usage": 10000 },
      { "date": "2026-04-02", "usage": 8000 }
    ]
  }
}
```

---

## 6. Market 模块

### 6.1 获取公共市场资源列表

```
GET /market/resources
Authorization: Bearer <token>
```

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| category | string | 筛选类别: SKILL, PLUGIN, MCP |
| search | string | 搜索关键词 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "resources": [
      {
        "id": "res_001",
        "name": "翻译助手",
        "description": "中英文互译",
        "category": "SKILL",
        "version": "1.0.0",
        "author": {
          "id": "usr_999",
          "name": "OpenClaw Team"
        },
        "downloadCnt": 1500,
        "rating": 4.8,
        "isInstalled": true
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100
    }
  }
}
```

### 6.2 获取资源详情

```
GET /market/resources/:resourceId
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "id": "res_001",
    "name": "翻译助手",
    "description": "中英文互译",
    "category": "SKILL",
    "version": "1.0.0",
    "versions": [
      { "version": "1.0.0", "createdAt": "2026-01-01" },
      { "version": "1.1.0", "createdAt": "2026-03-01" }
    ],
    "manifest": {
      "prompt": "你是一个翻译专家...",
      "variables": ["sourceLang", "targetLang"]
    },
    "author": {
      "id": "usr_999",
      "name": "OpenClaw Team",
      "type": "USER"
    },
    "securityStatus": "APPROVED",
    "downloadCnt": 1500,
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

### 6.3 发布资源到公共市场

```
POST /market/resources
Authorization: Bearer <token>
```

**请求体:**
```json
{
  "name": "我的技能",
  "description": "一个有用的技能",
  "category": "SKILL",
  "manifest": {
    "prompt": "你是一个...",
    "variables": []
  }
}
```

**响应 (201):**
```json
{
  "success": true,
  "data": {
    "resourceId": "res_002",
    "status": "PENDING_REVIEW",
    "message": "资源已提交，等待安全检查和审核"
  }
}
```

### 6.4 从公共市场同步到团队

```
POST /teams/:teamId/market/sync
Authorization: Bearer <token> (需要 ADMIN+)
```

**请求体:**
```json
{
  "resourceId": "res_001"
}
```

**响应 (201):**
```json
{
  "success": true,
  "data": {
    "teamResourceId": "team_res_001",
    "resourceId": "res_001",
    "status": "CHECKING",
    "message": "正在同步并进行安全检查"
  }
}
```

### 6.5 获取团队本地市场资源

```
GET /teams/:teamId/market/resources
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "resources": [
      {
        "id": "team_res_001",
        "resourceId": "res_001",
        "name": "翻译助手",
        "category": "SKILL",
        "source": "SYNC",
        "status": "APPROVED",
        "syncedAt": "2026-04-26T10:00:00Z"
      }
    ]
  }
}
```

### 6.6 发布资源到团队本地市场

```
POST /teams/:teamId/market/resources
Authorization: Bearer <token> (需要 ADMIN+)
```

**请求体:**
```json
{
  "name": "团队内部技能",
  "description": "仅供团队内部使用",
  "category": "SKILL",
  "manifest": { ... }
}
```

**响应 (201):**
```json
{
  "success": true,
  "data": {
    "teamResourceId": "team_res_002",
    "status": "PENDING_APPROVE",
    "message": "等待管理员审核"
  }
}
```

### 6.7 审核团队资源

```
PUT /teams/:teamId/market/resources/:resourceId/approve
Authorization: Bearer <token> (需要 ADMIN+)
```

**请求体:**
```json
{
  "action": "APPROVE",
  "rejectReason": null
}
```

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "resourceId": "team_res_002",
    "status": "APPROVED",
    "approvedAt": "2026-04-26T12:00:00Z"
  }
}
```

### 6.8 安装资源

```
POST /teams/:teamId/market/resources/:resourceId/install
Authorization: Bearer <token>
```

**响应 (201):**
```json
{
  "success": true,
  "data": {
    "installationId": "inst_001",
    "resourceId": "res_001",
    "version": "1.1.0",
    "installedAt": "2026-04-26T12:30:00Z"
  }
}
```

### 6.9 获取已安装资源列表

```
GET /teams/:teamId/market/installations
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "installations": [
      {
        "id": "inst_001",
        "resourceId": "res_001",
        "name": "翻译助手",
        "category": "SKILL",
        "version": "1.1.0",
        "installedAt": "2026-04-26T12:30:00Z",
        "updateAvailable": true
      }
    ]
  }
}
```

---

## 7. Conversation 模块

### 7.1 创建会话

```
POST /teams/:teamId/conversations
Authorization: Bearer <token>
```

**请求体:**
```json
{
  "title": "销售数据分析"
}
```

**响应 (201):**
```json
{
  "success": true,
  "data": {
    "id": "conv_001",
    "title": "销售数据分析",
    "teamId": "team_789",
    "createdAt": "2026-04-26T10:00:00Z"
  }
}
```

### 7.2 获取会话列表

```
GET /teams/:teamId/conversations
Authorization: Bearer <token>
```

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| pageSize | number | 每页数量 |

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv_001",
        "title": "销售数据分析",
        "messageCount": 15,
        "lastMessageAt": "2026-04-26T12:00:00Z",
        "createdAt": "2026-04-26T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### 7.3 获取会话详情

```
GET /teams/:teamId/conversations/:conversationId
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "id": "conv_001",
    "title": "销售数据分析",
    "teamId": "team_789",
    "messages": [
      {
        "id": "msg_001",
        "role": "user",
        "content": "帮我分析销售数据",
        "createdAt": "2026-04-26T10:00:00Z"
      },
      {
        "id": "msg_002",
        "role": "assistant",
        "content": "好的，请提供数据",
        "model": "gpt-4",
        "createdAt": "2026-04-26T10:00:30Z"
      }
    ],
    "createdAt": "2026-04-26T10:00:00Z"
  }
}
```

### 7.4 发送消息 (AI 对话)

```
POST /teams/:teamId/conversations/:conversationId/messages
Authorization: Bearer <token>
```

**请求体:**
```json
{
  "content": "这是销售数据...",
  "model": "gpt-4"
}
```

**响应 (201):**
```json
{
  "success": true,
  "data": {
    "id": "msg_003",
    "role": "user",
    "content": "这是销售数据...",
    "createdAt": "2026-04-26T10:05:00Z"
  }
}
```

**AI 回复通过 WebSocket 推送:**
```json
{
  "event": "message.created",
  "data": {
    "id": "msg_004",
    "role": "assistant",
    "content": "分析结果...",
    "model": "gpt-4",
    "usage": {
      "promptTokens": 100,
      "completionTokens": 200,
      "totalTokens": 300
    },
    "createdAt": "2026-04-26T10:05:01Z"
  }
}
```

### 7.5 更新会话标题

```
PUT /teams/:teamId/conversations/:conversationId
Authorization: Bearer <token>
```

**请求体:**
```json
{
  "title": "Q1 销售分析报告"
}
```

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "id": "conv_001",
    "title": "Q1 销售分析报告",
    "updatedAt": "2026-04-26T11:00:00Z"
  }
}
```

### 7.6 删除会话

```
DELETE /teams/:teamId/conversations/:conversationId
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "success": true,
  "data": null
}
```

---

## 8. AI Gateway (内部接口)

### 8.1 聊天完成

```
POST /ai/chat
Authorization: Bearer <token> (内部服务调用)
```

**请求体:**
```json
{
  "teamId": "team_789",
  "userId": "usr_123456",
  "model": "gpt-4",
  "messages": [
    { "role": "system", "content": "你是一个助手" },
    { "role": "user", "content": "你好" }
  ],
  "tools": ["file_ops", "code_runner"]
}
```

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "id": "chat_001",
    "model": "gpt-4",
    "choices": [
      {
        "message": {
          "role": "assistant",
          "content": "你好，有什么可以帮你？"
        },
        "finishReason": "stop"
      }
    ],
    "usage": {
      "promptTokens": 50,
      "completionTokens": 30,
      "totalTokens": 80
    }
  }
}
```

### 8.2 模型列表

```
GET /ai/models
Authorization: Bearer <token> (内部服务调用)
```

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "models": [
      { "id": "gpt-4", "name": "GPT-4", "provider": "openai" },
      { "id": "gpt-3.5-turbo", "name": "GPT-3.5", "provider": "openai" },
      { "id": "claude-3-opus", "name": "Claude 3 Opus", "provider": "anthropic" }
    ]
  }
}
```

---

## 9. WebSocket 事件

### 9.1 连接

```
WSS /ws?token=<access_token>
```

### 9.2 事件列表

| 事件 | 说明 | 数据 |
|------|------|------|
| `message.created` | 新消息创建 | Message 对象 |
| `message.updated` | 消息更新 | Message 对象 |
| `quota.changed` | 额度变动 | Quota 对象 |
| `resource.approved` | 资源审核通过 | Resource 对象 |
| `notification` | 系统通知 | Notification 对象 |

---

## 10. Auth 模块详细设计

### 10.1 字段说明

#### 用户对象 (User)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 用户唯一标识，格式: `usr_` + 18位随机字符 |
| email | string | 是 | 邮箱地址，用于登录，唯一索引 |
| password | string | 是 | bcrypt 加密，强度要求: 8位以上，包含大小写和数字 |
| name | string | 是 | 显示名称，2-50字符 |
| avatar | string | 否 | 头像 URL |
| teamId | string | 否 | 当前所在团队 ID |
| role | string | 否 | 用户角色: `OWNER`, `ADMIN`, `MEMBER` |
| createdAt | datetime | 是 | 创建时间，ISO 8601 |
| updatedAt | datetime | 是 | 更新时间 |

#### Token 对象

| 字段 | 类型 | 说明 |
|------|------|------|
| accessToken | string | JWT，15分钟有效期 |
| refreshToken | string | JWT，7天有效期 |
| expiresIn | number | Access Token 剩余秒数 |
| tokenType | string | 固定值: `Bearer` |

#### JWT Payload 结构

```typescript
// Access Token Payload
{
  "sub": "usr_123456",        // 用户 ID
  "teamId": "team_789",       // 团队 ID
  "role": "ADMIN",            // 用户角色
  "type": "access",           // token 类型
  "iat": 1714118400,          // 签发时间
  "exp": 1714119300           // 过期时间 (15分钟后)
}

// Refresh Token Payload
{
  "sub": "usr_123456",
  "type": "refresh",
  "iat": 1714118400,
  "exp": 1714713600           // 过期时间 (7天后)
}
```

### 10.2 密码强度规则

```typescript
const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,     // 必须有大写字母
  requireLowercase: true,     // 必须有小写字母
  requireDigit: true,          // 必须有数字
  requireSpecialChar: false,   // 可选特殊字符
  maxLength: 128,
  disallowedPatterns: [       // 禁止的密码
    'password',
    '12345678',
    'qwerty',
  ]
};

// 验证函数
function validatePassword(password: string): ValidationResult {
  if (password.length < PASSWORD_RULES.minLength) {
    return { valid: false, error: '密码至少8位' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: '密码必须包含大写字母' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: '密码必须包含小写字母' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: '密码必须包含数字' };
  }
  for (const pattern of PASSWORD_RULES.disallowedPatterns) {
    if (password.toLowerCase().includes(pattern)) {
      return { valid: false, error: '密码太简单，请更换' };
    }
  }
  return { valid: true };
}
```

### 10.3 Auth 错误处理

```typescript
// Auth 错误类型
enum AuthErrorCode {
  INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  REFRESH_FAILED = 'AUTH_REFRESH_FAILED',
  EMAIL_EXISTS = 'AUTH_EMAIL_EXISTS',
  WEAK_PASSWORD = 'AUTH_WEAK_PASSWORD',
  ACCOUNT_LOCKED = 'AUTH_ACCOUNT_LOCKED',
  TEAM_REQUIRED = 'AUTH_TEAM_REQUIRED',
}

// 错误响应示例
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "邮箱或密码错误",
    "details": {
      "retryAfter": 5,
      "attemptsLeft": 4
    }
  }
}

// 账户锁定响应
{
  "success": false,
  "error": {
    "code": "AUTH_ACCOUNT_LOCKED",
    "message": "账户已锁定，请30分钟后重试",
    "details": {
      "lockedUntil": "2026-04-26T10:30:00Z",
      "reason": "多次登录失败"
    }
  }
}
```

### 10.4 登录安全策略

```typescript
// 登录尝试限制
const LOGIN_RATE_LIMIT = {
  maxAttempts: 5,           // 5次失败后锁定
  lockoutDuration: 30 * 60, // 锁定30分钟
  cooldownSeconds: 5,       // 每次失败后等待5秒
};

// 记录登录尝试
async function recordLoginAttempt(email: string, success: boolean) {
  const key = `login_attempt:${email}`;
  const attempts = await redis.get(key);

  if (!success) {
    const newAttempts = (attempts || 0) + 1;
    await redis.setex(key, LOGIN_RATE_LIMIT.lockoutDuration, newAttempts);

    if (newAttempts >= LOGIN_RATE_LIMIT.maxAttempts) {
      await lockAccount(email);
      throw new AuthError('AUTH_ACCOUNT_LOCKED');
    }
  } else {
    await redis.del(key);
  }
}

// Token 黑名单 (登出后)
async function blacklistToken(tokenId: string, expiresIn: number) {
  await redis.setex(`blacklist:${tokenId}`, expiresIn, '1');
}

// 验证 Token 是否在黑名单
async function isTokenBlacklisted(tokenId: string): Promise<boolean> {
  return await redis.exists(`blacklist:${tokenId}`) === 1;
}
```

---

## 11. Quota 模块详细设计

### 11.1 字段说明

#### Quota 额度对象

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 额度记录 ID |
| teamId | string | 团队 ID |
| totalAmt | bigint | 总额度，-1 表示无限 |
| usedAmt | bigint | 已使用额度 |
| remainingAmt | bigint | 剩余额度，-1 表示无限 |
| period | enum | 周期: DAILY, MONTHLY |
| resetDay | number | 重置日 (每月几号) |
| resetAt | datetime | 下次重置时间，null 表示无限 |
| isUnlimited | boolean | 是否无限额度 |
| createdAt | datetime | 创建时间 |
| updatedAt | datetime | 更新时间 |

#### QuotaTransaction 交易记录

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 交易 ID |
| quotaId | string | 关联的额度 ID |
| userId | string | 操作用户 ID |
| userName | string | 操作用户名称 (冗余存储) |
| amount | bigint | 变动数量，负数=消耗，正数=充值 |
| balanceBefore | bigint | 变动前余额 |
| balanceAfter | bigint | 变动后余额 |
| type | enum | 类型: USAGE, RECHARGE, RESET |
| note | string | 备注 (管理员操作时填写) |
| createdAt | datetime | 创建时间 |

#### 用量统计 UsageStat

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | string | 用户 ID |
| periodUsage | bigint | 本周期使用量 |
| periodLimit | bigint | 本周期限额，-1 表示无限 |
| dailyUsage | bigint | 今日使用量 |
| monthlyUsage | bigint | 本月使用量 |
| last30Days | DailyUsage[] | 最近30天每日用量 |
| avgDaily | bigint | 日均用量 |

### 11.2 额度检查流程

```typescript
@Injectable()
export class QuotaService {

  async checkQuota(teamId: string, requiredTokens: bigint): Promise<QuotaCheckResult> {
    const quota = await this.prisma.quota.findUnique({ where: { teamId } });

    if (quota.isUnlimited) {
      return { allowed: true, reason: 'UNLIMITED' };
    }

    if (this.shouldReset(quota)) {
      await this.resetQuota(quota);
      quota.usedAmt = BigInt(0);
    }

    const remaining = quota.totalAmt - quota.usedAmt;

    if (remaining < requiredTokens) {
      return {
        allowed: false,
        reason: 'INSUFFICIENT',
        required: requiredTokens,
        available: remaining,
        resetAt: quota.resetAt
      };
    }

    return { allowed: true, reason: 'OK' };
  }

  async consumeQuota(
    teamId: string,
    userId: string,
    tokens: bigint,
    metadata?: Record<string, any>
  ): Promise<Transaction> {
    const quota = await this.prisma.quota.findUnique({ where: { teamId } });

    if (!quota.isUnlimited) {
      const remaining = quota.totalAmt - quota.usedAmt;
      if (remaining < tokens) {
        throw new QuotaException('INSUFFICIENT', {
          required: tokens,
          available: remaining
        });
      }
    }

    const transaction = await this.prisma.quotaTransaction.create({
      data: {
        quotaId: quota.id,
        userId,
        amount: -tokens,
        type: 'USAGE',
        note: metadata ? JSON.stringify(metadata) : null
      }
    });

    await this.prisma.quota.update({
      where: { teamId },
      data: { usedAmt: { increment: tokens } }
    });

    return transaction;
  }

  private async shouldReset(quota: Quota): Promise<boolean> {
    if (!quota.resetAt) return false;
    return new Date() >= new Date(quota.resetAt);
  }

  private async resetQuota(quota: Quota): Promise<void> {
    const nextReset = this.calculateNextReset(quota.period, quota.resetDay);

    await this.prisma.quota.update({
      where: { id: quota.id },
      data: { usedAmt: BigInt(0), resetAt: nextReset }
    });

    await this.prisma.quotaTransaction.create({
      data: {
        quotaId: quota.id,
        userId: 'SYSTEM',
        amount: 0,
        type: 'RESET',
        note: `自动重置，上周期使用: ${quota.usedAmt}`
      }
    });
  }

  private calculateNextReset(period: string, resetDay: number): Date {
    const now = new Date();

    if (period === 'MONTHLY') {
      const next = new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
      if (resetDay === 1) {
        return next;
      }
      if (now.getDate() >= resetDay) {
        return new Date(now.getFullYear(), now.getMonth() + 2, resetDay);
      }
      return next;
    }

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}
```

### 11.3 额度错误处理

```typescript
// Quota 错误类型
enum QuotaErrorCode {
  INSUFFICIENT = 'QUOTA_INSUFFICIENT',
  EXCEEDED = 'QUOTA_EXCEEDED',
  NOT_FOUND = 'QUOTA_NOT_FOUND',
  INVALID_AMOUNT = 'QUOTA_INVALID_AMOUNT',
  RESET_FAILED = 'QUOTA_RESET_FAILED',
  ADMIN_REQUIRED = 'QUOTA_ADMIN_REQUIRED',
}

// 额度不足错误响应
{
  "success": false,
  "error": {
    "code": "QUOTA_INSUFFICIENT",
    "message": "额度不足，无法完成请求",
    "details": {
      "required": 5000,
      "available": 3000,
      "resetAt": "2026-05-01T00:00:00Z",
      "suggestions": [
        "等待额度重置",
        "联系管理员增加额度",
        "升级团队套餐"
      ]
    }
  }
}

// 管理员充值权限错误
{
  "success": false,
  "error": {
    "code": "QUOTA_ADMIN_REQUIRED",
    "message": "只有管理员可以调整额度",
    "details": {
      "requiredRole": "ADMIN",
      "currentRole": "MEMBER"
    }
  }
}
```

### 11.4 额度预警与异常检测

```typescript
// 额度预警服务
@Injectable()
export class QuotaAlertService {

  async checkAndAlert(teamId: string) {
    const quota = await this.prisma.quota.findUnique({ where: { teamId } });

    if (quota.isUnlimited) return;

    const usedPercent = Number(quota.usedAmt * BigInt(100) / quota.totalAmt);
    const remaining = Number(quota.totalAmt - quota.usedAmt);

    const thresholds = [
      { percent: 80, message: '额度使用达到80%' },
      { percent: 90, message: '额度使用达到90%' },
      { percent: 95, message: '额度即将用尽' },
    ];

    for (const threshold of thresholds) {
      if (usedPercent >= threshold.percent && remaining <= 10000) {
        await this.sendAlert(teamId, {
          type: 'QUOTA_WARNING',
          percent: threshold.percent,
          remaining: Number(remaining),
          message: threshold.message
        });
      }
    }
  }

  async detectAnomaly(teamId: string, userId: string) {
    const stats = await this.quotaService.getUserUsageStats(teamId, userId);

    if (stats.last1hUsage > stats.avgDailyUsage * BigInt(10)) {
      await this.sendAlert(teamId, {
        type: 'USAGE_ANOMALY',
        userId,
        message: '检测到异常用量',
        details: {
          last1h: Number(stats.last1hUsage),
          avgDaily: Number(stats.avgDailyUsage),
          ratio: Number(stats.last1hUsage) / Number(stats.avgDailyUsage)
        }
      });
    }
  }
}
```

---

## 12. 通用错误处理

### 12.1 错误层次结构

```typescript
// 错误基类
class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public httpStatus: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// 认证错误
class AuthError extends AppError {
  constructor(code: AuthErrorCode, details?: Record<string, any>) {
    super(code, AUTH_MESSAGES[code], 401, details);
  }
}

// 权限错误
class PermissionError extends AppError {
  constructor(message: string = '权限不足') {
    super('PERMISSION_DENIED', message, 403);
  }
}

// 额度错误
class QuotaError extends AppError {
  constructor(code: QuotaErrorCode, details?: Record<string, any>) {
    super(code, QUOTA_MESSAGES[code], 403, details);
  }
}

// 资源不存在错误
class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource.toUpperCase()}_NOT_FOUND`, `${resource}不存在`, 404);
  }
}

// 参数验证错误
class ValidationError extends AppError {
  constructor(errors: FieldError[]) {
    super('VALIDATION_ERROR', '参数验证失败', 400, { fields: errors });
  }
}
```

### 12.2 全局异常过滤器

```typescript
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let errorResponse: ErrorResponse;

    if (exception instanceof AppError) {
      errorResponse = {
        success: false,
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
        }
      };
      response.status(exception.httpStatus);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      errorResponse = this.handlePrismaError(exception);
      response.status(400);
    } else {
      console.error('Unhandled exception:', exception);
      errorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器内部错误',
        }
      };
      response.status(500);
    }

    response.json(errorResponse);
  }

  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): ErrorResponse {
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: '记录已存在',
          details: { field: error.meta?.field }
        }
      };
    }

    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: '数据库操作失败',
      }
    };
  }
}
```

---

## 13. 错误码完整列表

| 错误码 | HTTP 状态 | 说明 | 详情字段 |
|--------|-----------|------|----------|
| `AUTH_INVALID_CREDENTIALS` | 401 | 用户名或密码错误 | retryAfter, attemptsLeft |
| `AUTH_TOKEN_EXPIRED` | 401 | Token 已过期 | expiresAt |
| `AUTH_TOKEN_INVALID` | 401 | Token 无效 | - |
| `AUTH_REFRESH_FAILED` | 401 | 刷新 Token 失败 | - |
| `AUTH_EMAIL_EXISTS` | 400 | 邮箱已注册 | - |
| `AUTH_WEAK_PASSWORD` | 400 | 密码强度不足 | requirements |
| `AUTH_ACCOUNT_LOCKED` | 401 | 账户已锁定 | lockedUntil, reason |
| `AUTH_TEAM_REQUIRED` | 403 | 需要加入团队 | - |
| `QUOTA_INSUFFICIENT` | 403 | 额度不足 | required, available, resetAt |
| `QUOTA_EXCEEDED` | 403 | 超出限制 | - |
| `QUOTA_NOT_FOUND` | 404 | 额度配置不存在 | - |
| `QUOTA_ADMIN_REQUIRED` | 403 | 需要管理员权限 | requiredRole, currentRole |
| `PERMISSION_DENIED` | 403 | 权限不足 | - |
| `TEAM_NOT_FOUND` | 404 | 团队不存在 | - |
| `TEAM_NAME_EXISTS` | 400 | 团队名称已存在 | - |
| `USER_NOT_FOUND` | 404 | 用户不存在 | - |
| `MEMBER_NOT_FOUND` | 404 | 成员不存在 | - |
| `MEMBER_ALREADY_EXISTS` | 400 | 成员已存在 | - |
| `RESOURCE_NOT_FOUND` | 404 | 资源不存在 | - |
| `RESOURCE_NAME_EXISTS` | 400 | 资源名称已存在 | - |
| `CONVERSATION_NOT_FOUND` | 404 | 会话不存在 | - |
| `VALIDATION_ERROR` | 400 | 参数验证失败 | fields[] |
| `DUPLICATE_ENTRY` | 400 | 重复记录 | field |
| `RATE_LIMITED` | 429 | 请求过于频繁 | retryAfter |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 | - |
| `DATABASE_ERROR` | 500 | 数据库操作失败 | - |

---

*文档版本: v1.1*
*更新日期: 2026-04-26*