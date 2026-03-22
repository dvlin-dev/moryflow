---
title: Workspace Profile / Memory / Sync / Knowledge Indexing 验证基线
date: 2026-03-14
scope: apps/moryflow/server + apps/moryflow/pc + apps/anyhunt/server + scripts/reset-rewrite-state.mjs + scripts/reset-knowledge-index-domain.mjs + scripts/rebuild-knowledge-index-domain.mjs
status: active
---

<!--
[INPUT]: Workspace Profile reset rewrite 后的服务端/PC/Anyhunt 主链、reset runbook 与固定验证入口
[OUTPUT]: 当前唯一验证基线、执行顺序、分层职责与成功标准
[POS]: docs/reference 核心功能验证参考

[PROTOCOL]: 当验证范围、执行顺序、固定命令、成功标准或失败分流失真时更新本文件；不维护时间线式排查日志。
-->

# Workspace Profile / Memory / Sync / Knowledge Indexing 验证基线

## 目标

本文件定义 `Workspace Profile + Memory/Sync 解耦` 重写后的统一验证口径，覆盖：

1. `Workspace` / `Workspace Profile` 主链是否成立。
2. `Memory` 是否在未开启 `Cloud Sync` 时独立可用。
3. `Workspace Content -> Memox` 写链与搜索读链是否闭环。
4. `Cloud Sync` 是否作为可选 transport 正常工作。
5. `Knowledge Indexing` 的 reset / rebuild 是否有固定入口。
6. `reset rewrite` 的 dry-run / destructive cleanup 是否有固定入口。
7. 删除、rename、账号切换等运行时边界是否与新架构不变量一致。
8. `quiet skip` 是否被视为健康终态，而不是假 `Indexing` 或错误 `Needs attention`。

## 范围

### Server

- `workspace/`
- `workspace-content/`
- `memory/`
- `memox/`
- `sync/`

### PC

- `workspace-meta/`
- `workspace-profile/`
- `workspace-doc-registry/`
- `memory-indexing/`
- `cloud-sync/`
- `renderer/workspace/components/memory/`
- `renderer/components/settings-dialog/components/cloud-sync-section*`

### Ops / Scripts

- `scripts/reset-rewrite-state.mjs`
- `scripts/reset-knowledge-index-domain.mjs`
- `scripts/rebuild-knowledge-index-domain.mjs`
- `/Users/lin/code/moryflow/apps/moryflow/server/.env`
- `/Users/lin/code/moryflow/apps/anyhunt/server/.env`

## 固定执行顺序

验证必须按以下顺序执行：

1. Server / Anyhunt 主链单测与集成测试
2. PC 主进程与 renderer 关键测试
3. 文档 / runbook / reset 入口检查
4. release-window dry-run
5. destructive reset 后的部署交接检查

约束：

1. 不再先诊断“旧线上问题”；当前只验证新基线是否成立。
2. 不再验证任何历史兼容或迁移脚本。
3. 如果出现失败，优先判定是：
   - `Workspace/Profile` 解析失败
   - `Workspace Content` 写链失败
   - `Cloud Sync` transport 失败
   - `reset script` 配置失败

## 自动化验证分层

### A. Server / Anyhunt

必须覆盖：

1. `workspace resolve` 返回稳定 `workspaceId / memoryProjectId / syncVaultId?`
2. `memory` 全链只吃 `workspaceId`
3. `workspace-content batch-upsert` 正确写入：
   - `WorkspaceDocument`
   - `WorkspaceDocumentRevision`
   - `WorkspaceContentOutbox`
   - `title` 固定由 server 从 `path` 派生；客户端请求体不再携带 `title`
4. `workspace-content batch-delete` 正确写入：
   - `WorkspaceContentOutbox.DELETE`
   - 仅删除当前 `workspaceId` 下的目标文档
5. `workspace-content` 服务端必须拒绝：
   - 已存在但不属于当前 workspace 的 `documentId`
   - `sync_object_ref.vaultId !== workspace.syncVaultId` 的对象引用
6. `memox` 只消费 `WorkspaceContentOutbox`
7. source contract 固定为：
   - `source_type = moryflow_workspace_markdown_v1`
   - `project_id = workspaceId`
   - `external_id = documentId`
