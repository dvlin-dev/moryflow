# Memox Phase 2 Review Follow-ups Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 收口 Memox 二期 code review 暴露的 P1/P2，使二期从“方向成立但需聚焦返工”推进到可再次验收的状态。

**Architecture:** 先把 `quota/admin-storage` 的统计真相源统一回 `Vault/SyncFile`，再冻结 rollback/rehearsal 的运行入口，最后补齐 Step 7 hard gate 与旧 `vectorize` 尾巴清理。所有行为改动先补失败测试，再做最小实现，再同步文档事实源。

**Tech Stack:** NestJS, Prisma, Vitest, React, Markdown docs

## Execution Status (2026-03-07)

- Task 1 completed：`admin-storage / quota` 的统计真相源已统一回 `Vault / SyncFile`，`UserStorageUsage` 明确退回额度缓存角色。
- Task 2 completed：rollback / rehearsal 已冻结为官方入口，`package.json`、`.env.example`、runbook、主文档与 `CLAUDE.md` 口径一致。
- Task 3 completed：Step 7 hard gate 已补齐 exact status 断言，旧 `vectorize` workspace 元数据尾巴已清理。
- Task 4 completed：review 文档已回写 `ready to continue` 结论；实现、测试、文档均已加入暂存区，待继续执行后续实施。
- Fresh verification evidence：
  - `pnpm --filter @moryflow/server exec vitest run src/admin-storage/admin-storage.service.spec.ts src/quota/quota.service.spec.ts src/search/search.service.spec.ts src/memox/memox-runtime-config.service.spec.ts`
  - `pnpm --filter @anyhunt/anyhunt-server exec vitest run test/memox-phase2-openapi-load-check.utils.spec.ts src/retrieval/__tests__/retrieval.controller.spec.ts src/memory/__tests__/memory-export.controller.spec.ts src/sources/__tests__/source-revisions.controller.spec.ts src/sources/__tests__/sources.controller.spec.ts`
  - `pnpm --filter @moryflow/server typecheck`
  - `pnpm --filter @anyhunt/anyhunt-server typecheck`
  - `pnpm --filter @moryflow/server run rehearsal:memox-phase2`（入口成功执行，按预期在缺 `MEMOX_API_KEY` 处 fail-fast）
  - `pnpm --filter @anyhunt/anyhunt-server run memox:phase2:openapi-load-check`（入口成功执行，按预期在缺 `MEMOX_API_KEY` 处 fail-fast）

---

### Task 1: 冻结 admin/quota 真相源

**Files:**

- Create: `apps/moryflow/server/src/admin-storage/admin-storage.service.spec.ts`
- Modify: `apps/moryflow/server/src/admin-storage/admin-storage.service.ts`
- Modify: `apps/moryflow/server/src/quota/quota.service.ts`

**Step 1: Write the failing tests**

- 为 `getStats()` 写测试：占位 `UserStorageUsage` 行不能增加云同步用户数。
- 为 `getVaultList()` 写测试：`fileCount` 只统计 `isDeleted=false`。
- 为 `getUserStorageList()` 写测试：只列出有真实 Vault 的用户，缺失 usage 行时默认 `storageUsed=0`。
- 为 `getUserStorageDetail()` 写测试：每个 Vault 的 `fileCount` 与 `totalSize` 都来自 live `SyncFile`。

**Step 2: Run targeted tests to verify RED**
Run: `pnpm --filter @moryflow/server exec vitest run src/admin-storage/admin-storage.service.spec.ts`
Expected: FAIL on current `userStorageUsage` / `_count.files` semantics.

**Step 3: Write minimal implementation**

- `getStats()` 改为 `syncFile.aggregate + vault.groupBy(userId) + vault.count + syncFile.count + vaultDevice.count`。
- `getVaultList()` / `getUserStorageDetail()` 的 `fileCount` 改为 `syncFile.groupBy(... isDeleted=false)._count.id`。
- `getUserStorageList()` 改为基于 `user + vaults.some` 取用户，再 merge `userStorageUsage` 作为额度缓存值，缺失时补 0。
- `QuotaService` 保持额度缓存职责，不再被 admin 误当事实源；若需要，只补注释/命名澄清其边界。

