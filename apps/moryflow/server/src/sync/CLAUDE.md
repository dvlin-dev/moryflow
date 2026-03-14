# Sync Module

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

`sync/` 是 Moryflow 文件 transport、对象校验、commit 发布、orphan cleanup 与同步观测的唯一真相源。

固定边界：

- 上游输入：PC / mobile 提交的 sync action receipts、对象存储中的文件对象
- 下游输出：`SyncFile` 当前态、`VaultDevice` 同步心跳、对象清理任务与同步指标
- Memory/Memox 集成边界：`sync/` 只负责 transport 与 `SyncFile` 真相；不再写旧 lifecycle outbox，也不直接驱动 Memox projection

## Responsibilities

**Does:**

- `SyncPlanService`：计算 action plan 与冲突副本策略
- `SyncActionTokenService`：签发/验证 commit receipts
- `SyncCommitService`：校验 receipts、原子 upsert `WorkspaceDocument + SyncFile`、更新 `VaultDevice` / storage usage
- `SyncCleanupService` / `SyncOrphanCleanupService` / `SyncStorageDeletionService`：处理对象清理与孤儿文件回收
- `SyncTelemetryService`：聚合同步关键指标
- `SyncInternalMetricsController`：暴露同步内部指标与诊断面

**Does NOT:**

- 直接调用 Memox 或 Anyhunt API
- 维护第二套搜索或 projection 真相表
- 通过旧 lifecycle outbox 驱动 Memory / Memox

## Invariants

1. `SyncCommitService` 必须在同一事务里先确保 `WorkspaceDocument` 归属于 `vault.workspaceId`，再 upsert `SyncFile` / `VaultDevice` / storage usage；禁止依赖异步 Memory ingest 预先创建 document。
2. `storage usage` 增量更新必须先确保 `UserStorageUsage` 行存在且 `storageUsed=0`，再执行数据库原子加减；禁止 read-modify-write，也禁止在创建行时预写正向 delta，避免首笔 commit 被重复计入。
3. `sync/` 不直接读取 Memox source state，也不写旧 lifecycle outbox；跨域副作用统一交给 `workspace-content/` 与 `memox/`。
4. `cleanup-orphans` 只能回收当前 `SyncFile` 不再引用的对象，不能越权删除其他 workspace/vault 的快照。
5. `Vault` 删除只表示删除 Sync transport；`sync/` 不得因为 teardown 擅自删除 `Workspace` 或 Memory source。
6. rewrite 基线固定满足 `SyncFile.id == SyncFile.documentId == WorkspaceDocument.id == documentId`；PC `workspace-doc-registry` 生成的稳定 `documentId` 也是 sync transport 的 `fileId`。

## Member List

| File                                      | Type       | Description                     |
| ----------------------------------------- | ---------- | ------------------------------- |
| `sync-commit.service.ts`             | Service    | commit/publish 主流程                    |
| `sync-plan.service.ts`               | Service    | diff / action plan                        |
| `sync-upload-contract.service.ts`    | Service    | 上传/下载对象合同                         |
| `sync-object-verify.service.ts`      | Service    | receipt 对象校验与 owned file 读取        |
| `sync-cleanup.service.ts`            | Service    | 清理队列编排                              |
| `sync-orphan-cleanup.service.ts`     | Service    | orphan cleanup 正式入口                   |
| `sync-storage-deletion.service.ts`   | Service    | 对象存储删除执行                          |
| `sync-internal-metrics.controller.ts`| Controller | 内部同步指标/诊断控制面                   |
| `sync-telemetry.service.ts`          | Service    | 同步指标聚合                              |
| `sync-action-token.service.ts`       | Service    | receipt token 签发/验证                   |
| `sync.controller.ts`                 | Controller | 同步 API 入口                             |
| `sync.module.ts`                     | Module     | NestJS 模块                               |
| `dto/sync.dto.ts`                    | Schema     | 同步 DTO                                  |

## Refactor Notes

- 不要把 Memory / Memox 的 source lifecycle 重新塞回 `sync/`。
- 不要恢复旧 `FileLifecycleOutbox`、`sync-internal-outbox.controller.ts` 或相关 lease state machine。
- 若后续增加 repair / replay 工具，优先复用现有 `SyncCleanupService` / `SyncOrphanCleanupService` / `SyncStorageDeletionService`，不要另起平行 transport 协议。
