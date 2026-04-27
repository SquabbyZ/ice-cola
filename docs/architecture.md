# Hermes + OpenClaw 产品架构

## 1. 产品定位

**Hermes** 是一款基于 AI 的桌面效率产品，核心思想是"各司其职，优势互补"：

- **Hermes** 作为"大脑"：负责复杂思考、规划、决策
- **OpenClaw** 作为"手脚"：负责执行标准化任务

```
┌─────────────────────────────────────────────────────────────────┐
│                         Hermes                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    OpenClaw Desktop                       │  │
│  │                    (Tauri + React)                        │  │
│  │                                                           │  │
│  │  ┌─────────────────┐     ┌─────────────────────────────┐  │  │
│  │  │   Hermes        │ +   │   OpenClaw Tools           │  │  │
│  │  │   (大脑)        │     │   (手脚)                    │  │  │
│  │  │                 │     │                             │  │  │
│  │  │  - 意图分析     │     │  - AI Chat                 │  │  │
│  │  │  - 任务规划     │     │  - Search                  │  │  │
│  │  │  - 工具编排     │     │  - Code Runner             │  │  │
│  │  │  - 本地记忆     │     │  - FileOps                 │  │  │
│  │  └─────────────────┘     └─────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│               ┌────────────────────────────┐                    │
│               │    OpenClaw Server         │                    │
│               │    (NestJS + PostgreSQL)   │                    │
│               │    团队私有部署              │                    │
│               └────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                              │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                         Hermes Desktop                                  │   │
│   │                    (OpenClaw Desktop + Hermes Module)                   │   │
│   │                                                                      │   │
│   │   ┌───────────────────────────────────────────────────────────────┐   │   │
│   │   │                    Hermes Core (大脑)                        │   │   │
│   │   │                                                               │   │   │
│   │   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │   │
│   │   │   │  Planner    │  │  Memory     │  │  Orchestrator│        │   │   │
│   │   │   │  任务规划    │  │  记忆管理    │  │  工具编排    │         │   │   │
│   │   │   └─────────────┘  └─────────────┘  └─────────────┘         │   │   │
│   │   └───────────────────────────────────────────────────────────────┘   │   │
│   │                                 │                                      │   │
│   │   ┌─────────────────────────────┼───────────────────────────────┐   │   │
│   │   │                    OpenClaw Tools (手脚)                   │   │   │
│   │   │                                                               │   │   │
│   │   │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │   │
│   │   │   │ AI Chat  │  │  Search  │  │Code Runner│  │ FileOps  │   │   │   │
│   │   │   └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │   │
│   │   └───────────────────────────────────────────────────────────────┘   │   │
│   └───────────────────────────────────────────────────────────────────┘   │
│                                    │                                              │
│                                    ▼                                              │
│               ┌────────────────────────────────────────────────────┐             │
│               │              OpenClaw Server                        │             │
│               │              (NestJS + PostgreSQL)                 │             │
│               │              团队私有部署                           │             │
│               │                                                       │             │
│               │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │             │
│               │  │ Auth    │  │ Team    │  │ Quota   │  │ Market  │ │             │
│               │  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │             │
│               │  ┌─────────┐  ┌─────────┐  ┌─────────┐              │             │
│               │  │ AI GW   │  │ Conv    │  │ Audit   │              │             │
│               │  └─────────┘  └─────────┘  └─────────┘              │             │
│               └──────────────────────────────────────────────────────┘             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                                    ▲
                                    │ 同步上游开源更新
                                    │
                         ┌─────────────────────┐
                         │   peaksclaw/openclaw │  ← 开源社区 (上游)
                         │   (OpenClaw Client)  │
                         └─────────────────────┘
```

## 3. 组件职责

### 3.1 Hermes Core (大脑)