8. `WorkspaceContentOutbox` 处理结果必须 durable 落为：
   - `INDEXED`
   - `QUIET_SKIPPED`
   - `DELETED`
9. reconcile 必须把 `QUIET_SKIPPED` 当成健康终态，不得再补 enqueue。
10. Anyhunt ingest read model 只允许输出：

- `READY`
- `INDEXING`
- `NEEDS_ATTENTION`

11. 内部观测/补偿入口固定为：

- `GET /internal/metrics/memox`
- `POST /internal/sync/memox/workspace-content/replay`
- `POST /internal/sync/memox/workspace-content/rebuild`

12. HTTP 级内部控制面固定覆盖：

- internal token 鉴权
- replay DTO 默认值 materialize
- internal route 不挂在 `/api` prefix 下

优先入口：

- `apps/moryflow/server/src/workspace/**/*.spec.ts`
- `apps/moryflow/server/src/workspace-content/**/*.spec.ts`
- `apps/moryflow/server/src/memory/**/*.spec.ts`
- `apps/moryflow/server/src/memox/**/*.spec.ts`
- `apps/moryflow/server/test/memox-internal-metrics.e2e-spec.ts`
- `apps/moryflow/server/test/memox-workspace-content-replay.e2e-spec.ts`

### B. PC Main / Renderer

必须覆盖：

1. `Workspace Profile` 解析与切换
2. `Memory` IPC 不再要求 sync binding
3. `Memory Indexing Engine` 在无 Sync / 有 Sync 两种模式下都能工作
4. `Sync Engine` 以 `profileKey` 隔离 journal / mirror / recovery
5. `Memory Indexing Engine` 必须覆盖：
   - `unlink` 走正式 delete/tombstone
   - rename / move 即使正文 hash 不变，也必须刷新 `path/title`
   - 账号身份切换后，旧 debounce / retry 任务必须失效
6. Renderer：
   - Memory 页面显示 `Workspace profile / Memory status / Sync status`
   - Settings 页面明确 `Memory works without Sync`
   - chat session 以 `vaultPath + profileKey` 隔离
7. Knowledge card / panel 只允许展示：
   - `Scanning`
   - `Needs attention`
   - `Indexing`
   - `Ready`
8. renderer 不得暴露手动 `Retry / Retry all / Rebuild` 控件。

优先入口：

- `apps/moryflow/pc/src/main/app/ipc/memory.test.ts`
- `apps/moryflow/pc/src/main/memory-indexing/__tests__/engine.spec.ts`
- `apps/moryflow/pc/src/main/cloud-sync/__tests__/recovery-coordinator.spec.ts`
- `apps/moryflow/pc/src/main/cloud-sync/sync-engine/__tests__/index.spec.ts`
- `apps/moryflow/pc/src/main/chat-session-store/handle.test.ts`
- `apps/moryflow/pc/src/renderer/workspace/components/memory/*.test.tsx`
- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section-model.test.ts`

### C. Reset / Runbook

必须覆盖：

1. `pnpm reset:knowledge-index:plan`
2. `pnpm rebuild:knowledge-index:plan`
3. `pnpm reset:rewrite:plan`
4. `pnpm harness:check`
5. 知识索引 release-window 序列固定为：
   - 部署新代码与 schema
   - `pnpm reset:knowledge-index:execute`
   - `pnpm rebuild:knowledge-index:execute`
   - 观察 replay 直到 `pendingCount = 0 && deadLetteredCount = 0`
   - 再做 UI / search / graph 验收

目的：

1. 确认 knowledge index reset 只清理 Anyhunt vector 派生表与对应 R2 对象。
2. 确认 rebuild 固定回到 canonical `WorkspaceDocument -> WorkspaceContentOutbox` 写链。
3. 确认 env 路径被正确解析。
4. 确认 plan/execute 入口稳定存在。
5. 确认文档索引与 runbook 没有悬空引用。

### D. Reset Rewrite / Baseline Cleanup

必须覆盖：

1. `pnpm reset:rewrite:plan`
2. `pnpm reset:rewrite:execute -- --skip-databases --skip-redis --skip-r2`
3. 生产验收入口只允许使用新 source contract：
   - `moryflow_workspace_markdown_v1`
   - `workspaceId + documentId`

目的：

1. 确认 env 路径被正确解析
2. 确认 plan/execute 入口稳定存在

## 固定命令

### PC

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/chat-session-store/handle.test.ts \
  src/main/app/ipc/memory.test.ts \
  src/main/memory-indexing/__tests__/engine.spec.ts \
  src/main/cloud-sync/__tests__/recovery-coordinator.spec.ts \
  src/main/cloud-sync/sync-engine/__tests__/index.spec.ts \
  src/renderer/workspace/components/memory/index.test.tsx \
  src/renderer/workspace/components/memory/use-memory.test.tsx \
  src/renderer/components/settings-dialog/components/cloud-sync-section-model.test.ts

pnpm --filter @moryflow/pc exec tsc -p tsconfig.json --noEmit --pretty false
```

