# 注册验证与团队邀请系统设计

> **目标：** 实现客户端注册验证（图形验证码 + 邮件验证码）和管理后台独立系统

## 系统架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    系统初始化流程                            │
│  部署服务 → 第一个注册用户成为所有者（不可删除）              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐    ┌─────────────────────────────┐
│    管理后台 (admin 系统)     │    │      客户端 (client 系统)     │
│   admin.example.com         │    │      app.example.com         │
│                             │    │                             │
│  - 独立用户体系              │    │  - 客户端用户注册             │
│  - 邮件邀请制                │    │  - 图形验证码 + 邮件验证码    │
│  - 成员 / 管理员 / 所有者    │    │  - 创建团队、邀请成员         │
│  - 配置邮件服务              │    │                             │
│  - 配置验证码服务            │    │                             │
└─────────────────────────────┘    └─────────────────────────────┘
```

### 技术选型

| 组件 | 技术 |
|------|------|
| 邮件服务 | Resend (免费 100封/天) |
| 图形验证码 | 第三方点选验证码（极验/腾讯防水墙等） |
| 管理后台框架 | NestJS (与后端共用) + React |
| 客户端框架 | React + Vite (现有) |

---

## 一、客户端注册流程

### 1.1 注册流程设计

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ 输入邮箱  │ → │ 图形验证  │ → │ 发送邮件  │ → │ 输入验证码│ → │ 完成注册 │
│ 密码姓名  │    │   验证码  │    │  验证码   │    │   6位    │    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### 1.2 接口限流规则

| 规则 | 限制 |
|------|------|
| IP 注册频率 | 每分钟最多 2 次 |
| 邮件验证码有效期 | 5 分钟 |
| 验证码错误次数 | 最多 3 次，超过需重新获取 |
| 同一邮箱重复注册 | 不支持（已注册邮箱不可再注册） |

### 1.3 数据库表

```sql
-- 客户端验证码记录
CREATE TABLE client_verification_codes (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    type VARCHAR(20) DEFAULT 'register',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 客户端用户（独立于管理后台用户）
CREATE TABLE client_users (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    team_id VARCHAR(36),
    role team_role DEFAULT 'MEMBER',
    verified BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 二、管理后台系统

### 2.1 用户角色

| 角色 | 说明 | 权限 |
|------|------|------|
| 所有者 | 第一个注册用户 | 不可删除，拥有所有权限 |
| 管理员 | 由所有者邀请 | 管理后台配置、邀请成员 |
| 成员 | 由管理员/所有者邀请 | 只读访问管理后台 |

### 2.2 用户体系

- 管理后台独立用户体系，与客户端用户分离
- 不开放注册，只能通过邮件邀请
- 所有者不可删除，管理员和成员可被移除

### 2.3 管理后台功能

```markdown
## 功能模块

### 系统设置
- 邮件服务配置（Resend API Key）
- 图形验证码服务配置（第三方 API Key）
- 系统信息展示

### 用户管理
- 所有者：查看所有用户，添加管理员/成员
- 管理员：查看用户，添加成员
- 成员：只读

### 邀请管理
- 发送邀请（邮件邀请链接）
- 撤回未接受邀请
- 查看邀请状态
```

### 2.4 管理后台数据库表

```sql
-- 管理后台用户（admin_users）
CREATE TABLE admin_users (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER', -- OWNER/ADMIN/MEMBER
    verified BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 管理后台邀请记录
CREATE TABLE admin_invitations (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    token VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'pending', -- pending/accepted/revoked
    invited_by VARCHAR(36) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置表
CREATE TABLE system_config (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 三、团队邀请流程（类似 GitHub）

### 3.1 邀请流程

```
1. 团队所有者/管理员输入被邀请人邮箱
2. 系统检查该邮箱是否已注册
3. 生成邀请链接（有效期 3 天）
4. 发送邮件到被邀请人
5. 被邀请人登录后自动加入团队
```

### 3.2 邀请链接格式

```
https://app.example.com/invite?token=xxx&team=xxx
```

### 3.3 撤回邀请

- 邀请人在邀请列表中可撤回未接受的邀请
- 已被接受的邀请不可撤回

### 3.4 数据库表

```sql
-- 团队邀请记录（可复用现有的 workorders 或新建）
CREATE TABLE team_invitations (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    team_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    invited_by VARCHAR(36) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 四、管理员密码找回

### 4.1 找回流程

```
1. 输入管理员邮箱
2. 图形验证码验证
3. 发送邮件验证码到注册邮箱
4. 验证通过后重置密码
```

### 4.2 恢复模式

- 预留通过环境变量 `ADMIN_RESET_TOKEN` 进入恢复模式
- 恢复模式需要邮箱验证才能重置所有者密码

---

## 五、接口设计

### 5.1 客户端注册接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/client/auth/send-code` | POST | 发送注册验证码（需图形验证） |
| `/client/auth/verify-code` | POST | 验证邮件验证码 |
| `/client/auth/register` | POST | 完成注册 |

### 5.2 管理后台接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/admin/auth/login` | POST | 管理员登录 |
| `/admin/auth/send-code` | POST | 发送重置密码验证码 |
| `/admin/auth/reset-password` | POST | 重置密码 |
| `/admin/users` | GET | 获取用户列表 |
| `/admin/users/invite` | POST | 发送邀请 |
| `/admin/users/:id` | DELETE | 移除用户 |
| `/admin/invitations/:id/revoke` | POST | 撤回邀请 |
| `/admin/config` | GET/PUT | 获取/更新系统配置 |

### 5.3 团队邀请接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/teams/:teamId/invite` | POST | 发送团队邀请 |
| `/teams/invitations/:token/accept` | POST | 接受邀请 |
| `/teams/invitations/:id/revoke` | POST | 撤回邀请 |

---

## 六、前端页面

### 6.1 客户端页面

```
/login                    - 登录页
/register                 - 注册页（含图形验证码 + 邮件验证码）
/invite                   - 接受邀请页
```

### 6.2 管理后台页面

```
/login                    - 管理员登录页
/dashboard                - 管理后台首页
/settings                 - 系统配置（邮件服务、验证码服务）
/users                    - 用户管理
/invitations              - 邀请管理
```

---

## 七、安全措施

| 措施 | 说明 |
|------|------|
| 接口限流 | IP 每分钟最多 2 次注册请求 |
| 验证码有效期 | 5 分钟 |
| 错误次数限制 | 验证码错误 3 次需重新获取 |
| 邀请链接有效期 | 3 天 |
| 密码加密 | bcrypt |
| JWT 认证 | 访问令牌 15 分钟，刷新令牌 7 天 |

---

## 八、邮件模板

### 8.1 客户端注册验证码（简单版）

```
主题: 【加冰可乐】您的注册验证码

您好，

您的注册验证码是：123456
有效期 5 分钟，请勿泄露。

— 加冰可乐团队
```

### 8.2 管理后台邀请邮件

```
主题: 【加冰可乐】邀请您加入管理后台

您好，

您被邀请加入加冰可乐管理后台。

邀请人：XXX
角色：管理员

点击以下链接接受邀请：
https://admin.example.com/accept?token=xxx

链接 3 天内有效。

— 加冰可乐团队
```

---

## 九、部署架构

```
┌─────────────────────────────────────────────────┐
│                  Nginx / Caddy                   │
│              (反向代理 + SSL)                     │
└─────────────────────────────────────────────────┘
         │                        │
         ↓                        ↓
┌─────────────────┐      ┌─────────────────┐
│  管理后台静态文件 │      │  客户端静态文件  │
│ admin.example.com│      │  app.example.com │
└─────────────────┘      └─────────────────┘
         │                        │
         ↓                        ↓
┌─────────────────────────────────────────────────┐
│              NestJS API 服务                      │
│   - /client/* (客户端 API)                       │
│   - /admin/* (管理后台 API)                      │
│   - /teams/* (团队相关 API)                      │
└─────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────┐
│   PostgreSQL    │
└─────────────────┘
```

---

## 十、开发计划

### Phase 1: 管理后台基础
- [ ] 创建 admin_users 表
- [ ] 创建 admin_invitations 表
- [ ] 管理员注册/登录功能
- [ ] 管理后台基础 UI

### Phase 2: 客户端注册验证
- [ ] 集成图形验证码服务
- [ ] 创建 client_verification_codes 表
- [ ] 发送验证码接口
- [ ] 注册流程（含验证）

### Phase 3: 团队邀请
- [ ] 创建 team_invitations 表
- [ ] 邀请接口开发
- [ ] 接受邀请流程
- [ ] 撤回邀请功能

### Phase 4: 系统配置
- [ ] 创建 system_config 表
- [ ] 管理后台配置页面
- [ ] 邮件服务集成

---

## 附录：环境变量

```env
# 数据库
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=...

# Resend 邮件
RESEND_API_KEY=...

# 图形验证码
CAPTCHA_SITE_KEY=...
CAPTCHA_SECRET_KEY=...

# 客户端域名
CLIENT_DOMAIN=app.example.com

# 管理后台域名
ADMIN_DOMAIN=admin.example.com

# 恢复模式
ADMIN_RESET_TOKEN=... (可选)
```