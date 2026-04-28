# Skills Marketplace 设计方案

## 概述

Skills 系统是 OpenClaw 的 AI 能力增强市场，与 Extensions（功能插件）形成互补：
- **Extensions** = 功能性插件
- **Skills** = AI 能力增强（对话风格、任务类型等）

## 核心定位

- 用户可在聊天中多选 Skill，AI 智能组合使用
- 支持手动创建和 AI 智能生成 Skill
- 严格的发布审批流程：个人 → 团队 → 市场

## 发布审批流程

```
个人 Skill
    ↓ [申请发布到团队]
团队 Skill 列表（ADMIN+ 审批）
    ↓ [申请发布到市场]
市场申请（ADMIN+ 审批）
    ↓ 审批通过
线上官网展示（应用侧仅显示"已发布市场"标识）
```

- **团队发布审批**：需要 ADMIN 或 OWNER 角色
- **市场发布审批**：需要 ADMIN 或 OWNER 角色（审批在外部平台完成）

## 数据模型

### Skill 表

```sql
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) DEFAULT '1.0.0',
  icon VARCHAR(500),
  category VARCHAR(100),
  tags TEXT[],
  content TEXT NOT NULL,           -- SKILL.md 完整内容
  config_schema JSONB,              -- 配置项 Schema
  config JSONB,                     -- 用户配置的值
  status VARCHAR(50) DEFAULT 'personal',  -- personal | team_pending | team | marketplace_pending | marketplace
  team_id UUID,
  author_id UUID REFERENCES users(id),
  marketplace_id VARCHAR(255),      -- 线上市场 ID，审批通过后填充
  ratings DECIMAL(3,2) DEFAULT 0,
  installs INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Skill 版本历史表

```sql
CREATE TABLE skill_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  config_schema JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);
```

### Skill 审批表

```sql
CREATE TABLE skill_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,     -- approve | reject
  target VARCHAR(50) NOT NULL,     -- team | marketplace
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 版本管理

- **范围**：仅个人 Skill 有版本历史快照
- **功能**：
  - 发布新版本时自动保存快照
  - 查看版本历史列表
  - 预览指定版本内容
  - 一键回退到指定版本
- **团队 Skill、市场 Skill**：无版本历史，走正式发布流程

## 数据库状态说明

| status | 说明 | 应用侧可见性 |
|--------|------|-------------|
| `personal` | 个人 Skill | 仅作者 |
| `team_pending` | 等待团队审批 | 申请人 + 团队管理员 |
| `team` | 已发布到团队 | 团队所有成员 |
| `marketplace_pending` | 等待市场审批 | 申请人 + 团队管理员 |
| `marketplace` | 已发布到市场 | 团队成员 + 市场标识 |

## 页面结构

```
/skills
├── 市场 Tab
│   ├── 搜索栏 + 分类筛选
│   ├── Skill 卡片网格
│   └── 详情抽屉（描述、配置、版本等）
├── 我的团队 Tab
│   ├── 团队 Skill 列表
│   ├── 审批状态筛选
│   └── 申请发布到市场按钮
└── 我的 Skill Tab
    ├── 个人 Skill 列表
    ├── 版本历史入口
    ├── 创建 Skill 入口
    └── 申请发布到团队按钮
```

## 配置管理

- 配置 UI 风格参考现有 Extensions
- 每个 Skill 有独立的配置面板
- 配置数据存储在 `config` JSONB 字段

## Chat 激活面板

- 支持多选 Skill
- AI 根据上下文智能组合选中的 Skill
- 显示已激活 Skill 列表

## 创建方式

1. **手动创建**：用户编写 SKILL.md 内容
2. **AI 智能生成**：根据用户描述自动生成 Skill（使用 create-skills 技能判断）