### 文档 / Reset

```bash
pnpm reset:knowledge-index:plan
pnpm rebuild:knowledge-index:plan
pnpm reset:rewrite:plan
pnpm harness:check
```

### Internal Diagnostics

```bash
curl -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  https://server.moryflow.com/internal/metrics/memox

curl -X POST \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  https://server.moryflow.com/internal/sync/memox/workspace-content/replay \
  -d '{"redriveDeadLetterLimit":100,"batchSize":20,"maxBatches":10,"leaseMs":60000}'

curl -X POST \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  https://server.moryflow.com/internal/sync/memox/workspace-content/rebuild \
  -d '{}'
```

### Compensation Drill

执行顺序固定为：

1. 先调 `GET /internal/metrics/memox` 记录基线。
2. 仅当 `outbox.pendingCount > 0` 或 `outbox.deadLetteredCount > 0` 时，才调 `POST /internal/sync/memox/workspace-content/replay`。
3. replay 成功一轮的最低标准是：
   - `failedIds = []`
   - `deadLetteredIds = []`
   - 若返回 `drained = true`，随后再次查询 metrics 时 `pendingCount = 0` 且 `deadLetteredCount = 0`
4. 若 replay 后 `pendingCount` 或 `deadLetteredCount` 不下降，或 replay 响应出现 `failedIds / deadLetteredIds`，应立即停在排障态，不继续盲目 redrive。
5. `projection.identityLookupMisses` 是诊断信号，不是单独的失败判据；只有在非 delete 工作负载下持续增长，才视为异常。

### Knowledge Index Release Window

执行顺序固定为：

1. 部署包含新索引状态模型和 canonical write chain 的代码。
2. 执行 `pnpm reset:knowledge-index:execute`，仅清理 Anyhunt vector 派生表与其对应 R2 对象。
3. 执行 `pnpm rebuild:knowledge-index:execute`，从当前 `WorkspaceDocument` 全量重建知识索引。
4. 重复 replay 直到脚本返回完成，或 `GET /internal/metrics/memox` 观察到 `pendingCount = 0 && deadLetteredCount = 0`。
5. 再验收：
   - Memory page 不再长期停在 `Indexing`
   - `Needs attention` 只反映真实不可索引/失败文件
   - 搜索可命中新路径/新标题
   - graph / source-derived memory 开始重新收敛

约束：

1. release-window 不允许直接手写 SQL 处理 outbox。

## 产品级 Smoke Test

release-window 在 destructive reset + rebuild 之后，必须额外完成一次真实 workspace smoke：

1. canonical 内容读取必须按 revision mode 区分：
   - `INLINE_TEXT` 直接读取 `WorkspaceDocumentRevision.contentText`
   - `SYNC_OBJECT_REF` 必须按 `vaultId + fileId + storageRevision` 读取对象快照，不能只看 `contentText`
2. canonical 内容再统一走 `classifyIndexableText()` 判定是否可索引。
3. smoke 最低成功标准是：
   - `indexable current documents == active KnowledgeSource`
   - quiet skip 文档不产生 active source
   - `missingIndexedDocumentCount = 0`
   - `unexpectedSourceCount = 0`
4. UI 验收最低成功标准是：
   - Memory 页面不再长期停在 `Indexing`
   - quiet skip 文件不显示 `Needs attention`
   - 真实失败文件才进入 `Needs attention`
