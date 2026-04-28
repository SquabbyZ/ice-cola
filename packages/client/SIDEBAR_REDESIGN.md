# 对话历史侧边栏重新设计

## 📋 改进概述

本次更新对对话历史侧边栏进行了全面重新设计，以适配应用的最小尺寸 **900x650px**，并提供了更现代化的用户体验。

## ✨ 主要改进

### 1. **响应式折叠功能**
- ✅ 支持侧边栏完全展开（256px）和折叠（64px）两种状态
- ✅ 自动检测窗口宽度，在 <1000px 时自动折叠
- ✅ 平滑的过渡动画（300ms ease-in-out）
- ✅ 折叠按钮带有悬停效果和视觉反馈

### 2. **现代化视觉设计**
- 🎨 渐变背景：从 `slate-50` 到白色
- 🎨 阴影效果：柔和的右侧阴影增加层次感
- 🎨 圆角优化：所有元素使用 `rounded-xl` 或 `rounded-lg`
- 🎨 激活状态：白色背景 + 主色边框 + 阴影
- 🎨 Hover 状态：微妙的背景色变化

### 3. **优化的交互体验**

#### 折叠状态（64px）
- 只显示图标，无文字
- 新建对话按钮变为圆形图标按钮
- 对话项显示为图标，带 tooltip 提示
- 操作按钮隐藏（空间不足）

#### 展开状态（256px）
- 完整的标题和时间戳显示
- 新建对话按钮带文字
- Hover 时显示编辑和删除按钮
- 底部显示对话数量和在线状态

### 4. **细节优化**

#### 滚动条样式
```css
scrollbar-thin 
scrollbar-thumb-slate-300 
scrollbar-track-transparent
hover:scrollbar-thumb-slate-400
```

#### 加载状态
- 骨架屏动画
- 渐变色占位符

#### 空状态
- 渐变背景的图标容器
- 友好的提示文字

#### 编辑模式
- 输入框带焦点环效果
- 保存/取消按钮带缩放动画
- 平滑的淡入动画

#### 删除确认
- 浏览器原生 confirm 对话框
- 删除中的禁用状态

### 5. **布局适配**

#### 最小尺寸 900x650px 下的表现
- **侧边栏展开**：256px + 644px 主内容区 = 足够空间
- **侧边栏折叠**：64px + 836px 主内容区 = 更宽敞
- **输入框区域**：始终保持在底部，不被挤压

#### 响应式断点建议
```typescript
// 自动折叠阈值
if (window.innerWidth < 1000) {
  // 自动折叠侧边栏
}

// 推荐的手动控制
- > 1200px: 默认展开
- 1000-1200px: 用户可选择
- < 1000px: 默认折叠
```

## 🔧 技术实现

### 组件 Props
```typescript
interface ConversationSidebarProps {
  teamId: string;
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  isCollapsed?: boolean;        // 新增：折叠状态
  onToggleCollapse?: () => void; // 新增：切换折叠
}
```

### 状态管理
```typescript
const [isSidebarOpen, setIsSidebarOpen] = useState(true);          // 是否显示侧边栏
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // 是否折叠
```

### 关键 CSS 类
```tsx
// 侧边栏容器
className={`
  relative flex flex-col h-full transition-all duration-300 ease-in-out
  ${isCollapsed ? 'w-16' : 'w-64'}
  bg-gradient-to-b from-slate-50 to-white
  border-r border-slate-200/80
  shadow-[2px_0_8px_rgba(0,0,0,0.04)]
`}

// 折叠按钮
className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full 
  bg-white border border-slate-200 shadow-md 
  hover:shadow-lg hover:border-primary/30 
  transition-all duration-200"
```

## 📊 API Key 配置

### 当前实现
API Key 通过 **Gateway Secrets** 系统管理，存储在 OpenClaw 配置文件中：

```typescript
// packages/client/src/services/apikey-service.ts
async saveApiKey(provider: string, apiKey: string): Promise<void> {
  // 直接写入配置文件
  await this.rpc.send('config.set', {
    raw: JSON.stringify(fullConfig, null, 2),
    baseHash: currentConfig.hash,
  });
  
  // Gateway 自动触发重启
}
```

