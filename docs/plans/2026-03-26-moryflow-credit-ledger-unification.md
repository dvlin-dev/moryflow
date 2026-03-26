# Moryflow Credit Ledger Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current credit settlement path with a single canonical credit ledger that records every credit movement, never crashes chat on settlement anomalies, and powers user/admin credit detail views.

**Architecture:** Introduce a unified `CreditLedgerEntry` domain as the sole source of truth, plus a small `CreditLedgerAllocation` child table for bucket breakdown. Reuse the existing `SubscriptionCredits`, `PurchasedCredits`, `CreditDebt`, and `CreditUsageDaily` tables as projections only, move every write through a new `CreditLedgerService`, split read filtering into a dedicated `CreditLedgerQueryService`, and decouple AI response completion from credit settlement completion without adding a retry state machine in this phase.

**Tech Stack:** NestJS + Prisma + Vitest, React + Zustand + React Query, shared `@moryflow/api` types/paths, Electron renderer/main stream handling.

---

## Non-Negotiable Invariants

1. `CreditLedgerEntry` is the only business truth for credits after cutover.
2. `SubscriptionCredits`, `PurchasedCredits`, `CreditDebt`, and `CreditUsageDaily` remain only as projections/read models. No feature code may write them directly after this migration.
3. `creditsDelta = 0` is valid and must be stored; anomalies are represented by `status` and `anomalyCode`, not by throwing.
4. AI settlement failure must never break a delivered chat response.
5. Activity logs remain audit logs only. They must not be repurposed as the credit ledger.
6. User-facing credit history and admin anomaly filtering both read `CreditLedgerQueryService`.

## Target Data Model

### New Prisma enums

- `CreditLedgerEventType`
  - `AI_CHAT`
  - `AI_IMAGE`
  - `SUBSCRIPTION_GRANT`
  - `PURCHASED_GRANT`
  - `REDEMPTION_GRANT`
  - `ADMIN_GRANT`
- `CreditLedgerDirection`
  - `DEBIT`
  - `CREDIT`
  - `NEUTRAL`
- `CreditLedgerStatus`
  - `APPLIED`
  - `SKIPPED`
  - `FAILED`
- `CreditBucketType`
  - `DAILY`
  - `SUBSCRIPTION`
  - `PURCHASED`
  - `DEBT`
- `CreditLedgerAnomalyCode`
  - `ZERO_USAGE`
  - `USAGE_MISSING`
  - `ZERO_PRICE_CONFIG`
  - `ZERO_CREDITS_WITH_USAGE`
  - `SETTLEMENT_FAILED`

### New Prisma models

- `CreditLedgerEntry`
  - immutable business row for one settled credit event
  - stores request identifiers, pricing snapshot, token usage, status, anomaly, error summary, and UI summary text
- `CreditLedgerAllocation`
  - one child row per bucket impact
  - records how much of the parent entry touched `daily`, `subscription`, `purchased`, or `debt`

### Existing models reused as projections

- `SubscriptionCredits`
- `PurchasedCredits`
- `CreditDebt`
- `CreditUsageDaily`

These tables are not removed in this phase. They are demoted to projections and updated only inside `CreditLedgerService`.

## Query Surfaces To Add

- User API
  - `GET /api/v1/user/credits/history`
- Admin API
  - `GET /api/v1/admin/credits/ledger`

## UI Surfaces To Add

- PC account page
  - credit history list under the existing balance cards
- Admin
  - dedicated credit ledger page with anomaly filters
  - recent ledger section inside user detail page

## Execution Progress

- Task 1: completed
- Task 2: completed
- Task 3: completed
- Task 4: completed
- Task 5: completed
- Task 6: completed
- Task 7: completed
- Task 8: completed
- Task 9: completed

---

### Task 1: Add the Ledger Schema and Freeze the Projection Boundary

**Status:** Completed

**Implemented:**

- Added `CreditLedgerEntry` and `CreditLedgerAllocation` plus the required enums in `schema.prisma`
- Added migration `0004_credit_ledger_unification`
- Added `src/credit-ledger/index.ts`, `credit-ledger.types.ts`, and `credit-ledger.constants.ts`
- Extended Prisma test mocks to cover the new ledger models

**Verified:**

```bash
pnpm --filter @moryflow/server prisma:generate
pnpm --filter @moryflow/server typecheck
```

**Files:**

