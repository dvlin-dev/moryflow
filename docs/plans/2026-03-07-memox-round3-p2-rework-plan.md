# Memox Round 3 P2 Rework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 收口 Round 2 全量 review 剩余的 P2，使检索热路径、Moryflow 写链职责、客户端类型事实源与二期文档都回到可长期维护的最佳实践状态。

**Architecture:** 先处理最直接影响热路径与后续演进的结构问题：Anyhunt retrieval 统一 query embedding、消除 chunk window N+1，并把聚合逻辑抽成纯函数；随后把 Moryflow memox outbox 的“worker orchestration”和“文件投影副作用”拆开；最后收口 PC/Admin 类型事实源与文档状态板，把共享合同、执行 runbook、架构事实源重新各归其位。

**Tech Stack:** NestJS, Prisma, Vitest, Electron IPC, React, Markdown docs

## Execution Status (2026-03-07)

- Task 1 completed：Anyhunt retrieval 已统一 query embedding、去掉 chunk window N+1，并把 source 聚合/映射抽到纯函数层。
- Task 2 completed：`MemoxOutboxConsumerService` 已收敛为 outbox worker orchestration；文件级 Memox source 投影已下沉到 `MemoxFileProjectionService`。
- Task 3 completed：PC/shared/Admin 类型事实源已收口，主架构文档不再维护 Step 7 过程态状态板。
- Task 4 completed：本轮 P2 已完成 fresh verification、review 文档回写，并重新加入暂存区。
- Task 5 completed：`SearchService` 已拆成应用编排层 + `SearchBackendService` + `SearchLiveFileProjectorService`，搜索读链不再在单个 service 内混合 backend 选择与 live truth projection。
- Task 6 completed：`FileLifecycleOutbox` 已拆成 writer / lease / shared contract 三层；`SyncCommitService`、`SyncInternalOutboxController`、`MemoxOutboxConsumerService` 只依赖各自需要的边界。

---

### Task 1: 收口 Anyhunt retrieval 热路径

**Files:**

- Create: `apps/anyhunt/server/src/retrieval/source-search.aggregator.ts`
- Create: `apps/anyhunt/server/src/retrieval/__tests__/source-search.aggregator.spec.ts`
- Modify: `apps/anyhunt/server/src/retrieval/retrieval.service.ts`
- Modify: `apps/anyhunt/server/src/retrieval/memory-fact-search.service.ts`
- Modify: `apps/anyhunt/server/src/retrieval/source-search.service.ts`
- Modify: `apps/anyhunt/server/src/retrieval/source-search.repository.ts`
- Modify: `apps/anyhunt/server/src/retrieval/__tests__/retrieval.service.spec.ts`
- Modify: `apps/anyhunt/server/src/retrieval/__tests__/source-search.service.spec.ts`
- Modify: `apps/anyhunt/server/src/retrieval/CLAUDE.md`

**Step 1: Write the failing tests**

- 为 `RetrievalService.search()` 增加断言：`include_memory_facts=true && include_sources=true` 时只生成一次 query embedding，并把同一 embedding 传给两个子域搜索服务。
- 为 `SourceSearchService.search()` 增加断言：候选 source 的 chunk window 必须批量查询，不允许按 source 单条调用 `findChunkWindow()`。
- 为新的 aggregator 纯函数写测试：chunk merge / source aggregate / snippet hydration 输入固定时，结果顺序与 matched chunk 选择稳定。

**Step 2: Run RED**
Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/retrieval/__tests__/retrieval.service.spec.ts src/retrieval/__tests__/source-search.service.spec.ts src/retrieval/__tests__/source-search.aggregator.spec.ts`
Expected: FAIL on duplicated embedding generation, missing batch window API, and missing pure aggregator layer.

**Step 3: Minimal implementation**

- `RetrievalService` 注入 `EmbeddingService`，在 unified retrieval 热路径只生成一次 embedding，再把 `queryEmbedding` 传给 `MemoryFactSearchService` / `SourceSearchService`。
- `SourceSearchRepository` 新增批量 `findChunkWindowsForCandidates()`，一次查回所有 `{ revisionId, chunkIndex }` 的窗口内容。
- `SourceSearchService` 只保留“调用 embedding/repo + 组织批量 hydration”；chunk merge / source aggregate / DTO mapping 抽到 `source-search.aggregator.ts`。

**Step 4: Run GREEN**
Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/retrieval/__tests__/retrieval.service.spec.ts src/retrieval/__tests__/source-search.service.spec.ts src/retrieval/__tests__/source-search.aggregator.spec.ts`
Expected: PASS

### Task 2: 拆出 Moryflow Memox 文件投影边界

**Files:**