**Step 4: Run targeted tests to verify GREEN**
Run: `pnpm --filter @moryflow/server exec vitest run src/admin-storage/admin-storage.service.spec.ts src/quota/quota.service.spec.ts`
Expected: PASS

### Task 2: 冻结 rollback / rehearsal 入口

**Files:**

- Modify: `apps/moryflow/server/package.json`
- Modify: `apps/moryflow/server/.env.example`
- Modify: `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`
- Modify: `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
- Modify: `apps/moryflow/server/CLAUDE.md`
- Modify: `apps/moryflow/admin/CLAUDE.md`

**Step 1: Write/adjust failing tests where practical**

- 为运行时配置补测试：`.env.example` 缺 `MORYFLOW_SEARCH_BACKEND` 的事实会在文档/脚本层修复；代码行为已由现有 spec 覆盖。

**Step 2: Implement**

- 在 `package.json` 增加固定 rehearsal script，使用已验证可运行的 `ts-node --project ... --transpile-only` 入口。
- 在 `.env.example` 明确加入 `MORYFLOW_SEARCH_BACKEND` 并写清默认/rollback 含义。
- 在 runbook / 主文档 / CLAUDE.md 中写入官方执行命令与必需 env。
- 修正 admin 侧 `user-storage-card.tsx` Header 漂移，并在 `apps/moryflow/admin/CLAUDE.md` 记录当前 storage 语义。

**Step 3: Verify**
Run: `pnpm --filter @moryflow/server exec vitest run src/memox/memox-runtime-config.service.spec.ts`
Run: `pnpm --filter @moryflow/server run rehearsal:memox-phase2 --help || true`
Expected: spec PASS；脚本入口不再依赖 `tsx`。

### Task 3: 补齐 Step 7 hard gate 与旧尾巴清理

**Files:**

- Modify: `apps/anyhunt/server/scripts/memox-phase2-openapi-load-check.utils.ts`
- Modify: `apps/anyhunt/server/scripts/memox-phase2-openapi-load-check.ts`
- Modify: `apps/anyhunt/server/test/memox-phase2-openapi-load-check.utils.spec.ts`
- Modify: `pnpm-workspace.yaml`
- Modify: `apps/moryflow/admin/src/features/storage/components/user-storage-card.tsx`
- Remove if still empty: `apps/moryflow/server/src/vectorize/`
- Modify: `apps/moryflow/server/CLAUDE.md`

**Step 1: Write failing tests**

- 为 OpenAPI hard gate utils 增加 required operations/status 覆盖：`POST /sources/{sourceId}/revisions`、`POST /source-revisions/{revisionId}/finalize`、`POST /exports`。

**Step 2: Run RED**
Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run test/memox-phase2-openapi-load-check.utils.spec.ts`
Expected: FAIL until required operations/status set is expanded.

**Step 3: Minimal implementation**

- 扩展 required operations/status。
- 运行时脚本增加对应 exact status 断言。
- 删除 workspace 中已废弃的 `vectorize` glob；移除空目录尾巴。
- 同步相关文档/Header。

**Step 4: Run GREEN**
Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run test/memox-phase2-openapi-load-check.utils.spec.ts src/retrieval/__tests__/retrieval.controller.spec.ts src/memory/__tests__/memory-export.controller.spec.ts`
Expected: PASS

### Task 4: 最终验证与文档同步

**Files:**

- Modify: `docs/design/anyhunt/runbooks/memox-phase2-code-review-plan.md`
- Modify: `docs/CLAUDE.md`

**Step 1: Run targeted verification**
Run: `pnpm --filter @moryflow/server exec vitest run src/admin-storage/admin-storage.service.spec.ts src/quota/quota.service.spec.ts src/search/search.service.spec.ts src/memox/memox-runtime-config.service.spec.ts`
Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run test/memox-phase2-openapi-load-check.utils.spec.ts src/retrieval/__tests__/retrieval.controller.spec.ts src/memory/__tests__/memory-export.controller.spec.ts`

**Step 2: Sync docs**

- 把 review 文档中的 P1/P2 状态更新为已修复或剩余项。
- 同步相关 CLAUDE.md。

**Step 3: Stage changes**
Run: `git add <changed files>`
Expected: 相关实现、测试、文档全部进入暂存区。