| 模块 | 职责 | 说明 |
|------|------|------|
| **Planner** | 任务规划 | 分析用户意图，分解复杂任务为可执行步骤 |
| **Memory** | 记忆管理 | 存储会话历史、上下文、知识图谱 |
| **Orchestrator** | 工具编排 | 选择合适工具、协调多工具协作、整合结果 |

### 3.2 OpenClaw Tools (手脚)

| 工具 | 能力 | 调用方式 |
|------|------|----------|
| **AI Chat** | 对话、总结、生成 | REST API |
| **Search** | 网络搜索、信息查询 | REST API |
| **Code Runner** | 执行 Python/JS 代码、数据分析 | 子进程 |
| **FileOps** | 文件读写、Excel/PPT 处理 | Node.js API |

### 3.3 OpenClaw Server (后端)

| 模块 | 职责 | 核心 API |
|------|------|----------|
| **Auth** | 认证鉴权 | /auth/login, /auth/register |
| **Team** | 团队管理 | /teams, /teams/:id/members |
| **Quota** | 额度管理 | /quotas, /quotas/recharge |
| **Market** | 市场资源 | /market/resources, /market/sync |
| **AI GW** | AI 路由 | 内部调用 |
| **Audit** | 审计日志 | 自动记录 |

## 4. 典型场景示例

### 场景 1: 数据分析报告生成

```
用户: "我上传了 3 份销售数据表格，帮我生成一份月度报告 PPT"
```

**Hermes 思考流程:**

```
Step 1: 理解任务 → 生成 PPT 报告
Step 2: 分析文件 → 3 份 Excel 表格
Step 3: 规划执行步骤:
  ├── Tool: FileOps → 读取 3 份 Excel 文件
  ├── Tool: CodeRunner(Python) → 数据清洗、合并
  ├── Tool: CodeRunner(Python) → 统计分析
  ├── Tool: AI Chat → 生成分析结论文字
  ├── Tool: CodeRunner(Python) → 生成图表
  ├── Tool: AI Chat → 生成 PPT 内容和排版建议
  ├── Tool: CodeRunner(Python) → 生成 PPT 文件
  └── Tool: FileOps → 保存到本地
Step 4: 整合结果 → 返回 PPT 文件路径
```

### 场景 2: 团队协作任务

```
用户: "帮我搜索最新 AI 技术趋势，写一份技术报告分享给团队"
```

**Hermes 思考流程:**

```
Step 1: 理解任务 → 搜索 + 写报告 + 分享
Step 2: 规划步骤:
  ├── Tool: Search → 搜索 AI 技术趋势
  ├── Tool: AI Chat → 整理总结
  ├── Tool: AI Chat → 写技术报告
  └── Tool: Market → 发布到团队知识库
Step 3: 执行并返回报告
```

### 场景 3: 复杂代码任务

```
用户: "用 Python 写一个快速排序，然后翻译成英文，最后添加注释"
```

**Hermes 思考流程:**

```
Step 1: 理解任务 → 写代码 + 翻译 + 注释
Step 2: 规划步骤:
  ├── Tool: CodeRunner → 编写快速排序
  ├── Tool: AI Chat → 翻译成英文
  ├── Tool: CodeRunner → 添加注释
  └── Tool: FileOps → 保存文件
Step 3: 整合结果
```

## 5. OpenClaw Server 数据模型

### 5.1 ER 图

```
User ───┬─── TeamMember ───┬─── Team
        │                  │
        │                  ├── Quota ──── QuotaTransaction
        │                  │
        │                  └── TeamMarketResource ──── MarketResource
        │                                      │
        └── ResourceInstallation               │
                                             ├── GlobalMarketResource (公共市场)
                                             ├── ResourceVersion
                                             └── SecurityCheck

AuditLog (审计日志 ─── 记录所有敏感操作)
```

### 5.2 核心实体

