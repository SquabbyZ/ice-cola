# 工单中心设计文档

> **创建时间：** 2026-04-28

## 概述

统一的工单管理中心，集中处理 Skills、MCP、插件等模块的工单（如审批请求），支持批量操作和历史记录查看。

**权限说明：**
- 普通成员：可查看所有工单，但看不到操作按钮
- 管理员：可执行审批操作（通过/拒绝）

## 页面结构

### 路径
- `/workorders` - 工单中心页面

### 布局
```
┌─────────────────────────────────────────────────────────┐
│  审批中心                                              │
├─────────────────────────────────────────────────────────┤
│  统计卡片: [全部 0] [Skills 0] [MCP 0] [插件 0]         │
├─────────────────────────────────────────────────────────┤
│  [全部] [待审批] [已通过] [已拒绝]     [批量通过] [批量拒绝] │
├─────────────────────────────────────────────────────────┤
│  ☐ 类型    名称          申请人    提交时间    操作      │
│  ☐ Skill  代码审查助手   张三      10分钟前   [通过][拒绝]│
│  ☐ MCP    文件处理器     李四      1小时前    [通过][拒绝]│
├─────────────────────────────────────────────────────────┤
│  [审批历史 Tab]                                        │
│  类型    名称          审批人   结果   备注     时间    │
│  Skill  代码审查助手   王五     通过   -        2小时前 │
│  Skill  翻译助手       王五     拒绝   质量不达标 3小时│
└─────────────────────────────────────────────────────────┘
```

## 数据模型

### ApprovalRequest（待审批请求）
```typescript
interface ApprovalRequest {
  id: string;
  type: 'skill' | 'mcp' | 'extension';
  targetId: string;
  targetName: string;
  targetIcon: string;
  applicantId: string;
  applicantName: string;
  teamId: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string; // 申请人备注
}
```

### ApprovalHistory（审批历史）
```typescript
interface ApprovalHistory {
  id: string;
  requestId: string;
  type: 'skill' | 'mcp' | 'extension';
  targetName: string;
  approverId: string;
  approverName: string;
  result: 'approved' | 'rejected';
  comment?: string; // 审批备注/拒绝理由
  processedAt: string;
}
```

## 功能详情

### 1. 统计卡片
- 显示各类待处理工单数量
- 点击卡片可快速筛选该类型

### 2. 分类筛选
- 全部 / Skills / MCP / 插件
- 状态筛选：待审批 / 已通过 / 已拒绝

### 3. 审批列表 Table
| 字段 | 说明 |
|------|------|
| 勾选框 | 支持单选和全选 |
| 类型 | Skill / MCP / 插件 图标+文字 |
| 名称 | 申请内容的名称 |
| 申请人 | 提交者姓名 |
| 可审批人员 | 有权限审批此工单的人员列表 |
| 提交时间 | 相对时间（带 tooltip 显示绝对时间） |
| 操作 | [通过] [拒绝] 按钮（仅管理员可见） |

### 4. 批量操作
- 选中多条后，显示「批量通过」「批量拒绝」按钮
- 批量拒绝需填写统一拒绝理由

### 5. 审批弹窗
**通过时：**
- 可选填写备注
- 确认后执行审批

**拒绝时：**
- 必须填写拒绝理由（至少10字）
- 确认后执行拒绝

### 6. 审批历史 Tab
- 展示已处理的审批记录
- 显示：类型、名称、审批人、结果、备注、时间
- 支持按类型筛选

## 路由配置

在 `App.tsx` 添加：
```tsx
<Route path="approvals" element={<Approvals />} />
```

在 `Sidebar.tsx` 添加导航入口。

## 状态管理

新增 `useApprovalsStore`：
```typescript
interface ApprovalsState {
  requests: ApprovalRequest[];
  history: ApprovalHistory[];
  filterType: 'all' | 'skill' | 'mcp' | 'extension';
  filterStatus: 'pending' | 'approved' | 'rejected';
  selectedIds: string[];

  loadRequests: () => Promise<void>;
  loadHistory: () => Promise<void>;
  approve: (id: string, comment?: string) => Promise<void>;
  reject: (id: string, comment: string) => Promise<void>;
  batchApprove: (ids: string[]) => Promise<void>;
  batchReject: (ids: string[], comment: string) => Promise<void>;
  setFilterType: (type: string) => void;
  setFilterStatus: (status: string) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
}
```

## 组件列表

1. **ApprovalsPage** - 页面容器
2. **ApprovalStats** - 统计卡片
3. **ApprovalFilters** - 筛选栏
4. **ApprovalTable** - 审批列表 Table
5. **ApprovalHistoryTable** - 审批历史 Table
6. **ApprovalActionDialog** - 审批操作弹窗（通过/拒绝）
7. **BatchActionBar** - 批量操作栏

## 与现有系统集成

### Skills 审批流程
- `requestPublishToTeam` → 创建待审批请求（写入 `requests`）
- `approveTeamPublish` → 更新状态为 `approved`（同时写入 `history`）
- `rejectTeamPublish` → 更新状态为 `rejected`（同时写入 `history`）

### 后续扩展
- MCP 审批：复用相同的数据结构和流程
- 插件审批：复用相同的数据结构和流程
