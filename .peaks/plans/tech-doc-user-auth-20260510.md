---
name: 技术文档 - 用户认证模块
date: 2026-05-10
module: server-auth
---

# 用户认证模块技术文档

## 概述
为 ice-cola server 包实现完整的 JWT 用户认证模块。

## 技术方案

### 认证流程
1. 用户登录 → 返回 JWT token
2. token 携带 userId 和角色信息
3. 前端请求携带 Authorization: Bearer <token>

### 数据库设计
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API 端点
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /auth/register | 用户注册 |
| POST | /auth/login | 用户登录 |
| GET | /auth/me | 获取当前用户信息 |

## 实施步骤
1. 创建 auth 模块目录结构
2. 实现 DTO 和实体
3. 实现 service 层
4. 实现 controller 层
5. 添加单元测试
6. 集成测试

## 依赖
- NestJS Passport
- @nestjs/jwt
- bcrypt