| 实体 | 说明 |
|------|------|
| **User** | 用户信息、认证 |
| **Team** | 团队、成员、角色 |
| **Quota** | 额度配置 (-1=无限)、重置周期 |
| **QuotaTransaction** | 额度交易记录 (消费/充值/重置) |
| **MarketResource** | 市场资源 (Skill/Plugin/MCP) |
| **GlobalMarketResource** | 公共市场资源 (平台方审核) |
| **TeamMarketResource** | 团队本地资源 (管理员审核) |
| **ResourceInstallation** | 安装记录 |
| **AuditLog** | 审计日志 |

### 5.3 角色权限

| 角色 | 权限 |
|------|------|
| **OWNER** | 转移团队、删除团队、设置所有权限 |
| **ADMIN** | 手动调整额度、审核团队资源、同步公共市场 |
| **MEMBER** | 使用 AI 对话、查看自己用量 |

## 6. 市场模块设计

### 6.1 资源发布流程

| 发布目标 | 流程 | 审核要求 |
|----------|------|----------|
| **公共市场** | 提交 → 安全扫描 → 平台审核 → 发布 | 平台方审核 |
| **团队本地市场** | 提交 → 管理员审核 → 发布 | ADMIN+ 审核 |

### 6.2 资源同步流程

```
公共市场                    团队私有市场
     │                            │
     │  ADMIN+ 发起同步           │
     ├───────────────────────────►│
     │                            │ 记录到 AuditLog
     │                            │ 设置 status=TEAM_APPROVED
     │                            │
     │                            ▼
     │                    团队成员可安装
```

## 7. 技术栈

### 客户端
- **Tauri 2.0** - 桌面应用框架
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vitest** - 单元测试

### 服务端
- **NestJS** - 后端框架
- **Prisma** - ORM
- **PostgreSQL** - 数据库
- **Redis** - 缓存/队列

### 工具链
- **pnpm** - 包管理 (Monorepo)
- **GitHub Actions** - CI/CD

## 8. 项目结构 (Monorepo)

```
hermes/
├── packages/
│   ├── client/                    ← OpenClaw Desktop (Tauri)
│   │   ├── src/
│   │   │   ├── hermes/            ← Hermes 大脑模块
│   │   │   │   ├── planner.ts
│   │   │   │   ├── memory.ts
│   │   │   │   └── orchestrator.ts
│   │   │   ├── tools/             ← OpenClaw Tools
│   │   │   │   ├── ai-chat.ts
│   │   │   │   ├── search.ts
│   │   │   │   ├── code-runner.ts
│   │   │   │   └── file-ops.ts
│   │   │   └── main.ts
│   │   ├── tauri.conf.json
│   │   └── package.json
│   │
│   └── server/                    ← OpenClaw Server (NestJS)
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── team/
│       │   │   ├── quota/
│       │   │   ├── market/
│       │   │   ├── conversation/
│       │   │   └── ai-gateway/
│       │   └── main.ts
│       ├── prisma/
│       │   └── schema.prisma
│       └── package.json
│
├── package.json                   ← Root workspace
├── pnpm-workspace.yaml
└── README.md
```

## 9. 安全设计

### 9.1 安全风险模型

```
┌─────────────────────────────────────────────────────────────────┐
│                        安全风险模型                              │
│                                                                 │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐       │
│  │  凭证窃取   │      │  额度滥用   │      │  数据泄露   │       │
│  │  JWT/Token │      │  绕过限制   │      │  团队数据   │       │
│  └──────┬─────┘      └──────┬─────┘      └──────┬─────┘       │
│         │                  │                  │               │
│         └──────────────────┼──────────────────┘               │
│                            │                                   │
│                            ▼                                   │
│                   ┌─────────────────┐                         │
│                   │   客户端被攻破    │                         │
│                   │   (Tauri Jailbreak)                        │
│                   └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 设计原则

| 原则 | 说明 | 实现方式 |
|------|------|----------|
| **零信任** | 不信任客户端所有输入 | 服务端二次校验 |
| **最小权限** | 客户端只做必要操作 | 工具调用限制 |
| **纵深防御** | 多层安全防护 | 端+云双层校验 |

### 9.3 凭证安全

**风险**: JWT Token 存在本地可能被窃取

**方案**: 使用 Tauri Secure Storage + OS Keychain

```typescript
// 安全存储设计
interface SecureVault {
  // JWT Access Token (短期, 15分钟)
  getAccessToken(): Promise<string | null>;
  setAccessToken(token: string): Promise<void>;
  
