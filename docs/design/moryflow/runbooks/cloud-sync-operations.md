---
title: 云同步运维与排障
date: 2026-03-07
scope: moryflow, cloud-sync, server, pc, mobile
status: active
---

<!--
[INPUT]: cloud-sync 当前实现、sync telemetry 指标、PC/Mobile apply journal 与恢复模型
[OUTPUT]: 云同步运行期观测入口、排障步骤、上线闸门与恢复手册
[POS]: Moryflow 云同步运维事实源

[PROTOCOL]: 本文件变更时同步更新 `docs/design/moryflow/runbooks/index.md`、`docs/index.md` 与 `docs/CLAUDE.md`。
-->

# 云同步运维与排障

## 1. 适用范围

1. 适用于 `Moryflow PC/Mobile 云同步` 的运行期观测、故障分级和恢复操作。
2. 本 runbook 只覆盖 `cloud sync` 主链路，不覆盖 Memox consumer 或第三方向量投影链路。
3. 文件真相源始终以服务端 `SyncFile` 为准；搜索与 projection 问题只能作为派生问题处理。

## 2. 观测入口

### 2.1 内部 metrics

1. 服务端内部观测端点：`GET /internal/metrics/sync`
2. outbox 内部控制面端点：
   - `POST /internal/sync/outbox/claim`
   - `POST /internal/sync/outbox/ack`
3. 这些端点固定为裸 internal 路由，不挂在 `/api` 前缀下。
4. 所有内部端点都必须携带 `Authorization: Bearer <INTERNAL_API_TOKEN>`。
5. 这些端点是内部排障入口，不应暴露给公网；应通过内网、反代白名单或运维侧采集。
6. 指标是进程内累积计数，服务重启后会归零；只有 `outbox.pendingCount` 来自数据库，重启后仍然可信。
7. `INTERNAL_API_TOKEN` 当前是静态配置，不支持运行时轮换。
8. 如果 token 泄露，必须按以下顺序处理：
   - 更新所有 server 实例的 `INTERNAL_API_TOKEN`
   - 重启所有 server 实例
   - 重启所有 projection consumer / worker 实例
9. 在支持多 token grace period 之前，不允许只重启部分实例。

### 2.2 指标字段

1. `diff`
   - `requests/failures`
   - `lastActionCount`
   - `actions.upload/download/delete/conflict`
   - `duration.lastMs/maxMs/avgDurationMs`
2. `commit`
   - `requests/failures/successes/conflicts`
   - `lastReceiptCount`
   - `duration.lastMs/maxMs/avgDurationMs`
3. `orphanCleanup`
   - `requests/failures/accepted`
   - `objectsRequested/deleted/retried/skipped`
   - `duration.lastMs/maxMs/avgDurationMs`
4. `outbox`
   - `pendingCount`

### 2.3 Outbox 消费协议

1. consumer 先调用 `POST /internal/sync/outbox/claim` 获取租约批次。
2. 处理完成后调用 `POST /internal/sync/outbox/ack` 提交 ack。
3. `leaseMs` 由 consumer 在 claim 请求里显式传入，当前允许范围是 `1..300000ms`。
4. 当前不支持 lease 续期；consumer 必须在租约到期前完成处理并 ack。
5. 如果 consumer 在租约过期前没有 ack，同一批事件会重新回到 claim 队列。
6. 这条控制面只服务 projection consumer，不参与 cloud-sync 主链路 publish。

### 2.4 Receipt Token Secret 部署约束

1. 所有 `moryflow-server` 实例都必须显式配置 `SYNC_ACTION_SECRET`；缺失时服务会在启动阶段直接失败。
2. `SYNC_ACTION_SECRET` 只用于 sync receipt token 签名，禁止回退到 `STORAGE_API_SECRET` 或与其复用。
3. 多实例部署时必须共享同一个 `SYNC_ACTION_SECRET`；否则 `sync/diff` 在实例 A 签发的 receipt token 会在实例 B `sync/commit` 时验签失败。
4. 如果需要轮换 `SYNC_ACTION_SECRET`，必须按整组实例一次性切换；旧 receipt token 的自然失效窗口受 `SYNC_ACTION_RECEIPT_TTL_SECONDS` 控制，默认最长 `900s`。

## 3. 客户端事实源

### 3.1 PC

1. apply journal：`<vault>/.moryflow/cloud-sync/apply-journal.json`
2. staging 目录：`<vault>/.moryflow/cloud-sync/staging/<journalId>/`
3. 关键状态：
   - `idle`
   - `syncing`
   - `offline`
   - `needs_recovery`

### 3.2 Mobile

1. apply journal：`<vault>/.moryflow/cloud-sync/apply-journal.json`
2. staging 目录：`<vault>/.moryflow/cloud-sync/staging/<journalId>/`
3. 关键状态：
   - `idle`
   - `syncing`
   - `offline`
   - `needs_recovery`

## 4. 故障分级

1. `P1`：数据一致性风险
   - 客户端停留在 `needs_recovery`
   - `commit.failures` 持续增长
   - `orphanCleanup.retried` 持续增长且不回落
2. `P2`：同步可用性下降
   - `diff.failures` 增长
   - `commit.conflicts` 激增
   - 单设备反复进入 `offline_error`
3. `P3`：派生链路积压
   - `outbox.pendingCount` 持续上升
   - projection 清理滞后

## 5. 标准排障流程

### 5.1 客户端先看 journal

1. 如果客户端状态是 `needs_recovery`，先检查 `apply-journal.json` 是否存在。
2. 读取 `phase`：
   - `committed`：表示服务端已 publish，客户端应优先 replay staged operations。
   - `executing/prepared`：表示本地尚未完成 publish，应先走 `cleanup-orphans` 清理未发布对象。
