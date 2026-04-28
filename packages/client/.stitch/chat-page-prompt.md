# OpenClaw Chat Page - Enhanced Design Prompt

## 🎯 Design Brief

Create a modern, professional chat interface for OpenClaw Desktop that combines productivity with visual elegance. The design should feel clean, focused, and collaborative while maintaining a sophisticated aesthetic.

---

## 📋 Enhanced Prompt for Stitch

```markdown
Modern minimalist chat interface for AI-powered desktop application with glassmorphism effects and indigo-violet color scheme. Professional, clean, focused atmosphere with subtle animations and micro-interactions.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web/Desktop (Tauri), Desktop-first
- Palette: 
  - Primary Action (#6366F1 Indigo 500) for main buttons, active states
  - Primary Hover (#4F46E5 Indigo 600) for interactions
  - Secondary (#8B5CF6 Violet 500) for accents
  - Background (#FFFFFF White) for content areas
  - Surface (#F9FAFB Gray 50) for cards and panels
  - Border (#E5E7EB Gray 200) for dividers
  - Text Primary (#111827 Gray 900) for headings
  - Text Secondary (#6B7280 Gray 500) for body text
- Styles: Rounded corners (12px medium, 8px small), Soft shadows (md-lg), Smooth transitions (150-250ms), Glassmorphism on header

**PAGE STRUCTURE:**

1. **Top Navigation Bar (Sticky Header):**
   - Height: 64px, white background with subtle bottom border (1px #E5E7EB)
   - Left section: Logo icon + "加冰可乐" brand name (H2, bold) + "AI 办公助手" tagline (small, muted gray)
   - Center section: Search input with search icon, rounded-full, width 320px, placeholder "搜索工作区...", light gray background (#F3F4F6), focus state with indigo ring
   - Right section: User avatar dropdown (circular, 36px), notification bell icon button, settings gear icon button
   - Glassmorphism effect on scroll: backdrop-filter blur(12px), semi-transparent white background
   - Z-index: 100 for sticky positioning

2. **Left Sidebar (Main Navigation):**
   - Width: 240px, surface background (#F9FAFB), right border 1px solid #E5E7EB
   - Top: "新建对话" primary button (indigo background, white text, full width, rounded-lg, margin 16px)
   - Navigation list with icons:
     * 工作台 (Workspace) - house icon
     * Claw (active) - chat bubble icon, highlighted with indigo background (#EEF2FF), indigo text (#6366F1), left border 3px solid indigo
     * 扩展商店 (Extensions) - puzzle icon
     * 专家系统 (Experts) - users icon
     * 定时任务 (Tasks) - calendar icon
     * Skill 市场 - sparkles icon
     * MCP 市场 - server icon
   - Each nav item: padding 12px 16px, hover state with gray-100 background, smooth transition 150ms
   - Bottom: Settings button with gear icon, ghost style

3. **Conversation History Panel:**
   - Width: 280px, white background, right border 1px solid #E5E7EB, collapsible
   - Header: "对话历史" title (H3, bold) + collapse toggle button (chevron icon)
   - "新建对话" secondary button (white background, gray border, full width, margin 12px 16px)
   - Scrollable conversation list:
     * Each item: padding 12px 16px, hover gray-50 background, active state with indigo-light background
     * Conversation title truncated with ellipsis, timestamp in muted gray (small text)
     * Active conversation: indigo-left border, indigo text color
   - Footer: Session count badge ("0 个对话") + connection status indicator (green dot + "在线" text)

4. **Main Chat Area:**
   - White background, padding 32px horizontal, 24px vertical, flex column layout
   
   **Hero Section (Empty State - Centered):**
   - Large heading: "Claw Your Ideas Into Reality" (H1, 32px, bold, centered, gray-900)
   - Subtitle: "Triggered Anywhere, Completed Locally" (16px, centered, gray-500, margin-top 8px)
   - Primary CTA button: "开始" (indigo background, white text, large size, padding 12px 32px, rounded-lg, shadow-md, hover lift effect with scale 1.02)
   
   **Quick Action Chips Grid:**
   - Layout: Flex wrap, gap 12px, centered, margin-top 32px, max-width 800px
   - 12 category buttons in pill shape (rounded-full):
     * 代码开发 💻 (Code Development)
     * 日常办公 📋 (Daily Office)
     * 任务 ✅ (Tasks)
     * 文档处理 📄 (Document Processing)
     * 金融服务 💰 (Financial Services)
     * 数据分析及可视化 📊 (Data Analysis & Visualization)
     * 深度研究 🔍 (Deep Research)
     * 产品管理 📦 (Product Management)
     * 幻灯片 📽️ (Slides)
     * 设计 🎨 (Design)
     * 邮件编辑 ✉️ (Email Editing)
     * 选择专家 👤 (Select Expert)
   - Button style: surface background (#F9FAFB), border 1px solid #E5E7EB, padding 8px 16px, icon + text layout
   - Hover: indigo-light background (#EEF2FF) + indigo text, smooth transition
   - Active/Selected: indigo background + white text
   
   **Message Input Area (Fixed Bottom):**
   - White background with top shadow (shadow-lg), padding 16px 24px
   - Multiline textarea input:
     * Placeholder: "输入消息..."
     * Min height 48px, max height 200px, auto-resize
     * Border 1px solid #E5E7EB, rounded-lg (12px)
     * Focus state: indigo ring 2px, border-color indigo
     * Padding 12px 16px, font-size 14px
   - Action buttons row (right-aligned, inline with input):
     * Craft button (magic wand icon, ghost style)
     * Auto button (auto icon, ghost style)
     * Skills button (puzzle icon, ghost style)
     * 选择文件夹 button (folder icon, ghost style)
     * Attach button (paperclip icon, ghost style)
     * Send button (arrow-up icon, primary indigo when enabled, disabled gray when empty)
   - Disclaimer text below input: "内容由 AI 生成，请核实重要信息。" (tiny 11px, muted gray, centered, margin-top 8px)

5. **Visual Enhancements:**
   - Subtle gradient background on hero section: linear-gradient from white to indigo-50
   - Floating animation on CTA button: gentle up-down motion (2s infinite)
   - Smooth fade-in animation for quick action chips: stagger delay 50ms each
   - Hover effects on all interactive elements: scale 1.02, shadow increase
   - Loading skeleton screens for conversation list
   - Toast notifications for actions (top-right corner)

**INTERACTIVE STATES:**
- Button hover: translateY(-1px) + shadow increase
- Button active: translateY(0) + scale 0.98
- Input focus: ring animation with indigo color
- Nav item active: left border indicator + background highlight
- Message send: slide-up animation + fade-in
- Connection status: pulsing green dot when online

**RESPONSIVE BEHAVIOR:**
- Desktop (>1024px): Full three-column layout as described
- Tablet (768-1024px): Collapsed left sidebar (icons only, 64px width), conversation panel 200px
- Mobile (<768px): Hidden sidebars with hamburger menu, full-width chat area, stacked quick actions

**ACCESSIBILITY:**
- All interactive elements have visible focus indicators (indigo ring)
- Sufficient color contrast (minimum 4.5:1 for text)
- Keyboard navigation support for all features
- ARIA labels on icon-only buttons
- Semantic HTML structure with proper heading hierarchy
```