  // Refresh Token (长期, 7天)
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string): Promise<void>;
  
  // Team Credential (加密团队标识)
  getTeamCredential(teamId: string): Promise<string | null>;
  setTeamCredential(teamId: string, cred: string): Promise<void>;
  
  // 清除所有凭证 (登出时)
  clearAll(): Promise<void>;
}

// 使用 OS 原生密钥链存储敏感数据
// Windows: Credential Manager
// macOS: Keychain
// Linux: libsecret
```

### 9.4 服务端校验 (纵深防御)

**核心原则**: 服务端永远不要相信客户端

```typescript
// NestJS Guard - 所有请求都要过
@Injectable()
export class QuotaGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // 从 JWT 解码
    
    // 服务端独立校验额度，不信任客户端
    const quota = await this.quotaService.getQuota(user.teamId);
    
    if (!this.quotaService.hasEnough(quota, request.tokensNeeded)) {
      throw new HttpException('额度不足', 403);
    }
    
    return true;
  }
}

// 服务端强制校验: Token有效性 + 额度检查 + 频率限制 + 审计记录
```

### 9.5 工具执行沙箱

**风险**: CodeRunner 执行用户代码可能被滥用

**开源沙箱方案**:

| 方案 | 说明 | 适用场景 |
|------|------|----------|
| **WebContainer** | 浏览器级沙箱 (StackBlitz) | 轻量 JS/Python |
| **Docker Container** | 容器级隔离 | 中等隔离需求 |
| **Bottler** | VM 级隔离 (Deno) | 高安全需求 |
| **Wasmtime** | WASM 沙箱 | 跨平台轻量 |
| **QuickJS** | 轻量 JS 引擎 | 简单脚本 |

**白名单限制**:

```typescript
const ALLOWED_OPERATIONS = {
  'python': ['numpy', 'pandas', 'matplotlib', 'python-pptx'],
  'javascript': ['math', 'date', 'json', 'array-methods'],
  'file': ['read', 'write'] // 只在工作目录内
};

const FORBIDDEN = {
  'python': ['os', 'sys', 'subprocess', 'socket'],
  'javascript': ['require', 'process', 'fs (outside workspace)'],
};
```

### 9.6 AI API Key 保护

**风险**: API Key 泄露导致额度被盗

**方案**: 服务端代理，客户端不存 Key

```
不安全:
┌────────────────┐
│  Client         │
│  API Key: xxx   │  ← 被逆向工程获取
└────────────────┘

安全:
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Client         │ ─► │  OpenClaw Srv  │ ─► │  OpenAI API   │
│  (无 API Key)   │     │  (服务端存Key)  │     │               │
└────────────────┘     └────────────────┘     └────────────────┘
```

```typescript
// 客户端不存储任何 AI API Key
// 所有 AI 请求通过服务端代理
@Injectable()
export class AiGatewayService {
  async chat(request: ChatRequest): Promise<ChatResponse> {
    // 1. 服务端校验额度
    await this.quotaService.checkAndConsume(user.teamId, tokens);
    
    // 2. 代理请求到 AI Provider (Key 只在服务端)
    const response = await this.openAI.chat({
      model: request.model,
      messages: request.messages,
    });
    
    // 3. 记录审计日志
    await this.auditLog.log({
      action: 'AI_CHAT',
      userId: request.userId,
      teamId: request.teamId,
      tokens: response.usage.total_tokens,
    });
    
    return response;
  }
}
```

### 9.7 团队数据隔离

**风险**: 客户端被攻破后可能访问其他团队数据

**方案**: 服务端从 JWT 解析 teamId，禁止客户端指定

```typescript
// 禁止客户端传入 teamId，所有查询基于服务端 JWT 解码
const teamId = request.user.teamId; // 服务端解码 JWT

