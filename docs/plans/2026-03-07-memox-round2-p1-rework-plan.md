# Memox Round 2 P1 Rework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 收口 Round 2 深度复审暴露的剩余 P1，让 Memox 二期公开合同、平台边界、Moryflow 热路径与 PC 错误语义一次性冻结到可直接开工执行的状态。

**Architecture:** 先冻结 Anyhunt 对外合同，把 response schema、OpenAPI 与运行时 hard gate 绑成同一事实源；再把 API Key 清理下沉到独立的 Memox tenant teardown 服务，消除 `ApiKeyModule <-> SourcesModule` 循环依赖；随后移除 Moryflow 默认热路径对 legacy vectorize 的硬依赖，并让 PC IPC 把远端错误原样抛回 renderer，由 renderer 统一决定空态与降级表现。

**Tech Stack:** NestJS, Prisma, Vitest, Electron IPC, Markdown docs

## Execution Status (2026-03-07)

- Task 1 completed：`exports.create` / `exports.get` / retrieval response schema 与 `finalize()` 公开合同已冻结。
- Task 2 completed：OpenAPI review、Step 7 hard gate 与 runtime payload 校验已经绑定到同一套 response schema 事实源。
- Task 3 completed：API Key cleanup 已收敛为任务状态机，Memox tenant teardown 已下沉到独立数据面服务，`ApiKeyModule <-> SourcesModule` 循环依赖已拆除。
- Task 4 completed：Moryflow memox-only 默认热路径已移除 legacy vectorize 启动硬依赖与默认双写，只在显式 rollback backend 下启用 legacy baseline。
- Task 5 completed：PC cloud-sync IPC 已改为记录日志后抛错，由 renderer 作为唯一 UI 降级层处理空态与报错。
- Task 6 completed：review runbook、主文档、cutover runbook 与相关 `CLAUDE.md` 已同步为同一事实源。

---

### Task 1: 冻结 Anyhunt exports / finalize / retrieval 公开合同

**Files:**

- Modify: `apps/anyhunt/server/src/memory/dto/memory.schema.ts`
- Modify: `apps/anyhunt/server/src/memory/memory-export.controller.ts`
- Modify: `apps/anyhunt/server/src/memory/memory.service.ts`
- Modify: `apps/anyhunt/server/src/memory/__tests__/memory-export.controller.spec.ts`
- Modify: `apps/anyhunt/server/src/retrieval/dto/retrieval.schema.ts`
- Modify: `apps/anyhunt/server/src/retrieval/retrieval.controller.ts`
- Modify: `apps/anyhunt/server/src/retrieval/__tests__/retrieval.controller.spec.ts`
- Modify: `apps/anyhunt/server/src/sources/knowledge-source-revision.service.ts`
- Modify: `apps/anyhunt/server/src/sources/__tests__/knowledge-source-revision.service.spec.ts`

**Step 1: Write the failing tests**

- 为 `exports.create` 增加断言：公开响应只返回 `memory_export_id`（保留 message 需明确文档是否允许；默认去掉 message，保持最小合同）。
- 为 retrieval controller 增加断言：OpenAPI response schema 必须存在且能对应 `SearchSourcesResponseSchema` / `SearchRetrievalResponseSchema`。
- 为 revision service 增加断言：`finalize()` 遇到 `INDEXED` revision 直接拒绝，reindex 仍是唯一公开再索引入口。

**Step 2: Run RED**
Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/memory/__tests__/memory-export.controller.spec.ts src/retrieval/__tests__/retrieval.controller.spec.ts src/sources/__tests__/knowledge-source-revision.service.spec.ts`
Expected: FAIL on current contract drift.

**Step 3: Minimal implementation**

- 在 memory/retrieval DTO 中新增明确 response schema，并把 controller 的 `@ApiOkResponse` 与 response schema 绑定。
- `createExport()` 改为返回冻结后的最小 payload，统一使用 `memory_export_id`。
- `finalize()` 去掉 `INDEXED` 宽松分支，让 `reindex()` 成为唯一公开再索引契约。

**Step 4: Run GREEN**
Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/memory/__tests__/memory-export.controller.spec.ts src/retrieval/__tests__/retrieval.controller.spec.ts src/sources/__tests__/knowledge-source-revision.service.spec.ts`
Expected: PASS

### Task 2: 把 OpenAPI / hard gate 升级为 response contract gate

**Files:**

- Modify: `apps/anyhunt/server/scripts/memox-phase2-openapi-load-check.utils.ts`
- Modify: `apps/anyhunt/server/scripts/memox-phase2-openapi-load-check.ts`
- Modify: `apps/anyhunt/server/test/memox-phase2-openapi-load-check.utils.spec.ts`

