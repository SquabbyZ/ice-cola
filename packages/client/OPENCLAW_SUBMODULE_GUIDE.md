# OpenClaw Submodule 管理指南

## 📋 概述

`packages/client/openclaw-official/` 目录包含 OpenClaw 官方代码，用于 Tauri Desktop App 的 Gateway 功能。

本目录保持与上游（https://github.com/openclaw/openclaw）同步，方便获取最新功能和修复。

---

## 🏗️ 目录结构

```
openclaw-server/
├── packages/
│   └── client/
│       ├── openclaw-official/      ← OpenClaw 官方代码（手动复制）
│       │   ├── scripts/
│       │   │   └── run-node.mjs    ← Gateway 启动脚本
│       │   ├── openclaw.json       ← 配置文件
│       │   └── ...
│       └── src-tauri/
│           └── src/
│               └── gateway.rs      ← 引用 openclaw-official 目录
└── scripts/
    ├── sync-openclaw.sh            ← Linux/Mac 同步脚本
    └── sync-openclaw.bat           ← Windows 同步脚本
```

---

## 🔄 同步上游更新

### 方法 1: 使用同步脚本（推荐）

**Linux/Mac:**
```bash
./scripts/sync-openclaw.sh
```

**Windows:**
```cmd
scripts\sync-openclaw.bat
```

### 方法 2: 手动 Git Pull

```bash
cd packages/client/openclaw-official
git pull origin main
cd ../../..
```

### 方法 3: 完整重新克隆（如果遇到问题）

```bash
# 1. 删除旧目录
rm -rf packages/client/openclaw-official

# 2. 重新克隆
git clone https://github.com/openclaw/openclaw.git packages/client/openclaw-official

# 3. 验证
ls packages/client/openclaw-official/scripts/run-node.mjs
```

---

## 🚀 首次设置

### 步骤 1: 复制 OpenClaw 代码

将 OpenClaw 官方仓库的**所有内容**复制到：

```
packages/client/openclaw-official/
```

确保包含以下关键文件：
- ✅ `scripts/run-node.mjs`
- ✅ `openclaw.json`
- ✅ `package.json`
- ✅ `dist/` (编译输出)

### 步骤 2: 初始化 Git（可选，用于自动同步）

```bash
cd packages/client/openclaw-official
git init
git remote add origin https://github.com/openclaw/openclaw.git
git pull origin main
cd ../..
```

### 步骤 3: 验证配置

```bash
# 检查 Gateway 脚本是否存在
ls packages/client/openclaw-official/scripts/run-node.mjs

# 应该看到: ✅ Gateway script exists
```

---

## 🔧 Tauri 集成

Tauri Desktop App 通过 `gateway.rs` 启动 OpenClaw Gateway：

```rust
// packages/client/src-tauri/src/gateway.rs
let openclaw_dir = current_dir.parent()
    .parent()
    .join("openclaw-official")
    .canonicalize()?;

let child = Command::new("node")
    .current_dir(&openclaw_dir)
    .args(&["scripts/run-node.mjs", "gateway", ...])
    .spawn()?;
```

**路径说明：**
- `src-tauri/` → `client/` → `openclaw-official/`
- 相对路径：`../../openclaw-official`

---

## 📝 提交更新到版本控制

同步 OpenClaw 后，记得提交更改：

```bash
# 如果使用 Git Submodule
git add packages/client/openclaw-official
git commit -m "chore: update openclaw submodule to latest"

# 如果是手动复制（当前方式）
git add packages/client/openclaw-official/
git commit -m "chore: sync openclaw-official with upstream"
```

---

## ⚠️ 注意事项

### 1. 不要修改 OpenClaw 代码

❌ **错误做法：**
```bash
# 不要在 openclaw-official 中直接修改代码
vim packages/client/openclaw-official/src/gateway.ts
```

✅ **正确做法：**
- 如果需要自定义功能，在 Server 层实现
- 或者 Fork OpenClaw 仓库，使用自己的分支

### 2. 保持目录结构一致

确保 `openclaw-official/` 始终包含：
- `scripts/run-node.mjs`
- `openclaw.json`
- 其他必需文件

### 3. 团队协作

团队成员克隆项目后需要：

```bash
# 选项 A: 手动复制（当前方式）
# 从共享位置复制 openclaw-official 目录

# 选项 B: 使用 Git Submodule（推荐未来迁移）
git submodule update --init --recursive
```

---

## 🐛 故障排查

### 问题 1: Gateway 启动失败

**症状：**
```
Failed to resolve openclaw-official path
Gateway script not found
```

**解决：**
```bash
# 1. 检查目录是否存在
ls packages/client/openclaw-official/

# 2. 检查关键文件
ls packages/client/openclaw-official/scripts/run-node.mjs

# 3. 重新复制 OpenClaw 代码
```

### 问题 2: Git Pull 冲突

**症状：**
```
CONFLICT (content): Merge conflict in ...
```

**解决：**
```bash
cd packages/client/openclaw-official

# 选项 A: 保留本地更改
git checkout --ours <file>

# 选项 B: 使用远程版本
git checkout --theirs <file>

# 选项 C: 完全重置（丢失本地更改）
git reset --hard origin/main
```

### 问题 3: Node.js 依赖缺失

**症状：**
```
Cannot find module '@openclaw/...'
```

**解决：**
```bash
cd packages/client/openclaw-official
npm install
# 或
pnpm install
```

---

## 📚 相关文档

- [OpenClaw 官方文档](https://github.com/openclaw/openclaw)
- [Tauri Desktop App](../packages/client/README.md)
- [Gateway 协议](../packages/client/src/services/gateway-client.ts)

---

## 🎯 未来改进

计划迁移到正式的 Git Submodule：

```bash
# 未来可以执行
git submodule add https://github.com/openclaw/openclaw.git packages/client/openclaw-official
```

优势：
- ✅ 自动跟踪上游更新
- ✅ 版本锁定（特定 commit/tag）
- ✅ 团队协作更简单