// 不安全: 客户端可伪造
// headers: { 'X-Team-Id': 'team-123' }

// 安全: 服务端强制覆盖
@Injectable()
export class TeamDataIsolation implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // JWT 解码后的用户信息
    
    // 确保用户只能访问自己团队的数据
    request.teamId = user.teamId; // 强制覆盖客户端可能传入的值
    
    return true;
  }
}
```

### 9.8 审计与监控

```typescript
// 所有敏感操作都要记录审计日志
enum AuditAction {
  AUTH_LOGIN = 'auth:login',
  AUTH_LOGOUT = 'auth:logout',
  QUOTA_CHECK = 'quota:check',
  QUOTA_CONSUME = 'quota:consume',
  AI_CHAT = 'ai:chat',
  FILE_READ = 'file:read',
  FILE_WRITE = 'file:write',
  CODE_EXECUTE = 'code:execute',
  MARKET_SYNC = 'market:sync',
}

// 异常检测: 额度异常消耗警告
async function detectAnomaly(userId: string) {
  const usage = await this.quotaService.getUsage(userId);
  
  // 检测: 1小时内消耗超过日均额度 10倍
  if (usage.last1h > usage.avgDaily * 10) {
    await this.alertService.send({
      type: 'QUOTA_ANOMALY',
      userId,
      message: '检测到异常额度消耗'
    });
  }
}
```

### 9.9 客户端安全 (防木马化)

**风险**: Hermes/OpenClaw 被黑客攻破后，作为木马危害用户 PC

```
黑客攻破后的威胁:
├── 读取本地文件 (Tauri 有文件系统权限)
├── 键盘记录 (输入敏感信息)
├── 屏幕截图
├── 建立后门连接 (C2)
├── 窃取浏览器 cookies/密码
└── 作为跳板攻击内网
```

#### 9.9.1 代码签名 (防止篡改)

```typescript
// Tauri 配置: 强制要求官方签名
{
  "tauri": {
    "security": {
      "require-signatures": true,  // 必须签名才能运行
      "bundle-signature": "sha256" // 签名算法
    }
  }
}

// 签名验证流程:
// 开发者发布 → 代码签名 → 用户下载 → 自动验证签名 → 签名无效拒绝运行
```

#### 9.9.2 启动完整性检查

```typescript
// 启动时自检
async function integrityCheck(): Promise<boolean> {
  // 1. 检查二进制文件 hash
  const binaryHash = await crypto.subtle.digest('SHA-256', binaryData);

  // 2. 检查配置文件是否被篡改
  const configHash = await crypto.subtle.digest('SHA-256', configData);

  // 3. 检查是否有未知进程注入
  const processList = await psutil.processes();
  const suspicious = processList.filter(p =>
    p.name.includes('inject') || p.name.includes('hook')
  );

  if (suspicious.length > 0) {
    return false;
  }

  return true;
}

// 启动失败时提示用户
if (!(await integrityCheck())) {
  alert('检测到程序被篡改，请重新下载安装');
  exit(1);
}
```

#### 9.9.3 权限最小化

```typescript
// Tauri 权限控制 - 只给必要权限
{
  "tauri": {
    "permissions": [
      "fs:default",           // 默认文件系统
      "fs:allow-app-read",    // 只读 app 目录
      "fs:deny-home-access",   // 禁止访问用户 home 目录
      "fs:deny-system-access",  // 禁止访问系统目录
      "net:default",          // 默认网络
      "net:allow-hermes-api"   // 只允许连接官方 API
    ]
  }
}
```

#### 9.9.4 网络锁定 (防止 C2 后门)

```typescript
// 网络白名单 + 证书锁定
const ALLOWED_CONNECTIONS = [
  'api.hermes-ai.com',
  'openclaw-server.team-*.com',
];

