# Memory Projection Backlog Recovery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the deployed failure mode where local workspace files are present but Memory stays empty because `WorkspaceContentOutbox` is not being drained into Memox, and ensure the UI shows an honest in-progress state until projection settles.

**Architecture:** Keep `WorkspaceContentOutbox` as the single source-derived memory fact source, but remove Bull worker delivery from the correctness path. The server will drain outbox batches directly on a bounded in-process scheduler using the existing database lease protocol, and Memory overview will expose workspace-scoped projection backlog so the PC renderer can keep the page in an honest non-empty initializing state until server-side projection is caught up.

**Tech Stack:** NestJS, Prisma, ScheduleModule cron, existing Memox projection services, Electron IPC, React hooks, Vitest.

---

## Problem Statement

### Verified Facts

1. PC local bootstrap does enqueue workspace-content events successfully.
   - Production telemetry shows `WorkspaceContentOutbox.pendingCount` grows from `30` to `31`, so local file bootstrap is reaching the server write chain.
2. The deployed Memox consumer lane is not making forward progress.
   - Production telemetry shows `consumer.claimed=0`, `consumer.acknowledged=0`, `consumer.failed=0`, `consumer.deadLettered=0` while `pendingCount` remains non-zero.
3. Memory overview is derived from server-side Memox state, not from local files.
   - [apps/moryflow/server/src/memory/memory.service.ts](/Users/lin/.codex/worktrees/5582/moryflow/apps/moryflow/server/src/memory/memory.service.ts)
   - [apps/moryflow/pc/src/main/app/ipc/memory-domain/overview.ts](/Users/lin/.codex/worktrees/5582/moryflow/apps/moryflow/pc/src/main/app/ipc/memory-domain/overview.ts)
4. The PC renderer only treats local bootstrap as transient state.
   - `overview.bootstrap.pending` is derived from local file scanning/upload work only.
   - It does not include downstream `WorkspaceContentOutbox -> Memox` backlog.
   - [apps/moryflow/pc/src/main/memory-indexing/state.ts](/Users/lin/.codex/worktrees/5582/moryflow/apps/moryflow/pc/src/main/memory-indexing/state.ts)
5. Once local bootstrap settles, the renderer can fall into the full empty dashboard even if server projection is still pending.
   - [apps/moryflow/pc/src/renderer/workspace/components/memory/knowledge-status.ts](/Users/lin/.codex/worktrees/5582/moryflow/apps/moryflow/pc/src/renderer/workspace/components/memory/knowledge-status.ts)
   - [apps/moryflow/pc/src/renderer/workspace/components/memory/dashboard-state.ts](/Users/lin/.codex/worktrees/5582/moryflow/apps/moryflow/pc/src/renderer/workspace/components/memory/dashboard-state.ts)
   - [apps/moryflow/pc/src/renderer/workspace/components/memory/index.tsx](/Users/lin/.codex/worktrees/5582/moryflow/apps/moryflow/pc/src/renderer/workspace/components/memory/index.tsx)

### Root Causes

1. Server correctness currently depends on Bull queue delivery for `memox-workspace-content-consumer-queue`.
2. The existing database lease protocol already provides safe multi-consumer coordination, so Bull is redundant for correctness here.
3. The UI state model stops at “local bootstrap finished” and has no notion of “server projection backlog still pending for this workspace”.

## Chosen Fix

### 1. Server: Make Outbox Drain Self-Recovering Without Bull

Replace the Memox workspace-content drain path with a bounded in-process scheduler that calls `MemoxWorkspaceContentConsumerService.processBatch()` directly.

Design constraints:

- Keep `WorkspaceContentOutbox` as the only durable source-derived projection fact source.
- Keep the database lease protocol as the concurrency contract.
- Keep replay/rebuild control endpoints on the same consumer service.
- Do not add a second write path.
- Do not require Redis/Bull worker health for correctness.

Implementation direction:

- Remove queue registration and Bull worker wiring from the Memox module.
- Turn the existing drain service into a direct scheduler with an internal re-entrancy guard.
- Reuse `limit`, `leaseMs`, `maxBatches`, and `consumerId` constants.
- Log failures at the scheduler boundary instead of silently depending on queue retries.

### 2. Server: Expose Workspace-Scoped Projection Backlog in Memory Overview

Augment Moryflow server memory overview so it can report whether the current workspace still has unprocessed `WorkspaceContentOutbox` work.