- Modify: `apps/moryflow/server/prisma/schema.prisma`
- Create: `apps/moryflow/server/prisma/migrations/<generated>_credit_ledger_unification/migration.sql`
- Modify: `apps/moryflow/server/src/testing/factories.ts`
- Create: `apps/moryflow/server/src/credit-ledger/index.ts`
- Create: `apps/moryflow/server/src/credit-ledger/credit-ledger.types.ts`
- Create: `apps/moryflow/server/src/credit-ledger/credit-ledger.constants.ts`

**Step 1: Add the new enums and models to Prisma**

- Add `CreditLedgerEntry` with:
  - `userId`, `eventType`, `direction`, `status`, `anomalyCode?`
  - `creditsDelta`, `computedCredits`, `appliedCredits`, `debtDelta`
  - `summary`, `detailsJson?`, `errorMessage?`
  - `requestId?`, `chatId?`, `runId?`, `idempotencyKey?`
  - `modelId?`, `providerId?`
  - `promptTokens?`, `completionTokens?`, `totalTokens?`
  - `inputPriceSnapshot?`, `outputPriceSnapshot?`
  - `creditsPerDollarSnapshot?`, `profitMultiplierSnapshot?`, `costUsd?`
  - `createdAt`, `updatedAt`
- Add `CreditLedgerAllocation` with:
  - `entryId`, `bucketType`, `amount`
  - `sourcePurchasedCreditsId?`
  - `createdAt`

**Step 2: Add indexes that match the planned read paths**

- `CreditLedgerEntry`
  - `@@index([userId, createdAt])`
  - `@@index([eventType, createdAt])`
  - `@@index([status, createdAt])`
  - `@@index([anomalyCode, createdAt])`
  - `@@unique([idempotencyKey])`
- `CreditLedgerAllocation`
  - `@@index([entryId])`
  - `@@index([bucketType, createdAt])`

**Step 3: Generate the migration and Prisma client**

Run:

```bash
pnpm --filter @moryflow/server prisma:generate
pnpm --filter @moryflow/server exec prisma migrate dev --name credit_ledger_unification
```

Expected:

- Prisma client regenerates successfully
- Migration creates the two new tables and enums

**Step 4: Extend testing factories with ledger builders**

- Add helpers for `CreditLedgerEntry` and `CreditLedgerAllocation`
- Keep existing `SubscriptionCredits`, `PurchasedCredits`, `CreditDebt`, and `CreditUsageDaily` factory helpers unchanged

**Step 5: Typecheck the server package**

Run:

```bash
pnpm --filter @moryflow/server typecheck
```

Expected:

- PASS with the new Prisma types available to TypeScript

**Step 6: Commit if and only if the user has explicitly authorized git commits**

Suggested message:

```bash
git commit -m "feat: add credit ledger schema and types"
```

---

### Task 2: Build the Core `CreditLedgerService` and Make Projection Writes Single-Entry

**Status:** Completed

**Implemented:**

- Added `CreditLedgerModule`, `CreditLedgerService`, and `CreditLedgerQueryService`
- Added ledger-focused unit tests for write and query flows
- Reduced `CreditService` to a read-only projection facade
- Wired `CreditModule` to export the ledger module and projection reads together

**Verified:**

```bash
pnpm --filter @moryflow/server test -- \
  src/credit-ledger/credit-ledger.service.spec.ts \
  src/credit-ledger/credit-ledger-query.service.spec.ts

pnpm --filter @moryflow/server test -- src/credit/credit.service.spec.ts
pnpm --filter @moryflow/server typecheck
```

**Files:**

- Create: `apps/moryflow/server/src/credit-ledger/credit-ledger.module.ts`
- Create: `apps/moryflow/server/src/credit-ledger/credit-ledger.service.ts`
- Create: `apps/moryflow/server/src/credit-ledger/credit-ledger-query.service.ts`
- Create: `apps/moryflow/server/src/credit-ledger/credit-ledger.service.spec.ts`
- Create: `apps/moryflow/server/src/credit-ledger/credit-ledger-query.service.spec.ts`
- Modify: `apps/moryflow/server/src/credit/credit.module.ts`
- Modify: `apps/moryflow/server/src/credit/credit.service.ts`

**Step 1: Write the failing ledger service tests**

Cover these cases in `credit-ledger.service.spec.ts`:

