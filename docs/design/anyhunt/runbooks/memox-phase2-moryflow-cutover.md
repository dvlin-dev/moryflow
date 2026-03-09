---
title: Memox 二期切换 Runbook（Moryflow 接入）
date: 2026-03-07
scope: apps/anyhunt/server, apps/moryflow/server, apps/moryflow/pc
status: active
---

# Memox 二期切换 Runbook

本 runbook 是 Moryflow 二期切到 Anyhunt Memox 的唯一切换事实源。

上位架构事实源：`docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`

本文只负责 `backfill / replay / 搜索投影验证 / cutover / 故障处理 / 最终下线`；不负责重新定义 API Key、source identity、搜索 DTO 或 Moryflow gateway 架构合同。

## 0. 定位与执行入口

仓库内已落地的执行入口（2026-03-08）：

- `apps/moryflow/server/src/memox/memox-cutover.service.ts`
  - `backfillBatch({ batchSize, reset? })`
  - `replayOutbox({ batchSize, maxBatches, leaseMs, consumerId? })`
  - `verifySearchProjection({ userId, topK, queries })`
- backfill checkpoint 固定持久化到 Redis key `memox:phase2:backfill-state`
- 历史回填固定复用 `MemoxOutboxConsumerService.upsertFile()`，不允许另起私有 backfill 写链

Moryflow 文件搜索与写链现在固定只走 Anyhunt Memox。仓库内不再保留第二套搜索后端、旧基线 compare 或专用回滚配置。

## 1. 前置条件

- 一期 `S1 ~ S5` 已完成并通过平台侧验收。
- 二期冻结合同已生效：服务 API Key、scope/source identity 映射、平台稳定文件身份返回、gateway -> PC 最小搜索合同、graph 关闭策略。
- 执行真实 staging cutover 前，Moryflow `memox` gateway、outbox consumer、source-first search adapter 必须已在目标环境打通。
- 切流前必须已提供 `PUT /api/v1/source-identities/:sourceType/:externalId`。
- 切流前平台的 `/api/v1/sources/search` 与 `/api/v1/retrieval/search` source 结果必须已返回 `project_id`、`external_id` 与 `display_path`。

## 2. 固定 idempotency 规则

- live replay 固定以 outbox event id 作为幂等根：同一事件触发的 source identity upsert、revision create、finalize、delete 必须复用同一 event-root idempotency family。
- backfill 固定以 `fileId + storageRevision + eventType` 作为幂等根：`upsert` 与 `finalize` 使用当前 revision 代际，`delete` 使用 `fileId + deleted`。

要求：

- 回放、重试、断点续跑与 rehearsal 不允许改写幂等根规则。
- 幂等键不引入额外业务摘要字段；禁止自定义 `vectorClockDigest` 一类未冻结算法。

## 3. 不可变正文读取合同

1. bridge 只允许按 `userId + vaultId + fileId + storageRevision` 读取对象快照。
2. 读取后必须校验 `contentHash`；只有 `storageRevision` 与 `contentHash` 同时匹配，才允许创建 revision 并 finalize。
3. 禁止按 `path` 或“最新对象”读取；禁止在 hash 不匹配时继续 finalize。

## 4. Backfill

数据源固定为 `sync` 真相源，而不是旧 `vectorizedFile`：

1. 扫描 `SyncFile` 当前活跃集合：`isDeleted = false`。
2. 对每个活跃文件，按冻结合同映射 source identity：`user_id / project_id / external_id / display_path / metadata`。
3. 固定先调用 `PUT /api/v1/source-identities/:sourceType/:externalId` resolve / upsert source identity，再获得稳定 `source_id`。
4. 若当前 `storageRevision` 或 `contentHash` 与 Memox 当前 revision 不一致，创建 revision 并 finalize。
5. 若 Memox 当前 revision 已与 `storageRevision + contentHash` 对齐，只允许刷新 source identity，不重复 finalize。
6. 每个批次持久化 checkpoint；失败批次只允许从 checkpoint 重跑，不允许全量手工重扫。

当前仓库事实（2026-03-08）：

- checkpoint 载荷固定记录 `processedCount / cursor(fileId, updatedAt) / status`
- backfill event id 固定为 `memox-backfill:${fileId}:${storageRevision}:upsert`

## 5. Replay

1. backfill 启动后，立即开启 outbox consumer。
2. consumer 只消费 `file lifecycle outbox` 的 claim / ack 协议，不允许绕过 outbox 直接读 PC 临时状态。
3. `file_upserted` 先做 source identity upsert；只有当 `storageRevision` 或 `contentHash` 漂移时才继续 revision create / finalize；若仅 path/title 变化则只刷新 identity。
4. consumer 必须先回查 `SyncFile` 真相源；若事件代际/路径已落后于当前文件状态，按幂等 no-op 成功处理，不允许把旧事件重试写回 Memox。
5. `file_deleted` 负责 source delete；若 source 尚不存在，按幂等 no-op 成功处理。
6. 只有当 Memox 侧 mutation 成功完成后，才允许 ack outbox 事件。
7. 失败事件不得 ack；retryable failure 固定回写 outbox-native backoff，poison 或达到最终尝试次数的事件固定进入 DLQ。
8. backfill 完成条件不是“扫描结束”，而是“扫描结束且 replay backlog 清零”。

