# OpenClaw Chat Page Design System

## 🎨 Design Overview

**Project**: OpenClaw Desktop - Chat Interface  
**Platform**: Web/Desktop (Tauri)  
**Style**: Modern Minimalist with Glassmorphism  
**Vibe**: Professional, Clean, Focused, Collaborative

---

## 🌈 Color Palette

### Primary Colors
- **Primary Action**: `#6366F1` (Indigo 500) - Main buttons, active states, links
- **Primary Hover**: `#4F46E5` (Indigo 600) - Button hover states
- **Primary Light**: `#EEF2FF` (Indigo 50) - Background accents, highlights

### Secondary Colors
- **Secondary**: `#8B5CF6` (Violet 500) - Secondary actions, badges
- **Accent**: `#EC4899` (Pink 500) - Notifications, important alerts

### Neutral Colors
- **Background**: `#FFFFFF` (White) - Main content area
- **Surface**: `#F9FAFB` (Gray 50) - Cards, panels
- **Border**: `#E5E7EB` (Gray 200) - Dividers, borders
- **Text Primary**: `#111827` (Gray 900) - Headings, main text
- **Text Secondary**: `#6B7280` (Gray 500) - Subtitles, hints
- **Text Muted**: `#9CA3AF` (Gray 400) - Placeholders, disabled

### Status Colors
- **Success**: `#10B981` (Emerald 500) - Online status, success messages
- **Warning**: `#F59E0B` (Amber 500) - Warnings, pending states
- **Error**: `#EF4444` (Red 500) - Errors, destructive actions
- **Info**: `#3B82F6` (Blue 500) - Informational messages

---

## 📐 Typography

### Font Family
- **Primary**: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- **Monospace**: "JetBrains Mono", "Fira Code", monospace (for code blocks)

### Type Scale
- **H1**: 32px / 40px line-height / 700 weight (Page titles)
- **H2**: 24px / 32px line-height / 600 weight (Section headers)
- **H3**: 20px / 28px line-height / 600 weight (Card titles)
- **Body Large**: 16px / 24px line-height / 400 weight (Main content)
- **Body**: 14px / 20px line-height / 400 weight (Default text)
- **Small**: 12px / 16px line-height / 400 weight (Captions, labels)
- **Tiny**: 11px / 14px line-height / 400 weight (Meta info)

---

## 🎭 Spacing System

Base unit: **4px**

- **XS**: 4px
- **SM**: 8px
- **MD**: 16px
- **LG**: 24px
- **XL**: 32px
- **2XL**: 48px
- **3XL**: 64px

---

## 🔲 Border Radius

- **Small**: 6px (Buttons, inputs, small cards)
- **Medium**: 12px (Cards, modals, panels)
- **Large**: 16px (Hero sections, large containers)
- **Full**: 9999px (Pills, avatars, badges)

---

## 🌑 Shadows & Elevation

