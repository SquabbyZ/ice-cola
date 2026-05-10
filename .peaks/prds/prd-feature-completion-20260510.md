# PRD - ice-cola Client Feature Completion

## Overview

### Background

The ice-cola client (packages/client) has multiple pages that are either using mock data, hardcoded stubs, or missing i18n coverage. Several UI components render placeholder content instead of real data. This PRD groups the work into 7 logical packages to bring client pages to feature-complete state.

### Target

Ship a client where every page either loads real data or explicitly communicates its empty state -- no more silent `0`s, `console.log` stubs, or hardcoded mock data.

## User Stories

- As an admin, I want the Dashboard to show real expert counts and MCP service counts so I know the system status at a glance.
- As a team lead, I want the Workorders page to load real data from the backend so I can manage approvals.
- As a user, I want to create and manage skills with a working "Create Skill" flow and version history.
- As a user, I want the Settings modal to look consistent with the rest of the app.
- As a developer, I want category filters and hardcoded strings to use i18n so the app works in both Chinese and English.

---

## Work Packages

### WP1: Dashboard Data Completeness

**Priority: P0**

**What changes:**
- `packages/client/src/pages/Dashboard.tsx` (lines 183-207)
  - Stat 3 "Active Experts": currently hardcoded to `{0}`, line 188
  - Stat 4 "MCP Services": currently hardcoded to `{0}`, line 203
- `packages/client/src/pages/Dashboard.tsx` (lines 53-78, 264-293)
  - Workspace tool cards have no click handlers

**Changes required:**

1. **Active Experts stat**: Wire to an existing or new API that returns the count of active experts. Options:
   - Use `useExpertStore` with a filter for active status, or
   - Add a `getActiveExpertCount()` call to `expert-service.ts` and expose it via the store.
   - Display the real count in the stat card.

2. **MCP Services stat**: Wire to MCP connection data. Options:
   - Import `useMCPStore` and use `connectedServers.length`, or
   - Fetch via a dedicated stats endpoint.
   - Display the real connected count.

3. **Workspace tool cards**: Each card should navigate to the corresponding feature page on click:
   - "Doc Processing" -> navigate to Chat with a doc-processing context
   - "Data Analysis" -> navigate to Chat with an analysis context
   - "Email Assistant" -> navigate to Chat with an email context
   - "Schedule Management" -> navigate to Chat with a scheduling context
   - Add `onClick` handlers using `useNavigate()` from react-router-dom.

**Acceptance criteria:**
- [ ] "Active Experts" shows a real count from the API (not 0 or hardcoded)
- [ ] "MCP Services" shows a real count from the MCP store (not 0 or hardcoded)
- [ ] Each workspace tool card navigates somewhere on click
- [ ] Loading skeletons still display correctly before data loads

**Files touched:**
- `packages/client/src/pages/Dashboard.tsx`

---

### WP2: Workorders Real Data Integration

**Priority: P0**

**What changes:**
- `packages/client/src/stores/workordersStore.ts`
  - Lines 53-97: `MOCK_WORKORDERS` and `MOCK_HISTORY` are hardcoded mock data
  - Lines 108-126: `loadWorkorders` and `loadHistory` use `setTimeout` + mock data instead of calling `workorder-service.ts`
  - Lines 128-177: `approve` and `reject` mutate local state without calling the API
  - Line 139: `approverName` is hardcoded to `'当前用户'`

**Changes required:**

1. **Import `workorderService`**: The service already exists at `services/workorder-service.ts` with full CRUD + batch operations. Import it into the store.

2. **Rewrite `loadWorkorders`**: Replace mock data loading with `workorderService.getList(teamId)`. The store needs access to `teamId` (from `useAuthStore`).

3. **Rewrite `loadHistory`**: Replace mock with `workorderService.getHistory(teamId)`.

4. **Rewrite `approve` / `reject`**: Call `workorderService.approve(id, comment)` / `workorderService.reject(id, comment)` before updating local state. Use optimistic updates (update local state first, revert on error).

5. **Rewrite `batchApprove` / `batchReject`**: Use `workorderService.batchApprove(ids, comment)` / `workorderService.batchReject(ids, comment)` instead of sequential loops.

6. **Fix hardcoded approver name**: Use the current user's name from `useAuthStore.getState().user`.

7. **Delete `MOCK_WORKORDERS` and `MOCK_HISTORY` constants** after integration.

**Acceptance criteria:**
- [ ] Workorders page loads data from the backend API (not mock)
- [ ] Approve/reject operations call the backend API
- [ ] Batch approve/reject uses the batch API endpoints
- [ ] Approver name reflects the logged-in user
- [ ] No mock data constants remain in the store file
- [ ] Error handling: failed API calls show toast errors and revert optimistic updates