- Create: `apps/moryflow/server/src/memox/memox-file-projection.service.ts`
- Create: `apps/moryflow/server/src/memox/memox-file-projection.service.spec.ts`
- Modify: `apps/moryflow/server/src/memox/memox-outbox-consumer.service.ts`
- Modify: `apps/moryflow/server/src/memox/memox-outbox-consumer.service.spec.ts`
- Modify: `apps/moryflow/server/src/memox/memox.module.ts`
- Modify: `apps/moryflow/server/src/memox/CLAUDE.md`

**Step 1: Write the failing tests**

- 为新 `MemoxFileProjectionService` 增加断言：它独占 `upsertFile/deleteFile` 的 snapshot 校验、Memox identity/revision 编排与显式 legacy rollback mirror。
- 为 `MemoxOutboxConsumerService` 增加断言：它只负责 `claim -> decode -> delegate -> ack/fail`，不再直接持有 snapshot/hash/identity 细节。

**Step 2: Run RED**
Run: `pnpm --filter @moryflow/server exec vitest run src/memox/memox-outbox-consumer.service.spec.ts src/memox/memox-file-projection.service.spec.ts`
Expected: FAIL until projection side effects are extracted.

**Step 3: Minimal implementation**

- 新增 `MemoxFileProjectionService`，承接 `readCurrentSyncFileState`、`readVerifiedSyncSnapshot`、`isStaleUpsert`、`isSourceGenerationAligned`、`upsertFile`、`deleteFile`。
- `MemoxOutboxConsumerService` 只保留 batch lease / payload parse / error policy，并把文件事件委托给 projection service。
- `legacyVectorSearchClient` 只在 projection service 的显式 rollback backend 分支里使用。

**Step 4: Run GREEN**
Run: `pnpm --filter @moryflow/server exec vitest run src/memox/memox-outbox-consumer.service.spec.ts src/memox/memox-file-projection.service.spec.ts src/memox/memox-outbox-consumer.di.spec.ts`
Expected: PASS

### Task 3: 收口客户端类型事实源与二期文档状态板

**Files:**

- Modify: `packages/api/src/cloud-sync/types.ts`
- Modify: `packages/api/CLAUDE.md`
- Modify: `apps/moryflow/pc/src/shared/ipc/cloud-sync.ts`
- Modify: `apps/moryflow/pc/src/main/app/cloud-sync-ipc-handlers.ts`
- Modify: `apps/moryflow/pc/src/main/app/cloud-sync-ipc-handlers.test.ts`
- Modify: `apps/moryflow/pc/CLAUDE.md`
- Create: `packages/api/src/admin-storage/types.ts`
- Modify: `apps/moryflow/admin/src/types/storage.ts`
- Modify: `apps/moryflow/admin/src/features/storage/api.ts`
- Modify: `apps/moryflow/admin/src/features/storage/hooks.ts`
- Modify: `apps/moryflow/admin/CLAUDE.md`
- Modify: `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
- Modify: `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`
- Modify: `docs/index.md`

**Step 1: Write the failing tests**

- 为 PC IPC handlers 增加断言：IPC shared types 基于 `@moryflow/api/cloud-sync` 派生后，`usage/search/vault` 仍保持现有公开形状，只有 `localPath` 是 IPC 增量字段。
- 若 Admin 类型迁移存在测试缺口，则补最小路径测试，确保 `storageApi` / hooks 仍消费同一套 DTO。

**Step 2: Run RED**
Run: `pnpm --filter @moryflow/pc exec vitest run src/main/app/cloud-sync-ipc-handlers.test.ts`
Run: `pnpm --filter @moryflow/admin exec vitest run src/features/storage/query-paths.test.ts src/pages/DashboardPage.storage.test.tsx`
Expected: FAIL until types and imports are unified.

**Step 3: Minimal implementation**

- `apps/moryflow/pc/src/shared/ipc/cloud-sync.ts` 改为基于 `@moryflow/api/cloud-sync` 派生：`CloudUsageInfo = UsageResponse`、`SearchInput = SearchRequest`、`CloudVault = Pick<VaultDto, ...>`、`SemanticSearchResult = SearchResultItem & { localPath?: string }`。
- `apps/moryflow/pc/src/main/app/cloud-sync-ipc-handlers.ts` 仅保留 view-model 级补充，不再手写平行合同。
- 新增 `packages/api/src/admin-storage/types.ts` 作为 Admin storage DTO 单一出口；Admin 前端删除本地平行 DTO，改为从共享包导入。
- 主架构文档删除 Step 6/7 的过程态“状态板 + 执行结果”长段，只保留稳定边界与结论；演练命令、证据、staging 阻塞统一收口到 cutover runbook。

**Step 4: Run GREEN**
Run: `pnpm --filter @moryflow/pc exec vitest run src/main/app/cloud-sync-ipc-handlers.test.ts`
Run: `pnpm --filter @moryflow/admin exec vitest run src/features/storage/query-paths.test.ts src/pages/DashboardPage.storage.test.tsx`
Expected: PASS

### Task 4: 最终验证与 review 文档回写

**Files:**

- Modify: `docs/design/anyhunt/runbooks/memox-phase2-code-review-plan.md`
- Modify: `docs/plans/2026-03-07-memox-round3-p2-rework-plan.md`

**Step 1: Run targeted verification**
Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/retrieval/__tests__/retrieval.service.spec.ts src/retrieval/__tests__/source-search.service.spec.ts src/retrieval/__tests__/source-search.aggregator.spec.ts`
Run: `pnpm --filter @moryflow/server exec vitest run src/memox/memox-outbox-consumer.service.spec.ts src/memox/memox-file-projection.service.spec.ts src/memox/memox-outbox-consumer.di.spec.ts`
Run: `pnpm --filter @moryflow/pc exec vitest run src/main/app/cloud-sync-ipc-handlers.test.ts`
Run: `pnpm --filter @moryflow/admin exec vitest run src/features/storage/query-paths.test.ts src/pages/DashboardPage.storage.test.tsx`
Run: `pnpm --filter @anyhunt/anyhunt-server typecheck`
Run: `pnpm --filter @moryflow/server typecheck`
Run: `pnpm --filter @moryflow/pc typecheck`
Run: `pnpm --filter @moryflow/admin typecheck`
Run: `git diff --check && git diff --cached --check`
Expected: all pass

