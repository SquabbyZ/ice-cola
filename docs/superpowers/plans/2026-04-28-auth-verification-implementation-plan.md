# 注册验证与团队邀请系统实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现管理后台独立系统 + 客户端注册验证码 + 团队邮件邀请

**Architecture:**
- 管理后台：独立 Vite + React 项目（packages/admin），独立域名 admin.example.com
- 客户端：现有项目增强注册流程（图形验证码 + 邮件验证码）
- 后端：NestJS 新增 admin 模块和 client 验证码模块
- 邮件服务：Resend API

**Tech Stack:**
- Frontend: Vite + React + shadcn/ui + react-hook-form + zod
- Backend: NestJS + PostgreSQL
- Email: Resend

---

## Phase 1: 创建管理后台前端项目

### Task 1.1: 初始化 admin 项目

**Files:**
- Create: `packages/admin/` (Vite + React 项目)
- 使用 `npm create vite@latest admin -- --template react-ts`
- 安装依赖: `npm install react-hook-form zod @hookform/resolvers class-variance-authority clsx tailwind-merge lucide-react`
- 按照 https://ui.shadcn.com/docs/installation/vite 安装 shadcn/ui

```bash
cd packages
npm create vite@latest admin -- --template react-ts
cd admin
npm install
npm install react-hook-form zod @hookform/resolvers class-variance-authority clsx tailwind-merge lucide-react
npx shadcn@latest init
```

- [ ] **Step 1: 创建 admin 项目基础结构**
- [ ] **Step 2: 安装所有依赖**
- [ ] **Step 3: 配置 shadcn/ui**
- [ ] **Step 4: 配置 Tailwind CSS**
- [ ] **Step 5: 初始化 git**
- [ ] **Step 6: Commit**

---

### Task 1.2: 管理后台基础 UI 结构

**Files:**
- Create: `packages/admin/src/App.tsx`
- Create: `packages/admin/src/components/Layout.tsx`
- Create: `packages/admin/src/pages/Login.tsx`
- Create: `packages/admin/src/pages/Dashboard.tsx`
- Create: `packages/admin/src/stores/authStore.ts`
- Create: `packages/admin/src/services/api.ts`

```tsx
// packages/admin/src/App.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
      </Route>
    </Routes>
  );
};

export default App;
```

- [ ] **Step 1: 创建基础路由结构**
- [ ] **Step 2: 创建 Layout 组件**
- [ ] **Step 3: 创建 Login 页面**
- [ ] **Step 4: 创建 Dashboard 页面**
- [ ] **Step 5: 创建 authStore**
- [ ] **Step 6: 创建 api 服务**
- [ ] **Step 7: Commit**

---

## Phase 2: 管理后台数据库与后端 API

### Task 2.1: 数据库表 - admin_users, admin_invitations, system_config

**Files:**
- Modify: `init.sql` (新增表)