**Step 1: Write the failing tests**

- 为 OpenAPI review utils 增加 response schema 断言：`POST /sources/search`、`POST /retrieval/search`、`POST /exports`、`POST /exports/get` 必须声明固定 response payload shape。
- 为 runtime payload assertion 增加 `exports.create` 的冻结 payload 校验。

**Step 2: Run RED**
Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run test/memox-phase2-openapi-load-check.utils.spec.ts`
Expected: FAIL until response schemas are actually checked.

**Step 3: Minimal implementation**

- 在 review utils 中增加对 OpenAPI success response schema 的存在性校验。
- 在运行时脚本里把 `exports.create` payload 改为严格校验 `memory_export_id`，并继续校验 search/get payload。
- 确保 OpenAPI review 与运行时 payload 校验共用同一套 schema 事实源，避免“文档绿了、真实合同已漂移”。

**Step 4: Run GREEN**
Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run test/memox-phase2-openapi-load-check.utils.spec.ts`
Expected: PASS

### Task 3: 下沉 API Key cleanup 的 Memox tenant teardown 边界

**Files:**

- Create: `apps/anyhunt/server/src/memox-platform/memox-tenant-teardown.service.ts`
- Modify: `apps/anyhunt/server/src/memox-platform/memox-platform.module.ts`
- Modify: `apps/anyhunt/server/src/memox-platform/__tests__/memox-platform.service.spec.ts`
- Modify: `apps/anyhunt/server/src/api-key/api-key-cleanup.service.ts`
- Modify: `apps/anyhunt/server/src/api-key/api-key.module.ts`
- Modify: `apps/anyhunt/server/src/api-key/__tests__/api-key.module.spec.ts`
- Modify: `apps/anyhunt/server/src/sources/sources.module.ts`
- Modify: `apps/anyhunt/server/src/sources/index.ts`

**Step 1: Write the failing tests**

- 为新 teardown service 增加测试：它掌握 R2 删除与 vector/source/graph/memory 删除顺序，API Key cleanup 只负责任务状态机。
- 为 `ApiKeyModule` 增加断言：不再依赖 `SourcesModule`，循环依赖被移除。

**Step 2: Run RED**
Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/memox-platform/__tests__/memox-platform.service.spec.ts src/api-key/__tests__/api-key.module.spec.ts`
Expected: FAIL until teardown ownership迁移完成.

**Step 3: Minimal implementation**

- 新增独立 `MemoxTenantTeardownService`，集中承接 tenant 级 R2 删除与数据面 teardown 顺序。
- `ApiKeyCleanupService` 只保留任务恢复、状态更新与调用 teardown service 的职责。
- `ApiKeyModule` 改为依赖 `MemoxPlatformModule` 而不是 `SourcesModule`，清除 cycle。

**Step 4: Run GREEN**
Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/memox-platform/__tests__/memox-platform.service.spec.ts src/api-key/__tests__/api-key.module.spec.ts src/sources/__tests__/knowledge-source-deletion.service.spec.ts`
Expected: PASS

### Task 4: 移除 Moryflow 默认热路径对 legacy vectorize 的硬依赖

**Files:**

- Modify: `apps/moryflow/server/src/memox/memox-runtime-config.service.ts`
- Modify: `apps/moryflow/server/src/memox/memox-runtime-config.service.spec.ts`
- Modify: `apps/moryflow/server/src/memox/memox-outbox-consumer.service.ts`
- Modify: `apps/moryflow/server/src/memox/memox-outbox-consumer.service.spec.ts`
- Modify: `apps/moryflow/server/src/memox/memox-outbox-consumer.di.spec.ts`

**Step 1: Write the failing tests**

- 为 runtime config 增加断言：默认 `memox` backend 启动不要求 `VECTORIZE_API_URL`；只有显式 `legacy_vector_baseline` 才要求 legacy URL。
- 为 outbox consumer 增加断言：默认不再镜像 legacy 写链；显式 legacy backend 时才写 legacy baseline。

**Step 2: Run RED**
Run: `pnpm --filter @moryflow/server exec vitest run src/memox/memox-runtime-config.service.spec.ts src/memox/memox-outbox-consumer.service.spec.ts src/memox/memox-outbox-consumer.di.spec.ts`
Expected: FAIL on current unconditional legacy dependency.

**Step 3: Minimal implementation**

