---
title: Memox Phase 2 深度 Code Review Runbook
date: 2026-03-08
scope: apps/anyhunt/server, apps/moryflow/server, apps/moryflow/pc, apps/moryflow/admin, packages/api, docs/design/anyhunt
status: active
---

<!--
[INPUT]: Memox Phase 2 大规模跨系统改动、PR #155、主架构事实源与切流 runbook
[OUTPUT]: 合并前深度 code review 的长期事实源，固定 review 分块、覆盖范围、真实 findings 与最终可合并判定
[POS]: Anyhunt Runbooks / Memox Phase 2 深度 review 唯一事实源

[PROTOCOL]: 本文件变更需同步更新 `docs/design/anyhunt/runbooks/index.md`、`docs/index.md` 与 `docs/CLAUDE.md`；若 findings 导致实现或主事实源变化，必须同步回写对应设计文档与模块 CLAUDE.md。
-->

# Memox Phase 2 深度 Code Review Runbook

上位事实源：

- `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
- `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`

本文是 Memox Phase 2 在合并前进行全量深度 code review 的唯一事实源。它不替代主架构文档或切流 runbook，而是固定回答 3 个问题：

1. 本次改动按什么模块边界与链路边界分块 review。
2. 每个 block 实际看了哪些文件、哪些相关非 diff 文件、得出了什么 findings。
3. 整个需求在最佳实践、模块化、单一职责、根因治理四个标准下，是否达到可合并状态。

## 0. Review 原则

### 0.1 固定评判标准

- 最佳实践优先，不为历史兼容牺牲边界清晰度。
- 单一职责优先，重复职责、双重语义、隐式回退都视为风险。
- review 不做 diff-only 判定；必须沿调用链、数据链、事件链、测试链与文档链补读相关背景文件。
- 外部评论、既有结论与已有测试都不是直接真相源；必须重新核对当前代码与当前文档是否仍一致。

### 0.2 Findings 记录规则

- 只记录真实成立的问题、残余风险或明确的“不成立”反证结论。
- 每条 finding 固定记录：
  - 严重级别：`P0 / P1 / P2 / P3`
  - 根因
  - 影响链路
  - 文件定位
  - 建议动作
  - 状态：`open / fixed / rejected`
- 非功能性样式建议、与当前架构目标无关的偏好建议，不进入 findings。

### 0.3 本轮 review 范围

本轮 review 以 `origin/main...HEAD` 为准，覆盖本 PR 当前全部改动以及必要的相关非 diff 文件。重点不是“每个改动文件都过一遍格式”，而是确保以下事实链完整成立：

1. Anyhunt 写侧平台事实源成立。
2. Moryflow 写侧桥接、删除、幂等与 outbox 成立。
3. 检索与搜索读链不会引入双重语义或结果漂移。
4. PC/Admin/API 契约与服务端真实返回一致。
5. 旧 `vectorize` 栈下线后，没有隐藏运行时依赖残留。
6. 文档与代码、测试与代码、migration 与代码三者一致。

## 1. 分块策略与推进顺序

本轮固定采用“按相关链路块推进，最后整体回看”的 review 策略，而不是按目录机械切分。

### Block A：Anyhunt 写侧主链

范围：

- `apps/anyhunt/server/src/sources/*`
- `apps/anyhunt/server/src/memory/*`
- `apps/anyhunt/server/src/memox-platform/*`
- `apps/anyhunt/server/src/api-key/*`
- `apps/anyhunt/server/src/redis/*`
- `apps/anyhunt/server/src/common/utils/openapi-schema.ts`
- `apps/anyhunt/server/.env.example`
- `apps/anyhunt/server/package.json`
- `apps/anyhunt/server/scripts/memox-phase2-openapi-load-check*.ts`
- `apps/anyhunt/server/test/memox-phase2-openapi-load-check.utils.spec.ts`

原因：这一块负责平台写侧的 source identity、revision、finalize、delete、tenant teardown、API key cleanup 与 OpenAPI/load gate，是整条桥接链的上游真相源。

### Block B：Moryflow 写侧与桥接主链

范围：

- `apps/moryflow/server/src/sync/*`
- `apps/moryflow/server/src/vault/*`
- `apps/moryflow/server/src/memox/*`
- `apps/moryflow/server/src/quota/*`
- `apps/moryflow/server/src/app.module.ts`
- `apps/moryflow/server/prisma/schema.prisma`
- `apps/moryflow/server/prisma/migrations/*`

原因：这一块负责 `SyncFile` 真相源、`file lifecycle outbox`、Memox bridge、delete/replay/backfill/故障处理、quota 与运行时门禁，是 Moryflow 接入 Memox 的核心风险面。

### Block C：检索与搜索读链

范围：

- `apps/anyhunt/server/src/retrieval/*`
- `apps/moryflow/server/src/search/*`
- `apps/moryflow/server/src/memox/memox-search-adapter.service.ts`
- `apps/moryflow/server/src/memox/memox-workspace-content-control.service.ts`
- `packages/api/src/admin-storage/*`
- `packages/api/src/cloud-sync/types.ts`
- `packages/api/src/index.ts`

原因：这一块决定用户实际搜索结果、active file 过滤、Memox 单链路搜索契约与跨端 DTO 契约，是用户感知一致性的主链。

### Block D：客户端与管理面契约

范围：

- `apps/moryflow/pc/src/main/app/ipc/cloud-sync.ts`
- `apps/moryflow/pc/src/main/app/ipc/register-handlers.ts`
- `apps/moryflow/pc/src/main/cloud-sync/api/*`
- `apps/moryflow/pc/src/shared/ipc/cloud-sync.ts`
- `apps/moryflow/admin/src/features/storage/*`
- `apps/moryflow/admin/src/pages/DashboardPage.tsx`
- `apps/moryflow/admin/src/types/storage.ts`

原因：这一块负责 PC IPC 错误语义、cloud-sync 合同、admin storage 列表与统计展示，验证客户端和管理面是否与服务端冻结合同一致。

### Block E：基础设施、下线清理与文档一致性

范围：

- `apps/moryflow/server/src/vectorize/*`（删除面）
- `apps/moryflow/vectorize/*`（删除面）
- `.husky/pre-commit`
- `scripts/should-skip-precommit-typecheck.*`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
- `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`
- `docs/design/anyhunt/core/*.md`
- `docs/index.md`
- `docs/CLAUDE.md`
- 相关模块 `CLAUDE.md`

原因：这一块验证旧栈下线是否彻底、工具链改动是否合理、文档是否已经冻结为当前真实实现，而不是继续漂移。

### 固定推进顺序

1. Block A
2. Block B
3. Block C
4. Block D
5. Block E
6. Whole-system final pass

原因：先确认写侧真相源、删除、幂等与 outbox 合同，再审读链和客户端契约，最后审基础设施和文档冻结状态，能避免后续判断建立在错误前提上。

## 2. 汇总面板

### 2.1 Block 状态

| Block | 主题                           | 状态      |
| ----- | ------------------------------ | --------- |
| A     | Anyhunt 写侧主链               | completed |
| B     | Moryflow 写侧与桥接主链        | completed |
| C     | 检索与搜索读链                 | completed |
| D     | 客户端与管理面契约             | completed |
| E     | 基础设施、下线清理与文档一致性 | completed |
| Final | 整体回顾                       | completed |

### 2.2 Findings 总表

| ID   | Block | Severity | 状态  | 摘要                                                                                                                              |
| ---- | ----- | -------- | ----- | --------------------------------------------------------------------------------------------------------------------------------- |
| A-01 | A     | P1       | fixed | source delete 已收口为 `markDeleted + durable cleanup queue + recovery scan`，删除态 source 不再因瞬时入队失败长期悬挂            |
| A-02 | A     | P2       | fixed | `POST /sources` 的 preflight 冲突与并发 `P2002` 现在统一返回结构化 `409 KNOWLEDGE_SOURCE_ALREADY_EXISTS`                          |
| C-01 | C     | P1       | fixed | Moryflow 文件搜索请求已固定下推 `source_types=['note_markdown']`，文件热路径不会混入其他 source type                              |
| B-01 | B     | P1       | fixed | `vault teardown` 已改走 revision-aware `SyncStorageDeletionService`，不再删除旧 keyspace，R2 batch partial error 也会显式暴露失败 |
| B-02 | B     | P1       | fixed | outbox lease ownership 已从共享 `consumerId` 升级为每次 claim 独立 `leaseOwner`，旧 job 不能再误 ack / fail 新 lease              |
| B-03 | B     | P2       | fixed | `sync commit` 的 storage usage 已收口为“先确保零基线，再数据库原子增量”，消除了 read-modify-write 与首笔双计数风险                |
| B-04 | B     | P3       | fixed | `replayOutbox().drained` 现在统一按循环后 backlog 重新计算，不再依赖最后一批 `claimed===0`                                        |
| D-01 | D     | P3       | fixed | `listCloudVaultsIpc()` 已补失败分支回归，防止 silent fallback 回归                                                                |
| E-01 | E     | P1       | fixed | 官网文案已改成符合 local-first + opt-in cloud sync 的真实承诺                                                                     |
| E-02 | E     | P2       | fixed | `docs-only` pre-commit 规则现已纳入删除文件，且空 staged 列表不再被当成可跳过 `typecheck`                                         |
| E-03 | E     | P2       | fixed | 两份长期文档已回写当前 `memox/search-live-file-projector/outbox writer+lease` 事实，旧 `vectorize` 口径已删除                     |

## 3. Block A：Anyhunt 写侧主链

### 3.1 Scope

- `apps/anyhunt/server/src/sources/*`
- `apps/anyhunt/server/src/memory/*`
- `apps/anyhunt/server/src/memox-platform/*`
- `apps/anyhunt/server/src/api-key/*`
- `apps/anyhunt/server/src/redis/*`
- `apps/anyhunt/server/src/common/utils/openapi-schema.ts`
- `apps/anyhunt/server/.env.example`
- `apps/anyhunt/server/package.json`
- `apps/anyhunt/server/scripts/memox-phase2-openapi-load-check*.ts`
- `apps/anyhunt/server/test/memox-phase2-openapi-load-check.utils.spec.ts`

### 3.2 Related non-diff files reviewed

- `apps/anyhunt/server/src/idempotency/idempotency-executor.service.ts`
- `apps/anyhunt/server/src/api-key/api-key.service.ts`
- `apps/anyhunt/server/src/api-key/api-key-cleanup.service.ts`
- `apps/anyhunt/server/src/sources/source-cleanup.processor.ts`
- `apps/anyhunt/server/src/sources/source-revision-cleanup.service.ts`
- `apps/anyhunt/server/src/sources/source-storage.service.ts`
- `apps/anyhunt/server/src/storage/storage.client.ts`
- `apps/anyhunt/server/src/sources/__tests__/knowledge-source.repository.spec.ts`
- `apps/anyhunt/server/src/sources/__tests__/knowledge-source-deletion.service.spec.ts`
- `apps/anyhunt/server/src/memory/__tests__/memory-export.controller.spec.ts`
- `apps/anyhunt/server/src/memory/memory.service.ts`

### 3.3 Checklist

- source identity / revision / finalize / delete 合同是否闭环
- processing lease / idempotency / teardown 是否原子且可重放
- OpenAPI / load gate / runtime payload 是否仍同源
- API key cleanup / tenant teardown 是否越权或遗漏
- 测试是否覆盖关键状态机和错误语义

### 3.4 Findings

1. `A-01 / P1 / fixed`
   修复：`KnowledgeSourceDeletionService.requestDelete()` 仍保持“先标记 `DELETED` 再异步 cleanup”的对外语义，但新增 `SourceCleanupRecoveryService` 以 5 分钟批量扫描 `DELETED` source 并补投同一 `jobId` 的 cleanup queue。这样即使首次入队因为 Bull/Redis 瞬时故障失败，删除链路也会自动恢复到最终硬删除。

   回写文件：
   - `apps/anyhunt/server/src/sources/knowledge-source-deletion.service.ts`
   - `apps/anyhunt/server/src/sources/source-cleanup-recovery.service.ts`
   - `apps/anyhunt/server/src/sources/sources.module.ts`
   - `apps/anyhunt/server/src/sources/__tests__/knowledge-source-deletion.service.spec.ts`
   - `apps/anyhunt/server/src/sources/__tests__/source-cleanup-recovery.service.spec.ts`

2. `A-02 / P2 / fixed`
   修复：`KnowledgeSourceRepository.createSource()` 现在对 preflight 命中与数据库 `P2002` 两种路径统一返回结构化 `409 KNOWLEDGE_SOURCE_ALREADY_EXISTS`。这让公开 `POST /sources` 与 `source-identities` resolve/upsert 的并发冲突语义重新对齐，不再把唯一键 race 泄漏成 500 或纯文本冲突。

   回写文件：
   - `apps/anyhunt/server/src/sources/knowledge-source.repository.ts`
   - `apps/anyhunt/server/src/sources/__tests__/knowledge-source.repository.spec.ts`

### 3.5 Frozen conclusion

Block A 已收口为 ready。source delete 的 durability 缺口和公开 create path 的并发冲突语义都已修复；沿 `revision/finalize/reindex/lease`、`memory export`、`tenant teardown`、`openapi load-check` 的相关链路补读后，也没有发现新的 correctness blocker。

## 4. Block B：Moryflow 写侧与桥接主链

### 4.1 Scope

- `apps/moryflow/server/src/sync/*`
- `apps/moryflow/server/src/vault/*`
- `apps/moryflow/server/src/memox/*`
- `apps/moryflow/server/src/quota/*`
- `apps/moryflow/server/src/app.module.ts`
- `apps/moryflow/server/prisma/schema.prisma`
- `apps/moryflow/server/prisma/migrations/*`

### 4.2 Related non-diff files reviewed

- `apps/moryflow/server/src/storage/storage.client.ts`
- `apps/moryflow/server/src/storage/r2.service.ts`
- `apps/moryflow/server/src/storage/storage.controller.ts`
- `apps/anyhunt/server/src/sources/knowledge-source.repository.ts`
- `apps/anyhunt/server/src/sources/__tests__/knowledge-source.repository.spec.ts`
- `apps/moryflow/server/src/sync/file-lifecycle-outbox-lease.service.spec.ts`
- `apps/moryflow/server/src/memox/memox-outbox-consumer.service.spec.ts`
- `apps/moryflow/server/src/memox/memox-workspace-content-control.service.spec.ts`
- `apps/moryflow/server/src/vault/vault-deletion.service.spec.ts`
- `apps/moryflow/server/src/quota/quota.service.spec.ts`

### 4.3 Checklist

- `SyncFile -> outbox -> Memox bridge` 是否单向、无双写真相源
- `delete / replay / backfill / 故障处理` 是否幂等且不破坏当前真相源
- outbox claim / ack / DLQ / lease 是否成立
- quota / vault teardown / runtime config 是否与 bridge 合同一致
- migration 与 schema 是否支持当前实现且无旧栈残留依赖

### 4.4 Findings

1. `B-01 / P1 / fixed`
   修复：`VaultDeletionService` 已放弃旧 `storageClient.deleteFiles()` keyspace，统一改走 `SyncStorageDeletionService.deleteTargetsOnce(..., 'immediate')`，按 `SyncFile.storageRevision` 做 revision-aware 删除。与此同时，`R2Service.deleteFiles()` 也补上了 `DeleteObjectsCommand.Errors` 检查，batch partial error 会显式返回失败。

   回写文件：
   - `apps/moryflow/server/src/vault/vault-deletion.service.ts`
   - `apps/moryflow/server/src/vault/vault-deletion.service.spec.ts`
   - `apps/moryflow/server/src/vault/vault.module.ts`
   - `apps/moryflow/server/src/storage/r2.service.ts`

2. `B-02 / P1 / fixed`
   修复：`FileLifecycleOutboxLeaseService.claimPendingBatch()` 现在为每次 claim 生成独立 `leaseOwner = "${consumerId}:${randomUUID()}"`，并把 ack/fail 的 where 条件同步切到 `leasedBy=leaseOwner`。`SyncInternalOutboxController`、DTO 和 `MemoxOutboxConsumerService` 也都已跟随新合同切换。

   回写文件：
   - `apps/moryflow/server/src/sync/file-lifecycle-outbox-lease.service.ts`
   - `apps/moryflow/server/src/sync/file-lifecycle-outbox.types.ts`
   - `apps/moryflow/server/src/sync/dto/sync-internal.dto.ts`
   - `apps/moryflow/server/src/sync/sync-internal-outbox.controller.ts`
   - `apps/moryflow/server/src/memox/memox-outbox-consumer.service.ts`
   - `apps/moryflow/server/src/sync/file-lifecycle-outbox-lease.service.spec.ts`
   - `apps/moryflow/server/src/memox/memox-outbox-consumer.service.spec.ts`

3. `B-03 / P2 / fixed`
   修复：`SyncCommitService.updateStorageUsageIncremental()` 已从 read-modify-write 改成“先 `upsert` 零基线行，再执行数据库原子 `UPDATE ... SET storageUsed = GREATEST(storageUsed + delta, 0)`”。后续修复又进一步去掉了“创建行时预写正向 delta”的做法，避免新用户首笔 commit 被重复计数。

   回写文件：
   - `apps/moryflow/server/src/sync/sync-commit.service.ts`
   - `apps/moryflow/server/src/sync/sync.service.spec.ts`

4. `B-04 / P3 / fixed`
   修复：`MemoxWorkspaceContentControlService.replayOutbox()` 结束循环后统一重新计算 `processedAt IS NULL` backlog 与 DLQ backlog，再决定 `drained`。这样最后一批正好清空 pending backlog 时也不会再报假阴性。

   回写文件：
   - `apps/moryflow/server/src/memox/memox-workspace-content-control.service.ts`
   - `apps/moryflow/server/src/memox/memox-workspace-content-control.service.spec.ts`

### 4.5 Frozen conclusion

Block B 已收口为 ready。vault teardown、outbox lease ownership、storage usage 原子增量和 replay `drained` 判定都已经回到当前冻结合同，没有再发现新的 correctness blocker。

## 5. Block C：检索与搜索读链

### 5.1 Scope

- `apps/anyhunt/server/src/retrieval/*`
- `apps/moryflow/server/src/search/*`
- `apps/moryflow/server/src/memox/memox-search-adapter.service.ts`
- `apps/moryflow/server/src/memox/legacy-vector-search.client.ts`
- `packages/api/src/admin-storage/*`
- `packages/api/src/cloud-sync/types.ts`
- `packages/api/src/index.ts`

### 5.2 Related non-diff files reviewed

- `apps/moryflow/server/src/memox/memox-source-bridge.service.ts`
- `apps/moryflow/server/src/memox/dto/memox.dto.ts`
- `apps/moryflow/server/src/memox/memox.client.ts`
- `apps/moryflow/server/src/memox/CLAUDE.md`
- `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
- `apps/moryflow/server/src/memox/memox-search-adapter.service.spec.ts`
- `apps/moryflow/server/src/search/search-backend.service.spec.ts`
- `apps/moryflow/server/src/search/search-live-file-projector.service.spec.ts`
- `apps/anyhunt/server/src/retrieval/__tests__/retrieval.service.spec.ts`
- `apps/anyhunt/server/src/retrieval/__tests__/source-search.service.spec.ts`

### 5.3 Checklist

- Anyhunt retrieval 编排是否仍是单一检索语义事实源
- Moryflow search 是否只做 DTO/active file 适配，而非重建第二套平台语义
- Memox 单链路搜索边界是否清晰
- DTO / package types / controller 返回是否一致
- 测试是否覆盖排序、过滤、命中与 no-op 路径

### 5.4 Findings

1. `C-01 / P1 / fixed`
   修复：`MemoxSourceBridgeService.buildSourcesSearchRequest()` 已固定下推 `source_types: ['note_markdown']`，本地 `MemoxSourceSearchRequestSchema` 也恢复了该字段，相关 adapter 回归测试已覆盖。Moryflow 文件搜索因此重新锁定在 note file 结果域，不会再被平台其他 source type 污染。

   回写文件：
   - `apps/moryflow/server/src/memox/memox-source-bridge.service.ts`
   - `apps/moryflow/server/src/memox/dto/memox.dto.ts`
   - `apps/moryflow/server/src/memox/memox-source-bridge.service.spec.ts`
   - `apps/moryflow/server/src/memox/memox-search-adapter.service.spec.ts`

### 5.5 Frozen conclusion

Block C 已收口为 ready。Anyhunt retrieval 聚合、Moryflow `SearchService -> SearchBackendService -> SearchLiveFileProjectorService`、Memox 搜索 DTO 映射和共享 API 类型上的 review 结果现在与冻结的 `note_markdown` 文件搜索域保持一致。

## 6. Block D：客户端与管理面契约

### 6.1 Scope

- `apps/moryflow/pc/src/main/app/ipc/cloud-sync.ts`
- `apps/moryflow/pc/src/main/app/ipc/register-handlers.ts`
- `apps/moryflow/pc/src/main/cloud-sync/api/*`
- `apps/moryflow/pc/src/shared/ipc/cloud-sync.ts`
- `apps/moryflow/admin/src/features/storage/*`
- `apps/moryflow/admin/src/pages/DashboardPage.tsx`
- `apps/moryflow/admin/src/types/storage.ts`

### 6.2 Related non-diff files reviewed

- `packages/api/src/cloud-sync/types.ts`
- `packages/api/src/admin-storage/types.ts`
- `packages/api/src/admin-storage/index.ts`
- `packages/api/src/index.ts`
- `apps/moryflow/server/src/search/search.controller.ts`
- `apps/moryflow/server/src/search/dto/search.dto.ts`
- `apps/moryflow/server/src/search/search.service.ts`
- `apps/moryflow/server/src/search/search-backend.service.ts`
- `apps/moryflow/server/src/search/search-live-file-projector.service.ts`
- `apps/moryflow/server/src/admin-storage/admin-storage.controller.ts`
- `apps/moryflow/server/src/admin-storage/admin-storage.service.ts`
- `apps/moryflow/server/src/admin-storage/admin-storage.service.spec.ts`
- `apps/moryflow/server/src/quota/quota.service.ts`
- `apps/moryflow/server/src/quota/quota.service.spec.ts`
- `apps/moryflow/pc/src/preload/index.ts`
- `apps/moryflow/pc/src/renderer/hooks/use-cloud-sync.ts`
- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section.tsx`
- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section-ready.tsx`
- `apps/moryflow/pc/src/shared/ipc/index.ts`
- `apps/moryflow/pc/src/shared/ipc/desktop-api.ts`
- `apps/moryflow/admin/src/features/storage/const.ts`
- `apps/moryflow/admin/src/features/storage/components/vault-list-table.tsx`
- `apps/moryflow/admin/src/features/storage/components/vault-detail-dialog.tsx`
- `apps/moryflow/admin/src/pages/DashboardPage.storage.test.tsx`
- `apps/moryflow/admin/CLAUDE.md`
- `apps/moryflow/pc/CLAUDE.md`

### 6.3 Checklist

- IPC 错误码与主进程/服务端真实语义是否一致
- cloud-sync 类型与 packages/api 是否一致
- admin storage 展示、分页、排序、字段口径是否与服务端一致
- 测试是否覆盖 UI/IPC 契约回归

### 6.4 Findings

本轮未发现成立的 correctness / regression finding。

非阻塞测试缺口：

1. `D-01 / P3 / fixed`
   修复：`apps/moryflow/pc/src/main/app/ipc/cloud-sync.test.ts` 已补 `listCloudVaultsIpc()` 失败分支回归，固定当前“向上抛错，由 renderer `use-cloud-sync` 统一降级”的合同，避免回退成 silent fallback。

### 6.5 Frozen conclusion

Block D 维持 ready，并且测试缺口也已补齐。前后端类型漂移、IPC 错误语义回退、管理页统计字段残留 `vectorized*`、以及分页/排序契约错配都没有发现明确问题。

## 7. Block E：基础设施、下线清理与文档一致性

### 7.1 Scope

- `apps/moryflow/server/src/vectorize/*`（删除面）
- `apps/moryflow/vectorize/*`（删除面）
- `.husky/pre-commit`
- `scripts/should-skip-precommit-typecheck.*`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
- `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`
- `docs/design/anyhunt/core/*.md`
- `docs/index.md`
- `docs/CLAUDE.md`
- 相关模块 `CLAUDE.md`

### 7.2 Related non-diff files reviewed

- `apps/moryflow/www/src/components/landing/WhyLocalSection.tsx`
- `apps/moryflow/server/src/search/search-backend.service.ts`
- `apps/moryflow/server/src/memox/memox-runtime-config.service.ts`
- `docs/design/moryflow/core/cloud-sync-architecture.md`
- `docs/design/moryflow/runbooks/cloud-sync-operations.md`
- 全仓 `rg` 搜索：`VectorizedFile / vectorizedCount / vectorizeEnabled / search-result-filter / apps/moryflow/vectorize`

### 7.3 Checklist

- 旧 `vectorize` 栈是否已从运行时依赖上真正下线
- docs-only pre-commit 收口是否只跳过该跳过的校验
- workspace / lockfile / generated / migration 变动是否合理
- 主架构文档、cutover runbook、core docs、CLAUDE.md 是否与代码一致

### 7.4 Findings

1. `E-01 / P1 / fixed`
   修复：官网落地页 `WhyLocalSection.tsx` 已改成符合当前架构的 local-first + opt-in cloud sync 描述，不再向外承诺 “Never uploaded, never shared.” 这类与 Memox Phase 2 冻结事实冲突的文案。

2. `E-02 / P2 / fixed`
   修复：`scripts/should-skip-precommit-typecheck.mjs` 已把 staged files diff filter 扩到 `ACMRD`，并把空列表判定改成 `false`。这样只有纯 Markdown staged 变更才会跳过 `pnpm typecheck`，纯删除代码不再被误判成 docs-only。

3. `E-03 / P2 / fixed`
   修复：两份长期 Moryflow 文档都已回写到当前真实实现：旧 `VectorizeProjectionReconcileService`、`search-result-filter.service` 和 `sync on/off + vectorize on/off` 矩阵都已删除，文档口径改为 `Memox gateway + SearchLiveFileProjector + outbox writer/lease` 的现行架构。

### 7.5 Frozen conclusion

Block E 已收口为 ready。运行时旧 `vectorize` 栈没有发现新的隐藏 importer，开发 guardrail 与长期文档也都已经回写到当前冻结实现。此 block 剩余的环境级 gate 继续由主架构事实源和 cutover runbook 管理，而不是代码/文档漂移问题。

## 8. Whole-system Final Pass

### 8.1 需要回看的系统问题

- 是否还存在双重检索语义或双重写侧真相源
- 是否还存在旧 `vectorize` 栈的隐藏依赖或数据模型残留
- 是否还有 delete / replay / 故障处理 的边界缺口
- 文档、代码、测试、migrations 是否同源

### 8.2 Final findings

整轮 deep review 的系统性结论如下：

1. 代码级 correctness blocker 已全部关闭。
   - Anyhunt 写侧删除 durability（`A-01`）与公开 create path 并发冲突语义（`A-02`）都已修复。
   - Moryflow 写侧的 vault teardown、lease ownership、storage usage 原子增量与 replay 判定（`B-01 ~ B-04`）都已回到冻结合同。
   - 搜索热路径的 `note_markdown` 结果域隔离（`C-01`）已固定。

2. 客户端、官网与工具链补全了最后的 guardrail。
   - `D-01` 已补失败分支回归。
   - `E-01 ~ E-03` 已修完用户可见承诺、docs-only pre-commit 规则与长期文档漂移。

3. 本轮没有发现新的未收口系统性问题。
   - 写侧真相源、读链结果域、客户端契约、工具链 guardrail 和长期文档现在已经一致。
   - 旧 `vectorize` 栈运行时路径已彻底删除，没有发现隐藏运行时依赖复活。

### 8.3 Merge readiness

从 deep code review 角度看，当前 PR 的代码级阻塞已经清空，**不再因为本 runbook 中的 findings 阻塞合并**。

需要区分两类 gate：

- **本 runbook 负责的代码/契约/文档 gate**：已全部通过。
- **外部环境 gate**：`staging cutover rehearsal` 与 `Moryflow Server staging dogfooding` 仍按上位事实源管理，是否需要在合并前完成，取决于主架构文档和切流 runbook，而不是本次 deep review。

因此，本 runbook 的冻结结论是：

- Block A ~ E 全部 ready
- Whole-system final pass 未发现新的 code review blocker
- 当前 PR 已达到 “deep review completed / code-level ready” 状态