**Files touched:**
- `packages/client/src/stores/workordersStore.ts`

---

### WP3: Tasks Page Implementation

**Priority: P1**

**What changes:**
- `packages/client/src/pages/Tasks.tsx` -- currently a "Coming Soon" placeholder with hardcoded dash values
- `packages/client/src/stores/` -- no tasks store exists
- `packages/client/src/services/` -- no tasks service exists

**Changes required (MVP scope):**

1. **Create `services/task-service.ts`**:
   - `getTasks(teamId): Promise<Task[]>`
   - `createTask(teamId, data): Promise<Task>`
   - `deleteTask(id): Promise<void>`
   - `getTaskStats(teamId): Promise<TaskStats>`

2. **Create `stores/tasksStore.ts`**:
   - State: `tasks: Task[]`, `isLoading`, `error`
   - Actions: `loadTasks`, `createTask`, `deleteTask`
   - Filter by status: `running`, `completed`, `pending`, `failed`

3. **Update `pages/Tasks.tsx`**:
   - Remove "Coming Soon" placeholder
   - Wire stat cards to real `TaskStats` data
   - Add a task list with basic table/card layout showing: name, status, created time, last run time
   - Wire "Create Task" button to a simple create dialog (name + description + type)
   - Wire delete action with confirmation dialog
   - Keep scope minimal -- no scheduling, no execution history, no complex workflows

4. **Add i18n keys** for task creation dialog, table headers, empty states.

**Acceptance criteria:**
- [ ] Tasks page displays a real list of tasks from the API (or empty state if backend endpoint not yet available)
- [ ] Stat cards show real counts (running, completed, total, success rate)
- [ ] "Create Task" button opens a create dialog
- [ ] Tasks can be deleted with confirmation
- [ ] Page uses i18n for all visible strings
- [ ] If backend task endpoints do not exist yet, store returns empty array with graceful empty state (no crashes)

**Files touched:**
- `packages/client/src/pages/Tasks.tsx` (rewrite)
- `packages/client/src/stores/tasksStore.ts` (new)
- `packages/client/src/services/task-service.ts` (new)
- `packages/client/src/i18n/locales/en.json` (add task keys)
- `packages/client/src/i18n/locales/zh.json` (add task keys)

---

### WP4: Skills Create and Version History UI

**Priority: P1**

**What changes:**
- `packages/client/src/pages/Skills.tsx` line 141-146: "Create" button has no `onClick` handler
- `packages/client/src/pages/Skills.tsx` line 183: `onVersionHistory` calls `console.log`
- `packages/client/src/stores/skillsStore.ts` lines 153-156: `getVersions` always returns `[]`
- `packages/client/src/stores/skillsStore.ts` lines 158-160: `revertToVersion` is a `console.log` stub
- `packages/client/src/services/skill-service.ts`: no `getVersions` or `createSkill` version tracking

**Changes required:**

1. **Create Skill dialog**: Build a `CreateSkillDialog` component (or inline modal) with fields:
   - Name (required)
   - Description (required)
   - Category (dropdown)
   - Tags (comma-separated input)
   - Content (textarea for skill prompt/template)
   - On submit: call `skillService.createSkill()` then refresh `personalSkills`

2. **Wire "Create" button**: Add `onClick` to the Skills page create button that opens the dialog.

3. **Implement `getVersions`**: Add a `skillService.getVersions(skillId)` method that calls the backend. If backend endpoint does not exist, return empty array and show "No versions yet" state.

4. **Wire `onVersionHistory`**: Replace `console.log` with opening a `SkillVersionHistory` dialog/modal that:
   - Calls `getVersions(skillId)`
   - Renders the existing `SkillVersionHistory` component with the result
   - Handles preview and revert actions

5. **Implement `revertToVersion`**: Add a `skillService.revertToVersion(skillId, versionId)` method. If backend endpoint does not exist, show a toast "Not yet available".

**Acceptance criteria:**
- [ ] "Create Skill" button opens a form dialog
- [ ] Submitting the form calls the API and adds the skill to the personal list
- [ ] "Version History" click opens a modal showing version list (or empty state)
- [ ] Revert action calls the API or shows an appropriate toast if unavailable
- [ ] No `console.log` stubs remain in production code paths

**Files touched:**
- `packages/client/src/pages/Skills.tsx`
- `packages/client/src/stores/skillsStore.ts`
- `packages/client/src/services/skill-service.ts`
- `packages/client/src/components/CreateSkillDialog.tsx` (new)