- AI debit consumes `daily -> subscription -> purchased` in order and writes one parent ledger row plus allocation rows
- purchased grant first repays debt, then writes remaining purchased credits
- subscription grant first repays debt, then refreshes current subscription projection
- zero-delta AI settlement writes `SKIPPED` instead of throwing
- `totalTokens > 0` and `creditsDelta = 0` marks `ZERO_CREDITS_WITH_USAGE`

Run:

```bash
pnpm --filter @moryflow/server exec vitest run src/credit-ledger/credit-ledger.service.spec.ts
```

Expected:

- FAIL because the service does not exist yet

**Step 2: Implement the write API of `CreditLedgerService`**

Add public methods with tight responsibilities:

- `recordAiChatSettlement(...)`
- `recordAiImageSettlement(...)`
- `grantSubscriptionCredits(...)`
- `grantPurchasedCredits(...)`
- `grantRedemptionCredits(...)`
- `grantAdminCredits(...)`

Implementation requirements:

- Use a Prisma transaction for parent row, allocation rows, and projection writes
- All projection writes happen only inside this service
- Zero-delta events are stored with `SKIPPED`
- Never throw `amount must be positive` for a ledger event

Query responsibilities move to `CreditLedgerQueryService`:

- `listUserLedger(...)`
- `listAdminLedger(...)`

**Step 3: Shrink `CreditService` into a read facade**

- Keep `getCreditsBalance()` as the main read helper
- Keep projection helpers private to the ledger module where needed
- Update internal comments to state that these tables are projections

**Step 4: Re-run the ledger service tests**

Run:

```bash
pnpm --filter @moryflow/server exec vitest run src/credit-ledger/credit-ledger.service.spec.ts
```

Expected:

- PASS

**Step 5: Run the current credit service regression tests**

Run:

```bash
pnpm --filter @moryflow/server exec vitest run src/credit/credit.service.spec.ts
```

Expected:

- PASS after updating expectations away from direct write usage if needed

**Step 6: Commit if authorized**

Suggested message:

```bash
git commit -m "feat: add unified credit ledger service"
```

---

### Task 3: Make AI Chat Settlement Crash-Proof and Ledger-Backed

**Status:** Completed

**Implemented:**

- Replaced direct chat debit writes with `CreditLedgerService.recordAiChatSettlement()`
- Added best-effort failed ledger persistence for settlement exceptions
- Updated `SSEStreamBuilder` to emit final chunk and `[DONE]` before async settlement completes
- Extended AI activity logs with ledger metadata instead of relying on naked credit numbers

**Verified:**

```bash
pnpm --filter @moryflow/server test -- \
  src/ai-proxy/ai-proxy.service.spec.ts \
  src/ai-proxy/ai-proxy.provider-options.spec.ts
```

**Files:**

- Modify: `apps/moryflow/server/src/ai-proxy/ai-proxy.service.ts`
- Modify: `apps/moryflow/server/src/ai-proxy/stream/sse-stream.builder.ts`
- Modify: `apps/moryflow/server/src/ai-proxy/ai-proxy.service.spec.ts`
- Modify: `apps/moryflow/server/src/ai-proxy/ai-proxy.provider-options.spec.ts`
- Modify: `apps/moryflow/server/src/activity-log/activity-log.service.ts`

**Step 1: Write the failing regression tests**

Add tests for:

- streaming chat with zero credits no longer throws
- usage present but computed credits zero creates anomaly state
- final SSE chunk is emitted even if settlement later fails
- activity log receives `ledgerEntryId` and summary, not just naked credit numbers

Run:

```bash
pnpm --filter @moryflow/server exec vitest run \
  src/ai-proxy/ai-proxy.service.spec.ts \
  src/ai-proxy/ai-proxy.provider-options.spec.ts
```

Expected:

- FAIL on the old settlement path

**Step 2: Replace direct credit consumption with the ledger workflow**

- Once usage becomes available, build the final AI ledger payload
- Compute pricing snapshot and anomaly code before applying projections
- Persist one final ledger row idempotently using `idempotencyKey`

**Step 3: Decouple SSE final chunk emission from settlement success**

- Send final assistant chunk and `[DONE]` before async settlement completion can surface an error
- Do not let settlement failure leak into the client stream
- Best-effort persist a `FAILED` ledger row when the business settlement path fails

**Step 4: Keep activity logs as audit only**

- `logAiChat()` should include `ledgerEntryId`, `status`, and anomaly summary
- Do not duplicate token math logic in `ActivityLogService`