3. 检查 `stagedOperations` 与 staging 文件是否完整。

### 5.2 服务端再看 metrics

1. 先拉取 `GET /internal/metrics/sync`。
2. 判断主问题落点：
   - `diff.failures` 增长：优先排查客户端上报、path/fileId 或协议入参问题。
   - `commit.failures` 增长：优先排查对象合同验证、receipt 过期、storageRevision/contentHash 不匹配。
   - `orphanCleanup.retried` 增长：优先排查对象删除、revision 保护或 R2 删除失败。
   - `outbox.pendingCount` 增长：优先排查下游 consumer，而不是回改 sync 主链路。

### 5.3 最后看搜索/投影

1. 如果用户反馈“已删文件仍能搜到”，先确认 `SyncFile` 是否已 tombstone。
2. 只要 `SyncFile` 已删除，读路径会过滤结果；这类问题优先归类为 projection drift，而不是 sync 真相源错误。
3. 此时检查 `outbox.pendingCount` 与 projection reconcile job，而不是重新执行 commit。

## 6. 常见场景处理

### 6.1 客户端卡在 `needs_recovery`

1. 确认 journal 是否存在。
2. 若 `phase=committed`：
   - 保留 journal
   - 触发一次恢复流程
   - 期望 replay staged file ops 后 publish FileIndex
3. 若 `phase=executing/prepared`：
   - 调用 `POST /api/v1/sync/cleanup-orphans`
   - 期望 `accepted=true`
   - 成功后清理 journal/staging 并重新进入下一轮 sync

### 6.2 `outbox.pendingCount` 持续增长

1. 先确认 `commit.successes` 是否仍在增长。
2. 若 commit 正常且只有 `pendingCount` 积压，说明问题在下游消费，不在 cloud-sync 主链路。
3. 优先检查 consumer 是否按 `claim -> process -> ack` 正常推进。
4. 这类问题不阻断文件同步，但需要处理 projection backlog。

### 6.3 `commit.conflicts` 激增

1. 优先视为真实并发编辑，而不是协议损坏。
2. 检查是否集中在同一 vault / 同一文件。
3. conflict copy 已纳入 journal + staged group，目标是“生成冲突副本但不丢数据”，不是强行消灭 conflict 计数。

### 6.4 `orphanCleanup.retried` 增长

1. 先确认这些对象是否仍是当前 `SyncFile.storageRevision`。
2. 如果是当前 revision，被保护是正确行为，应计入 `skipped` 而不是强删。
3. 如果不是当前 revision 且仍持续 retry，排查对象删除链路与 R2 条件删除。
4. 当前 orphan cleanup 没有时间保护窗口；对象是否可删只由“当前 `SyncFile` 是否仍引用该 revision”决定。
5. 如果客户端长时间不恢复，orphan object 会持续保留并占用存储。

## 6.5 灾难恢复边界

1. 本 runbook 只定义 cloud-sync 主链路恢复，不单独承诺 PostgreSQL 或 R2 的基础设施备份实现。
2. 数据库恢复前提：
   - 平台侧必须有最近一次可用 PostgreSQL 备份或快照
   - 恢复后必须重新验证 `SyncFile`、`VaultDevice`、`FileLifecycleOutbox` 三张表的一致性
3. 对象存储恢复前提：
   - 平台侧必须有 R2 bucket 级别的备份/复制策略
   - cloud-sync 自身不提供“凭元数据重建对象内容”的能力
4. 如果 PostgreSQL 与 R2 恢复点不一致，必须优先按 `SyncFile.storageRevision` 做抽样核对，再决定是否重新开放写入。

## 7. 上线闸门

1. 根级校验必须 fresh 通过：
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test:unit`
2. 云同步关键验证必须通过：
   - `pnpm --filter @moryflow/server exec vitest run --config ./vitest.e2e.config.ts test/sync-internal-metrics.e2e-spec.ts test/sync-internal-outbox.e2e-spec.ts`
   - `pnpm --filter @moryflow/server test -- src/sync/sync-telemetry.service.spec.ts src/sync/sync-diff.spec.ts src/sync/sync-action-token.service.spec.ts src/sync/file-lifecycle-outbox.service.spec.ts src/sync/sync.service.spec.ts src/sync/sync-orphan-cleanup.service.spec.ts`
   - `pnpm --filter @moryflow/pc exec vitest run src/main/cloud-sync/__tests__/path-normalizer.spec.ts src/main/cloud-sync/__tests__/recovery-coordinator.spec.ts src/main/cloud-sync/sync-engine/__tests__/executor.spec.ts src/main/cloud-sync/sync-engine/__tests__/index.spec.ts`
   - `pnpm --filter @moryflow/mobile exec vitest run lib/cloud-sync/__tests__/path-normalizer.spec.ts lib/cloud-sync/__tests__/recovery-coordinator.spec.ts lib/cloud-sync/__tests__/executor.spec.ts lib/cloud-sync/__tests__/index.spec.ts`
3. 若根级校验不通过，不允许宣称 cloud-sync 进入最终上线态。
4. 上线前压测目标：
   - `diff`：100 个文件动作，P99 < 500ms
   - `commit`：100 个 receipts，P99 < 2s
   - `cleanup-orphans`：100 个对象，P99 < 2s

## 8. 当前基线（2026-03-06）

1. `pnpm lint`：通过
2. `pnpm typecheck`：通过
3. `pnpm test:unit`：通过
4. sync internal metrics E2E：通过
5. sync internal outbox E2E：通过
6. PC/Mobile path + recovery + executor 回归：通过
