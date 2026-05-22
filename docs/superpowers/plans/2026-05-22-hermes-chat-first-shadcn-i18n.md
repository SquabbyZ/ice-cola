# Hermes Chat-first shadcn/i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the client 问道 page into a Hermes Chat-first workspace while remediating high-frequency client/admin shadcn/ui and i18n issues.

**Architecture:** Keep `packages/client/src/pages/Chat.tsx` as the container for existing Gateway/Hermes orchestration, but extract presentational UI into focused `components/chat/*` modules. Add missing local shadcn-style primitives only when required, move hardcoded high-frequency text into zh/en locale files, and keep admin remediation focused on redemption/Lingqi pages.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, i18next/react-i18next, local shadcn/ui-style components, Vitest, Playwright MCP.

---

## File Structure

### Create

- `packages/client/src/components/ui/textarea.tsx` — local shadcn-style Textarea primitive used by the chat composer.
- `packages/client/src/components/ui/separator.tsx` — local shadcn-style Separator primitive for the Hermes capability bar.
- `packages/client/src/components/chat/ChatComposer.tsx` — 1-line default / 3-line max composer with attachments, send, stop, and edit actions.
- `packages/client/src/components/chat/HermesCapabilityBar.tsx` — compact Hermes capability status and selectors for model, Lingqi, expert, MCP, skills, plugins, multimodal.
- `packages/client/src/components/chat/HermesExecutionBlock.tsx` — message-level tool/MCP/skill/plugin execution display.
- `packages/client/src/components/chat/ChatEmptyState.tsx` — Hermes-oriented empty state and quick actions.
- `packages/client/src/components/chat/ChatMessages.tsx` — scrollable message list wrapper around `ChatMessageItem`.
- `packages/client/src/components/chat/ChatComposer.test.tsx` — component tests for composer line behavior and keyboard handling.
- `packages/client/src/components/chat/HermesExecutionBlock.test.tsx` — component tests for execution states and i18n labels.
- `packages/client/src/i18n/chat-key-parity.test.ts` — zh/en key parity check for the chat namespace.
- `packages/admin/src/i18n/admin-key-parity.test.ts` — zh/en key parity check for admin remediation namespaces.
- `reports/问道页_Hermes_Chat_First_E2E_TEST_REPORT_YYYYMMDD.md` — created after Playwright MCP execution with the actual date.

### Modify

- `packages/client/src/pages/Chat.tsx` — keep orchestration, replace inline footer/header/message rendering with extracted components.
- `packages/client/src/components/ChatMessageItem.tsx` — replace raw high-frequency buttons with `Button`, delegate tool rendering to `HermesExecutionBlock`, move hardcoded labels to i18n.
- `packages/client/src/components/ConversationSidebar.tsx` — replace high-frequency hardcoded labels with i18n keys where touched by responsive shell.
- `packages/client/src/i18n/locales/zh.json` — add chat Hermes/capability/tool/composer keys.
- `packages/client/src/i18n/locales/en.json` — add English equivalents.
- `packages/admin/src/pages/RedemptionCodes.tsx` — replace hardcoded high-frequency Chinese strings with i18n keys while preserving existing shadcn components.
- `packages/admin/src/pages/RedemptionCodeDetail.tsx` — replace hardcoded high-frequency Chinese strings with i18n keys.
- `packages/admin/src/pages/LingqiLedger.tsx` — replace hardcoded high-frequency Chinese strings with i18n keys.
- `packages/admin/src/i18n/locales/zh.json` — add redemption/Lingqi namespaces.
- `packages/admin/src/i18n/locales/en.json` — add redemption/Lingqi namespaces.
- `packages/admin/src/pages/RedemptionCodes.test.tsx` — update expectations to use translated visible text and retain no-native-control assertions.

### Do Not Modify Unless Required By Build

- `packages/client/src/services/gateway-client.ts` — protocol behavior remains unchanged.
- `packages/server/**` — no backend protocol changes in this slice.
- `docker-compose.yml` — no runtime infrastructure change.

---

## Task 1: Add missing client UI primitives

**Files:**
- Create: `packages/client/src/components/ui/textarea.tsx`
- Create: `packages/client/src/components/ui/separator.tsx`

- [ ] **Step 1: Create Textarea primitive**

Create `packages/client/src/components/ui/textarea.tsx` with:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = 'Textarea';

export { Textarea };
```

- [ ] **Step 2: Create Separator primitive**

Create `packages/client/src/components/ui/separator.tsx` with:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

function Separator({ className, orientation = 'horizontal', ...props }: SeparatorProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === 'vertical' ? 'h-full w-px bg-border' : 'h-px w-full bg-border',
        className
      )}
      {...props}
    />
  );
}

export { Separator };
```

- [ ] **Step 3: Run client type check**

Run:

```bash
pnpm --dir packages/client build
```

Expected: Build reaches existing project state or passes. If it fails because the new files do not compile, fix the new files before continuing.

- [ ] **Step 4: Commit this task**

```bash
git add packages/client/src/components/ui/textarea.tsx packages/client/src/components/ui/separator.tsx
git commit -m "feat: add client ui primitives"
```

---

## Task 2: Add chat i18n keys and parity test

**Files:**
- Create: `packages/client/src/i18n/chat-key-parity.test.ts`
- Modify: `packages/client/src/i18n/locales/zh.json`
- Modify: `packages/client/src/i18n/locales/en.json`

- [ ] **Step 1: Write failing parity test**

Create `packages/client/src/i18n/chat-key-parity.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import en from './locales/en.json';
import zh from './locales/zh.json';

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key)
  );
}

describe('chat locale keys', () => {
  test('keeps zh and en chat keys in sync', () => {
    const zhKeys = flattenKeys(zh.chat).sort();
    const enKeys = flattenKeys(en.chat).sort();

    expect(enKeys).toEqual(zhKeys);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --dir packages/client vitest run src/i18n/chat-key-parity.test.ts
```

Expected: FAIL because the new Hermes/capability keys do not exist yet.

- [ ] **Step 3: Add zh chat keys**

Modify `packages/client/src/i18n/locales/zh.json` under the existing `chat` object. Add these nested objects while preserving existing keys:

```json
{
  "hermes": {
    "workspaceTitle": "Hermes 问道工作台",
    "ready": "Hermes 就绪",
    "connecting": "正在连接 Hermes",
    "disconnected": "Hermes 未连接",
    "gatewayReady": "Gateway 已连接",
    "gatewayDisconnected": "Gateway 未连接",
    "teamRequired": "请先创建或加入团队后再开始问道。"
  },
  "capabilities": {
    "model": "模型",
    "lingqi": "灵气",
    "expert": "专家",
    "mcp": "MCP",
    "skills": "技能",
    "plugins": "插件",
    "multimodal": "多模态",
    "more": "更多能力",
    "currentModel": "当前模型",
    "balance": "余额 {{amount}} 灵气",
    "estimate": "预计 {{amount}} 灵气",
    "estimateUnavailable": "发送前预估灵气消耗",
    "noExpert": "未选择专家",
    "mcpCount": "已选 {{count}} 个 MCP",
    "attachmentCount": "{{count}} 个附件"
  },
  "composer": {
    "placeholderReady": "向 Hermes 描述你的问题...",
    "placeholderEditing": "编辑这条消息...",
    "placeholderConnecting": "连接 Hermes 后即可输入",
    "send": "发送",
    "stop": "停止",
    "saveEdit": "保存编辑",
    "cancelEdit": "取消编辑",
    "attach": "添加附件",
    "enterToSend": "Enter 发送，Shift+Enter 换行"
  },
  "execution": {
    "running": "正在{{label}}...",
    "complete": "{{label}}完成",
    "error": "{{label}}失败：{{message}}",
    "unknownError": "未知错误",
    "details": "执行详情",
    "tool": "工具调用",
    "mcp": "MCP 调用",
    "skill": "技能执行",
    "plugin": "插件执行",
    "labels": {
      "web_search": "搜索网络",
      "web_extract": "提取网页内容",
      "execute_code": "执行代码",
      "code_execution": "执行代码",
      "image_generate": "生成图片",
      "vision_analyze": "分析图片",
      "read_file": "读取文件",
      "write_file": "写入文件",
      "terminal": "执行命令",
      "browser_navigate": "浏览网页"
    }
  }
}
```

- [ ] **Step 4: Add en chat keys**

Modify `packages/client/src/i18n/locales/en.json` under the existing `chat` object with matching keys:

```json
{
  "hermes": {
    "workspaceTitle": "Hermes Ask Workspace",
    "ready": "Hermes ready",
    "connecting": "Connecting to Hermes",
    "disconnected": "Hermes disconnected",
    "gatewayReady": "Gateway connected",
    "gatewayDisconnected": "Gateway disconnected",
    "teamRequired": "Create or join a team before asking Hermes."
  },
  "capabilities": {
    "model": "Model",
    "lingqi": "Lingqi",
    "expert": "Expert",
    "mcp": "MCP",
    "skills": "Skills",
    "plugins": "Plugins",
    "multimodal": "Multimodal",
    "more": "More capabilities",
    "currentModel": "Current model",
    "balance": "Balance {{amount}} Lingqi",
    "estimate": "Estimated {{amount}} Lingqi",
    "estimateUnavailable": "Estimate Lingqi before sending",
    "noExpert": "No expert selected",
    "mcpCount": "{{count}} MCP selected",
    "attachmentCount": "{{count}} attachments"
  },
  "composer": {
    "placeholderReady": "Describe your question to Hermes...",
    "placeholderEditing": "Edit this message...",
    "placeholderConnecting": "Connect to Hermes to start typing",
    "send": "Send",
    "stop": "Stop",
    "saveEdit": "Save edit",
    "cancelEdit": "Cancel edit",
    "attach": "Attach",
    "enterToSend": "Enter to send, Shift+Enter for newline"
  },
  "execution": {
    "running": "Running {{label}}...",
    "complete": "{{label}} complete",
    "error": "{{label}} failed: {{message}}",
    "unknownError": "Unknown error",
    "details": "Execution details",
    "tool": "Tool call",
    "mcp": "MCP call",
    "skill": "Skill execution",
    "plugin": "Plugin execution",
    "labels": {
      "web_search": "Search the web",
      "web_extract": "Extract web content",
      "execute_code": "Run code",
      "code_execution": "Run code",
      "image_generate": "Generate image",
      "vision_analyze": "Analyze image",
      "read_file": "Read file",
      "write_file": "Write file",
      "terminal": "Run command",
      "browser_navigate": "Browse page"
    }
  }
}
```

- [ ] **Step 5: Run parity test**

Run:

```bash
pnpm --dir packages/client vitest run src/i18n/chat-key-parity.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit this task**

```bash
git add packages/client/src/i18n/chat-key-parity.test.ts packages/client/src/i18n/locales/zh.json packages/client/src/i18n/locales/en.json
git commit -m "test: add chat locale parity coverage"
```

---

## Task 3: Build and test ChatComposer

**Files:**
- Create: `packages/client/src/components/chat/ChatComposer.tsx`
- Create: `packages/client/src/components/chat/ChatComposer.test.tsx`

- [ ] **Step 1: Write failing ChatComposer tests**

Create `packages/client/src/components/chat/ChatComposer.test.tsx`:

```tsx
import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import '../../i18n';
import { ChatComposer } from './ChatComposer';

interface RenderedComposer {
  container: HTMLDivElement;
  root: Root;
  textarea: HTMLTextAreaElement;
}

function renderComposer(overrides: Partial<React.ComponentProps<typeof ChatComposer>> = {}): RenderedComposer {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const props: React.ComponentProps<typeof ChatComposer> = {
    value: '',
    isEditing: false,
    isSending: false,
    gatewayConnected: true,
    canSend: true,
    attachments: [],
    onChange: vi.fn(),
    onSend: vi.fn(),
    onStop: vi.fn(),
    onCancelEdit: vi.fn(),
    onAttachClick: vi.fn(),
    ...overrides,
  };

  act(() => {
    root.render(<ChatComposer {...props} />);
  });

  const textarea = container.querySelector('textarea');
  if (!textarea) {
    throw new Error('textarea not found');
  }

  return { container, root, textarea };
}