**Step 5: Re-run the AI proxy tests**

Run:

```bash
pnpm --filter @moryflow/server exec vitest run \
  src/ai-proxy/ai-proxy.service.spec.ts \
  src/ai-proxy/ai-proxy.provider-options.spec.ts
```

Expected:

- PASS

**Step 6: Commit if authorized**

Suggested message:

```bash
git commit -m "fix: decouple ai chat delivery from credit settlement"
```

---

### Task 4: Make AI Image Settlement Use the Same Ledger Rules

**Status:** Completed

**Implemented:**

- Switched `AiImageService` to `CreditLedgerService.recordAiImageSettlement()`
- Added failed-settlement fallback rows for image billing
- Included ledger metadata in image activity logs

**Verified:**

```bash
pnpm --filter @moryflow/server test -- src/ai-image/ai-image.service.spec.ts
```

**Files:**

- Modify: `apps/moryflow/server/src/ai-image/ai-image.service.ts`
- Create: `apps/moryflow/server/src/ai-image/ai-image.service.spec.ts`
- Modify: `apps/moryflow/server/src/activity-log/activity-log.service.ts`

**Step 1: Write the failing image settlement tests**

Cover:

- successful image generation writes `AI_IMAGE` ledger entries
- zero-priced or zero-count image outcomes write `SKIPPED`/anomaly rows instead of throwing
- debt-incurring image requests are represented through ledger + projection writes

Run:

```bash
pnpm --filter @moryflow/server exec vitest run src/ai-image/ai-image.service.spec.ts
```

Expected:

- FAIL

**Step 2: Switch `AiImageService` to `CreditLedgerService`**

- Remove direct calls to `CreditService.consumeCreditsWithDebt()`
- Snapshot price config and image usage onto the ledger entry
- Keep the user-visible API response unchanged

**Step 3: Re-run the image service tests**

Run:

```bash
pnpm --filter @moryflow/server exec vitest run src/ai-image/ai-image.service.spec.ts
```

Expected:

- PASS

**Step 4: Commit if authorized**

Suggested message:

```bash
git commit -m "feat: route ai image billing through credit ledger"
```

---

### Task 5: Move Grants, Redemptions, and Admin Top-Ups to the Ledger

**Status:** Completed

**Implemented:**

- Routed payment subscription grants and credit-pack purchases through `CreditLedgerService`
- Routed redemption rewards through `CreditLedgerService`
- Routed admin manual grants through `CreditLedgerService`
- Removed feature-path references to the old `CreditService` mutation API

**Verified:**

```bash
pnpm --filter @moryflow/server test -- \
  src/payment/payment.service.spec.ts \
  src/admin/admin.service.spec.ts

rg -n "consumeCreditsWithDebt|grantSubscriptionCredits\\(|grantPurchasedCredits\\(" apps/moryflow/server/src
```

**Files:**

- Modify: `apps/moryflow/server/src/payment/payment.service.ts`
- Modify: `apps/moryflow/server/src/payment/payment.service.spec.ts`
- Modify: `apps/moryflow/server/src/redemption/redemption.service.ts`
- Modify: `apps/moryflow/server/src/admin/admin.service.ts`
- Modify: `apps/moryflow/server/src/admin/admin.service.spec.ts`

**Step 1: Write the failing regression tests**

Cover:

- subscription activation creates `SUBSCRIPTION_GRANT`
- credits purchase creates `PURCHASED_GRANT`
- redemption creates the correct grant event type
- admin manual grant creates `ADMIN_GRANT`
- debt repayment is reflected on the same grant ledger row via `debtDelta` and allocation rows

Run:

```bash
pnpm --filter @moryflow/server exec vitest run \
  src/payment/payment.service.spec.ts \
  src/admin/admin.service.spec.ts
```

Expected:

- FAIL because callers still use the old credit write methods

**Step 2: Replace all direct grant calls**

- Remove direct writes to `CreditService.grantSubscriptionCredits()`
- Remove direct writes to `CreditService.grantPurchasedCredits()`
- Route payment, redemption, and admin credits through `CreditLedgerService`

**Step 3: Re-run the updated regression suites**

Run:

```bash
pnpm --filter @moryflow/server exec vitest run \
  src/payment/payment.service.spec.ts \
  src/admin/admin.service.spec.ts \
  src/user/user.controller.spec.ts
```