### 配置路径
- **配置文件**: `C:\Users\smallMark\.openclaw\openclaw.json`
- **配置结构**:
```json
{
  "models": {
    "providers": {
      "minimax": {
        "apiKey": "your-api-key-here",
        "baseUrl": "https://api.minimax.io/anthropic"
      }
    }
  }
}
```

### 验证流程
1. 用户在设置页面输入 API Key
2. 点击"保存"按钮
3. ApiKeyService 写入配置文件
4. Gateway 检测到配置变化，自动重启
5. 测试按钮验证 API Key 有效性

## 🎯 使用示例

### 基础用法
```tsx
<ConversationSidebar
  teamId={teamId}
  currentConversationId={currentConversationId}
  onSelectConversation={handleSelectConversation}
  onNewConversation={handleNewConversation}
  isCollapsed={isSidebarCollapsed}
  onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
/>
```

### 条件渲染
```tsx
{isSidebarOpen && (
  <ConversationSidebar ... />
)}

{!isSidebarOpen && (
  <button onClick={() => setIsSidebarOpen(true)}>
    <Menu />
  </button>
)}
```

## 🚀 性能优化

### 已实现的优化
1. ✅ 折叠状态下减少 DOM 节点
2. ✅ 使用 CSS transitions 代替 JS 动画
3. ✅ Hover 状态本地管理，避免全局重渲染
4. ✅ 防抖的窗口 resize 监听

### 未来优化方向
- [ ] 虚拟滚动（当对话数量 > 100 时）
- [ ] 懒加载对话详情
- [ ] 缓存对话列表数据

## 📱 响应式设计原则

### 核心原则
1. **空间优先**：确保主聊天区域至少有 600px 宽度
2. **渐进增强**：小屏幕折叠，大屏幕展开
3. **用户控制**：允许手动切换折叠状态
4. **视觉连贯**：折叠/展开保持视觉一致性

### 断点策略
```
移动端 (< 768px):   侧边栏隐藏，通过汉堡菜单访问
平板端 (768-1000px): 默认折叠，可手动展开
桌面端 (> 1000px):  默认展开，可手动折叠
```

## 🎨 设计系统

### 颜色方案
```css
--primary: #3b82f6 (蓝色)
--slate-50: #f8fafc (浅灰背景)
--slate-100: #f1f5f9 (hover 背景)
--slate-200: #e2e8f0 (边框)
--slate-400: #94a3b8 (次要文本)
--slate-700: #334155 (主要文本)
```

### 间距系统
```
p-2:  8px   (列表项内边距)
p-3:  12px  (头部/尾部内边距)
gap-1: 4px  (按钮间距)
gap-2: 8px  (图标与文本间距)
```

### 圆角系统
```
rounded-lg:  8px  (小元素)
rounded-xl:  12px (卡片、按钮)
rounded-2xl: 16px (大容器)
```

## 🔍 测试清单

### 功能测试
- [x] 折叠/展开切换正常
- [x] 新建对话功能正常
- [x] 选择对话功能正常
- [x] 重命名功能正常
- [x] 删除功能正常
- [x] 自动折叠逻辑正常

### 视觉测试
- [x] 渐变背景显示正确
- [x] 阴影效果符合预期
- [x] Hover 状态流畅
- [x] 激活状态清晰
- [x] 滚动条样式美观

### 响应式测试
- [x] 900px 宽度下布局合理
- [x] 650px 高度下内容完整
- [x] 窗口resize 时自动调整
- [x] 折叠状态图标对齐

## 📝 更新日志

### v2.0.0 (2026-04-27)
- ✨ 新增侧边栏折叠功能
- ✨ 优化视觉设计和交互动画
- ✨ 添加自动折叠逻辑
- 🎨 现代化渐变背景和阴影
- 🎯 适配 900x650 最小尺寸
- ♿ 改进可访问性（tooltip、焦点状态）

### v1.0.0 (初始版本)
- 基础对话列表功能
- 新建、重命名、删除操作
- 固定宽度 256px

## 🙏 致谢

本次设计参考了现代 SaaS 应用的最佳实践，包括：
- Linear 的简洁美学
- Notion 的空间利用
- Figma 的交互细节
- Vercel 的渐变运用

---

**最后更新**: 2026-04-27  
**维护者**: PeaksClaw Team