Design constraints:

- Scope by the resolved workspace only.
- Count only unprocessed and non-dead-lettered outbox rows for that workspace.
- Do not leak other users’ or workspaces’ backlog.

Implemented response shape:

- Add `projection.pending`
- Add `projection.unresolvedEventCount`

### 3. PC Main/Renderer: Treat Projection Backlog as an Honest In-Progress State

Use the new server overview signal in the shared IPC overview model.

Rules:

- If local bootstrap is pending, treat as `SCANNING`.
- If local bootstrap is done but server projection backlog is pending and no file-level status has materialized yet, keep the page in `SCANNING`.
- The full empty dashboard must not render while either local bootstrap or server projection backlog is pending.
- Polling must continue while either local bootstrap or server projection backlog is pending.

This preserves the current four formal states:

- `SCANNING`
- `NEEDS_ATTENTION`
- `INDEXING`
- `READY`

and makes the “local files exist, server projection not done yet” window resolve to `SCANNING` instead of `READY + empty`.

## Tasks

### Task 1: Freeze the server-side recovery design

**Files:**
- Create: `docs/plans/2026-03-23-memory-projection-backlog-recovery.md`
- Modify later: `docs/design/moryflow/core/workspace-profile-and-memory-architecture.md`
- Modify later: `docs/design/moryflow/core/cloud-sync-architecture.md`
- Modify later: `apps/moryflow/server/src/memox/CLAUDE.md`

### Task 2: Write failing tests for direct drain and backlog exposure

**Files:**
- Create/Modify: `apps/moryflow/server/src/memox/memox-workspace-content-drain.service.spec.ts`
- Modify: `apps/moryflow/server/src/memory/memory.service.spec.ts` or the closest existing Memory service tests
- Modify: `apps/moryflow/pc/src/main/app/ipc/memory.test.ts`

Red tests to add:

- direct scheduler drains batches without Bull queue wiring
- scheduler does not overlap concurrent drain runs
- memory overview returns workspace-scoped projection backlog
- IPC overview forwards projection backlog into renderer contract

### Task 3: Write failing renderer tests for honest non-empty state

