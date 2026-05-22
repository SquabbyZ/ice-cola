# TypeScript UI Standards

Source: Extracted from project `CLAUDE.md` to keep the root instruction file compact.
Scope: React/Tauri/Admin frontend UI conventions.

## Confirmation Dialogs

Do not use browser-native `window.confirm()`.

All confirmation flows must use the project Dialog components so style, behavior, and brand remain consistent.

Preferred client component:

```tsx
import ConfirmDialog from '@/components/ConfirmDialog';
```

Or build a confirmation flow from:

```tsx
import { Dialog } from '@/components/ui/dialog';
```

Why:
- Native browser dialogs have inconsistent styling.
- Native dialogs cannot match product branding.
- Native dialogs may be blocked or behave inconsistently in embedded contexts.
