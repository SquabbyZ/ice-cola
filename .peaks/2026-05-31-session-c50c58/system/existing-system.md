# Existing System Extraction: ice-cola
**Date:** 2026-05-31
**Session:** 2026-05-31-session-c50c58
**Archetype:** legacy-fullstack

## Visual Tokens

### Color System
- Primary: Zinc palette (zinc-100, zinc-200, zinc-400, zinc-500)
- Background: white (bg-white)
- Border: border-zinc-200
- Text: text-zinc-400, text-zinc-500
- Shadow: shadow-zinc-200/70

### Spacing
- Component padding: p-3
- Gap between elements: gap-2
- Margin bottom: mb-2, mt-2
- Rounded corners: rounded-2xl (components), rounded-full (tags)

### Typography
- Small text: text-xs
- Icon size: h-4 w-4

### Component Patterns
- Card-like containers: rounded-2xl border shadow-lg
- Tags/badges: rounded-full bg-zinc-100 px-2 py-1
- Buttons: Radix UI Button with variants (ghost, secondary, default)
- Form controls: Radix UI Textarea with custom styling

## Code Conventions

### Component Naming
- Pattern: PascalCase for component names
- File naming: PascalCase.tsx (e.g., ChatComposer.tsx)
- Export pattern: Named exports with type exports
  ```typescript
  export { ChatComposer };
  export type { ChatComposerProps };
  ```

### Component Structure
- Directory: `src/components/` (flat) or `src/components/<feature>/` (grouped)
- Props interface: `<ComponentName>Props`
- Functional components with TypeScript
- Props destructuring in function signature

### Service Layer
- Directory: `src/services/`
- Pattern: Service functions with axios
- Repository pattern: `src/repositories/`

### Hooks
- Directory: `src/hooks/`
- Naming: `use<Name>` prefix (React convention)

### State Management
- Store directory: `src/stores/`
- Library: Zustand
- Type exports: Export types alongside store

### Internationalization
- Library: react-i18next
- Usage: `const { t } = useTranslation();`
- Keys: Namespaced (e.g., 'chat.composer.placeholderReady')

### Styling Conventions
- TailwindCSS utility classes
- No inline styles
- Component-specific classes in className prop
- Responsive: Not heavily used in sampled code
- Dark mode: Not detected in sampled code

### Import Patterns
- Type imports: `import type React from 'react';`
- Alias: `@/` for src root
- UI components: `@/components/ui/<component>`
- Icons: lucide-react

### Event Handlers
- Naming: `handle<Action>` (e.g., handleSend, handleStop)
- Async handling: `Promise.resolve(callback()).catch(() => undefined)`
- Keyboard events: Check for composition (IME) before handling

### Accessibility
- aria-label on icon buttons
- Semantic HTML where appropriate
- Disabled states on interactive elements

## Inconsistencies
None detected in sampled code. The codebase follows consistent modern React + TypeScript patterns.

## Sources
- packages/client/src/components/chat/ChatComposer.tsx
- packages/client/src directory structure
- package.json dependencies (Radix UI, TailwindCSS, Zustand, React Query)