const FORBIDDEN_PATTERNS = [
  /cnc\.|trojan\.|backdoor/,  // 禁止连接 C2 服务器
  /\.exe$/,                   // 禁止下载执行文件
];

// 所有网络请求都必须 TLS 1.3 + 证书锁定
// 如果证书不匹配，立即终止连接
```

#### 9.9.5 运行时行为监控

```typescript
// 监控异常行为
interface SecurityMonitor {
  // 检测异常网络连接
  onUnexpectedConnection: (target: string) => void;

  // 检测异常文件访问
  onSensitiveFileAccess: (path: string) => void;

  // 检测异常权限请求
  onPrivilegeEscalation: () => void;
}

// 记录白名单行为，检测黑名单行为
const ALLOWED_CONNECTIONS = [
  'api.hermes-ai.com',
  'openclaw-server.team-*.com',
];

const FORBIDDEN_PATTERNS = [
  /cnc\.|trojan\.|backdoor/,  // 禁止连接 C2 服务器
  /\.exe$/,                   // 禁止下载执行文件
];
```

#### 9.9.6 远程证明 (Remote Attestation)

```
┌─────────────────┐     ┌─────────────────┐
│  用户 PC        │     │  官方服务器     │
│                 │     │                 │
│  Hermes/OpenClaw│◄───►│  白名单服务器   │
│                 │     │                 │
│  生成 TPM 证明  │     │  验证 TPM 签名  │
│  报告运行状态   │     │  确认是官方版本 │
└─────────────────┘     └─────────────────┘
```

### 9.10 客户端安全能力矩阵

| 威胁 | 防护措施 | 说明 |
|------|----------|------|
| **篡改客户端** | 代码签名 + 启动自检 | 检测是否被修改 |
| **键盘记录** | 权限最小化 + 行为监控 | 不请求键盘权限 |
| **文件窃取** | 沙箱限制 + 目录白名单 | 只读写工作目录 |
| **C2 后门** | 网络白名单 + 证书锁定 | 只能连接官方服务器 |
| **中间人注入** | TLS 1.3 + 证书固定 | 无法注入恶意代码 |
| **进程注入** | 启动时进程扫描 | 检测未知模块 |
| **提权攻击** | 权限审计 + 远程证明 | 防止权限提升 |

---

## 10. 服务端校验安全总结

| 安全层级 | 防护措施 | 说明 |
|----------|----------|------|
| **凭证** | Tauri SecureStorage + OS Keychain | JWT/Token 不落明文 |
| **传输** | HTTPS + TLS 1.3 | 传输加密 |
| **服务端校验** | 强制额度检查 + 团队隔离 | 不信任客户端 |
| **代码执行** | 沙箱隔离 + 白名单限制 | 防止本地攻击 |
| **API Key** | 服务端代理，客户端不存 Key | 防止 Key 泄露 |
| **数据隔离** | JWT 解析 teamId，禁止客户端指定 | 防止跨团队访问 |
| **审计** | 所有操作记录 + 异常检测 | 发现和追溯攻击 |

---

## 11. 后续规划

### Phase 1: 基础能力 (当前)
- [x] 单机桌面应用 (Tauri + React)
- [x] 本地 SQLite 数据存储
- [x] 基础 AI 对话

### Phase 2: 服务端团队支持
- [ ] NestJS 后端搭建
- [ ] PostgreSQL 数据库
- [ ] 团队管理模块
- [ ] 额度管理系统

### Phase 3: 市场生态
- [ ] 公共市场 (平台方维护)
- [ ] 团队本地市场
- [ ] 资源审核流程

### Phase 4: Hermes 智能化
- [ ] Hermes Core 模块
- [ ] 任务规划与分解
- [ ] 多工具编排
- [ ] 本地记忆系统

---

*文档版本: v1.0*
*更新日期: 2026-04-26*