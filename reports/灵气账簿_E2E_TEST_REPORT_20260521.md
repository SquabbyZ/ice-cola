# 灵气账簿 E2E 测试报告

## 测试信息
- **测试时间**: 2026-05-21 16:01:00-16:05:00
- **测试工程师**: Claude Code
- **功能版本**: v1.0.0

## 测试环境
- **浏览器**: Chrome via Chrome DevTools MCP
- **viewport**: 1280x720
- **前端地址**: http://127.0.0.1:1423
- **后端地址**: http://127.0.0.1:3004
- **数据库**: Docker PostgreSQL `ice-cola-postgres`，host port 5433
- **API 测试用户**: claude-ledger-redeem-20260521160159@example.com
- **浏览器测试用户**: claude-browser-lingqi-20260521160411@example.com
- **浏览器测试团队**: e2915b81-2b00-4fd5-a4f6-a1459dae0e03

## 测试功能
验证灵气账簿接口 `/teams/:teamId/quota/ledger` 与客户端 `/lingqi` 页面“近期灵气账簿”区域；覆盖新团队空账簿、兑换码充值后账簿写入、页面渲染账簿记录以及模型目录/消耗预估联动。

## 测试步骤

### Step 1: 启动 worktree 后端服务
- 操作：使用本地 E2E 环境变量启动后端服务到 `3004`，并配置 `1423` 前端 CORS 来源。
- 预期：NestJS HTTP 服务启动成功，灵气 REST 接口可访问。
- 结果：通过。HTTP 服务监听 `0.0.0.0:3004`。

### Step 2: 启动 worktree 前端服务
- 操作：使用 `VITE_API_URL=http://127.0.0.1:3004` 启动 Vite 前端到 `1423`。
- 预期：前端从 `http://127.0.0.1:1423` 加载，并调用 `3004` 后端。
- 结果：通过。Vite 输出 `Local: http://127.0.0.1:1423/`。

### Step 3: 验证新团队账簿接口
- 操作：通过 API 注册测试用户、创建团队、重新登录获取包含 teamId 的 JWT，然后请求 `/teams/:teamId/quota/status`、`/teams/:teamId/quota/ledger?limit=10`、`/teams/:teamId/models/catalog`。
- 预期：状态接口成功；新团队账簿为空数组；模型目录返回可用模型列表。
- 结果：通过。状态接口返回余额 `0`，账簿接口返回 `[]`，模型目录返回 3 个模型。

### Step 4: 验证兑换码写入账簿
- 操作：在本地 Docker PostgreSQL 中插入一次性测试兑换码哈希，通过 `/teams/:teamId/quota/redeem` 兑换，再次请求 `/teams/:teamId/quota/ledger?limit=10`。
- 预期：兑换成功后余额增加，账簿新增一条 `grant` 方向的 `redemption_code` 记录。
- 结果：通过。
  - 兑换前账簿数量：0
  - 兑换授予灵气：120
  - 兑换后余额：120
  - 兑换后境界：mortal
  - 兑换后账簿数量：1
  - 首条账簿方向：grant
  - 首条账簿金额：120
  - 首条交易类型：redemption_code

### Step 5: 准备浏览器验证数据
- 操作：创建浏览器测试用户与团队，插入一次性测试兑换码并兑换 150 灵气。
- 预期：浏览器用户具备有效团队、余额和非空账簿。
- 结果：通过。团队 `e2915b81-2b00-4fd5-a4f6-a1459dae0e03` 余额为 `150`。

### Step 6: 打开 `/lingqi` 页面
- 操作：由于注册页需要邮箱验证码，使用已创建测试用户的有效 token 注入 localStorage，导航到 `http://127.0.0.1:1423/lingqi`。
- 预期：受保护路由通过认证，页面展示灵气状态、模型目录、消耗预估与账簿区域。
- 结果：通过。页面 URL 为 `http://127.0.0.1:1423/lingqi`，显示“灵气修行与模型调度”。

### Step 7: 验证页面账簿渲染
- 操作：在 `/lingqi` 页面检查“近期灵气账簿”区域。
- 预期：页面显示最近兑换记录，包含方向、来源、描述和金额。
- 结果：通过。页面显示：
  - 当前灵气：150
  - 当前境界：凡人
  - 总获得：150
  - 总消耗：0
  - 当前套餐：散修
  - 近期灵气账簿：`获得 / redemption_code · redemption_code / 灵气兑换码充值 / +150 灵气`

### Step 8: 验证模型目录与预估联动
- 操作：检查 `/lingqi` 页面模型选择与消耗预估区域。
- 预期：散修套餐仅开放入门模型，高阶模型提示需更高套餐；聊天消耗预估可基于余额展示剩余。
- 结果：通过。页面显示“入门心法 gpt-4o-mini”可用，“玄阶功法 gpt-4o”“宗师真诀 claude-3-5-sonnet-20241022”需更高套餐；预估提示“本次预计消耗 10 灵气，完成后剩余 140 灵气。”

## 测试结果

| 测试项 | 状态 | 备注 |
|--------|------|------|
| 后端 REST 服务 | PASS | `http://127.0.0.1:3004` |
| 前端 Vite 服务 | PASS | `http://127.0.0.1:1423/` |
| 新团队空账簿接口 | PASS | `/quota/ledger?limit=10` 返回空数组 |
| 兑换码充值 | PASS | 兑换授予 120 灵气 |
| 账簿写入 | PASS | 新增 `grant` / `redemption_code` 记录 |
| 浏览器认证态 | PASS | 使用 API 创建用户 token 注入 localStorage |
| `/lingqi` 页面加载 | PASS | 显示“灵气修行与模型调度” |
| 近期灵气账簿 UI | PASS | 显示 `+150 灵气` 兑换记录 |
| 模型目录 UI | PASS | 1 个可用模型，2 个套餐受限模型 |
| 消耗预估 UI | PASS | 预计 10 灵气，剩余 140 灵气 |

## 截图证据
- `lingqi-e2e-20260521.png`
- `lingqi-terminology-workorders-20260521.png`

## 发现的问题

| 优先级 | 问题描述 | 状态 |
|--------|----------|------|
| LOW | Playwright MCP 因 `spawn npx ENOENT` 不可用，本轮浏览器验证改用 Chrome DevTools MCP。 | OPEN |
| LOW | E2E 后端环境中 WebSocket 端口 `3001` 已被占用，日志出现 `EADDRINUSE :::3001`；本轮验证范围为灵气 REST 页面与接口，未阻塞测试。 | OPEN |
| LOW | 服务启动时 AI model seed 出现 `ai_models_provider_id_fkey` 外键错误；服务继续监听 `3004`，未阻塞本轮灵气接口与页面验证。 | OPEN |
| INFO | 客户端注册页需要邮箱验证码，因此浏览器验证使用 API 创建测试用户并注入有效登录态进入受保护页面。 | CLOSED |

## 结论

PASS

灵气账簿接口和 `/lingqi` 页面账簿 UI 已完成 E2E 验证：新团队账簿为空、兑换码充值后生成账簿记录、页面正确展示余额 150 与 `+150 灵气` 兑换记录，模型目录和消耗预估联动正常。测试报告不包含真实兑换码或访问令牌。
