# OpenClaw Server Prisma Schema 设计

## 1. 数据模型总览

```prisma
// 完整数据模型包含以下模块:
// - Auth & User (用户认证)
// - Team (团队管理)
// - Quota (额度管理)
// - Market (市场资源)
// - Conversation (会话)
// - Audit (审计日志)
```

---

## 2. Auth & User 模块

### 2.1 User 模型

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique @db.VarChar(255)
  password      String    @db.VarChar(255)
  name          String    @db.VarChar(50)
  avatar        String?   @db.VarChar(500)
  role          TeamRole  @default(MEMBER)
  teamId        String?
  team          Team?     @relation(fields: [teamId], references: [id])

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 关联
  teamMember    TeamMember?
  quotaTransactions  QuotaTransaction[]
  auditLogs    AuditLog[]
  conversations Conversation[]
  messages      Message[]

  @@index([email])
  @@index([teamId])
}

enum TeamRole {
  OWNER
  ADMIN
  MEMBER
}
```

### 2.2 字段说明

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | 用户唯一标识 |
| email | String | Unique, VarChar(255) | 邮箱，唯一索引 |
| password | String | VarChar(255) | bcrypt 加密存储 |
| name | String | VarChar(50) | 显示名称 |
| avatar | String | Nullable, VarChar(500) | 头像 URL |
| role | TeamRole | Default MEMBER | 团队角色 |
| teamId | String | Nullable | 所属团队 |
| createdAt | DateTime | Default now() | 创建时间 |
| updatedAt | DateTime | @updatedAt | 更新时间 |

---

## 3. Team 模块

### 3.1 Team 模型

```prisma
model Team {
  id        String   @id @default(cuid())
  name     String   @db.VarChar(100)
  ownerId  String   @unique

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // 关联
  members        TeamMember[]
  quota         Quota?
  teamResources  TeamMarketResource[]
  installations ResourceInstallation[]
  conversations Conversation[]

  @@index([name])
  @@index([ownerId])
}
```

### 3.2 TeamMember 模型

```prisma
model TeamMember {
  id       String   @id @default(cuid())
  teamId   String
  userId   String   @unique
  role     TeamRole @default(MEMBER)
  joinedAt DateTime @default(now())

  team     Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([teamId])
  @@index([userId])
}
```

### 3.3 团队相关表关系

```
Team (1) ──────< TeamMember (N)
      └─────< Quota (1)
      └─────< TeamMarketResource (N)
      └─────< ResourceInstallation (N)
      └─────< Conversation (N)

TeamMember >── User (1)
```

---

## 4. Quota 模块

### 4.1 Quota 模型

```prisma
model Quota {
  id          String     @id @default(cuid())
  teamId      String     @unique
  totalAmt    BigInt     @default(-1)  // -1 表示无限
  usedAmt     BigInt     @default(0)
  period      QuotaPeriod @default(MONTHLY)
  resetDay    Int        @default(1)   // 每月重置日
  resetAt     DateTime?              // 下次重置时间

  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  team        Team       @relation(fields: [teamId], references: [id], onDelete: Cascade)
  transactions QuotaTransaction[]

  @@index([teamId])
}

enum QuotaPeriod {
  DAILY
  MONTHLY
}
```

### 4.2 QuotaTransaction 模型

```prisma
model QuotaTransaction {
  id            String           @id @default(cuid())
  quotaId       String
  userId        String
  userName      String           // 冗余存储
  amount        BigInt           // 负数=消耗，正数=充值
  balanceBefore BigInt
  balanceAfter  BigInt
  type          TransactionType
  note          String?          @db.Text
  metadata      Json?            // 扩展信息：模型、tokens等
  createdAt     DateTime         @default(now())

  quota         Quota            @relation(fields: [quotaId], references: [id], onDelete: Cascade)
  user          User             @relation(fields: [userId], references: [id])

  @@index([quotaId])
  @@index([userId])
  @@index([createdAt])
  @@index([type])
}