- `MemoxRuntimeConfigService` 改为先判断 `MORYFLOW_SEARCH_BACKEND`，只在 `legacy_vector_baseline` 分支读取 `VECTORIZE_API_URL`。
- `MemoxOutboxConsumerService` 注入 runtime config，并仅在 `legacy_vector_baseline` 激活时调用 legacy vector client。
- 明确 rollback baseline 不再通过默认双写维持热同步，而是靠显式 backend/回切流程驱动。

**Step 4: Run GREEN**
Run: `pnpm --filter @moryflow/server exec vitest run src/memox/memox-runtime-config.service.spec.ts src/memox/memox-outbox-consumer.service.spec.ts src/memox/memox-outbox-consumer.di.spec.ts`
Expected: PASS

### Task 5: 修正 PC cloud-sync IPC 错误合同

**Files:**

- Modify: `apps/moryflow/pc/src/main/app/ipc-handlers.ts`
- Modify: `apps/moryflow/pc/src/renderer/hooks/use-cloud-sync.ts`
- Modify if needed: `apps/moryflow/pc/CLAUDE.md`

**Step 1: Write the failing tests where practical**

- 若现有 IPC 文件缺少可维护测试入口，则先在 hook 层补回归测试或抽取最小 helper 后测试：远端失败不再伪装成空数组/零用量，而由 renderer catch 后回落为 `[]` / `null`。

**Step 2: Run RED**
Run: `pnpm --filter @moryflow/pc exec vitest run <new-or-updated-test-file>`
Expected: FAIL until main process stops swallowing errors.

**Step 3: Minimal implementation**

- 去掉 `listCloudVaults/getUsage/search` 的 main-process catch fallback 返回值，只记录日志后重新抛错。
- 保持 renderer hook 作为唯一 UI 级降级点：列表失败返回 `[]`，用量失败返回 `null`，搜索失败由调用方按现有约定处理。

**Step 4: Run GREEN**
Run: `pnpm --filter @moryflow/pc exec vitest run <new-or-updated-test-file>`
Expected: PASS

### Task 6: 回写 review runbook / 主文档 / CLAUDE 事实源并做最终验证

**Files:**

- Modify: `docs/design/anyhunt/runbooks/memox-phase2-code-review-plan.md`
- Modify: `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
- Modify: `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`
- Modify: `docs/index.md`
- Modify: `docs/design/anyhunt/features/index.md`
- Modify: `apps/anyhunt/server/CLAUDE.md`
- Modify: `apps/moryflow/server/CLAUDE.md`
- Modify if touched: `apps/moryflow/pc/CLAUDE.md`

**Step 1: Run targeted verification**
Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/memory/__tests__/memory-export.controller.spec.ts src/retrieval/__tests__/retrieval.controller.spec.ts src/sources/__tests__/knowledge-source-revision.service.spec.ts src/memox-platform/__tests__/memox-platform.service.spec.ts src/api-key/__tests__/api-key.module.spec.ts test/memox-phase2-openapi-load-check.utils.spec.ts`
Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/api-key/__tests__/api-key-cleanup.service.spec.ts src/memory/__tests__/memory.service.spec.ts`
Run: `pnpm --filter @moryflow/server exec vitest run src/memox/memox-runtime-config.service.spec.ts src/memox/memox-outbox-consumer.service.spec.ts src/memox/memox-outbox-consumer.di.spec.ts`
Run: `pnpm --filter @moryflow/pc exec vitest run src/main/app/cloud-sync-ipc-handlers.test.ts`
Run: `pnpm --filter @anyhunt/anyhunt-server typecheck`
Run: `pnpm --filter @moryflow/server typecheck`
Run: `pnpm --filter @moryflow/pc typecheck`
Run: `git diff --check && git diff --cached --check`
Expected: all pass

**Step 2: Sync docs**

- 将 Round 2 review 文档的 Block C/D/E/G/H/Z 结论更新为整改后事实。
- 在主文档 / cutover / CLAUDE 中冻结新的合同、边界、rollback 与错误语义。

**Step 3: Stage changes**
Run: `git add <changed files>`
Expected: 本轮实现、测试、文档全部进入暂存区。

## Fresh Verification Evidence (2026-03-07 19:40 CST)

- PASS: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/api-key/__tests__/api-key-cleanup.service.spec.ts src/memory/__tests__/memory.service.spec.ts`
- PASS: `pnpm --filter @anyhunt/anyhunt-server typecheck`
- PASS: `pnpm --filter @moryflow/server typecheck`
- PASS: `pnpm --filter @moryflow/pc typecheck`
- PASS: `git diff --check && git diff --cached --check`