Expected:

- PASS

**Step 4: Grep for old write entry points**

Run:

```bash
rg -n "consumeCreditsWithDebt|grantSubscriptionCredits|grantPurchasedCredits" apps/moryflow/server/src
```

Expected:

- Only read-only helpers or private projection helpers remain
- No AI/payment/redemption/admin feature path writes projections directly

**Step 5: Commit if authorized**

Suggested message:

```bash
git commit -m "refactor: route all credit mutations through ledger service"
```

---

### Task 6: Add User/Admin Ledger Query APIs and Shared Types

**Status:** Completed

**Implemented:**

- Added shared ledger paths and types in `packages/api`
- Added `/api/v1/user/credits/history`
- Added `/api/v1/admin/credits/ledger`
- Added recent user ledger slice to admin user detail payload

**Verified:**

```bash
pnpm --filter @moryflow/server test -- \
  src/credit-ledger/credit-ledger-query.service.spec.ts \
  src/user/user.controller.spec.ts

pnpm --filter @moryflow/server typecheck
```

**Files:**

- Modify: `packages/api/src/paths.ts`
- Modify: `packages/api/src/membership/types.ts`
- Modify: `apps/moryflow/server/src/user/user.controller.ts`
- Modify: `apps/moryflow/server/src/user/user.controller.spec.ts`
- Modify: `apps/moryflow/server/src/admin/admin.controller.ts`
- Modify: `apps/moryflow/server/src/admin/admin.service.ts`
- Create: `apps/moryflow/server/src/credit-ledger/dto/credit-ledger-query.dto.ts`

**Step 1: Add the shared API paths and DTO types**

- Add `USER_API.CREDITS_HISTORY`
- Add one admin endpoint for ledger queries
- Add shared types:
  - `CreditLedgerItem`
  - `CreditLedgerListResponse`
  - `CreditLedgerStatus`
  - `CreditLedgerEventType`
  - `CreditLedgerAnomalyCode`

**Step 2: Write the failing controller/service tests**

Cover:

- user history endpoint returns only the current user
- admin ledger endpoint supports `status`, `eventType`, `anomalyCode`, `zeroDelta`, `hasTokens`, `userId`, and date range filters
- user detail can return recent ledger rows for a focused view

Run:

```bash
pnpm --filter @moryflow/server exec vitest run \
  src/user/user.controller.spec.ts \
  src/credit-ledger/credit-ledger.query.spec.ts
```

Expected:

- FAIL until controllers and queries are added

**Step 3: Implement the query DTO and controller methods**

- Add pagination defaults and strict filter parsing
- Make user queries read from `CreditLedgerQueryService.listUserLedger()`
- Make admin queries read from `CreditLedgerQueryService.listAdminLedger()`
- Add a recent ledger slice to `getUserDetails()`

**Step 4: Re-run the query tests**

Run:

```bash
pnpm --filter @moryflow/server exec vitest run \
  src/user/user.controller.spec.ts \
  src/credit-ledger/credit-ledger.query.spec.ts
```

Expected:

- PASS

**Step 5: Commit if authorized**

Suggested message:

```bash
git commit -m "feat: expose credit ledger query apis"
```

---

### Task 7: Fix PC Stream Terminal Semantics and Add User Credit History UI

**Status:** Completed

**Implemented:**

- Prevented `streamAgentRun()` from emitting `finish` when the stream fails after partial output
- Preserved partial output chunks by closing open text/reasoning segments without emitting a false success terminal chunk
- Added `fetchCreditHistory()` to the PC server API layer
- Added `CreditHistoryPanel` under the account credit cards in the settings dialog

**Verified:**

```bash
pnpm --filter @moryflow/pc test -- \
  src/main/chat/__tests__/stream/streamAgentRun.test.ts \
  src/renderer/components/settings-dialog/components/account/credit-history-panel.test.tsx \
  src/renderer/components/settings-dialog/components/account/user-profile.test.tsx

pnpm --filter @moryflow/pc typecheck
```

**Files:**

- Modify: `apps/moryflow/pc/src/main/chat/stream/streamAgentRun.ts`
- Modify: `apps/moryflow/pc/src/main/chat/__tests__/stream/streamAgentRun.test.ts`
- Modify: `apps/moryflow/pc/src/renderer/lib/server/api.ts`
- Modify: `apps/moryflow/pc/src/renderer/lib/server/types.ts`
- Create: `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/credit-history-panel.tsx`
- Create: `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/credit-history-panel.test.tsx`
- Modify: `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/user-profile.tsx`
- Modify: `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/user-profile.test.tsx`

