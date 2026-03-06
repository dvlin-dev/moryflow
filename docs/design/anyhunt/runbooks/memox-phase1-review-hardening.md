# Memox Phase 1 Review Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 收口 Memox 一期 review 暴露的阻塞问题，使一期重新达到可上线的生产化状态。

**Architecture:** 先把事实源文档改回 `in_progress`，然后基于失败测试驱动修复 `api-key cleanup / graph cleanup / retrieval graph 契约 / source ingest guardrail` 四条主线，最后重置并压缩 `apps/anyhunt/server` 主库与向量库 migration 基线。所有修复都按零兼容执行，不保留旧迁移包袱。当前计划已全部执行完成；随后又按外部 review 追加完成了 `sources` 结构化 guardrail 错误契约、`pending_upload_expires_at` 与小时级 zombie revision cleanup、`ScopeRegistry / Export / canonical merge` 的事实源回写，以及 2026-03-06 PR review 收口（`finalize` processing slot 生命周期、`ApiKeyCleanupProcessor` 模块注册、`IdempotencyService.begin()` 并发唯一键竞争、`SourcesModule` OpenAPI 注册表）。

**Tech Stack:** NestJS 11、Prisma 7、PostgreSQL 16、Redis 7、BullMQ、Vitest

---

### Task 1: 回写事实源并锁定整改范围

**Files:**

- Modify: `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
- Modify: `docs/CLAUDE.md`
- Modify: `apps/anyhunt/server/CLAUDE.md`

**Step 1: 回写一期状态与阻塞问题**

- 将一期状态从 `completed` 改为 `in_progress`
- 增加“本需求允许直接重置 Anyhunt Server 主库与向量库”的限定准则
- 列出 5 个阻塞问题和修复顺序

**Step 2: 记录本轮执行计划**

- 以本文件作为实现计划事实源

### Task 2: 用失败测试锁定 cleanup 与 graph 根因

**Files:**

- Modify: `apps/anyhunt/server/src/api-key/__tests__/api-key.service.spec.ts`
- Modify: `apps/anyhunt/server/src/graph/__tests__/graph-projection.service.spec.ts`

**Step 1: 先写失败测试**

- 验证 API key 删除必须 enqueue durable cleanup job，并覆盖 sources/graph/R2 资源
- 验证 cleanup memory/source evidence 时，不得删除仍被其他 observation 引用的 canonical relation
- 验证低置信 observation 不会创建 canonical entity / relation

**Step 2: 跑定向测试，确认 RED**

### Task 3: 修复 API key cleanup 为 durable tenant teardown

**Files:**

- Modify: `apps/anyhunt/server/src/api-key/api-key.service.ts`
- Modify: `apps/anyhunt/server/src/queue/queue.constants.ts`
- Modify: `apps/anyhunt/server/src/queue/queue.module.ts`
- Create: `apps/anyhunt/server/src/api-key/api-key-cleanup.processor.ts`
- Create/Modify: `apps/anyhunt/server/src/api-key/api-key-cleanup.service.ts`（若拆分需要）

**Step 1: 用队列替代进程内 fire-and-forget**

- 新增 `ApiKeyCleanupJob`
- 删除 `cleanupVectorDataAsync`

**Step 2: 完整清理租户数据**

- `MemoryFact*`
- `KnowledgeSource*`
- `SourceChunk`
- `Graph*`
- 关联 R2 blobs

**Step 3: 跑定向测试，确认 GREEN**

### Task 4: 让 GraphObservation 成为唯一 cleanup 事实源

**Files:**

- Modify: `apps/anyhunt/server/src/graph/graph-projection.service.ts`
- Modify: `apps/anyhunt/server/src/graph/graph-context.service.ts`
- Modify: `apps/anyhunt/server/src/graph/graph.utils.ts`

**Step 1: 先改 cleanup 语义**

- 删除 observation 后，只 prune orphan canonical relation/entity
- 不再按 evidence 字段直接删除 canonical relation

**Step 2: 补 low-confidence gate**

- 低置信 observation 仅保留为 observation
- 不直接升格 canonical entity / relation

**Step 3: 跑 graph 定向测试**

### Task 5: 对齐 retrieval 契约与 graph context 加载策略

**Files:**

- Modify: `apps/anyhunt/server/src/retrieval/dto/retrieval.schema.ts`
- Modify: `apps/anyhunt/server/src/retrieval/retrieval.service.ts`
- Modify: `apps/anyhunt/server/src/retrieval/__tests__/retrieval.service.spec.ts`
- Modify: `apps/anyhunt/server/src/retrieval/__tests__/retrieval.controller.spec.ts`

**Step 1: 先写失败测试**

- `include_graph_context=false` 时不加载 graph
- `include_graph_context=true` 时批量附加 graph，避免按 item N+1

**Step 2: 实现最小修复**

- schema 显式加上 `include_graph_context`
- retrieval 改为按域批量拉取 graph context

### Task 6: 把 source ingest guardrail 真正挂到运行时

**Files:**

- Modify: `apps/anyhunt/server/src/sources/knowledge-source-revision.service.ts`
- Modify: `apps/anyhunt/server/src/sources/source-storage.service.ts`
- Modify: `apps/anyhunt/server/src/sources/__tests__/knowledge-source-revision.service.spec.ts`

**Step 1: 先写失败测试**

- 超过 finalize/reindex 频率窗口必须拒绝
- 超过并发 source job 上限必须拒绝

**Step 2: 实现 runtime enforcement**

- 用 Redis 或主库事实源实现窗口计数
- finalize/reindex/并发摄入都必须 enforce

### Task 7: 压缩 migration 并重置数据库

**Files:**

- Modify: `apps/anyhunt/server/prisma/main/migrations/*`
- Modify: `apps/anyhunt/server/prisma/vector/migrations/*`
- Modify: `apps/anyhunt/server/CLAUDE.md`

**Step 1: 生成当前 schema 的干净基线 migration**

- 主库一套
- 向量库一套

**Step 2: 删除历史迁移包袱**

- 保留当前基线
- 回写“本轮零兼容重置”说明

**Step 3: 在可用数据库执行 reset 并迁移**

执行结果（2026-03-06）：

- 已定位真实目标库连接并发起零兼容 reset
- 主库已成功执行 `DROP SCHEMA public CASCADE` + `CREATE SCHEMA public`
- 向量库在空 `public schema` 上成功应用单基线 migration `20260306173100_init`
- 主库成功应用单基线 migration `20260306173000_init`
- `prisma migrate status --config prisma.main.config.ts` 与 `prisma migrate status --config prisma.vector.config.ts` 均返回 `Database schema is up to date`
- 中途出现的宿主机磁盘耗尽问题已解除，不再构成当前阻塞

### Task 8: 回写文档并执行验证

**Files:**

- Modify: `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
- Modify: `docs/CLAUDE.md`
- Modify: `apps/anyhunt/server/CLAUDE.md`

**Step 1: 回写每个修复项的完成状态**

**Step 2: 跑受影响校验**

- `pnpm --filter @anyhunt/anyhunt-server test -- ...`
- `pnpm --filter @anyhunt/anyhunt-server exec eslint --no-warn-ignored ...`
- `pnpm --filter @anyhunt/anyhunt-server exec tsc --noEmit`

**Step 3: 如数据库连接可用，执行 reset + migrate 并记录结果**
