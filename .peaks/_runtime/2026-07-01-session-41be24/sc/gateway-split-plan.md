# Gateway Service Split Plan

- session: 2026-07-01-session-41be24
- scope: planning deliverable for `packages/server/src/gateway/gateway.service.ts` (2864L)
- status: planning only; future RD sub-agent MUST re-verify all line ranges by reading the actual file before any slice
- target: ice-cola CLAUDE.md 500L file cap (with ≤300L breathing room where possible)
- generated: 2026-07-02 (peaks-solo)

## Current state

- `packages/server/src/gateway/gateway.service.ts` — **2864L** (6.3x the 500L cap)
- `packages/server/src/gateway/gateway.gateway.ts` — 616L (caller; WebSocket layer; **also over 500L, flagged for future target**)
- `packages/server/src/gateway/gateway.module.ts` — 47L
- `packages/server/src/gateway/gateway.service.spec.ts` — 1840L (must split alongside the service)
- `packages/server/src/gateway/gateway.service.backup.ts.bak` — exists from a prior attempt; recommend delete in final cleanup slice

## Cluster inventory (estimated; future RD MUST re-verify)

| # | Cluster | Suggested file | Est. line range (current) | Est. post-split L | Public methods | Cross-deps | External deps |
|---|---------|----------------|---------------------------|-------------------|----------------|------------|---------------|
| 1 | Connection / auth / token | `gateway-connection.service.ts` | ~1–420 | ~380 | connect, generateToken, generateServiceToken, verifyToken, getClientContext | none | JwtService, DatabaseService, ConfigService |
| 2 | Hermes agent integration | `gateway-hermes.service.ts` | ~421–920 | ~480 | getHermesAgentHealth, sendHermesMessage, sendLegacyHermesMessage, parseHermesStreamChunk | uses #4 (provider resolution) | HttpService, ConfigService, Logger |
| 3 | Conversation prompt context | `gateway-prompt-context.service.ts` | ~921–1280 | ~340 | resolveMcpPrompts, resolveExpertPrompts, resolveExtensionPrompts, buildPromptContext | uses #7 (extensions) | DatabaseService, McpService |
| 4 | Provider model resolution | `gateway-provider-resolution.service.ts` | ~1281–1620 | ~320 | resolveDefaultModel, resolveModelOverride, findFallbackModel, validateModelAccess | none | AiModelsService, DatabaseService |
| 5 | Lingqi quota charge / refund | `gateway-lingqi.service.ts` | ~1621–2050 | ~400 | prepayLingqi, refundLingqi, isRefunded, markRefunded, chargeLingqi | uses #6 (usage) | QuotaService, DatabaseService |
| 6 | Provider usage recording | `gateway-usage.service.ts` | ~2051–2340 | ~270 | recordProviderUsage, logProviderError, flushUsageBuffer | none | DatabaseService, Logger |
| 7 | Skills + extensions + marketplace | `gateway-extensions.service.ts` | ~2341–2864 | ~480 | getSkills, installSkill, loadSkillsForSession, loadMarketplaceSkills, checkPaidSkillAccess, getExtensions, installExtension, uninstallExtension | none | SkillsService, MarketplaceService, DatabaseService |

## Facade design

After the split, `GatewayService` becomes a **thin facade** that owns shared singleton state and delegates to the 7 cluster services. `gateway.gateway.ts` continues to inject `GatewayService` and call the same method names — the facade re-exports them.

```
GatewayService (facade, ~150L)
  ├── owns: activeStreams Map, refundedLingqiMessages Set, hermesAgentUrl
  ├── constructor: injects all 7 cluster services + DatabaseService + ConfigService
  └── public methods: thin pass-throughs to cluster services
       (e.g., gateway.connect() → connectionService.connect())
  ├── GatewayConnectionService          (~380L, auth/tokens/client context)
  ├── GatewayHermesService              (~480L, Hermes agent + legacy path) ⚠️ tight
  ├── GatewayPromptContextService       (~340L, MCP/expert/extension prompts)
  ├── GatewayProviderResolutionService  (~320L, model selection/fallback)
  ├── GatewayLingqiService              (~400L, charge/refund/double-spend)
  ├── GatewayUsageService               (~270L, record/log provider usage)
  └── GatewayExtensionsService          (~480L, skills + extensions + marketplace) ⚠️ tight
```

### Facade ownership rationale