```sql
-- admin 用户表
CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    verified BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- admin 邀请表
CREATE TABLE IF NOT EXISTS admin_invitations (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    token VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'pending',
    invited_by VARCHAR(36) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 1: 添加 SQL 表到 init.sql**
- [ ] **Step 2: Commit**

---

### Task 2.2: Admin Auth 模块

**Files:**
- Create: `packages/server/src/admin-admin/admin.module.ts`
- Create: `packages/server/src/admin-admin/admin.controller.ts`
- Create: `packages/server/src/admin-admin/admin.service.ts`
- Create: `packages/server/src/admin-admin/dto/`

```typescript
// AdminService - 核心逻辑
// - findAdminByEmail(email)
// - findAdminById(id)
// - createAdmin(data) - 第一个创建的用户 role='OWNER'
// - verifyPassword(password, hash)
// - generateToken(admin)
// - sendInvitationEmail(email, role, token)
```

- [ ] **Step 1: 创建 admin.module.ts**
- [ ] **Step 2: 创建 admin.service.ts (核心逻辑)**
- [ ] **Step 3: 创建 admin.controller.ts (API 端点)**
- [ ] **Step 4: 创建 DTOs**
- [ ] **Step 5: 注册到 app.module**
- [ ] **Step 6: Commit**

---

### Task 2.3: Admin 用户管理 API

**Files:**
- Modify: `packages/server/src/admin-admin/admin.controller.ts`
- Modify: `packages/server/src/admin-admin/admin.service.ts`

**API Endpoints:**
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /admin/auth/login | 管理员登录 |
| POST | /admin/auth/send-code | 发送重置密码验证码 |
| POST | /admin/auth/reset-password | 重置密码 |
| GET | /admin/users | 获取用户列表 |
| POST | /admin/users/invite | 发送邀请 |
| DELETE | /admin/users/:id | 移除用户 |
| POST | /admin/invitations/:id/revoke | 撤回邀请 |

- [ ] **Step 1: 实现登录 API**
- [ ] **Step 2: 实现用户列表 API**
- [ ] **Step 3: 实现邀请 API**
- [ ] **Step 4: 实现移除用户 API**
- [ ] **Step 5: 实现撤回邀请 API**
- [ ] **Step 6: Commit**

---

### Task 2.4: Admin 系统配置 API

**Files:**
- Create: `packages/server/src/admin-admin/config.controller.ts`
- Create: `packages/server/src/admin-admin/config.service.ts`

```typescript
// ConfigService
// - getConfig(key) - 获取配置
// - setConfig(key, value) - 设置配置
// - getAllConfigs() - 获取所有配置
```

**API Endpoints:**
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/config | 获取所有配置 |
| PUT | /admin/config/:key | 更新配置 |
| GET | /admin/config/resend | 获取 Resend 配置状态 |
| PUT | /admin/config/resend | 更新 Resend 配置 |

- [ ] **Step 1: 创建 config.service.ts**
- [ ] **Step 2: 创建 config.controller.ts**
- [ ] **Step 3: 实现配置 CRUD API**
- [ ] **Step 4: Commit**

---

## Phase 3: 管理后台前端页面

### Task 3.1: 登录页面

**Files:**
- Create: `packages/admin/src/pages/Login.tsx`
- Create: `packages/admin/src/forms/LoginForm.tsx`

```tsx
// LoginForm 使用 react-hook-form + zod
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const LoginForm: React.FC = () => {
  const form = useForm<z.infer<typeof schema>>();
  // ... 提交到 /admin/auth/login
};
```

- [ ] **Step 1: 创建 LoginForm 组件**
- [ ] **Step 2: 创建 Login 页面**
- [ ] **Step 3: 添加路由**
- [ ] **Step 4: Commit**

---

### Task 3.2: 用户管理页面

**Files:**
- Create: `packages/admin/src/pages/Users.tsx`
- Create: `packages/admin/src/components/UserTable.tsx`
- Create: `packages/admin/src/components/InviteUserDialog.tsx`

**功能：**
- 显示所有 admin 用户（所有者/管理员/成员）
- 发送邀请（输入邮箱 + 选择角色）
- 移除用户（不是所有者）
- 显示邀请状态

- [ ] **Step 1: 创建 UserTable 组件**
- [ ] **Step 2: 创建 InviteUserDialog 组件**
- [ ] **Step 3: 创建 Users 页面**
- [ ] **Step 4: Commit**

---

### Task 3.3: 邀请管理页面

**Files:**
- Create: `packages/admin/src/pages/Invitations.tsx`
- Create: `packages/admin/src/components/InvitationTable.tsx`

**功能：**
- 显示所有pending状态的邀请
- 可撤回未接受的邀请

- [ ] **Step 1: 创建 InvitationTable 组件**
- [ ] **Step 2: 创建 Invitations 页面**
- [ ] **Step 3: Commit**

---

### Task 3.4: 系统设置页面

**Files:**
- Create: `packages/admin/src/pages/Settings.tsx`
- Create: `packages/admin/src/forms/ResendConfigForm.tsx`

**功能：**
- 配置 Resend API Key
- 配置验证码服务 Key
- 保存配置到 system_config 表

- [ ] **Step 1: 创建 ResendConfigForm 组件**
- [ ] **Step 2: 创建 Settings 页面**
- [ ] **Step 3: Commit**

---

### Task 3.5: 接受邀请页面

**Files:**
- Create: `packages/admin/src/pages/AcceptInvite.tsx`

**功能：**
- 访问 `/accept?token=xxx` 验证 token
- 有效则注册/登录并加入系统
- 无效则提示错误

- [ ] **Step 1: 创建 AcceptInvite 页面**
- [ ] **Step 2: 添加路由**
- [ ] **Step 3: Commit**

---

## Phase 4: 客户端注册验证码

### Task 4.1: 数据库表 - client_verification_codes

**Files:**
- Modify: `init.sql`

```sql
-- 客户端验证码记录
CREATE TABLE IF NOT EXISTS client_verification_codes (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    type VARCHAR(20) DEFAULT 'register',
    expires_at TIMESTAMP NOT NULL,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 1: 添加表到 init.sql**
- [ ] **Step 2: Commit**

---

### Task 4.2: 图形验证码服务

**Files:**
- Create: `packages/server/src/commons/captcha.service.ts`

**功能：**
- 生成点选验证码（使用 canvas 库）
- 验证点击坐标
- 缓存验证码状态

```typescript
// CaptchaService
// - generateCaptcha() - 生成验证码图片和 token
// - verifyCaptcha(token, clicks) - 验证点击
```

- [ ] **Step 1: 创建 captcha.service.ts**
- [ ] **Step 2: 实现生成验证码方法**
- [ ] **Step 3: 实现验证方法**
- [ ] **Step 4: Commit**

---

### Task 4.3: 邮件验证码服务

**Files:**
- Create: `packages/server/src/commons/email.service.ts`
- Modify: `packages/server/src/auth/auth.service.ts`

**功能：**
- 发送邮件验证码（使用 Resend）
- 5分钟有效期
- 错误3次需重新获取

```typescript
// EmailService
// - sendVerificationCode(email, code) - 发送验证码
// - sendTeamInviteEmail(email, inviterName, teamName, link) - 发送团队邀请
```

- [ ] **Step 1: 创建 email.service.ts**
- [ ] **Step 2: 实现发送验证码方法**
- [ ] **Step 3: 实现邀请邮件方法**
- [ ] **Step 4: Commit**

---

### Task 4.4: 客户端注册 API 增强

**Files:**
- Modify: `packages/server/src/auth/auth.controller.ts`
- Modify: `packages/server/src/auth/auth.service.ts`

**新增 API:**
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /client/auth/send-code | 发送注册验证码（需图形验证） |
| POST | /client/auth/verify-code | 验证邮件验证码 |
| POST | /client/auth/register | 完成注册 |

**限流规则：**
- IP 每分钟最多 2 次注册请求

- [ ] **Step 1: 实现 send-code API**
- [ ] **Step 2: 实现 verify-code API**
- [ ] **Step 3: 实现限流逻辑**
- [ ] **Step 4: Commit**

---

### Task 4.5: 客户端注册页面增强

**Files:**
- Modify: `packages/client/src/pages/Register.tsx`

**流程：**
```
1. 输入邮箱
2. 图形验证码验证
3. 发送邮件验证码
4. 输入6位验证码
5. 设置密码和姓名
6. 完成注册
```

- [ ] **Step 1: 增强 Register.tsx 表单**
- [ ] **Step 2: 添加图形验证码组件**
- [ ] **Step 3: 添加邮件验证码倒计时**
- [ ] **Step 4: 测试完整流程**
- [ ] **Step 5: Commit**

---

## Phase 5: 团队邀请邮件功能

### Task 5.1: 团队邀请 API

**Files:**
- Modify: `packages/server/src/teams/teams.controller.ts`
- Modify: `packages/server/src/teams/teams.service.ts`

**新增 API:**
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /teams/:teamId/invite | 发送团队邀请邮件 |
| POST | /teams/invitations/:token/accept | 接受邀请 |
| GET | /teams/invitations/:id/revoke | 撤回邀请 |

**规则：**
- 邀请链接有效期 3 天
- 被邀请人必须是已注册用户
- 发送人可以撤回邀请

- [ ] **Step 1: 实现发送邀请 API**
- [ ] **Step 2: 实现接受邀请 API**
- [ ] **Step 3: 实现撤回邀请 API**
- [ ] **Step 4: Commit**

---

### Task 5.2: 客户端邀请页面

**Files:**
- Modify: `packages/client/src/pages/Profile.tsx`
- Create: `packages/client/src/components/InviteMemberDialog.tsx`

**功能：**
- 在团队管理中显示邀请按钮
- 输入邮箱发送邀请
- 显示待接受邀请列表

- [ ] **Step 1: 创建 InviteMemberDialog 组件**
- [ ] **Step 2: 增强 Profile 页面**
- [ ] **Step 3: 测试邀请流程**
- [ ] **Step 4: Commit**

---

### Task 5.3: 邀请链接处理页面

**Files:**
- Create: `packages/client/src/pages/Invite.tsx`

**功能：**
- 访问 `/invite?token=xxx` 处理邀请链接
- 有效则显示邀请信息并加入团队
- 无效则提示错误

- [ ] **Step 1: 创建 Invite 页面**
- [ ] **Step 2: 添加路由**
- [ ] **Step 3: Commit**

---

## Phase 6: 部署配置

### Task 6.1: Vite 代理配置

**Files:**
- Modify: `packages/admin/vite.config.ts`

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/admin': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 1: 配置 Vite 代理**
- [ ] **Step 2: Commit**

---

### Task 6.2: Nginx 配置示例

**Files:**
- Create: `docs/deployment/nginx.conf`

```nginx
# 管理后台
server {
    listen 443 ssl;
    server_name admin.example.com;
    root /var/www/admin/dist;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /admin {
        proxy_pass http://localhost:3000;
    }
}

# 客户端
server {
    listen 443 ssl;
    server_name app.example.com;
    root /var/www/client/dist;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /client {
        proxy_pass http://localhost:3000;
    }
}
```

- [ ] **Step 1: 创建 nginx 配置示例**
- [ ] **Step 2: Commit**

---

## 数据库变更汇总

```sql
-- Phase 2.1: admin 表
CREATE TABLE IF NOT EXISTS admin_users (...);
CREATE TABLE IF NOT EXISTS admin_invitations (...);
CREATE TABLE IF NOT EXISTS system_config (...);

-- Phase 4.1: 客户端验证码表
CREATE TABLE IF NOT EXISTS client_verification_codes (...);

-- Phase 5.1: 团队邀请表（可复用或新建）
-- team_invitations 表根据需要创建
```

---

## 环境变量

```env
# 后端
DATABASE_URL=postgresql://...
JWT_SECRET=...
RESEND_API_KEY=re_xxx

# 图形验证码
CAPTCHA_SECRET_KEY=xxx

# 域名
CLIENT_URL=https://app.example.com
ADMIN_URL=https://admin.example.com
```

---

## 执行顺序

1. Phase 1: 创建 admin 前端项目
2. Phase 2: 管理后台后端 API
3. Phase 3: 管理后台前端页面
4. Phase 4: 客户端注册验证码
5. Phase 5: 团队邀请邮件功能
6. Phase 6: 部署配置