---

### WP5: i18n Coverage Fix

**Priority: P1**

**What changes:**
Multiple files have hardcoded Chinese/English strings that bypass the i18n system.

**Affected files and scope:**

1. **`components/SettingsModal.tsx`** (highest impact):
   - Line 164: menu item labels `'账户'`, `'系统'`, `'记忆'`, `'模型'`, `'Claw'`, `'数据'`, `'帮助'`
   - Line 176-184: `'显示语言'`, `'设置应用程序界面的显示语言'`, `'中文(简体)'`, `'English'`
   - Line 188-194: `'字体大小'`, `'调整界面文字大小'`, `'默认'`
   - Lines 200-224: `'简洁模式'`, `'非高风险自动安装'`, `'防休眠'` and descriptions
   - Lines 228-249: memory settings labels
   - Lines 252-411: model/API key settings, quota settings labels
   - Lines 413-457: integration settings labels
   - Lines 459-525: data management labels
   - Lines 509-525: help section labels
   - Lines 529, 540-577: account placeholder, modal title, etc.

2. **`components/SkillVersionHistory.tsx`**:
   - Line 30: `'版本历史'`
   - Line 31: `'个版本'`
   - Line 52: `'当前'`
   - Line 57: `'由'`, `'创建'`, `'未知'`
   - Line 60: `'预览'`
   - Line 64: `'回退到此版本'`

3. **`stores/workordersStore.ts`**:
   - Line 139, 165: `'当前用户'`

4. **`stores/mcpStore.ts`**:
   - Line 65: `{ value: 'all', label: '全部' }` (and lines 66-70 category labels)
   - Should use i18n keys instead of hardcoded Chinese

5. **`stores/extensions.ts`**:
   - Lines 57, 172, 196: `selectedCategory: '全部'` -- should use `'all'` key

6. **`stores/skillsStore.ts`**:
   - Lines 73, 196: `selectedCategory: '全部'` -- should use `'all'` key

7. **`stores/expertMarketplaceStore.ts`**:
   - Line 56: `{ value: 'all', label: '全部' }`

**Changes required:**

1. Add i18n keys to `en.json` and `zh.json` for all SettingsModal labels (approximately 40-50 new keys under `settings.*` namespace).

2. Add i18n keys for `SkillVersionHistory` labels (under `skills.versionHistory.*` namespace).

3. Replace `'当前用户'` in workordersStore with `useAuthStore.getState().user?.name` or a `t()` call.

4. Fix category filter stores: change `selectedCategory` default from `'全部'` to `'all'` and update filter logic to compare against `'all'` instead of a localized string. This applies to:
   - `skillsStore.ts`: change default to `'all'`, filter `!== 'all'`
   - `extensions.ts`: change default to `'all'`, filter `!== 'all'`, reset to `'all'`
   - `mcpStore.ts`: already uses `'all'` -- only category labels need i18n
   - `expertMarketplaceStore.ts`: category labels need i18n

5. Update `MCP.tsx` category rendering: `CATEGORIES` in `mcpStore.ts` should use i18n keys (export as function that takes `t()`, or use raw keys and translate in component).

**Acceptance criteria:**
- [ ] SettingsModal: zero hardcoded Chinese strings -- all use `t('settings.xxx')`
- [ ] SkillVersionHistory: zero hardcoded Chinese strings
- [ ] Category filter stores: `selectedCategory` default is `'all'`, comparison is `!== 'all'`
- [ ] MCP category labels render through i18n
- [ ] App can be switched to English and every visible string renders in English
- [ ] No regression in Chinese locale

**Files touched:**
- `packages/client/src/components/SettingsModal.tsx`
- `packages/client/src/components/SkillVersionHistory.tsx`
- `packages/client/src/stores/workordersStore.ts`
- `packages/client/src/stores/mcpStore.ts`
- `packages/client/src/stores/extensions.ts`
- `packages/client/src/stores/skillsStore.ts`
- `packages/client/src/stores/expertMarketplaceStore.ts`
- `packages/client/src/i18n/locales/en.json`
- `packages/client/src/i18n/locales/zh.json`

---

### WP6: SettingsModal Design System Alignment

**Priority: P2**

**What changes:**
- `packages/client/src/components/SettingsModal.tsx`
  - Uses `gray-*` palette throughout (gray-50, gray-100, gray-200, gray-500, gray-600, gray-700, gray-900)
  - The rest of the app uses the `zinc-*` palette consistently
  - 28 occurrences of `gray-*` class names found

**Changes required:**