**Files:**
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/memory/knowledge-status.test.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/memory/dashboard-state.test.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/memory/use-memory-page.test.ts`

Red tests to add:

- `projection.pending` keeps the page in `SCANNING` after local bootstrap finishes and before file-level statuses materialize
- full empty dashboard stays hidden while `projection.pending`
- polling continues while `projection.pending`, and stops after both local and server pending states settle

### Task 4: Implement the server fix

**Files:**
- Modify: `apps/moryflow/server/src/memox/memox.module.ts`
- Modify: `apps/moryflow/server/src/memox/memox-workspace-content-drain.service.ts`
- Delete or stop exporting if obsolete: `apps/moryflow/server/src/memox/memox-workspace-content-consumer.processor.ts`
- Modify: `apps/moryflow/server/src/memox/index.ts`
- Modify: `apps/moryflow/server/src/memory/memory.service.ts`
- Modify DTOs if needed: `apps/moryflow/server/src/memory/dto/memory.dto.ts`

Implementation notes:

- direct drain must keep bounded loop semantics via existing constants
- direct drain must never overlap with itself inside one process
- memory overview backlog query must be workspace-scoped and cheap

### Task 5: Implement the PC/renderer fix

**Files:**
- Modify shared contract: `apps/moryflow/pc/src/shared/ipc/memory.ts`
- Modify: `apps/moryflow/pc/src/main/app/ipc/memory-domain/overview.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/memory/knowledge-status.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/memory/dashboard-state.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/memory/use-memory-page.ts`

Implementation notes:

- keep local bootstrap and server projection state separate in data model
- do not invent a fifth UI state
- do not show full empty while server projection backlog is pending

### Task 6: Verify and sync stable facts

**Files:**
- Modify: `docs/plans/2026-03-23-memory-projection-backlog-recovery.md`
- Modify: `docs/design/moryflow/core/workspace-profile-and-memory-architecture.md`
- Modify: `docs/design/moryflow/core/cloud-sync-architecture.md`
- Modify: `apps/moryflow/server/src/memox/CLAUDE.md`

Verification target:

- direct drain tests pass
- Memory overview / IPC tests pass
- renderer state tests pass
- targeted server + PC typecheck pass

## Acceptance Criteria

1. `WorkspaceContentOutbox` projection no longer depends on Bull worker registration to make forward progress.
2. With local files present and server projection still pending, Memory page does not show the full empty dashboard.
3. Memory page continues polling until both local bootstrap and server projection backlog settle.
4. Existing workspace/account isolation remains intact.

## Progress

- [x] Root causes verified from code and production telemetry.
- [x] Repair design frozen in implementation.
- [x] Server direct-drain recovery tests added.
- [x] Server direct-drain recovery implemented.
- [x] Memory overview projection-backlog signal implemented.
- [x] Renderer honest-state tests added.
- [x] Renderer honest-state implementation completed.
- [x] Stable design facts synced back to design/reference docs.
- [x] Validation completed.

## Implementation Notes

- `MemoxWorkspaceContentDrainService` 已改为固定周期 direct drain，不再经由 Bull queue enqueue/worker 才能推进 `WorkspaceContentOutbox`。
- `MemoryService.getOverview()` 现在额外返回当前 `workspaceId` 下未处理 `WorkspaceContentOutbox` unresolved backlog 的 `projection.pending + unresolvedEventCount`；该口径按 `processedAt = null` 统计，覆盖 `UPSERT + DELETE + dead-letter 后仍未收敛` 的事件。
- PC shared overview 合同已新增 `projection` 段；renderer 在 `bootstrap.pending || projection.pending` 且尚无文件级状态时保持 `Scanning`。
- `useMemoryPage()` 轮询窗口已扩展为 `local bootstrap pending OR remote projection pending`；其中 projection-only backlog 期间只轮询 `overview`，待 pending 收敛后再补一次 statuses / graph refresh。
- `MemoxWorkspaceContentConsumerService` 在当前 canonical 状态投影成功后，会把同 document 上已过时的 unresolved outbox 行收敛为 processed no-op，避免 superseded dead letters 长期卡住 projection backlog。
- `useMemoryPage()` 已补 scope-change transition guard：旧 scope 的 `projection.pending` 不会在切换到新 scope 的同一轮 effect 里触发一轮伪“settled refresh”，避免额外的 statuses / graph 请求。
- review follow-up 已补齐两处边界修复：
  - `deriveKnowledgeSummary()` 不再要求 `sourceCount === 0` 才把 `projection.pending` 视为 `Scanning`
  - `shouldShowMemoryEmptyDashboard()` 对 `bootstrap.pending || projection.pending` 做 hard guard，避免状态推导未来回归时再次误落 full empty
- PR review follow-up 已再补两处合同修复：
  - `getMemoryOverviewIpc()` 现在会把缺失的 `projection` 字段归一化为默认值，避免 partial producer/harness 直接把 `undefined` 透给 renderer
  - `projection.pending` 现在基于未处理 `WorkspaceContentOutbox` event backlog，覆盖 `UPSERT + DELETE`，不再把 delete-only backlog 误判为已收敛
- `WorkspaceContentOutbox` 已新增 `workspaceId + processedAt` 复合索引，避免 `overview` 轮询把 unresolved backlog count 退化成热路径大范围扫描。
- 稳定事实已同步回 `docs/design/moryflow/core/workspace-profile-and-memory-architecture.md`、`docs/design/moryflow/core/cloud-sync-architecture.md`、`docs/design/moryflow/features/moryflow-pc-memory-workbench-architecture.md`、`docs/design/moryflow/runbooks/cloud-sync-operations.md` 和 `apps/moryflow/server/src/memox/CLAUDE.md`。

## Validation Notes

- `pnpm --filter @moryflow/pc exec vitest run src/main/app/ipc/memory.test.ts src/renderer/workspace/components/memory/knowledge-status.test.ts src/renderer/workspace/components/memory/dashboard-state.test.ts src/renderer/workspace/components/memory/use-memory-page.test.ts` 通过，`37 passed`。
- `pnpm --filter @moryflow/server exec vitest run src/memox/memox-workspace-content-drain.service.spec.ts src/memory/memory.dto.spec.ts src/memory/memory.controller.spec.ts src/memory/memory.service.spec.ts` 通过，`18 passed`。
- `pnpm --filter @moryflow/pc typecheck` 通过。
- `pnpm --filter @moryflow/server typecheck` 通过。
- `DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy pnpm --filter @moryflow/server exec prisma validate` 通过。
- `node scripts/check-doc-contracts.mjs` 通过。
- `git diff --check` 通过。