- **Shadow SM**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- **Shadow MD**: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`
- **Shadow LG**: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`
- **Shadow XL**: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)`
- **Shadow Inner**: `inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)`

---

## 🎪 Layout Structure

### 1. Top Navigation Bar (Header)
**Height**: 64px  
**Background**: White with subtle bottom border  
**Elements**:
- Left: Logo + Brand name "加冰可乐" + Tagline "AI 办公助手"
- Center: Search input with icon (width: 320px, rounded-full)
- Right: User avatar dropdown, notification bell, settings gear

**Styling**:
- Glassmorphism effect on scroll: `backdrop-filter: blur(12px)`
- Sticky positioning with z-index: 100
- Smooth transition on scroll

### 2. Left Sidebar (Main Navigation)
**Width**: 240px (collapsed: 64px)  
**Background**: Surface color (#F9FAFB)  
**Border**: Right border 1px solid #E5E7EB

**Navigation Items**:
- 工作台 (Workspace)
- Claw (Active - highlighted)
- 扩展商店 (Extensions)
- 专家系统 (Experts)
- 定时任务 (Tasks)
- Skill 市场
- MCP 市场

**Active State**:
- Background: Primary Light (#EEF2FF)
- Text: Primary Action (#6366F1)
- Left border: 3px solid Primary Action
- Icon: Filled variant

**Hover State**:
- Background: Gray 100
- Smooth transition: 150ms ease

### 3. Conversation History Panel
**Width**: 280px (collapsible)  
**Background**: White  
**Border**: Right border 1px solid #E5E7EB

**Sections**:
- Header: "对话历史" title + "新建对话" button
- List: Scrollable conversation items
- Footer: Session count + connection status

**Conversation Item**:
- Padding: 12px 16px
- Hover: Gray 50 background
- Active: Primary Light background + Primary text
- Truncated title with ellipsis
- Timestamp in muted gray

### 4. Main Chat Area
**Background**: White  
**Padding**: 32px horizontal, 24px vertical

#### Hero Section (Empty State)
- **Title**: "Claw Your Ideas Into Reality" (H1, centered)
- **Subtitle**: "Triggered Anywhere, Completed Locally" (Body Large, centered, muted)
- **CTA Button**: "开始" (Primary, large, centered)

#### Quick Action Chips
**Layout**: Flex wrap, gap 12px, centered  
**Style**: Pill-shaped buttons with icons

**Categories**:
- 代码开发 💻
- 日常办公 📋
- 任务 ✅
- 文档处理 📄
- 金融服务 💰
- 数据分析及可视化 📊
- 深度研究 🔍
- 产品管理 📦
- 幻灯片 📽️
- 设计 🎨
- 邮件编辑 ✉️
- 选择专家 👤

**Button Style**:
- Background: Surface (#F9FAFB)
- Border: 1px solid Border (#E5E7EB)
- Hover: Primary Light background + Primary text
- Active: Primary background + White text
- Rounded-full, padding 8px 16px
- Icon + text layout

#### Message Input Area
**Position**: Fixed bottom or sticky  
**Background**: White with top shadow  
**Padding**: 16px 24px

**Components**:
1. **Input Field**:
   - Multiline textarea
   - Placeholder: "输入消息..."
   - Min height: 48px, max height: 200px
   - Border: 1px solid Border
   - Focus: Primary ring 2px
   - Rounded-lg (12px)

2. **Action Buttons** (Right side, inline):
   - Craft (magic wand icon)
   - Auto (auto icon)
   - Skills (puzzle icon)
   - 选择文件夹 (folder icon)
   - Attach (paperclip icon)
   - Send (arrow up icon, primary color when enabled)

3. **Disclaimer**: Small text below input
   - "内容由 AI 生成，请核实重要信息。"
   - Tiny size, muted color, centered

---

## 🎬 Animations & Transitions

### Timing Functions
- **Fast**: 150ms ease-out (hover states, tooltips)
- **Normal**: 250ms ease-in-out (modals, panels)
- **Slow**: 350ms ease-in-out (page transitions)

### Common Animations
- **Fade In**: opacity 0 → 1, duration 250ms
- **Slide Up**: translateY(10px) → 0, duration 250ms
- **Scale In**: scale(0.95) → 1, duration 200ms
- **Expand Height**: height auto with max-height transition

### Micro-interactions
- Button hover: scale(1.02) + shadow increase
- Input focus: ring animation
- Message send: slide up + fade in
- Loading: pulse animation on dots

---

## 🧩 Component Specifications

### Buttons

#### Primary Button
```css
background: #6366F1;
color: white;
padding: 10px 20px;
border-radius: 8px;
font-weight: 500;
transition: all 150ms ease;

:hover {
  background: #4F46E5;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

:active {
  transform: translateY(0);
}
```

#### Secondary Button
```css
background: white;
color: #374151;
border: 1px solid #E5E7EB;
padding: 10px 20px;
border-radius: 8px;
font-weight: 500;

:hover {
  background: #F9FAFB;
  border-color: #D1D5DB;
}
```

#### Ghost Button
```css
background: transparent;
color: #6B7280;
padding: 8px 12px;

:hover {
  background: #F3F4F6;
  color: #111827;
}
```

### Cards

#### Standard Card
```css
background: white;
border: 1px solid #E5E7EB;
border-radius: 12px;
padding: 24px;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  transition: all 250ms ease;
}
```

### Input Fields

#### Text Input
```css
border: 1px solid #E5E7EB;
border-radius: 8px;
padding: 10px 14px;
font-size: 14px;
transition: all 150ms ease;