1. **Replace all `gray-*` with `zinc-*` equivalents**:
   - `gray-50` -> `zinc-50`
   - `gray-100` -> `zinc-100`
   - `gray-200` -> `zinc-200`
   - `gray-300` -> `zinc-300`
   - `gray-400` -> `zinc-400`
   - `gray-500` -> `zinc-500`
   - `gray-600` -> `zinc-600`
   - `gray-700` -> `zinc-700`
   - `gray-900` -> `zinc-900`

2. **Border styles**: `border-gray-100` -> `border-zinc-100`, etc.

3. **Hover states**: `hover:bg-gray-100` -> `hover:bg-zinc-100`

4. **Optional -- merge with Settings.tsx page**: SettingsModal and the Settings page (`pages/Settings.tsx`) may overlap. Decision needed:
   - Option A: Keep both, SettingsModal is a quick-access version
   - Option B: Remove SettingsModal, always navigate to Settings page
   - Recommendation: Keep both for now, defer merge to a later PR

**Acceptance criteria:**
- [ ] SettingsModal uses `zinc-*` palette exclusively (zero `gray-*` classes)
- [ ] Visual appearance matches the zinc-based design system used in other modals
- [ ] No functional changes -- only visual token replacement

**Files touched:**
- `packages/client/src/components/SettingsModal.tsx`

---

### WP7: Category Filter Fix

**Priority: P2**

**What changes:**
Multiple stores compare `selectedCategory` against the Chinese string `'全部'` to determine "show all" behavior. This breaks when the app is in English or when the label changes.

**Affected stores:**

| Store | File | Lines |
|-------|------|-------|
| skillsStore | `stores/skillsStore.ts` | 73, 196 |
| extensions | `stores/extensions.ts` | 57, 172, 196 |
| mcpStore | `stores/mcpStore.ts` | 65 (label only) |
| expertMarketplaceStore | `stores/expertMarketplaceStore.ts` | 56 (label only) |

**Changes required:**

1. **skillsStore.ts**:
   - Change line 73: `selectedCategory: '全部'` -> `selectedCategory: 'all'`
   - Change line 196: `selectedCategory !== '全部'` -> `selectedCategory !== 'all'`

2. **extensions.ts**:
   - Change line 57: `selectedCategory: '全部'` -> `selectedCategory: 'all'`
   - Change line 172: `selectedCategory !== '全部'` -> `selectedCategory !== 'all'`
   - Change line 196 (reset): `selectedCategory: '全部'` -> `selectedCategory: 'all'`

3. **mcpStore.ts** -- already uses `'all'` as the value. Category labels should use i18n:
   - Change `CATEGORIES` from a static array to a function `getCategories(t)` or use raw i18n keys.

4. **expertMarketplaceStore.ts** -- same pattern as mcpStore.

5. **UI components** that render categories should pass the translated label, not the raw value.

**Acceptance criteria:**
- [ ] All stores use `'all'` (not `'全部'`) as the "show all" sentinel value
- [ ] Category filter works correctly in both Chinese and English locales
- [ ] `reset()` actions also reset to `'all'`
- [ ] Visual display of categories uses i18n-translated labels

**Files touched:**
- `packages/client/src/stores/skillsStore.ts`
- `packages/client/src/stores/extensions.ts`
- `packages/client/src/stores/mcpStore.ts`
- `packages/client/src/stores/expertMarketplaceStore.ts`

---

## Execution Order

Recommended sequence based on dependencies:

1. **WP7** (Category filter fix) -- small, unblocks testing across all pages
2. **WP5** (i18n coverage) -- foundational, touches many files
3. **WP6** (SettingsModal design) -- small cosmetic fix, low risk
4. **WP1** (Dashboard data) -- depends on store integrations being correct
5. **WP2** (Workorders real data) -- requires backend to be running
6. **WP4** (Skills create/version) -- requires backend for create, graceful fallback for versions
7. **WP3** (Tasks page) -- largest scope, most new code

## Non-Functional Requirements

- All pages must use i18n for user-visible strings
- Stores must use immutable state updates (Zustand pattern)
- Error states must show user-friendly messages via toast or inline UI
- Loading states must show skeletons, not blank screens
- Category filters must use stable identifiers (`'all'`), not localized display strings

## Out of Scope

- Server-side bug fixes (auth, DI, column mismatches) -- separate PRD
- MCP marketplace service integration (connecting `mcp-marketplace-service.ts` to the MCP page) -- separate PRD
- Advanced task scheduling, execution history, or workflow automation
- SettingsModal / Settings page merge

## Change Log

| Date | Change |
|------|--------|
| 2026-05-10 | Initial PRD created |