**Step 1: Write the failing stream regression tests**

Cover:

- stream errors no longer emit `finish` before the error path
- partial content is preserved when settlement fails after output delivery

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run src/main/chat/__tests__/stream/streamAgentRun.test.ts
```

Expected:

- FAIL under the current `finalize then throw` behavior

**Step 2: Fix `streamAgentRun()`**

- Only emit `finish` when the stream truly completed without terminal error
- Preserve partial output and surface a retry-friendly error state
- Keep existing abort handling intact

**Step 3: Add the PC API call and panel component**

- Add `fetchCreditHistory()` in `renderer/lib/server/api.ts`
- Add a simple history panel under the balance cards
- Initial list columns:
  - detail
  - date
  - credit delta
- Optional detail expansion:
  - model
  - tokens
  - status
  - anomaly

**Step 4: Write and run the UI tests**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/chat/__tests__/stream/streamAgentRun.test.ts \
  src/renderer/components/settings-dialog/components/account/credit-history-panel.test.tsx \
  src/renderer/components/settings-dialog/components/account/user-profile.test.tsx
```

Expected:

- PASS

**Step 5: Commit if authorized**

Suggested message:

```bash
git commit -m "fix: preserve chat output on settlement errors and add pc credit history"
```

---

### Task 8: Add the Admin Credit Ledger Page and User Detail Integration

**Status:** Completed

**Implemented:**

- Added a dedicated admin credit ledger feature module and `/credits` route
- Added a sidebar entry for the ledger page
- Added recent credit ledger rows inside the user detail page
- Added a user-detail jump path into the filtered ledger page via `userId` query params

**Verified:**

```bash
pnpm --filter @moryflow/admin test -- src/pages/CreditLedgerPage.test.tsx
pnpm --filter @moryflow/admin typecheck
```

**Files:**

- Create: `apps/moryflow/admin/src/features/credit-ledger/api.ts`
- Create: `apps/moryflow/admin/src/features/credit-ledger/hooks.ts`
- Create: `apps/moryflow/admin/src/features/credit-ledger/types.ts`
- Create: `apps/moryflow/admin/src/pages/CreditLedgerPage.tsx`
- Create: `apps/moryflow/admin/src/pages/CreditLedgerPage.test.tsx`
- Modify: `apps/moryflow/admin/src/App.tsx`
- Modify: `apps/moryflow/admin/src/components/layout/app-sidebar.tsx`
- Modify: `apps/moryflow/admin/src/features/users/api.ts`
- Modify: `apps/moryflow/admin/src/types/api.ts`
- Modify: `apps/moryflow/admin/src/pages/UserDetailPage.tsx`

**Step 1: Add the failing admin page test**

Cover:

- page fetches ledger rows
- filters include:
  - user
  - event type
  - status
  - anomaly
  - zero delta only
  - has tokens only
- user detail page shows recent ledger rows without leaving the user profile

Run:

```bash
pnpm --filter @moryflow/admin exec vitest run src/pages/CreditLedgerPage.test.tsx
```

Expected:

- FAIL

**Step 2: Build a dedicated admin ledger feature**

- Do not reuse the generic activity logs feature
- Add strongly typed API and hooks under `features/credit-ledger`
- Add a dedicated `/credits` route and sidebar entry under the payment/system area

**Step 3: Embed recent rows in user detail**

- Show the latest credit events below the balance card
- Include a link or button to open the full ledger page with `userId` pre-filtered

**Step 4: Re-run the admin tests**

Run:

```bash
pnpm --filter @moryflow/admin exec vitest run src/pages/CreditLedgerPage.test.tsx
pnpm --filter @moryflow/admin typecheck
```

Expected:

- PASS

**Step 5: Commit if authorized**

Suggested message:

```bash
git commit -m "feat: add admin credit ledger views"
```

---

### Task 9: Finalize Documentation and Verification

**Status:** Completed

**Implemented:**

- Rewrote `docs/design/moryflow/features/credits-system-tech.md` into the new unified-ledger fact source
- Updated the features index to point to the new ledger semantics
- Ran the final targeted regression suite across server, PC, and admin
- Performed a final self-review pass and fixed two issues:
  - AI image ledger rows were incorrectly marked `ZERO_USAGE` when `imageTokens` were absent but credits were charged
  - `streamAgentRun()` could leave `result.completed` rejections unobserved after a stream failure