**Step 2: Sync docs**

- 在 review runbook 中新增本轮 P2 收口结论与 fresh verification evidence。
- 在计划文档中把执行状态改为 completed，并记录验证结果。

**Step 3: Stage changes**
Run: `git add <changed files>`
Expected: 本轮实现、测试、文档全部进入暂存区。

## Fresh Verification Evidence (2026-03-07 20:19 CST)

- PASS: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/retrieval/__tests__/retrieval.controller.spec.ts src/retrieval/__tests__/retrieval.module.spec.ts src/retrieval/__tests__/retrieval.service.spec.ts src/retrieval/__tests__/source-search.repository.spec.ts src/retrieval/__tests__/source-search.service.spec.ts src/retrieval/__tests__/source-search.aggregator.spec.ts`
- PASS: `pnpm --filter @anyhunt/anyhunt-server typecheck`
- PASS: `pnpm --filter @moryflow/server exec vitest run src/memox/memox-file-projection.service.spec.ts src/memox/memox-outbox-consumer.di.spec.ts src/memox/memox-outbox-consumer.processor.spec.ts src/memox/memox-outbox-consumer.service.spec.ts src/memox/memox-cutover.service.spec.ts`
- PASS: `pnpm --filter @moryflow/server typecheck`
- PASS: `pnpm --filter @moryflow/api build`
- PASS: `pnpm --filter @moryflow/pc exec vitest run src/main/app/cloud-sync-ipc-handlers.test.ts && pnpm --filter @moryflow/pc typecheck`
- PASS: `pnpm --filter @moryflow/admin exec vitest run src/features/storage/query-paths.test.ts src/pages/DashboardPage.storage.test.tsx && pnpm --filter @moryflow/admin typecheck`
- PASS: `git diff --check && git diff --cached --check`

## Follow-up Batch 2 (2026-03-07)

### Task 5: 收口 SearchService 的 backend / projection 职责

**Files:**

- Create: `apps/moryflow/server/src/search/search-backend.service.ts`
- Create: `apps/moryflow/server/src/search/search-live-file-projector.service.ts`
- Modify: `apps/moryflow/server/src/search/search.service.ts`
- Modify: `apps/moryflow/server/src/search/search.module.ts`
- Modify: `apps/moryflow/server/src/search/index.ts`
- Modify: `apps/moryflow/server/src/search/search.service.spec.ts`
- Create: `apps/moryflow/server/src/search/search-backend.service.spec.ts`
- Create: `apps/moryflow/server/src/search/search-live-file-projector.service.spec.ts`

**Step 1: Write the failing tests**

- 新增 `SearchBackendService` 与 `SearchLiveFileProjectorService` 单测，先锁住 backend 选择、legacy mapping、live SyncFile hydration 行为。
- 重写 `SearchService` 单测，使其只验证 vault ACL + orchestration，不再承载 backend/projection 细节。

**Step 2: Run RED**
Run: `pnpm --filter @moryflow/server exec vitest run src/search/search.service.spec.ts src/search/search-backend.service.spec.ts src/search/search-live-file-projector.service.spec.ts`
Expected: FAIL until new services exist and SearchService constructor is updated.

**Step 3: Minimal implementation**

- 新增 `SearchBackendService`，集中封装 `MemoxSearchAdapterService` / `LegacyVectorSearchClient` 选择与 legacy DTO 映射。
- 新增 `SearchLiveFileProjectorService`，集中做 `SyncFile(isDeleted=false)` 活跃集过滤与本地字段回填。
- `SearchService` 退化为应用编排层，只保留日志、vault ACL 与调用顺序。

**Step 4: Run GREEN**
Run: `pnpm --filter @moryflow/server exec vitest run src/search/search.service.spec.ts src/search/search-backend.service.spec.ts src/search/search-live-file-projector.service.spec.ts src/search/search.controller.spec.ts`
Expected: PASS

### Task 6: 拆分 FileLifecycleOutbox 的 writer / lease state machine

**Files:**

- Create: `apps/moryflow/server/src/sync/file-lifecycle-outbox.types.ts`
- Create: `apps/moryflow/server/src/sync/file-lifecycle-outbox-writer.service.ts`
- Create: `apps/moryflow/server/src/sync/file-lifecycle-outbox-lease.service.ts`
- Modify: `apps/moryflow/server/src/sync/sync-commit.service.ts`
- Modify: `apps/moryflow/server/src/sync/sync-internal-outbox.controller.ts`
- Modify: `apps/moryflow/server/src/sync/sync.module.ts`
- Modify: `apps/moryflow/server/src/sync/index.ts`
- Create: `apps/moryflow/server/src/sync/file-lifecycle-outbox-writer.service.spec.ts`
- Create: `apps/moryflow/server/src/sync/file-lifecycle-outbox-lease.service.spec.ts`
- Modify: `apps/moryflow/server/src/sync/sync.service.spec.ts`
- Modify: `apps/moryflow/server/src/memox/memox-outbox-consumer.service.ts`
- Modify: `apps/moryflow/server/src/memox/memox-outbox-consumer.service.spec.ts`
- Modify: `apps/moryflow/server/src/memox/memox-outbox-consumer.di.spec.ts`
- Modify: `apps/moryflow/server/CLAUDE.md`
- Create: `apps/moryflow/server/src/sync/CLAUDE.md`

**Step 1: Write the failing tests**

- 新增 writer spec，只验证 `appendSyncCommitEvents()` 负责从 sync commit 真相生成 upsert/delete 事件。
- 新增 lease spec，只验证 `claim / ack / fail / retry / DLQ` 状态迁移。
- 更新 memox consumer DI/spec，让 consumer 只依赖 lease service。

**Step 2: Run RED**
Run: `pnpm --filter @moryflow/server exec vitest run src/sync/file-lifecycle-outbox-writer.service.spec.ts src/sync/file-lifecycle-outbox-lease.service.spec.ts src/memox/memox-outbox-consumer.di.spec.ts`
Expected: FAIL until new services and constructor graph are introduced.

**Step 3: Minimal implementation**

- 共享 outbox payload/record/request 类型抽到 `file-lifecycle-outbox.types.ts`。
- `FileLifecycleOutboxWriterService` 只负责 append/write；`FileLifecycleOutboxLeaseService` 只负责 claim/ack/fail/retry/DLQ。
- `SyncCommitService` 改为注入 writer；`SyncInternalOutboxController` 与 `MemoxOutboxConsumerService` 改为注入 lease。
- 删除原来的胖 `file-lifecycle-outbox.service.ts`，避免继续把写侧和租约侧耦在一起。

**Step 4: Run GREEN**
Run: `pnpm --filter @moryflow/server exec vitest run src/sync/file-lifecycle-outbox-writer.service.spec.ts src/sync/file-lifecycle-outbox-lease.service.spec.ts src/sync/sync.service.spec.ts src/memox/memox-outbox-consumer.di.spec.ts src/memox/memox-outbox-consumer.service.spec.ts src/memox/memox-cutover.service.spec.ts`
Expected: PASS

## Follow-up Batch 2 Fresh Verification Evidence (2026-03-07 20:42 CST)

- PASS: `pnpm --filter @moryflow/server exec vitest run src/search/search.service.spec.ts src/search/search-backend.service.spec.ts src/search/search-live-file-projector.service.spec.ts src/search/search.controller.spec.ts src/sync/file-lifecycle-outbox-writer.service.spec.ts src/sync/file-lifecycle-outbox-lease.service.spec.ts src/sync/sync.service.spec.ts src/memox/memox-outbox-consumer.di.spec.ts src/memox/memox-outbox-consumer.processor.spec.ts src/memox/memox-outbox-consumer.service.spec.ts src/memox/memox-cutover.service.spec.ts`
- PASS: `pnpm --filter @moryflow/server typecheck`
- PASS: `git diff --check && git diff --cached --check`