5. release-window 不允许只调用 `rebuild` 而不先 reset；否则旧派生状态可能污染验收。
6. `rebuild` 默认重扫全量 canonical documents；只有显式传 `--workspace-id` 或 `--limit` 时才允许缩小范围。

## 成功标准

### Workspace / Memory

1. 登录后即可为当前工作区 resolve `workspaceId`
2. 未开启 Sync 时，`Memory overview / search / facts / graph / export` 仍可用
3. `Memory` API 与 Anyhunt source identity 全部以 `workspaceId` 为 scope
4. 账号身份切换后，旧 `Memory Indexing` 任务不会继续写入旧 workspace

### Workspace Content / Memox

1. `Document Registry` 能稳定分配 `documentId`
2. `Workspace Content` upsert 后能产生 `WorkspaceContentOutbox`
3. Memox consumer 能把文档投影成 `moryflow_workspace_markdown_v1`
4. 删除文档后，对应 source 可被删除或按 no-op 成功处理
5. rename / move 后，即使正文 hash 不变，搜索命中与 source display path 也必须刷新为新路径
6. `GET /internal/metrics/memox` 能正确暴露 `pendingCount / deadLetteredCount / identityLookupMisses`
7. 发生 replay backlog 或 DLQ 时，只允许通过 `POST /internal/sync/memox/workspace-content/replay` 做 redrive / replay
8. HTTP 级 replay 控制面必须支持最小请求体，并正确落到默认 `batchSize / maxBatches / leaseMs`

### Cloud Sync

1. Sync 只在当前 `Workspace Profile` 下运行
2. 切账号后不会复用旧账号 journal / recovery 状态
3. `cleanup-orphans 403` 不再作为跨账号状态串用的可复现路径

### Reset / Handoff

1. `pnpm reset:knowledge-index:plan` / `pnpm rebuild:knowledge-index:plan` 能打印目标 env、base URL、vector database、R2 bucket 和执行 payload。
2. `pnpm reset:knowledge-index:execute` 只删除 knowledge/memory/graph/vector 派生数据，不触碰 `Workspace*` 及其他主业务数据。
3. `pnpm rebuild:knowledge-index:execute` 固定通过 `POST /internal/sync/memox/workspace-content/rebuild` + `replay` 走 canonical 文档链，不允许旁路 Anyhunt 直接改 revision。
4. knowledge index rebuild 完成后，`GET /internal/metrics/memox` 必须回到 `pendingCount = 0 && deadLetteredCount = 0`。
5. `pnpm reset:rewrite:plan` 能打印三套数据库、Redis、R2 目标与 migrate handoff。
6. `pnpm reset:rewrite:execute` 具备真实 destructive cleanup 能力。
7. 部署阶段的 schema 入口只允许执行文档中冻结的 `prisma migrate deploy`。
8. 若目标环境存在历史 Memox 数据，部署后还必须执行 feature runbook 里的 `sources/reindex-all` 与 `graph/rebuild`；不能把这两步误认为 migration 会自动完成。

## 失败分流

1. `workspace resolve` 失败：
   - 先查 `workspace/` 与 `workspace-profile/`
2. `Memory` 在未开 Sync 时不可用：
   - 先查 `app/ipc/memory-handlers` 是否仍要求 binding
3. source-derived memory 不落库：
   - 先查 `workspace-content`、`memox-workspace-content-consumer` 与 `GET /internal/metrics/memox`
4. 切账号后 Sync 异常：
   - 先查 `profileKey`、`apply-journal`、`sync-mirror-state`
5. reset script 失败：
   - 先查 env 路径、数据库 URL、Redis URL、R2 bucket 名称
6. 删除后 Memory 结果残留或 rename 路径未刷新：
   - 先查 `memory-indexing`、`workspace-content batch-delete`、`memox-workspace-content-projection`
7. 出现 backlog 或 DLQ：
   - 先查 `GET /internal/metrics/memox`，再走 `POST /internal/sync/memox/workspace-content/replay`
8. replay 一直不收敛：
   - 停止继续 redrive，先看 replay 响应里的 `failedIds / deadLetteredIds`，再查 `memox-workspace-content-consumer` 与 `WorkspaceContentOutbox`