enum TransactionType {
  USAGE      // 使用额度
  RECHARGE   // 管理员充值
  RESET      // 系统重置
}
```

### 4.3 额度计算逻辑

```typescript
// 剩余额度计算
remainingAmt = quota.totalAmt === -1 ? -1 : quota.totalAmt - quota.usedAmt

// 是否无限额度
isUnlimited = quota.totalAmt === -1

// 是否应该重置
shouldReset = quota.resetAt && new Date() >= quota.resetAt
```

---

## 5. Market 模块

### 5.1 GlobalMarketResource 公共市场资源

```prisma
model GlobalMarketResource {
  id           String        @id @default(cuid())
  name         String        @db.VarChar(100)
  description  String?       @db.Text
  category     ResourceCategory
  authorId     String
  manifest     Json          // 资源清单配置
  version      String        @db.VarChar(20)
  downloadCnt  Int           @default(0)
  rating       Float         @default(0)
  status       ResourceStatus @default(PENDING_REVIEW)
  securityCheckId String?    @unique

  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  // 关联
  author          User                 @relation(fields: [authorId], references: [id])
  versions        ResourceVersion[]
  securityCheck   SecurityCheck?
  teamResources   TeamMarketResource[]

  @@unique([name, category])
  @@index([category])
  @@index([authorId])
  @@index([status])
}

enum ResourceCategory {
  SKILL
  PLUGIN
  MCP
}

enum ResourceStatus {
  PENDING_REVIEW  // 待审核
  CHECKING        // 安全检查中
  APPROVED        // 已通过
  REJECTED        // 已拒绝
  DEPRECATED      // 已废弃
}
```

### 5.2 ResourceVersion 资源版本

```prisma
model ResourceVersion {
  id           String   @id @default(cuid())
  resourceId   String
  version      String  @db.VarChar(20)
  manifest     Json     // 该版本的完整配置
  changelog    String?  @db.Text
  createdAt    DateTime @default(now())

  resource     GlobalMarketResource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  @@unique([resourceId, version])
  @@index([resourceId])
}
```

### 5.3 SecurityCheck 安全检查记录

```prisma
model SecurityCheck {
  id           String           @id @default(cuid())
  resourceId   String           @unique
  status       SecurityStatus   @default(PENDING)
  scanResult   Json?            // 扫描结果详情
  checkedAt    DateTime?
  checkedBy    String?          // 审核人员
  rejectReason String?          @db.Text

  createdAt    DateTime         @default(now())

  @@index([status])
}

enum SecurityStatus {
  PENDING     // 待检查
  PASSED      // 通过
  FAILED      // 未通过
  SKIPPED     // 跳过
}
```

### 5.4 TeamMarketResource 团队本地资源

```prisma
model TeamMarketResource {
  id           String           @id @default(cuid())
  teamId       String
  globalResourceId String?      // 从公共市场同步
  name         String          @db.VarChar(100)
  description  String?         @db.Text
  category     ResourceCategory
  source       ResourceSource
  manifest     Json
  version      String           @db.VarChar(20)
  status       ResourceStatus   @default(PENDING_APPROVE)
  syncedAt     DateTime?
  approvedAt   DateTime?
  approvedBy   String?

  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  team         Team             @relation(fields: [teamId], references: [id], onDelete: Cascade)
  globalResource GlobalMarketResource? @relation(fields: [globalResourceId], references: [id])
  installations ResourceInstallation[]

  @@unique([teamId, name, category])
  @@index([teamId])
  @@index([globalResourceId])
  @@index([status])
}

enum ResourceSource {
  SYNC         // 从公共市场同步
  LOCAL        // 团队内部创建
}
```

### 5.5 ResourceInstallation 安装记录

```prisma
model ResourceInstallation {
  id           String   @id @default(cuid())
  teamId       String
  resourceId   String
  version      String   @db.VarChar(20)
  installedAt  DateTime @default(now())
  updatedAt    DateTime @updatedAt

  team         Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  resource     TeamMarketResource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  @@unique([teamId, resourceId])
  @@index([teamId])
  @@index([resourceId])
}
```

### 5.6 市场模块关系图

```
GlobalMarketResource (1) ──────< ResourceVersion (N)
       │
       │
       └────────< TeamMarketResource (N) ──────< ResourceInstallation (N)
       │                │
       │                │
       └────< SecurityCheck (1)        Team (1)
                                              │
                                              └───── TeamMember (N)
                                                       │
                                                       └───── User (1)