describe('ChatComposer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('uses one row by default and caps input at three rows', () => {
    const { root, textarea } = renderComposer();

    expect(textarea.rows).toBe(1);
    expect(textarea.dataset.maxRows).toBe('3');

    act(() => {
      root.unmount();
    });
  });

  test('submits on Enter and allows Shift+Enter newline', () => {
    const onSend = vi.fn();
    const { root, textarea } = renderComposer({ value: 'hello Hermes', onSend });

    act(() => {
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    });
    expect(onSend).not.toHaveBeenCalled();

    act(() => {
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(onSend).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
  });

  test('shows connected and disconnected placeholders', () => {
    const connected = renderComposer({ gatewayConnected: true });
    expect(connected.textarea.placeholder).toContain('Hermes');
    act(() => connected.root.unmount());

    const disconnected = renderComposer({ gatewayConnected: false });
    expect(disconnected.textarea.placeholder).toContain('Hermes');
    expect(disconnected.textarea.disabled).toBe(true);
    act(() => disconnected.root.unmount());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --dir packages/client vitest run src/components/chat/ChatComposer.test.tsx
```

Expected: FAIL with module not found for `./ChatComposer`.

- [ ] **Step 3: Implement ChatComposer**

Create `packages/client/src/components/chat/ChatComposer.tsx`:

```tsx
import { Paperclip, Send, Square, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Attachment } from '@/stores/chat';

interface ChatComposerProps {
  value: string;
  isEditing: boolean;
  isSending: boolean;
  gatewayConnected: boolean;
  canSend: boolean;
  attachments: Attachment[];
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onCancelEdit: () => void;
  onAttachClick: () => void;
}

function ChatComposer({
  value,
  isEditing,
  isSending,
  gatewayConnected,
  canSend,
  attachments,
  onChange,
  onSend,
  onStop,
  onCancelEdit,
  onAttachClick,
}: ChatComposerProps) {
  const { t } = useTranslation();
  const trimmedValue = value.trim();
  const sendDisabled = !gatewayConnected || !canSend || !trimmedValue || isSending;
  const placeholder = !gatewayConnected
    ? t('chat.composer.placeholderConnecting')
    : isEditing
      ? t('chat.composer.placeholderEditing')
      : t('chat.composer.placeholderReady');

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    if (!sendDisabled) {
      onSend();
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-lg shadow-zinc-200/70">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 text-xs text-zinc-500">
          {attachments.map((attachment) => (
            <span key={attachment.id} className="rounded-full bg-zinc-100 px-2 py-1">
              {attachment.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onAttachClick}
          aria-label={t('chat.composer.attach')}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Textarea
          value={value}
          rows={1}
          data-max-rows="3"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={!gatewayConnected || isSending}
          className="max-h-[84px] min-h-[36px] flex-1 resize-none border-0 bg-transparent px-1 py-2 shadow-none focus-visible:ring-0"
        />

        {isSending ? (
          <Button type="button" variant="secondary" size="icon" onClick={onStop} aria-label={t('chat.composer.stop')}>
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" size="icon" onClick={onSend} disabled={sendDisabled} aria-label={t('chat.composer.send')}>
            <Send className="h-4 w-4" />
          </Button>
        )}

        {isEditing && (
          <Button type="button" variant="ghost" size="icon" onClick={onCancelEdit} aria-label={t('chat.composer.cancelEdit')}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <p className="mt-2 text-xs text-zinc-400">{t('chat.composer.enterToSend')}</p>
    </div>
  );
}

export { ChatComposer };
```

- [ ] **Step 4: Run ChatComposer test**

Run:

```bash
pnpm --dir packages/client vitest run src/components/chat/ChatComposer.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit this task**

```bash
git add packages/client/src/components/chat/ChatComposer.tsx packages/client/src/components/chat/ChatComposer.test.tsx
git commit -m "feat: add Hermes chat composer"
```

---

## Task 4: Build and test HermesExecutionBlock

**Files:**
- Create: `packages/client/src/components/chat/HermesExecutionBlock.tsx`
- Create: `packages/client/src/components/chat/HermesExecutionBlock.test.tsx`
- Modify: `packages/client/src/components/ChatMessageItem.tsx`

- [ ] **Step 1: Write failing execution block tests**

Create `packages/client/src/components/chat/HermesExecutionBlock.test.tsx`:

```tsx
import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { describe, expect, test } from 'vitest';
import '../../i18n';
import { HermesExecutionBlock } from './HermesExecutionBlock';

function renderText(element: React.ReactElement): string {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  const text = container.textContent ?? '';
  act(() => {
    root.unmount();
  });
  return text;
}

describe('HermesExecutionBlock', () => {
  test('renders running tool calls with localized label', () => {
    const text = renderText(
      <HermesExecutionBlock toolName="web_search" status="running" output="" />
    );

    expect(text).toContain('搜索网络');
  });

  test('renders failed tool calls with fallback error', () => {
    const text = renderText(
      <HermesExecutionBlock toolName="terminal" status="error" output="" />
    );

    expect(text).toContain('失败');
    expect(text).toContain('未知错误');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --dir packages/client vitest run src/components/chat/HermesExecutionBlock.test.tsx
```

Expected: FAIL with module not found for `./HermesExecutionBlock`.

- [ ] **Step 3: Implement HermesExecutionBlock**

Create `packages/client/src/components/chat/HermesExecutionBlock.tsx`:

```tsx
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ToolCallResult } from '@/stores/chat';

interface HermesExecutionBlockProps {
  toolName: string;
  status: ToolCallResult['status'];
  output?: string;
  imageUrl?: string;
}

function HermesExecutionBlock({ toolName, status, output, imageUrl }: HermesExecutionBlockProps) {
  const { t } = useTranslation();
  const label = t(`chat.execution.labels.${toolName}`, { defaultValue: toolName });
  const message = status === 'running'
    ? t('chat.execution.running', { label })
    : status === 'error'
      ? t('chat.execution.error', { label, message: output || t('chat.execution.unknownError') })
      : t('chat.execution.complete', { label });

  const Icon = status === 'running' ? Loader2 : status === 'error' ? XCircle : CheckCircle2;

  return (
    <div
      className={cn(
        'mt-2 rounded-xl border p-3 text-sm',
        status === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-zinc-200 bg-zinc-50 text-zinc-700'
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', status === 'running' && 'animate-spin')} />
        <Badge variant="secondary">{t('chat.execution.tool')}</Badge>
        <span>{message}</span>
      </div>

      {output && status !== 'error' && (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2 text-xs text-zinc-600">
          {output}
        </pre>
      )}

      {imageUrl && (
        <img src={imageUrl} alt={label} className="mt-2 max-h-64 rounded-lg border border-zinc-200 object-contain" />
      )}
    </div>
  );
}

export { HermesExecutionBlock };
```

- [ ] **Step 4: Run execution block test**

Run:

```bash
pnpm --dir packages/client vitest run src/components/chat/HermesExecutionBlock.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Replace tool rendering in ChatMessageItem**

Modify `packages/client/src/components/ChatMessageItem.tsx`:

- Import `HermesExecutionBlock`:

```tsx
import { HermesExecutionBlock } from '@/components/chat/HermesExecutionBlock';
```

- Replace the existing inline tool-call rendering block with:

```tsx
{message.toolCalls?.map((toolCall) => (
  <HermesExecutionBlock
    key={toolCall.toolCallId}
    toolName={toolCall.toolName}
    status={toolCall.status}
    output={toolCall.output}
    imageUrl={toolCall.imageUrl}
  />
))}
```

- Remove the now-unused `getToolLabel` helper from `ChatMessageItem.tsx`.

- [ ] **Step 6: Run tests and build**

Run:

```bash
pnpm --dir packages/client vitest run src/components/chat/HermesExecutionBlock.test.tsx && pnpm --dir packages/client build
```

Expected: PASS and build succeeds.

- [ ] **Step 7: Commit this task**

```bash
git add packages/client/src/components/chat/HermesExecutionBlock.tsx packages/client/src/components/chat/HermesExecutionBlock.test.tsx packages/client/src/components/ChatMessageItem.tsx
git commit -m "feat: localize Hermes execution blocks"
```

---

## Task 5: Build Hermes capability bar and empty state

**Files:**
- Create: `packages/client/src/components/chat/HermesCapabilityBar.tsx`
- Create: `packages/client/src/components/chat/ChatEmptyState.tsx`

- [ ] **Step 1: Create HermesCapabilityBar**

Create `packages/client/src/components/chat/HermesCapabilityBar.tsx`:

```tsx
import { Bot, Boxes, Brain, Circle, Coins, ImagePlus, PlugZap, Puzzle, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface HermesCapabilityBarProps {
  gatewayConnected: boolean;
  selectedModelName?: string;
  lingqiBalance?: string;
  lingqiEstimate?: string;
  selectedExpertName?: string;
  selectedMcpCount: number;
  attachmentCount: number;
  onModelClick: () => void;
  onExpertClick: () => void;
  onMcpClick: () => void;
  onSkillsClick: () => void;
  onPluginsClick: () => void;
  onAttachClick: () => void;
}

function HermesCapabilityBar({
  gatewayConnected,
  selectedModelName,
  lingqiBalance,
  lingqiEstimate,
  selectedExpertName,
  selectedMcpCount,
  attachmentCount,
  onModelClick,
  onExpertClick,
  onMcpClick,
  onSkillsClick,
  onPluginsClick,
  onAttachClick,
}: HermesCapabilityBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
      <Badge variant={gatewayConnected ? 'default' : 'secondary'} className="gap-1">
        <Circle className={cn('h-2 w-2 fill-current', gatewayConnected ? 'text-emerald-500' : 'text-zinc-400')} />
        {gatewayConnected ? t('chat.hermes.gatewayReady') : t('chat.hermes.gatewayDisconnected')}
      </Badge>

      <Separator orientation="vertical" className="hidden h-5 sm:block" />

      <Button type="button" variant="ghost" size="sm" onClick={onModelClick} className="gap-1">
        <Bot className="h-4 w-4" />
        {selectedModelName || t('chat.capabilities.model')}
      </Button>

      <Button type="button" variant="ghost" size="sm" className="gap-1">
        <Coins className="h-4 w-4" />
        {lingqiEstimate || lingqiBalance || t('chat.capabilities.estimateUnavailable')}
      </Button>

      <Button type="button" variant="ghost" size="sm" onClick={onExpertClick} className="gap-1">
        <Brain className="h-4 w-4" />
        {selectedExpertName || t('chat.capabilities.noExpert')}
      </Button>

      <Button type="button" variant="ghost" size="sm" onClick={onMcpClick} className="gap-1">
        <PlugZap className="h-4 w-4" />
        {t('chat.capabilities.mcpCount', { count: selectedMcpCount })}
      </Button>

      <Button type="button" variant="ghost" size="sm" onClick={onSkillsClick} className="gap-1">
        <Wrench className="h-4 w-4" />
        {t('chat.capabilities.skills')}
      </Button>

      <Button type="button" variant="ghost" size="sm" onClick={onPluginsClick} className="gap-1">
        <Puzzle className="h-4 w-4" />
        {t('chat.capabilities.plugins')}
      </Button>

      <Button type="button" variant="ghost" size="sm" onClick={onAttachClick} className="gap-1">
        {attachmentCount > 0 ? <Boxes className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
        {attachmentCount > 0
          ? t('chat.capabilities.attachmentCount', { count: attachmentCount })
          : t('chat.capabilities.multimodal')}
      </Button>
    </div>
  );
}

export { HermesCapabilityBar };
```

- [ ] **Step 2: Create ChatEmptyState**

Create `packages/client/src/components/chat/ChatEmptyState.tsx`:

```tsx
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface ChatEmptyStateProps {
  gatewayConnected: boolean;
  onPromptSelect: (prompt: string) => void;
}

function ChatEmptyState({ gatewayConnected, onPromptSelect }: ChatEmptyStateProps) {
  const { t } = useTranslation();
  const prompts = [
    t('chat.quickActions.explainCode'),
    t('chat.quickActions.debugError'),
    t('chat.quickActions.optimizePerformance'),
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 rounded-3xl bg-emerald-50 p-4 text-emerald-600">
        <Sparkles className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-semibold text-zinc-900">{t('chat.hermes.workspaceTitle')}</h2>
      <p className="mt-2 text-sm text-zinc-500">
        {gatewayConnected ? t('chat.hermes.ready') : t('chat.hermes.connecting')}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {prompts.map((prompt) => (
          <Button key={prompt} type="button" variant="outline" size="sm" onClick={() => onPromptSelect(prompt)}>
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}

export { ChatEmptyState };
```

- [ ] **Step 3: Run build**

Run:

```bash
pnpm --dir packages/client build
```

Expected: PASS.

- [ ] **Step 4: Commit this task**

```bash
git add packages/client/src/components/chat/HermesCapabilityBar.tsx packages/client/src/components/chat/ChatEmptyState.tsx
git commit -m "feat: add Hermes capability surfaces"
```

---

## Task 6: Extract ChatMessages wrapper

**Files:**
- Create: `packages/client/src/components/chat/ChatMessages.tsx`
- Modify: `packages/client/src/pages/Chat.tsx`

- [ ] **Step 1: Create ChatMessages**

Create `packages/client/src/components/chat/ChatMessages.tsx`:

```tsx
import ChatMessageItem from '@/components/ChatMessageItem';
import type { ChatMessage } from '@/stores/chat';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onRegenerate: (id: string) => void;
  onFeedback: (id: string, type: 'like' | 'dislike') => void;
}

function ChatMessages({
  messages,
  isLoading,
  messagesEndRef,
  onEdit,
  onDelete,
  onRegenerate,
  onFeedback,
}: ChatMessagesProps) {
  return (
    <div className="space-y-4 px-4 py-6">
      {messages.map((message) => (
        <ChatMessageItem
          key={message.id}
          message={message}
          onEdit={onEdit}
          onDelete={onDelete}
          onRegenerate={onRegenerate}
          onFeedback={onFeedback}
        />
      ))}

      {isLoading && <div className="text-sm text-zinc-400">...</div>}
      <div ref={messagesEndRef} />
    </div>
  );
}

export { ChatMessages };
```

- [ ] **Step 2: Replace inline message mapping in Chat.tsx**

Modify `packages/client/src/pages/Chat.tsx`:

- Add import:

```tsx
import { ChatMessages } from '@/components/chat/ChatMessages';
```

- Replace the inline message-list JSX with:

```tsx
<ChatMessages
  messages={messages}
  isLoading={isLoading}
  messagesEndRef={messagesEndRef}
  onEdit={handleStartEdit}
  onDelete={handleDeleteMessage}
  onRegenerate={handleRegenerateMessage}
  onFeedback={handleFeedback}
/>
```

Use the actual existing handler names in `Chat.tsx`. If a handler name differs, keep behavior identical and pass the existing function.

- [ ] **Step 3: Run build**

Run:

```bash
pnpm --dir packages/client build
```

Expected: PASS.

- [ ] **Step 4: Commit this task**

```bash
git add packages/client/src/components/chat/ChatMessages.tsx packages/client/src/pages/Chat.tsx
git commit -m "refactor: extract chat message list"
```

---

## Task 7: Integrate ChatComposer, capability bar, and empty state into Chat.tsx

**Files:**
- Modify: `packages/client/src/pages/Chat.tsx`

- [ ] **Step 1: Import extracted components**

Modify imports in `packages/client/src/pages/Chat.tsx`:

```tsx
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatEmptyState } from '@/components/chat/ChatEmptyState';
import { HermesCapabilityBar } from '@/components/chat/HermesCapabilityBar';
```

- [ ] **Step 2: Add composer reset helper**

Inside `Chat.tsx`, near existing message input helpers, add:

```tsx
const resetComposer = () => {
  setMessage('');
  if (inputRef.current) {
    inputRef.current.style.height = 'auto';
  }
};
```

Replace the successful-send `setMessage('')` call with `resetComposer()` after `hermes.send` has been accepted or after the existing successful send path currently clears the input.

- [ ] **Step 3: Replace empty state JSX**

Replace the current empty-state block with:

```tsx
<ChatEmptyState
  gatewayConnected={gatewayConnected}
  onPromptSelect={(prompt) => setMessage(prompt)}
/>
```

- [ ] **Step 4: Replace large footer panel with capability bar and composer**

Replace the current footer composer area with:

```tsx
<div className="border-t border-zinc-200 bg-zinc-50/95 p-3 backdrop-blur">
  <div className="mx-auto flex max-w-5xl flex-col gap-2">
    <HermesCapabilityBar
      gatewayConnected={gatewayConnected}
      selectedModelName={selectedLingqiModel?.displayName || selectedLingqiModel?.modelId}
      lingqiBalance={lingqiStatus ? t('chat.capabilities.balance', { amount: formatLingqiAmount(lingqiStatus.balance) }) : undefined}
      lingqiEstimate={lingqiEstimate ? t('chat.capabilities.estimate', { amount: formatLingqiAmount(lingqiEstimate.estimatedCost) }) : undefined}
      selectedExpertName={selectedExpert?.name}
      selectedMcpCount={selectedMcpServerIds.length}
      attachmentCount={attachments.length}
      onModelClick={() => setShowModelSelector(true)}
      onExpertClick={() => setShowExpertSelector(true)}
      onMcpClick={() => setShowMcpSelector(true)}
      onSkillsClick={() => navigate('/skills')}
      onPluginsClick={() => navigate('/extensions')}
      onAttachClick={() => fileInputRef.current?.click()}
    />

    <ChatComposer
      value={message}
      isEditing={Boolean(editingMessageId)}
      isSending={isSending}
      gatewayConnected={gatewayConnected}
      canSend={Boolean(currentTeamId)}
      attachments={attachments}
      onChange={setMessage}
      onSend={editingMessageId ? handleSaveEdit : handleSendMessage}
      onStop={handleStopGeneration}
      onCancelEdit={handleCancelEdit}
      onAttachClick={() => fileInputRef.current?.click()}
    />
  </div>
</div>
```

If `Chat.tsx` currently uses different state names for model selector, expert selector, MCP selector, attachments, team id, or file input, map those props to the existing state without changing behavior.

- [ ] **Step 5: Remove old inline textarea and footer panel imports**

Remove imports that are only used by the deleted footer JSX. Keep `LingqiModelSelector`, `LingqiCostPreview`, `ExpertSelector`, and `MCPSelector` if their dialogs/selectors still render elsewhere.

- [ ] **Step 6: Run targeted tests and build**

Run:

```bash
pnpm --dir packages/client vitest run src/components/chat/ChatComposer.test.tsx src/components/chat/HermesExecutionBlock.test.tsx src/i18n/chat-key-parity.test.ts && pnpm --dir packages/client build
```

Expected: PASS and build succeeds.

- [ ] **Step 7: Confirm file size**

Run:

```bash
node -e "const fs=require('fs'); for (const f of ['packages/client/src/pages/Chat.tsx','packages/client/src/components/chat/ChatComposer.tsx','packages/client/src/components/chat/HermesCapabilityBar.tsx','packages/client/src/components/chat/HermesExecutionBlock.tsx']) { const n=fs.readFileSync(f,'utf8').split('\n').length; console.log(`${f}: ${n}`); if (n>500) process.exitCode=1; }"
```

Expected: All listed files are `<= 500` lines.

- [ ] **Step 8: Commit this task**

```bash
git add packages/client/src/pages/Chat.tsx packages/client/src/components/chat/ChatComposer.tsx packages/client/src/components/chat/HermesCapabilityBar.tsx packages/client/src/components/chat/ChatEmptyState.tsx packages/client/src/components/chat/ChatMessages.tsx
git commit -m "feat: integrate Hermes chat-first workspace"
```

---

## Task 8: Remediate ChatMessageItem and ConversationSidebar i18n/buttons

**Files:**
- Modify: `packages/client/src/components/ChatMessageItem.tsx`
- Modify: `packages/client/src/components/ConversationSidebar.tsx`
- Modify: `packages/client/src/i18n/locales/zh.json`
- Modify: `packages/client/src/i18n/locales/en.json`

- [ ] **Step 1: Add client common action keys**

Add these matching keys under an existing `common` object or create it if absent.

`zh.json`:

```json
{
  "actions": {
    "edit": "编辑",
    "delete": "删除",
    "copy": "复制",
    "regenerate": "重新生成",
    "like": "有帮助",
    "dislike": "没帮助",
    "rename": "重命名",
    "search": "搜索",
    "newChat": "新开问道"
  }
}
```

`en.json`:

```json
{
  "actions": {
    "edit": "Edit",
    "delete": "Delete",
    "copy": "Copy",
    "regenerate": "Regenerate",
    "like": "Helpful",
    "dislike": "Not helpful",
    "rename": "Rename",
    "search": "Search",
    "newChat": "New ask"
  }
}
```

- [ ] **Step 2: Replace raw action buttons in ChatMessageItem**

In `packages/client/src/components/ChatMessageItem.tsx`:

- Import `useTranslation` if not already imported.
- Import `Button`:

```tsx
import { Button } from '@/components/ui/button';
```

- Replace action button elements with this pattern:

```tsx
<Button
  type="button"
  variant="ghost"
  size="icon"
  onClick={() => onEdit(message.id, message.content)}
  aria-label={t('actions.edit')}
  title={t('actions.edit')}
>
  <Edit3 className="h-4 w-4" />
</Button>
```

Apply the same pattern for delete, copy, regenerate, like, and dislike actions using the existing icons and callbacks.

- [ ] **Step 3: Replace high-frequency ConversationSidebar labels**

In `packages/client/src/components/ConversationSidebar.tsx`:

- Import `useTranslation` if not present.
- Replace visible hardcoded labels for new chat, search placeholder, rename, and delete with the new action keys.
- Preserve current conversation loading and selection behavior.

- [ ] **Step 4: Run client tests and build**

Run:

```bash
pnpm --dir packages/client vitest run src/i18n/chat-key-parity.test.ts src/components/chat/ChatComposer.test.tsx src/components/chat/HermesExecutionBlock.test.tsx && pnpm --dir packages/client build
```

Expected: PASS and build succeeds.

- [ ] **Step 5: Commit this task**

```bash
git add packages/client/src/components/ChatMessageItem.tsx packages/client/src/components/ConversationSidebar.tsx packages/client/src/i18n/locales/zh.json packages/client/src/i18n/locales/en.json
git commit -m "refactor: standardize chat actions and labels"
```

---

## Task 9: Add admin redemption/Lingqi i18n parity coverage

**Files:**
- Create: `packages/admin/src/i18n/admin-key-parity.test.ts`
- Modify: `packages/admin/src/i18n/locales/zh.json`
- Modify: `packages/admin/src/i18n/locales/en.json`

- [ ] **Step 1: Write failing admin parity test**

Create `packages/admin/src/i18n/admin-key-parity.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import en from './locales/en.json';
import zh from './locales/zh.json';

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key)
  );
}

describe('admin remediation locale keys', () => {
  test('keeps redemption and Lingqi keys in sync', () => {
    expect(flattenKeys(en.redemptionCodes).sort()).toEqual(flattenKeys(zh.redemptionCodes).sort());
    expect(flattenKeys(en.redemptionCodeDetail).sort()).toEqual(flattenKeys(zh.redemptionCodeDetail).sort());
    expect(flattenKeys(en.lingqiLedger).sort()).toEqual(flattenKeys(zh.lingqiLedger).sort());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --dir packages/admin vitest run src/i18n/admin-key-parity.test.ts
```

Expected: FAIL because the namespaces do not exist yet.

- [ ] **Step 3: Add zh admin namespaces**

Add these top-level objects to `packages/admin/src/i18n/locales/zh.json`:

```json
{
  "redemptionCodes": {
    "title": "兑换码管理",
    "description": "创建、筛选和追踪灵气兑换码",
    "create": "创建兑换码",
    "searchPlaceholder": "搜索兑换码或备注",
    "empty": "暂无兑换码",
    "columns": {
      "code": "兑换码",
      "type": "类型",
      "value": "数值",
      "status": "状态",
      "expiresAt": "过期时间",
      "createdAt": "创建时间",
      "actions": "操作"
    },
    "status": {
      "unused": "未使用",
      "used": "已使用",
      "expired": "已过期",
      "disabled": "已禁用"
    },
    "actions": {
      "copy": "复制",
      "view": "查看详情",
      "disable": "禁用",
      "enable": "启用"
    },
    "validation": {
      "amountRequired": "请输入灵气数量",
      "expiresAtRequired": "请选择过期时间"
    },
    "errors": {
      "loadFailed": "加载兑换码失败",
      "createFailed": "创建兑换码失败"
    }
  },
  "redemptionCodeDetail": {
    "title": "兑换码详情",
    "back": "返回兑换码列表",
    "usage": "使用记录",
    "metadata": "基础信息",
    "emptyUsage": "暂无使用记录",
    "errors": {
      "loadFailed": "加载兑换码详情失败"
    }
  },
  "lingqiLedger": {
    "title": "灵气账本",
    "description": "查看团队灵气变动和扣费明细",
    "filters": {
      "team": "团队",
      "type": "类型",
      "dateRange": "时间范围"
    },
    "columns": {
      "time": "时间",
      "team": "团队",
      "type": "类型",
      "amount": "数量",
      "balance": "余额",
      "description": "说明"
    },
    "empty": "暂无账本记录",
    "errors": {
      "loadFailed": "加载灵气账本失败"
    }
  }
}
```

- [ ] **Step 4: Add en admin namespaces**

Add matching top-level objects to `packages/admin/src/i18n/locales/en.json`:

```json
{
  "redemptionCodes": {
    "title": "Redemption codes",
    "description": "Create, filter, and track Lingqi redemption codes",
    "create": "Create code",
    "searchPlaceholder": "Search code or note",
    "empty": "No redemption codes",
    "columns": {
      "code": "Code",
      "type": "Type",
      "value": "Value",
      "status": "Status",
      "expiresAt": "Expires at",
      "createdAt": "Created at",
      "actions": "Actions"
    },
    "status": {
      "unused": "Unused",
      "used": "Used",
      "expired": "Expired",
      "disabled": "Disabled"
    },
    "actions": {
      "copy": "Copy",
      "view": "View details",
      "disable": "Disable",
      "enable": "Enable"
    },
    "validation": {
      "amountRequired": "Enter a Lingqi amount",
      "expiresAtRequired": "Choose an expiration time"
    },
    "errors": {
      "loadFailed": "Failed to load redemption codes",
      "createFailed": "Failed to create redemption code"
    }
  },
  "redemptionCodeDetail": {
    "title": "Redemption code detail",
    "back": "Back to redemption codes",
    "usage": "Usage records",
    "metadata": "Details",
    "emptyUsage": "No usage records",
    "errors": {
      "loadFailed": "Failed to load redemption code detail"
    }
  },
  "lingqiLedger": {
    "title": "Lingqi ledger",
    "description": "Review team Lingqi changes and charges",
    "filters": {
      "team": "Team",
      "type": "Type",
      "dateRange": "Date range"
    },
    "columns": {
      "time": "Time",
      "team": "Team",
      "type": "Type",
      "amount": "Amount",
      "balance": "Balance",
      "description": "Description"
    },
    "empty": "No ledger records",
    "errors": {
      "loadFailed": "Failed to load Lingqi ledger"
    }
  }
}
```

- [ ] **Step 5: Run admin parity test**

Run:

```bash
pnpm --dir packages/admin vitest run src/i18n/admin-key-parity.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit this task**

```bash
git add packages/admin/src/i18n/admin-key-parity.test.ts packages/admin/src/i18n/locales/zh.json packages/admin/src/i18n/locales/en.json
git commit -m "test: add admin locale parity coverage"
```

---

## Task 10: Apply admin redemption/Lingqi i18n remediation

**Files:**
- Modify: `packages/admin/src/pages/RedemptionCodes.tsx`
- Modify: `packages/admin/src/pages/RedemptionCodeDetail.tsx`
- Modify: `packages/admin/src/pages/LingqiLedger.tsx`
- Modify: `packages/admin/src/pages/RedemptionCodes.test.tsx`

- [ ] **Step 1: Wire translations in RedemptionCodes**

In `packages/admin/src/pages/RedemptionCodes.tsx`:

- Add or reuse:

```tsx
import { useTranslation } from 'react-i18next';
```

- Inside the component:

```tsx
const { t } = useTranslation();
```

- Replace high-frequency hardcoded labels with keys:

```tsx
<h1>{t('redemptionCodes.title')}</h1>
<p>{t('redemptionCodes.description')}</p>
<Button>{t('redemptionCodes.create')}</Button>
<Input placeholder={t('redemptionCodes.searchPlaceholder')} />
```

- Replace table headers with `t('redemptionCodes.columns.code')`, `t('redemptionCodes.columns.type')`, `t('redemptionCodes.columns.value')`, `t('redemptionCodes.columns.status')`, `t('redemptionCodes.columns.expiresAt')`, `t('redemptionCodes.columns.createdAt')`, and `t('redemptionCodes.columns.actions')`.

- Replace status labels through a local map:

```tsx
const statusLabelKey: Record<string, string> = {
  UNUSED: 'redemptionCodes.status.unused',
  USED: 'redemptionCodes.status.used',
  EXPIRED: 'redemptionCodes.status.expired',
  DISABLED: 'redemptionCodes.status.disabled',
};
```

Render with:

```tsx
{t(statusLabelKey[status] ?? 'redemptionCodes.status.unused')}
```

- [ ] **Step 2: Wire translations in RedemptionCodeDetail**

In `packages/admin/src/pages/RedemptionCodeDetail.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
```

Inside the component:

```tsx
const { t } = useTranslation();
```

Replace visible hardcoded title/back/usage/metadata/empty/error labels with:

```tsx
{t('redemptionCodeDetail.title')}
{t('redemptionCodeDetail.back')}
{t('redemptionCodeDetail.usage')}
{t('redemptionCodeDetail.metadata')}
{t('redemptionCodeDetail.emptyUsage')}
{t('redemptionCodeDetail.errors.loadFailed')}
```

- [ ] **Step 3: Wire translations in LingqiLedger**

In `packages/admin/src/pages/LingqiLedger.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
```

Inside the component:

```tsx
const { t } = useTranslation();
```

Replace visible title/description/filter/table/empty/error labels with:

```tsx
{t('lingqiLedger.title')}
{t('lingqiLedger.description')}
{t('lingqiLedger.filters.team')}
{t('lingqiLedger.filters.type')}
{t('lingqiLedger.filters.dateRange')}
{t('lingqiLedger.columns.time')}
{t('lingqiLedger.columns.team')}
{t('lingqiLedger.columns.type')}
{t('lingqiLedger.columns.amount')}
{t('lingqiLedger.columns.balance')}
{t('lingqiLedger.columns.description')}
{t('lingqiLedger.empty')}
{t('lingqiLedger.errors.loadFailed')}
```

- [ ] **Step 4: Update RedemptionCodes tests**

In `packages/admin/src/pages/RedemptionCodes.test.tsx`, update assertions that depend on hardcoded Chinese labels to use the new rendered fallback zh text. Keep existing assertions that prove:

```ts
expect(screen.queryByDisplayValue(/datetime-local/i)).not.toBeInTheDocument();
expect(window.alert).not.toHaveBeenCalled();
```

If the file currently asserts specific Chinese strings, update to the matching new zh translations from Task 9.

- [ ] **Step 5: Run admin tests and build**

Run:

```bash
pnpm --dir packages/admin vitest run src/i18n/admin-key-parity.test.ts src/pages/RedemptionCodes.test.tsx && pnpm --dir packages/admin build
```

Expected: PASS and build succeeds.

- [ ] **Step 6: Commit this task**

```bash
git add packages/admin/src/pages/RedemptionCodes.tsx packages/admin/src/pages/RedemptionCodeDetail.tsx packages/admin/src/pages/LingqiLedger.tsx packages/admin/src/pages/RedemptionCodes.test.tsx
git commit -m "refactor: localize admin Lingqi management pages"
```

---

## Task 11: Responsive manual verification and E2E report

**Files:**
- Create: `reports/问道页_Hermes_Chat_First_E2E_TEST_REPORT_YYYYMMDD.md`

- [ ] **Step 1: Start required dev services**

Run:

```bash
pm2 start ecosystem.config.cjs --update-env
```

Expected: PM2 starts or restarts `ice-cola-admin-1992` and `ice-cola-client-1420`.

- [ ] **Step 2: Verify service status**

Run:

```bash
pm2 status
```

Expected: `ice-cola-client-1420` and `ice-cola-admin-1992` are online.

- [ ] **Step 3: Use Playwright MCP for client responsive checks**

Using Playwright MCP, open `http://localhost:1420` and verify the Chat/问道 page at these viewports:

- 1440 x 900
- 1024 x 768
- 768 x 900
- 375 x 812
- 1024 x 600

For each viewport confirm:

- Conversation area remains the primary visual area.
- Hermes/Gateway status is visible or available through the collapsed capability surface.
- Model, Lingqi, Expert, MCP, Skills, Plugins, and Multimodal entrances are visible or reachable.
- The input starts visually as one row.
- The input grows no higher than three rows.
- Sending or triggering send clears the composer and visually returns it to one row when the app accepts the send.
- No horizontal overflow appears.

- [ ] **Step 4: Use Playwright MCP for admin smoke checks**

Using Playwright MCP, open `http://localhost:1992` and verify the admin redemption/Lingqi pages render localized labels without native browser dialogs:

- `/redemption-codes`
- `/lingqi-ledger`

Confirm:

- Page titles and table headers render from locale text.
- shadcn-style buttons, inputs, selects, tables, dialogs remain styled.
- Creating/opening a redemption dialog does not call `window.alert()` or `window.confirm()`.

- [ ] **Step 5: Write E2E report**

Create `reports/问道页_Hermes_Chat_First_E2E_TEST_REPORT_YYYYMMDD.md` using the actual date. Use this structure:

```markdown
# 问道页 Hermes Chat-first E2E Test Report

## Test Time

YYYY-MM-DD HH:mm local time

## Tested Feature

Hermes Chat-first 问道页、client/admin 高频 shadcn/ui 组件整改、client/admin 高频 i18n 清理。

## Environment

- Client: http://localhost:1420
- Admin: http://localhost:1992
- Browser: Playwright MCP Chromium

## Test Steps

1. Opened client Chat/问道 page at 1440 x 900.
2. Verified conversation-first layout and Hermes capability bar.
3. Repeated layout checks at 1024 x 768, 768 x 900, 375 x 812, and 1024 x 600.
4. Verified composer one-row default, three-row maximum, and reset after send acceptance.
5. Verified model, Lingqi, expert, MCP, skills, plugins, and multimodal entrances.
6. Opened admin redemption and Lingqi pages.
7. Verified localized labels and shadcn-style controls.

## Result

PASS or FAIL

## Evidence

- Screenshot paths or descriptions from Playwright MCP.

## Issues

- List any remaining issues with priority and status.
```

- [ ] **Step 6: Commit report**

```bash
git add reports/问道页_Hermes_Chat_First_E2E_TEST_REPORT_YYYYMMDD.md
git commit -m "test: add Hermes chat-first E2E report"
```

---

## Task 12: Final validation and reviews

**Files:**
- Review all files modified in Tasks 1-11.

- [ ] **Step 1: Run client validation**

Run:

```bash
pnpm --dir packages/client vitest run src/i18n/chat-key-parity.test.ts src/components/chat/ChatComposer.test.tsx src/components/chat/HermesExecutionBlock.test.tsx && pnpm --dir packages/client build
```

Expected: PASS and build succeeds.

- [ ] **Step 2: Run admin validation**

Run:

```bash
pnpm --dir packages/admin vitest run src/i18n/admin-key-parity.test.ts src/pages/RedemptionCodes.test.tsx && pnpm --dir packages/admin build
```

Expected: PASS and build succeeds.

- [ ] **Step 3: Run file-size check**

Run:

```bash
node -e "const fs=require('fs'); const files=['packages/client/src/pages/Chat.tsx','packages/client/src/components/ChatMessageItem.tsx','packages/client/src/components/ConversationSidebar.tsx','packages/client/src/components/chat/ChatComposer.tsx','packages/client/src/components/chat/HermesCapabilityBar.tsx','packages/client/src/components/chat/HermesExecutionBlock.tsx','packages/client/src/components/chat/ChatMessages.tsx','packages/client/src/components/chat/ChatEmptyState.tsx','packages/admin/src/pages/RedemptionCodes.tsx','packages/admin/src/pages/RedemptionCodeDetail.tsx','packages/admin/src/pages/LingqiLedger.tsx']; for (const f of files) { const n=fs.readFileSync(f,'utf8').split('\n').length; console.log(`${f}: ${n}`); if (n>500) process.exitCode=1; }"
```

Expected: all listed files are `<= 500` lines.

- [ ] **Step 4: Run raw control audit for scoped files**

Run:

```bash
node -e "const fs=require('fs'); const files=['packages/client/src/pages/Chat.tsx','packages/client/src/components/ChatMessageItem.tsx','packages/client/src/components/chat/ChatComposer.tsx','packages/admin/src/pages/RedemptionCodes.tsx','packages/admin/src/pages/RedemptionCodeDetail.tsx','packages/admin/src/pages/LingqiLedger.tsx']; const patterns=[/<button\\b/g,/<textarea\\b/g,/<select\\b/g,/<table\\b/g,/window\\.confirm\\(/g,/window\\.alert\\(/g]; for (const f of files) { const s=fs.readFileSync(f,'utf8'); for (const p of patterns) { const m=s.match(p); if (m) console.log(`${f}: ${p} -> ${m.length}`); } }"
```

Expected: no `window.confirm(` or `window.alert(`. Any remaining raw semantic elements are intentional and documented in the final summary.

- [ ] **Step 5: Run code review agents**

Use these agents after code changes are complete:

- `code-reviewer` for general quality.
- `typescript-reviewer` for TypeScript/React correctness.
- `security-reviewer` because the changes touch user input, attachments, and external Hermes/Gateway surfaces.

Expected: no CRITICAL or HIGH findings remain.

- [ ] **Step 6: Commit any final fixes**

If review or validation required fixes:

```bash
git add <fixed-files>
git commit -m "fix: address Hermes chat-first validation findings"
```

Expected: commit succeeds with hooks passing.

---

## Self-Review

### Spec coverage

- Hermes Chat-first workspace: Tasks 3, 5, 6, and 7.
- Input default 1 row, max 3 rows, reset after send: Tasks 3, 7, and 11.
- Skills/MCP/plugins/experts/multimodal entrances: Tasks 5, 7, and 11.
- shadcn/ui high-frequency remediation: Tasks 1, 3, 4, 5, 8, and 10.
- client/admin i18n cleanup: Tasks 2, 8, 9, and 10.
- 500-line limit: Tasks 7 and 12.
- TDD: Tasks 2, 3, 4, and 9 write failing tests before implementation.
- Playwright MCP report: Task 11.
- Final review and security review: Task 12.

### Placeholder scan

This plan contains no TBD markers and no intentionally vague implementation steps. Steps that touch code include exact file paths, concrete snippets, commands, and expected outcomes.

### Type consistency

The plan consistently uses `Attachment` and `ToolCallResult` from `packages/client/src/stores/chat.ts`, existing `Button` and new `Textarea`/`Separator` UI primitives, and existing i18next JSON imports for parity tests.