:focus {
  outline: none;
  border-color: #6366F1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

::placeholder {
  color: #9CA3AF;
}
```

### Badges

#### Status Badge
```css
display: inline-flex;
align-items: center;
gap: 6px;
padding: 4px 10px;
border-radius: 9999px;
font-size: 12px;
font-weight: 500;

/* Online */
background: #D1FAE5;
color: #065F46;

/* Offline */
background: #F3F4F6;
color: #6B7280;
```

---

## 📱 Responsive Breakpoints

- **Mobile**: < 768px
  - Hide left sidebar, use hamburger menu
  - Full-width chat area
  - Stack quick action chips vertically
  
- **Tablet**: 768px - 1024px
  - Collapsed left sidebar (icons only)
  - Reduced conversation panel width (200px)
  
- **Desktop**: > 1024px
  - Full layout as designed
  - Max content width: 1200px

---

## ♿ Accessibility Guidelines

- **Contrast Ratio**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Focus Indicators**: Visible focus rings on all interactive elements
- **Keyboard Navigation**: Full keyboard support for all features
- **ARIA Labels**: Descriptive labels for icons and buttons
- **Screen Reader**: Semantic HTML structure with proper heading hierarchy
- **Motion**: Respect `prefers-reduced-motion` media query

---

## 🎯 Design Principles

1. **Clarity First**: Clear visual hierarchy, obvious affordances
2. **Consistency**: Unified spacing, colors, and interactions
3. **Feedback**: Immediate visual feedback for all user actions
4. **Efficiency**: Minimize clicks, provide shortcuts and quick actions
5. **Delight**: Subtle animations and micro-interactions enhance experience
6. **Focus**: Reduce cognitive load, highlight what matters

---

## 🔄 State Management

### Loading States
- Skeleton screens for content loading
- Spinner for button actions
- Progress bars for long operations

### Empty States
- Illustration + friendly message + CTA
- Example: "暂无对话" with "新建对话" button

### Error States
- Inline error messages below inputs
- Toast notifications for global errors
- Retry buttons where applicable

### Success States
- Checkmark animations
- Success toasts with auto-dismiss
- Positive reinforcement messaging

---

## 📝 Implementation Notes

### Tailwind CSS Classes Mapping

```javascript
// Colors
primary: 'bg-indigo-500 hover:bg-indigo-600 text-white'
surface: 'bg-gray-50'
border: 'border-gray-200'

// Spacing
padding-sm: 'p-2' (8px)
padding-md: 'p-4' (16px)
padding-lg: 'p-6' (24px)

// Rounded
rounded-sm: 'rounded-md' (6px)
rounded-md: 'rounded-lg' (12px)
rounded-lg: 'rounded-xl' (16px)
rounded-full: 'rounded-full'

// Shadows
shadow-sm: 'shadow-sm'
shadow-md: 'shadow-md'
shadow-lg: 'shadow-lg'

// Typography
text-xs: 'text-xs' (12px)
text-sm: 'text-sm' (14px)
text-base: 'text-base' (16px)
text-lg: 'text-lg' (20px)
text-xl: 'text-xl' (24px)
text-2xl: 'text-2xl' (32px)
```

---

## 🚀 Next Steps

1. **Create .stitch/DESIGN.md** with this specification
2. **Generate Screen**: Use `generate_screen_from_text` with enhanced prompt
3. **Iterate**: Use `edit_screens` for refinements
4. **Download**: Save generated HTML and screenshots to `.stitch/designs`
5. **Implement**: Convert design to React components with Tailwind CSS

---

*Generated by Stitch Design Expert*  
*Last Updated: 2026-04-27*