**Verified:**

```bash
pnpm --filter @moryflow/server test -- \
  src/credit-ledger/credit-ledger.service.spec.ts \
  src/ai-proxy/ai-proxy.service.spec.ts \
  src/ai-proxy/ai-proxy.provider-options.spec.ts \
  src/ai-image/ai-image.service.spec.ts \
  src/payment/payment.service.spec.ts \
  src/admin/admin.service.spec.ts \
  src/user/user.controller.spec.ts

pnpm --filter @moryflow/pc test -- \
  src/main/chat/__tests__/stream/streamAgentRun.test.ts \
  src/renderer/components/settings-dialog/components/account/credit-history-panel.test.tsx \
  src/renderer/components/settings-dialog/components/account/user-profile.test.tsx

pnpm --filter @moryflow/admin test -- src/pages/CreditLedgerPage.test.tsx

pnpm --filter @moryflow/server typecheck
pnpm --filter @moryflow/pc typecheck
pnpm --filter @moryflow/admin typecheck

rg -n "subscriptionCredits\\.|purchasedCredits\\.|creditDebt\\.|creditUsageDaily\\." apps/moryflow/server/src
git diff --check
```

**Files:**

- Modify: `docs/design/moryflow/features/credits-system-tech.md`
- Modify: `docs/design/moryflow/features/index.md`

**Step 1: Rewrite the stable design doc**

- Replace outdated facts in `credits-system-tech.md`
- Document:
  - ledger as source of truth
  - projections as read models
  - zero-delta semantics
  - user/admin history surfaces
  - AI settlement no longer blocks response delivery

**Step 2: Run the minimum full verification suite**

Run:

```bash
pnpm --filter @moryflow/server exec vitest run \
  src/credit-ledger/credit-ledger.service.spec.ts \
  src/ai-proxy/ai-proxy.service.spec.ts \
  src/ai-proxy/ai-proxy.provider-options.spec.ts \
  src/ai-image/ai-image.service.spec.ts \
  src/payment/payment.service.spec.ts \
  src/admin/admin.service.spec.ts \
  src/user/user.controller.spec.ts

pnpm --filter @moryflow/pc exec vitest run \
  src/main/chat/__tests__/stream/streamAgentRun.test.ts \
  src/renderer/components/settings-dialog/components/account/credit-history-panel.test.tsx \
  src/renderer/components/settings-dialog/components/account/user-profile.test.tsx

pnpm --filter @moryflow/admin exec vitest run src/pages/CreditLedgerPage.test.tsx

pnpm --filter @moryflow/server typecheck
pnpm --filter @moryflow/pc typecheck
pnpm --filter @moryflow/admin typecheck
```

Expected:

- All targeted regression suites PASS
- All three packages typecheck

**Step 3: Grep for direct projection writes one final time**

Run:

```bash
rg -n "subscriptionCredits\\.|purchasedCredits\\.|creditDebt\\.|creditUsageDaily\\." apps/moryflow/server/src
```

Expected:

- Direct writes only appear inside `CreditLedgerService`
- Reads may remain in `CreditService` or admin query services

**Step 4: Commit if authorized**

Suggested message:

```bash
git commit -m "feat: unify moryflow credit accounting on a single ledger"
```

---

## Execution Notes

- Do not create a separate `AiInvocationLedger`. AI metadata belongs on `CreditLedgerEntry`.
- Do not create a generic `BalanceSnapshot` table in this phase. Reuse the existing projection tables to avoid unnecessary schema sprawl.
- Do not add a retry queue or pending-state workflow in this phase. Persist final `APPLIED/SKIPPED/FAILED` rows only.
- Do not move this feature into `ActivityLog`. That would recreate the same observability problem in a different place.
- Keep user-facing/API error copy in English.
- If implementation uncovers provider-specific usage gaps, prefer `SKIPPED + anomalyCode` over throwing.

## Cutover Strategy

1. Deploy schema first.
2. Deploy the ledger-backed write path.
3. Deploy the read APIs and UI.
4. Confirm that new rows appear in:
   - user history
   - admin ledger
   - activity log summaries
5. Remove dead direct-write code paths in the same branch; there is no historical backfill step in this plan.