---

## 🎨 Design Keywords

**Atmosphere**: Professional, Modern, Clean, Focused, Collaborative, Trustworthy  
**Style**: Minimalist, Glassmorphism, Soft UI, Contemporary  
**Color Mood**: Calm (indigo/violet), Energetic (accent pink), Balanced (neutral grays)  
**Typography**: Clear, Readable, Hierarchical, Modern sans-serif  
**Spacing**: Generous whitespace, Comfortable padding, Clear separation  
**Interactions**: Smooth, Responsive, Delightful, Intuitive  

---

## 📐 Technical Specifications

### Dimensions
- Header height: 64px
- Left sidebar width: 240px (collapsed: 64px)
- Conversation panel width: 280px (collapsible)
- Main content max-width: 1200px
- Input area fixed height: ~120px (variable with textarea expansion)

### Spacing Scale
- XS: 4px
- SM: 8px
- MD: 16px
- LG: 24px
- XL: 32px
- 2XL: 48px

### Border Radius
- Small: 6px (buttons, inputs)
- Medium: 12px (cards, panels)
- Large: 16px (hero sections)
- Full: 9999px (pills, badges)

### Shadows
- SM: `0 1px 2px rgba(0,0,0,0.05)`
- MD: `0 4px 6px -1px rgba(0,0,0,0.1)`
- LG: `0 10px 15px -3px rgba(0,0,0,0.1)`
- XL: `0 20px 25px -5px rgba(0,0,0,0.1)`

---

## 🚀 Generation Instructions

1. Use `generate_screen_from_text` with the enhanced prompt above
2. Set projectId to current OpenClaw project
3. Name the screen: "chat-page-v2-modern"
4. Download generated HTML to `.stitch/designs/chat-page-v2.html`
5. Download screenshot to `.stitch/designs/chat-page-v2.png`
6. Review outputComponents for suggestions and refinements
7. Use `edit_screens` for any adjustments needed

---

## ✨ Expected Output

A stunning, production-ready chat interface that:
- Feels modern and professional
- Has clear visual hierarchy
- Provides excellent UX with intuitive navigation
- Includes delightful micro-interactions
- Maintains consistency with the design system
- Is fully responsive across devices
- Follows accessibility best practices

---

*Created by Stitch Design Expert*  
*For OpenClaw Desktop Chat Interface Redesign*
