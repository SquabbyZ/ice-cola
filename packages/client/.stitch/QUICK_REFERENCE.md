# OpenClaw Chat Page - Quick Reference Card

## 🎨 Color Palette (Copy-Paste Ready)

```css
/* Primary */
--primary-50: #EEF2FF;
--primary-500: #6366F1;
--primary-600: #4F46E5;

/* Neutral */
--white: #FFFFFF;
--gray-50: #F9FAFB;
--gray-200: #E5E7EB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-900: #111827;

/* Status */
--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;
```

## 📐 Spacing Scale

```
XS: 4px   | SM: 8px   | MD: 16px
LG: 24px  | XL: 32px  | 2XL: 48px | 3XL: 64px
```

## 🔲 Border Radius

```
Small: 6px   | Medium: 12px   | Large: 16px   | Full: 9999px
```

## 🌑 Shadow Values

```css
shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1);
```

## 📝 Typography Scale

```
H1: 32px / 40px lh / 700 weight
H2: 24px / 32px lh / 600 weight
H3: 20px / 28px lh / 600 weight
Body LG: 16px / 24px lh / 400 weight
Body: 14px / 20px lh / 400 weight
Small: 12px / 16px lh / 400 weight
Tiny: 11px / 14px lh / 400 weight
```

## 🏗️ Layout Dimensions

```
Header Height: 64px
Left Sidebar: 240px (collapsed: 64px)
Conversation Panel: 280px
Main Content Max-Width: 1200px
```

## ⚡ Animation Timings

```
Fast: 150ms ease-out (hover)
Normal: 250ms ease-in-out (modals)
Slow: 350ms ease-in-out (transitions)
```

## 🎯 Key Components

### Primary Button
```jsx
<button className="bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-150 hover:scale-102 hover:shadow-lg active:scale-98">
  Button Text
</button>
```

### Secondary Button
```jsx
<button className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-300 transition-all">
  Button Text
</button>
```

### Input Field
```jsx
<input className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" />
```

### Card
```jsx
<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-250">
  Card Content
</div>
```

### Pill Chip
```jsx
<button className="bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all">
  <Icon className="w-4 h-4 mr-2" />
  Label
</button>
```

## 📱 Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 767px) { ... }

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) { ... }

/* Desktop */
@media (min-width: 1024px) { ... }
```

## ♿ Accessibility Checklist

- [ ] Color contrast ≥ 4.5:1
- [ ] Focus visible on all interactive elements
- [ ] ARIA labels on icon buttons
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] Semantic HTML structure

## 🚀 Tailwind Utility Classes

```javascript
// Colors
bg-indigo-500 hover:bg-indigo-600
text-gray-900 text-gray-500
border-gray-200

// Spacing
p-4 (16px) px-6 (24px) py-3 (12px)
m-4 mb-6 mt-2

// Rounded
rounded-md (6px) rounded-lg (12px) rounded-xl (16px) rounded-full

// Shadows
shadow-sm shadow-md shadow-lg shadow-xl

// Typography
text-xs text-sm text-base text-lg text-xl text-2xl
font-normal font-medium font-semibold font-bold

// Flexbox
flex items-center justify-between
flex-wrap gap-3

// Transitions
transition-all duration-150 ease-out
hover:scale-102 hover:shadow-lg
```

## 📁 File Structure

```
.stitch/
├── DESIGN.md              ← Full design system
├── chat-page-prompt.md    ← Stitch MCP prompt
├── design-preview.md      ← Implementation guide
├── REDESIGN_SUMMARY.md    ← Project summary
├── QUICK_REFERENCE.md     ← This file
└── designs/
    └── current-layout.png ← Current screenshot
```

## 🔗 Quick Links

- **Full Spec**: `.stitch/DESIGN.md`
- **Implementation**: `.stitch/design-preview.md`
- **Summary**: `.stitch/REDESIGN_SUMMARY.md`
- **Stitch Prompt**: `.stitch/chat-page-prompt.md`

---

*Quick reference for OpenClaw Chat Page Redesign*  
*Keep this handy during implementation!*