```

---

## 6. Conversation 模块

### 6.1 Conversation 模型

```prisma
model Conversation {
  id       String   @id @default(cuid())
  teamId   String
  title    String   @db.VarChar(200)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  team     Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  messages Message[]

  @@index([teamId])
  @@index([createdAt])
}
```

### 6.2 Message 模型

```prisma
model Message {
  id             String     @id @default(cuid())
  conversationId String
  role           MessageRole
  content        String     @db.Text
  model          String?    @db.VarChar(50)  // AI 模型
  usage          Json?                         // token 用量
  createdAt      DateTime   @default(now())

  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@index([createdAt])
}

enum MessageRole {
  user
  assistant
  system
}
```

### 6.3 会话模块关系图

```
Team (1) ──────< Conversation (N)
                   │
                   └─────< Message (N)
```

---

## 7. Audit 模块

### 7.1 AuditLog 审计日志

```prisma
model AuditLog {
  id         String      @id @default(cuid())
  teamId     String?
  userId     String
  action     String      @db.VarChar(100)   // 操作类型
  resource   String?     @db.VarChar(50)    // 资源类型
  resourceId String?     @db.VarChar(100)   // 资源ID
  details    Json?                          // 详细信息
  ipAddress  String?     @db.VarChar(45)    // IPv6
  userAgent  String?     @db.VarChar(500)
  createdAt  DateTime    @default(now())

  team       Team?       @relation(fields: [teamId], references: [id], onDelete: SetNull)
  user       User        @relation(fields: [userId], references: [id])

  @@index([teamId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@index([resource, resourceId])
}
```

### 7.2 操作类型枚举

| action | 说明 | resource |
|--------|------|----------|
| USER_REGISTER | 用户注册 | user |
| USER_LOGIN | 用户登录 | session |
| USER_LOGOUT | 用户登出 | session |
| TEAM_CREATE | 创建团队 | team |
| TEAM_UPDATE | 更新团队 | team |
| MEMBER_INVITE | 邀请成员 | member |
| MEMBER_REMOVE | 移除成员 | member |
| MEMBER_ROLE_CHANGE | 角色变更 | member |
| QUOTA_RECHARGE | 额度充值 | quota |
| QUOTA_RESET | 额度重置 | quota |
| RESOURCE_PUBLISH | 发布资源 | resource |
| RESOURCE_SYNC | 同步资源 | resource |
| RESOURCE_INSTALL | 安装资源 | installation |
| RESOURCE_UNINSTALL | 卸载资源 | installation |
| RESOURCE_APPROVE | 审核通过 | resource |
| RESOURCE_REJECT | 审核拒绝 | resource |

---

## 8. 完整 Schema 文件

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============== Auth & User ==============

model User {
  id        String   @id @default(cuid())
  email     String   @unique @db.VarChar(255)
  password  String   @db.VarChar(255)
  name      String   @db.VarChar(50)
  avatar    String?  @db.VarChar(500)
  role      TeamRole @default(MEMBER)
  teamId    String?
  team      Team?    @relation(fields: [teamId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  teamMember       TeamMember?
  transactions     QuotaTransaction[]
  auditLogs        AuditLog[]
  conversations    Conversation[]
  messages         Message[]

  @@index([email])
  @@index([teamId])
}

enum TeamRole {
  OWNER
  ADMIN
  MEMBER
}

// ============== Team ==============

model Team {
  id        String   @id @default(cuid())
  name      String   @db.VarChar(100)
  ownerId   String   @unique

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members       TeamMember[]
  quota         Quota?
  teamResources TeamMarketResource[]
  installations ResourceInstallation[]
  conversations Conversation[]
  auditLogs     AuditLog[]

  @@index([name])
  @@index([ownerId])
}

model TeamMember {
  id       String   @id @default(cuid())
  teamId   String
  userId   String   @unique
  role     TeamRole @default(MEMBER)
  joinedAt DateTime @default(now())

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([teamId])
  @@index([userId])
}

// ============== Quota ==============

model Quota {
  id       String      @id @default(cuid())
  teamId   String      @unique
  totalAmt BigInt      @default(-1)
  usedAmt  BigInt      @default(0)
  period   QuotaPeriod @default(MONTHLY)
  resetDay Int         @default(1)
  resetAt  DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  team         Team              @relation(fields: [teamId], references: [id], onDelete: Cascade)
  transactions QuotaTransaction[]

  @@index([teamId])
}

enum QuotaPeriod {
  DAILY
  MONTHLY
}

model QuotaTransaction {
  id            String          @id @default(cuid())
  quotaId       String
  userId        String
  userName      String
  amount        BigInt
  balanceBefore BigInt
  balanceAfter  BigInt
  type          TransactionType
  note          String?         @db.Text
  metadata      Json?
  createdAt     DateTime        @default(now())

  quota Quota @relation(fields: [quotaId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id])

  @@index([quotaId])
  @@index([userId])
  @@index([createdAt])
  @@index([type])
}

enum TransactionType {
  USAGE
  RECHARGE
  RESET
}

// ============== Market ==============

model GlobalMarketResource {
  id              String           @id @default(cuid())
  name            String           @db.VarChar(100)
  description     String?          @db.Text
  category        ResourceCategory
  authorId        String
  manifest        Json
  version         String           @db.VarChar(20)
  downloadCnt     Int              @default(0)
  rating          Float            @default(0)
  status          ResourceStatus   @default(PENDING_REVIEW)
  securityCheckId String?          @unique

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  author        User              @relation(fields: [authorId], references: [id])
  versions      ResourceVersion[]
  securityCheck SecurityCheck?
  teamResources TeamMarketResource[]

  @@unique([name, category])
  @@index([category])
  @@index([authorId])
  @@index([status])
}

enum ResourceCategory {
  SKILL
  PLUGIN
  MCP
}

enum ResourceStatus {
  PENDING_REVIEW
  CHECKING
  APPROVED
  REJECTED
  DEPRECATED
}

model ResourceVersion {
  id         String   @id @default(cuid())
  resourceId String
  version    String   @db.VarChar(20)
  manifest   Json
  changelog  String?  @db.Text
  createdAt  DateTime @default(now())

  resource GlobalMarketResource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  @@unique([resourceId, version])
  @@index([resourceId])
}

model SecurityCheck {
  id           String         @id @default(cuid())
  resourceId   String         @unique
  status       SecurityStatus @default(PENDING)
  scanResult   Json?
  checkedAt    DateTime?
  checkedBy    String?
  rejectReason String?        @db.Text

  createdAt DateTime @default(now())

  @@index([status])
}

enum SecurityStatus {
  PENDING
  PASSED
  FAILED
  SKIPPED
}

model TeamMarketResource {
  id               String           @id @default(cuid())
  teamId           String
  globalResourceId String?
  name             String           @db.VarChar(100)
  description      String?         @db.Text
  category         ResourceCategory
  source           ResourceSource
  manifest         Json
  version          String           @db.VarChar(20)
  status           ResourceStatus   @default(PENDING_APPROVE)
  syncedAt         DateTime?
  approvedAt       DateTime?
  approvedBy       String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  team          Team                   @relation(fields: [teamId], references: [id], onDelete: Cascade)
  globalResource GlobalMarketResource?  @relation(fields: [globalResourceId], references: [id])
  installations ResourceInstallation[]

  @@unique([teamId, name, category])
  @@index([teamId])
  @@index([globalResourceId])
  @@index([status])
}

enum ResourceSource {
  SYNC
  LOCAL
}

model ResourceInstallation {
  id          String   @id @default(cuid())
  teamId      String
  resourceId  String
  version     String  @db.VarChar(20)
  installedAt DateTime @default(now())
  updatedAt   DateTime @updatedAt

  team    Team                 @relation(fields: [teamId], references: [id], onDelete: Cascade)
  resource TeamMarketResource  @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  @@unique([teamId, resourceId])
  @@index([teamId])
  @@index([resourceId])
}

// ============== Conversation ==============

model Conversation {
  id        String   @id @default(cuid())
  teamId    String
  title     String   @db.VarChar(200)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  team     Team      @relation(fields: [teamId], references: [id], onDelete: Cascade)
  messages Message[]

  @@index([teamId])
  @@index([createdAt])
}

model Message {
  id             String      @id @default(cuid())
  conversationId String
  role           MessageRole
  content        String      @db.Text
  model          String?     @db.VarChar(50)
  usage          Json?
  createdAt      DateTime    @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@index([createdAt])
}

enum MessageRole {
  user
  assistant
  system
}

// ============== Audit ==============

model AuditLog {
  id         String   @id @default(cuid())
  teamId     String?
  userId     String
  action     String   @db.VarChar(100)
  resource   String?  @db.VarChar(50)
  resourceId String?  @db.VarChar(100)
  details    Json?
  ipAddress  String?  @db.VarChar(45)
  userAgent  String?  @db.VarChar(500)
  createdAt  DateTime @default(now())

  team Team? @relation(fields: [teamId], references: [id], onDelete: SetNull)
  user User  @relation(fields: [userId], references: [id])

  @@index([teamId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@index([resource, resourceId])
}
```

---

## 9. 索引设计

| 表 | 索引类型 | 字段 | 用途 |
|----|---------|------|------|
| User | Unique | email | 登录查询 |
| User | Index | teamId | 团队成员查询 |
| Team | Unique | ownerId | 团队所有者查询 |
| TeamMember | Unique | userId | 成员唯一性 |
| TeamMember | Index | teamId | 团队成员列表 |
| Quota | Unique | teamId | 额度查询 |
| QuotaTransaction | Index | quotaId | 交易记录查询 |
| QuotaTransaction | Index | userId | 用户操作记录 |
| QuotaTransaction | Index | createdAt | 时间范围查询 |
| GlobalMarketResource | Unique | (name, category) | 资源唯一性 |
| GlobalMarketResource | Index | category | 分类筛选 |
| GlobalMarketResource | Index | status | 状态筛选 |
| ResourceVersion | Unique | (resourceId, version) | 版本唯一性 |
| SecurityCheck | Unique | resourceId | 资源安全检查 |
| TeamMarketResource | Unique | (teamId, name, category) | 团队内唯一 |
| TeamMarketResource | Index | teamId | 团队资源列表 |
| TeamMarketResource | Index | status | 状态筛选 |
| ResourceInstallation | Unique | (teamId, resourceId) | 安装唯一性 |
| Conversation | Index | teamId | 团队会话列表 |
| Conversation | Index | createdAt | 时间排序 |
| Message | Index | conversationId | 消息查询 |
| AuditLog | Index | teamId | 团队审计 |
| AuditLog | Index | userId | 用户操作 |
| AuditLog | Index | (resource, resourceId) | 资源操作历史 |

---

## 10. 级联删除规则

| 父表 | 子表 | 删除规则 |
|------|------|---------|
| Team | TeamMember | Cascade |
| Team | Quota | Cascade |
| Team | TeamMarketResource | Cascade |
| Team | ResourceInstallation | Cascade |
| Team | Conversation | Cascade |
| Team | AuditLog | SetNull |
| GlobalMarketResource | ResourceVersion | Cascade |
| GlobalMarketResource | SecurityCheck | Cascade |
| TeamMarketResource | ResourceInstallation | Cascade |
| Conversation | Message | Cascade |
| Quota | QuotaTransaction | Cascade |

---

*文档版本: v1.0*
*更新日期: 2026-04-26*
