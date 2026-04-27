# OpenClaw Desktop

基于 Tauri + React + TypeScript 构建的 OpenClaw 桌面应用，为小型创业团队/工作室提供 AI 智能管家服务。

## 技术栈

- **Tauri 2.0**: 跨平台桌面应用框架
- **React 18**: 前端 UI 框架
- **TypeScript**: 类型安全
- **Vite**: 现代化构建工具
- **Tailwind CSS**: 实用优先的 CSS 框架
- **Zustand**: 轻量级状态管理
- **React Router DOM v6**: 客户端路由
- **Axios**: HTTP 客户端
- **Lucide React**: 图标库

## 项目结构

```
tauri-app/
├── src/
│   ├── components/          # 可复用组件
│   │   ├── Layout.tsx      # 主布局（顶部栏 + 侧边栏）
│   │   ├── TopBar.tsx      # 顶部状态栏
│   │   └── Sidebar.tsx     # 侧边导航栏
│   ├── pages/              # 页面组件
│   │   ├── Dashboard.tsx   # 工作台
│   │   ├── Chat.tsx        # 对话
│   │   ├── Extensions.tsx  # 扩展商店
│   │   ├── Experts.tsx     # 专家系统
│   │   ├── Tasks.tsx       # 定时任务
│   │   └── Settings.tsx    # 设置
│   ├── stores/             # Zustand 状态管理
│   │   ├── gateway.ts      # 网关状态
│   │   └── team.ts         # 团队状态
│   ├── lib/                # 工具库
│   │   └── api.ts          # Axios 实例
│   ├── App.tsx             # 应用根组件
│   ├── main.tsx            # 应用入口
│   └── index.css           # 全局样式
├── src-tauri/              # Tauri Rust 后端
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

## 开发指南

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

这会同时启动 Vite 开发服务器和 Tauri 应用窗口。

### 构建生产版本

```bash
pnpm build
```

### 预览生产构建

```bash
pnpm preview
```

### 代码检查

```bash
pnpm lint
```

自动修复格式问题：

```bash
pnpm lint:fix
```

## 核心功能模块

### 1. 工作台 (Dashboard)
- 今日对话统计
- Token 使用情况
- 活跃成员数
- 定时任务概览
- 快速操作入口

### 2. 对话 (Chat)
- 多轮对话界面
- 会话历史管理
- 权限审批弹窗

### 3. 扩展商店 (Extensions)
- Skill 市场
- MCP 市场
- 插件市场
- 自然语言生成 Skill

### 4. 专家系统 (Experts)
- 预配置角色管理
- 对话式创建专家
- Prompt 模板库

### 5. 定时任务 (Tasks)
- 自动化调度
- 任务启停控制
- 进度监控

### 6. 设置 (Settings)
- 模型配置
- 团队管理
- 额度分配
- API Key 管理

## 状态管理

使用 Zustand 进行全局状态管理：

- **Gateway Store**: 管理 OpenClaw Gateway 连接状态
- **Team Store**: 管理团队成员、额度统计

## API 集成

通过 `src/lib/api.ts` 中的 Axios 实例与 OpenClaw Gateway API 通信，默认地址为 `http://localhost:18789`。

## 下一步开发计划

1. ✅ 项目初始化和基础架构搭建
2. ⏳ 集成 OpenClaw Gateway API
3. ⏳ 实现对话功能
4. ⏳ 实现团队管理功能
5. ⏳ 实现扩展商店
6. ⏳ 实现专家系统
7. ⏳ 实现定时任务
8. ⏳ 添加权限审批机制
9. ⏳ 优化 UI/UX 细节
10. ⏳ 打包发布

## 许可证

MIT
