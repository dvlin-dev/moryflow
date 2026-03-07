# Sync Module

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

`sync/` 是 Moryflow 文件同步与文件生命周期事件的唯一真相源。

固定边界：

- 上游输入：PC / mobile 提交的 sync action receipts、对象存储中的文件对象
- 下游输出：`SyncFile` 当前态、`VaultDevice` 同步心跳、`FileLifecycleOutbox` 生命周期事件、清理/指标内部控制面
- Memox 集成边界：`sync/` 只负责写出生命周期事实与租约协议；不直接做 Memox projection 副作用

## Responsibilities

**Does:**

- `SyncPlanService`：计算 action plan 与冲突副本策略
- `SyncActionTokenService`：签发/验证 commit receipts
- `SyncCommitService`：校验 receipts、落库 `SyncFile`、更新 `VaultDevice` / storage usage、写出 outbox
- `FileLifecycleOutboxWriterService`：把 commit 真相写成 `file_upserted / file_deleted` outbox 事件
- `FileLifecycleOutboxLeaseService`：集中管理 outbox 的 `claim / ack / fail / retry / DLQ` 状态机
- `file-lifecycle-outbox.types.ts`：集中维护 outbox payload、record、lease request 的共享合同
- `SyncInternalOutboxController`：暴露 projection consumer 内部 `claim / ack` 控制面
- `SyncCleanupService` / `SyncOrphanCleanupService` / `SyncStorageDeletionService`：处理对象清理与孤儿文件回收
- `SyncTelemetryService`：聚合同步关键指标

**Does NOT:**

- 直接调用 Memox 或 Anyhunt API
- 维护第二套搜索或 projection 真相表
- 根据 outbox 事件决定最终检索展示字段

## Invariants

1. `SyncCommitService` 必须先完成 `SyncFile` / `VaultDevice` / storage usage 事务，再在同一事务里调用 `FileLifecycleOutboxWriterService.appendSyncCommitEvents()`；禁止提交成功却漏写 outbox。
2. `FileLifecycleOutboxWriterService` 只负责追加事实事件，不承担 lease、retry、DLQ、consumer 语义。
3. `FileLifecycleOutboxLeaseService` 是唯一允许修改 `leasedBy / leaseExpiresAt / processedAt / deadLetteredAt / lastError*` 的边界。
4. outbox payload 的单一事实源固定是 `file-lifecycle-outbox.types.ts`；consumer 与 writer 不允许各自维护平行 payload 结构。
5. `sync/` 不直接读取 Memox source state；跨域副作用统一交给 `memox/` consumer。

## Member List

| File                                      | Type       | Description                     |
| ----------------------------------------- | ---------- | ------------------------------- |
| `sync-commit.service.ts`                  | Service    | commit/publish 主流程           |
| `file-lifecycle-outbox-writer.service.ts` | Service    | 写出生命周期事件                |
| `file-lifecycle-outbox-lease.service.ts`  | Service    | claim/ack/fail/retry/DLQ 状态机 |
| `file-lifecycle-outbox.types.ts`          | Types      | outbox 共享合同                 |
| `sync-internal-outbox.controller.ts`      | Controller | 内部 outbox 控制面              |
| `sync-cleanup.service.ts`                 | Service    | 清理队列编排                    |
| `sync-storage-deletion.service.ts`        | Service    | 对象存储删除执行                |
| `sync-telemetry.service.ts`               | Service    | 同步指标聚合                    |

## Refactor Notes

- 不要把 outbox payload、lease request 或 DLQ 结果重新散落回 `SyncCommitService`、`MemoxOutboxConsumerService` 或 controller。
- 不要恢复“一个 outbox service 同时负责 writer + lease state machine”的结构；写侧与租约侧必须分层。
- 若后续增加 replay / repair 工具，优先复用 `FileLifecycleOutboxLeaseService` 与 `file-lifecycle-outbox.types.ts`，不要另起私有协议。