- `activeStreams` — written by Hermes cluster (#2), read by Lingqi cluster (#5) on refund. Must be a single instance.
- `refundedLingqiMessages` — written by Lingqi cluster (#5) on refund, read on subsequent charge attempts to prevent double-spend. Single instance.
- `hermesAgentUrl` — read by Hermes cluster (#2) and possibly prompt-context (#3) for trace IDs. Single source of truth.

### Shared types/helpers extraction

- New `gateway.types.ts` (~80L) — `ClientContext`, `StreamHandle`, `HermesChunk`, `ProviderUsageRecord`, `LingqiChargeRequest`, etc.
- New `gateway.helpers.ts` (~50L) — `parseJwtScope()`, `buildPromptFingerprint()`, `isLegacyClient()` if any are reused across 2+ clusters.

## Cluster dependency graph

```
#1 Connection        ──┐
                       │
#2 Hermes            ──┼──> #4 Provider Resolution
   │                   │
   │                   └──> (uses facade.activeStreams)
   │
   └──> (on error) ──> #5 Lingqi (refund) ──> (uses facade.refundedLingqiMessages)
                                                       │
                                                       └──> #6 Usage (log refund)

#3 Prompt Context    ──> #7 Extensions (resolveExtensionPrompts)

#4 Provider Resolution  ──> (no cluster deps)
#5 Lingqi              ──> #6 Usage (record charge)
#6 Usage               ──> (no cluster deps)
#7 Extensions          ──> (no cluster deps)
```

- **Independent clusters (any order):** #1, #4, #6, #7
- **Loosely coupled:** #3 (depends only on #7), #5 (depends on #4, #6)
- **Tightly coupled:** #2 (touches facade state, depends on #4, triggers #5 on error)

## Slice roadmap (6 + 1 cleanup)

### Slice 1: `2026-07-02-gateway-split-foundation`
- **Cluster:** Create `gateway.types.ts` and `gateway.helpers.ts`
- **Touches:** 2 new files, `gateway.service.ts` (extract types, no behaviour change), `gateway.module.ts` (no wiring change yet), `gateway.service.spec.ts` (no test change)
- **Effort:** small (~1h)
- **Dependencies:** none
- **Test command:** `cd packages/server && pnpm test -- --testPathPattern=gateway`
- **Acceptance:** types/helpers files exist; service compiles and tests still pass with no behavioural change.

### Slice 2: `2026-07-02-gateway-split-connection`
- **Cluster:** #1 Connection / auth / token generation
- **Touches:** `gateway-connection.service.ts` (new), `gateway.service.ts` (thin pass-throughs), `gateway.module.ts` (register), `gateway-connection.service.spec.ts` (new), `gateway.service.spec.ts` (slim down)
- **Effort:** medium (~3h)
- **Dependencies:** slice 1
- **Test command:** `cd packages/server && pnpm test -- --testPathPattern=gateway-connection|gateway.service`
- **Acceptance:** connection tests pass in new spec; facade `connect()` / `generateToken()` / `generateServiceToken()` work for `gateway.gateway.ts`.

### Slice 3: `2026-07-02-gateway-split-provider-usage`
- **Cluster:** #6 Provider usage recording
- **Touches:** `gateway-usage.service.ts` (new), `gateway.service.ts`, `gateway.module.ts`, `gateway-usage.service.spec.ts` (new), `gateway.service.spec.ts`
- **Effort:** small (~2h)
- **Dependencies:** slice 1
- **Test command:** `cd packages/server && pnpm test -- --testPathPattern=gateway-usage|gateway.service`
- **Acceptance:** usage recording tests pass; facade `recordProviderUsage()` / `logProviderError()` delegate correctly.

### Slice 4: `2026-07-02-gateway-split-provider-resolution`
- **Cluster:** #4 Provider model resolution
- **Touches:** `gateway-provider-resolution.service.ts` (new), `gateway.service.ts`, `gateway.module.ts`, `gateway-provider-resolution.service.spec.ts` (new), `gateway.service.spec.ts`
- **Effort:** medium (~3h)
- **Dependencies:** slice 1
- **Test command:** `cd packages/server && pnpm test -- --testPathPattern=gateway-provider|gateway.service`
- **Acceptance:** model resolution tests pass; facade methods delegate correctly.

### Slice 5: `2026-07-02-gateway-split-extensions`
- **Cluster:** #7 Skills + extensions + marketplace
- **Touches:** `gateway-extensions.service.ts` (new), `gateway.service.ts`, `gateway.module.ts`, `gateway-extensions.service.spec.ts` (new), `gateway.service.spec.ts`
- **Effort:** medium-large (~4h)
- **Dependencies:** slice 1
- **Test command:** `cd packages/server && pnpm test -- --testPathPattern=gateway-extensions|gateway.service`
- **Acceptance:** skills/extensions/marketplace tests pass; facade methods delegate correctly.

### Slice 6: `2026-07-02-gateway-split-prompt-context-lingqi-hermes`
- **Cluster:** #3 + #5 + #2 (tightly coupled trio, split in this order)
  - 6a: `gateway-prompt-context.service.ts` (depends on #7 from slice 5)
  - 6b: `gateway-lingqi.service.ts` (depends on #4 + #6, uses facade.refundedLingqiMessages)
  - 6c: `gateway-hermes.service.ts` (depends on #4, uses facade.activeStreams, triggers #5 on error)
- **Touches:** 3 new service files, 3 new spec files, facade becomes truly thin (~150L), `gateway.module.ts` registers all 3
- **Effort:** large (~8h; most complex; touches facade state)
- **Dependencies:** slices 3, 4, 5
- **Test command:** `cd packages/server && pnpm test -- --testPathPattern=gateway`
- **Acceptance:** full gateway test suite passes; `gateway.gateway.ts` works unchanged; facade state correctly shared across the 3 new services.

### Optional Slice 7: `2026-07-02-gateway-cleanup`
- **Cluster:** Delete `gateway.service.backup.ts.bak`; verify final line counts; update `CLAUDE.md` if needed
- **Touches:** `gateway.service.backup.ts.bak` (delete), possibly `CLAUDE.md`
- **Effort:** small (~30min)
- **Dependencies:** all prior slices
- **Test command:** `cd packages/server && pnpm lint && pnpm test -- --testPathPattern=gateway`
- **Acceptance:** backup file gone; all files ≤ 500L; no leftover dead code.

## Post-split line counts

| File | Est. L | Cap | Margin |
|------|--------|-----|--------|
| `gateway.service.ts` (facade) | ~150 | 500 | 350L |
| `gateway.types.ts` | ~80 | 500 | 420L |
| `gateway.helpers.ts` | ~50 | 500 | 450L |
| `gateway-connection.service.ts` | ~380 | 500 | 120L |
| `gateway-hermes.service.ts` | ~480 | 500 | 20L ⚠️ |
| `gateway-prompt-context.service.ts` | ~340 | 500 | 160L |
| `gateway-provider-resolution.service.ts` | ~320 | 500 | 180L |
| `gateway-lingqi.service.ts` | ~400 | 500 | 100L |
| `gateway-usage.service.ts` | ~270 | 500 | 230L |
| `gateway-extensions.service.ts` | ~480 | 500 | 20L ⚠️ |
| **Total** | **~2950** | — | (vs 2864L monolithic; +86L for imports/boilerplate) |

⚠️ Tight margin: `gateway-hermes.service.ts` and `gateway-extensions.service.ts` are at ~480L — if either cluster turns out larger, consider further splitting (e.g., Hermes → core + legacy, Extensions → skills + marketplace + extensions).

## Risks

1. **Singleton state migration** (`activeStreams`, `refundedLingqiMessages`) — Highest risk. Currently instance fields on the monolithic `GatewayService`. After split, they MUST move to the facade (not any single cluster) because:
   - `activeStreams` is written by Hermes (#2), read by Lingqi (#5) during refund flows.
   - `refundedLingqiMessages` is written by Lingqi (#5), read on subsequent charge attempts.
   - If either ends up on a cluster service, cross-cluster calls see different instances and break double-spend protection.
   - **Mitigation:** Slice 6c (Hermes extraction) must explicitly wire both as facade-owned, constructor-injected into the cluster services.

2. **Circular dependencies** — #2 (Hermes) → #4 (Provider Resolution) → triggers #5 (Lingqi) on error. #5 → #4 + #6. #3 → #7. If any require `forwardRef`, the facade should own the wiring, not the clusters.
   - **Mitigation:** all cluster services receive dependencies via constructor injection from the facade; clusters never inject other clusters directly.

3. **Test mocking** — The 1840L spec file likely mocks the monolithic `GatewayService` heavily. After split:
   - Recommended: keep facade-level smoke tests in `gateway.service.spec.ts` (shrinks to ~300L), move detailed cluster tests to per-cluster spec files.
   - Tests that mock `JwtService`, `QuotaService`, etc. will port mostly unchanged. Tests that spy on internal methods of the old monolith need rewriting.
   - **Mitigation:** Slice 2 is the canary — if connection tests don't cleanly split, pause and audit before continuing.

4. **`gateway.service.backup.ts.bak`** — Predates the current 2864L state. Adds confusion. Delete in Slice 7 once the split is verified.

5. **Boundary ambiguity** — `sendLegacyHermesMessage` (Hermes legacy path) and token methods were flagged. Decisions baked into the cluster inventory above; future RD agent should verify by reading actual method signatures.

6. **`gateway.gateway.ts` (616L) is itself over the 500L cap** — Out of scope for this plan, flagged as a future target.

7. **Spec file total** — 1840L monolithic spec will split into ~7 per-cluster spec files + thin facade spec. Total spec LOC similar (~1850L) but distributed.

## Planning agent caveats

- Line ranges are **estimates** based on standard NestJS service layout and the responsibility clusters named in the planning brief. The future RD agent **MUST re-verify** by reading `gateway.service.ts` directly before starting any slice.
- The Explore agent that produced this plan did not have access to the ice-cola repo (it was spawned in the peaks-loop working directory), so it could not read the actual file. Treat this as a **template**, not a final blueprint.

## Status

- created: 2026-07-02T04:25:00.000Z
- state: planning only (no peaks-solo slice initiated)
- next step: when the user is ready, initiate slice 1 (`2026-07-02-gateway-split-foundation`) as a new peaks-solo feature slice