当前仓库事实（2026-03-08）：

- `file_upserted` 固定走两段式 identity：
  1. `source-identity`：只写稳定 identity metadata（`source_origin`）
  2. `source-identity-materialize`：仅在 finalize 成功后，把 `content_hash / storage_revision` 物化回 source metadata
- 若 Memox 当前 `current_revision_id + metadata(content_hash/storage_revision)` 已与文件代际一致，则跳过 Memox 侧 revision create/finalize。
- stale `file_upserted / file_deleted` 固定在 consumer 内按 `SyncFile` 当前真相源判定并 no-op，不允许旧事件把 Memox source 回退到历史状态。
- outbox 行固定持久化 `attemptCount / lastAttemptAt / lastErrorCode / lastErrorMessage / deadLetteredAt`
- `failClaimedEvent()` 若失败状态持久化失败，batch 必须向上抛错交给 Bull retry；只有失败状态真正落库后，才允许把本轮事件视为“已处理完成”
- replay 聚合结果固定输出 `claimed / acknowledged / failedIds / deadLetteredIds / drained`；其中 `drained=true` 的前提是 `FileLifecycleOutbox.processedAt IS NULL` 已清零，且不存在 DLQ backlog
- `MemoxGatewayError` 的 retry classifier 固定收紧为：仅网络错误 / timeout / `408` / `429` / `5xx` 可重试；确定性 `4xx` 直接进 DLQ
- `MemoxRuntimeConfigService` 在模块启动期固定 fail-fast 校验 `ANYHUNT_API_BASE_URL / ANYHUNT_API_KEY / ANYHUNT_REQUEST_TIMEOUT_MS`，不再接受第二套搜索后端配置

## 6. Graph 策略

- Moryflow Phase 2 固定 `include_graph_context = false`。
- Moryflow Phase 2 固定不启用 source / memory graph projection。
- graph 不是本次 cutover 的验收前置；只有在 graph 隔离不再依赖单服务 `apiKeyId` 时才允许重新评估。

## 7. 搜索投影验证

搜索投影验证固定按“用户感知是否一致”判定，不按 score 完全一致判定。

golden query 集至少覆盖：

1. 新建文件
2. 更新正文
3. rename
4. delete
5. 同标题不同路径
6. 同用户不同 vault
7. 全局搜索下的跨 vault 结果展示

staging 通过阈值固定为：

- golden query 的预期 `fileId` 命中率 `100%`（Top 5 内）
- 删除泄漏数 `0`
- `project_id + external_id -> display_path` 错配数 `0`
- 新提交最终可检索 `p95 <= 15s`
- 删除后不可检索 `p95 <= 15s`
- rename 路径生效 `p95 <= 15s`

未达到以上阈值，不允许切流。

当前仓库事实（2026-03-08）：

- `verifySearchProjection()` 报告固定输出 `expectedHitRate / deletedLeakCount / pathMismatchCount`
- 验证基线固定为 `MemoxSearchAdapterService.searchFiles() -> SyncFile 活跃集校验`

## 8. Cutover

1. 先执行 backfill 与 replay，直到 backlog 清零。
2. 对 staging golden queries 执行 `verifySearchProjection()` 与端到端搜索验证；达标后，把 Moryflow Server 的搜索读路径保持为 Anyhunt Memox 正式路径。
3. 切流后进入 stabilization window；`POST /api/v1/search` 默认并且固定保持 Memox gateway。
4. stabilization window 内持续观测：搜索命中、删除泄漏、rename 路径生效、outbox lag、Memox API 错误率。

## 9. 故障处理

出现以下任一情况，必须停止继续推进：

- 删除泄漏 > `0`
- `project_id + external_id -> display_path` 错配 > `0`
- golden query 命中率低于 `100%`
- 新提交/删除/rename 的 `p95` 超过 `15s`

处理动作固定为：

1. 立即停止继续推进 cutover；若故障根因位于 `source identity / storageRevision / contentHash` 写入合同，必须暂停 outbox ack（或停 consumer 保留 backlog），禁止在错误合同下继续写入 Memox。
2. 写侧必须暂停 ack、修复合同，必要时按当前环境 scope 定向清理或直接重置 Memox 数据集，再重新执行 backfill + replay。
3. 修复后重新执行搜索投影验证，再次进入 cutover。
4. 整个恢复过程不删除 outbox 事实源；Moryflow `sync` 仍是唯一文件生命周期真相源。

## 10. 最终下线

只有在 stabilization window 结束且 staging / dogfooding 均稳定后，才允许执行：

1. 删除旧 `vectorize` 读写链路；`POST /api/v1/search` 仅保留为 Memox-backed gateway
2. 删除 `VectorizedFile` 与 `vectorizedCount` 相关合同
3. 删除 PC / shared / admin / quota 中旧 `vectorized*` 类型与接口
4. 更新官网文案、运维手册与部署说明

当前仓库事实（2026-03-08）：

- `apps/moryflow/server/src/vectorize/*` 已删除，旧 worker / controller / reconcile 不再存在
- Prisma schema 与迁移已删除 `VectorizedFile`、`UserStorageUsage.vectorizedCount`
- Admin / Quota / PC / shared / packages 已删除旧 `vectorized*` 合同
- Moryflow 搜索与写链现在只保留 Anyhunt Memox 单一路径

## 11. 本地可控环境验证事实（2026-03-08）

当前唯一已完成的实测证据来自本地可控环境。固定执行入口为：

- `pnpm --filter @moryflow/server run rehearsal:memox-phase2`
- `pnpm --filter @anyhunt/anyhunt-server run memox:phase2:openapi-load-check`

本地执行前提固定为：

- Moryflow rehearsal 固定提供 `ANYHUNT_API_KEY`；可选覆盖 `MORYFLOW_BASE_URL`、`ANYHUNT_BASE_URL`、`ANYHUNT_REHEARSAL_USER_EMAIL`
- Anyhunt gate 至少提供 `ANYHUNT_API_KEY`；本地复跑固定额外提供 `EMBEDDING_OPENAI_BASE_URL=http://127.0.0.1:3998/v1`
- Anyhunt gate 可选覆盖 `ANYHUNT_BASE_URL`、`ANYHUNT_OPENAPI_URL`、`ANYHUNT_PHASE2_LOAD_USER_ID`、`ANYHUNT_PHASE2_LOAD_PROJECT_ID`、`ANYHUNT_PHASE2_SOURCE_CASES`、`ANYHUNT_PHASE2_SOURCE_CONCURRENCY`、`ANYHUNT_PHASE2_EXPORT_CASES`

实测冻结事实：

1. full-stack cutover rehearsal 已通过：首轮 sync 产生 3 个 `upload`；backfill 按全局 `SyncFile(isDeleted=false)` 扫描 12 个活跃文件并在 2 个 batch 完成；初始与 mutation 后 `verifySearchProjection()` 都达到 `expectedHitRate=1 / deletedLeakCount=0 / pathMismatchCount=0`。
2. mutation 回放已通过：第二轮 sync 只产生 `beta rename + gamma delete + delta add` 3 个动作；`replayOutbox()` 返回 `claimed=3 / acknowledged=3 / failedIds=[] / deadLetteredIds=[]`。报告中的 `drained=false` 代表全局 backlog 指示位未清零，不代表当前 vault 演练失败。当前运行时代码也已把 drain 吞吐固定为“每 5 秒调度一次、单个 job 最多连续处理 10 个 batch \* 20 条事件”。
3. delete bridge 现固定重复提交 frozen scope：`file_deleted` 通过 `user_id + project_id + external_id` resolve source identity，不再因为空 scope 命中 `SOURCE_IDENTITY_SCOPE_MISMATCH` 并进入 DLQ。
4. 用户可见结果已对齐：Memox 模式下 `delta` 命中 `archive/delta.md`，`beta` 命中 `projects/beta-renamed.md`，`gamma` 返回空；`apps/moryflow/server/scripts/memox-phase2-local-rehearsal.ts` 现对 Moryflow `POST /api/v1/search` 与 Anyhunt `POST /api/v1/sources/search` 显式卡 `200`，当前 vault 下 6 条 outbox 事件均 `processedAt != null` 且无 `deadLetteredAt`。
5. Anyhunt Step 7 contract/load gate 也已复跑通过：`pnpm --filter @anyhunt/anyhunt-server run memox:phase2:openapi-load-check` 固定检查 required/forbidden paths、required operations、documented success status、documented response schema，并在运行时精确校验 `PUT /source-identities/*=200`、`POST /sources/:sourceId/revisions=200`、`POST /source-revisions/:revisionId/finalize=200`、`POST /sources/search=200`、`POST /retrieval/search=200`、`POST /exports=200`、`POST /exports/get=200` 的冻结 payload（含 `exports.create -> { memory_export_id }`）；本地复跑固定让 Anyhunt `EMBEDDING_OPENAI_BASE_URL=http://127.0.0.1:3998/v1` 指向 mock OpenAI，结果为 `source` 6 case / `export` 3 case 全成功，p95 `identity=72.09ms / revision=537.55ms / finalize=357.04ms / sourcesSearch=72.16ms / retrievalSearch=33.62ms / exportCreate=8.41ms / exportReady=321.25ms`。

## 12. 外部未完成 gate（2026-03-07）

- 真实 staging cutover rehearsal 与 Moryflow Server staging dogfooding 尚未完成。
- 阻塞原因不是 runbook 主链路代码，而是外部环境：`https://server.anyhunt.app` 在 2026-03-07 实测不可达/返回 `502`。
- 因此当前只具备本地可控环境的实测证据，不具备真实 staging 证据。
