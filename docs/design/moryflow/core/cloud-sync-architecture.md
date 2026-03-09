---
title: Moryflow 云同步架构
date: 2026-03-08
scope: apps/moryflow/server + apps/moryflow/pc + apps/moryflow/mobile + packages/api
status: active
---

<!--
[INPUT]: Moryflow 当前云同步实现、协议边界、审计结论与运维基线
[OUTPUT]: 云同步唯一架构事实源（协议不变量 + 模块边界 + 验证基线）
[POS]: Moryflow Core / Cloud Sync

[PROTOCOL]: 仅在协议、不变量、代码入口或 runbook 引用失真时更新；不维护实施闭环时间线。
-->

# Moryflow 云同步架构

## TL;DR

1. 当前云同步已经冻结为 `server-authoritative action plan`：`sync/diff -> execute -> receipt-only commit -> staged apply publish`。
2. `path`、`fileId`、`SyncFile`、`storageRevision` 都有明确单一事实源。
3. PC / Mobile 都采用 `apply journal + recovery coordinator`，commit 前不再直接 publish 本地真相。
4. sync 域与 `vectorize / Memox` 已经解耦，commit 成功后只写 `file lifecycle outbox`。
5. 观测、恢复、上线闸门与 `SYNC_ACTION_SECRET` 运维要求独立保留在 [cloud-sync-operations.md](/Users/lin/.codex/worktrees/17b2/moryflow/docs/design/moryflow/runbooks/cloud-sync-operations.md)。

## 1. 核心不变量

### 1.1 事实源

1. `path`：canonical POSIX relative path；规范化只处理分隔符与前导 `./`，不会再通过 `.trim()` 静默改写文件名。
2. `fileId`：同步事实源分配，不能由 vectorize、副作用任务或 UI 推导生成。
3. `SyncFile`：服务端唯一元数据真相。
4. `storageRevision`：对象代际唯一标识。
5. `file lifecycle outbox`：只代表 `SyncFile` 发布后的派生事件，不反向决定 sync 成败。

### 1.2 协议字段职责

1. `vectorClock`：语义内容版本。
2. `storageRevision`：对象代际。
3. `actionId`：一次执行令牌。
4. `receiptToken`：带 `issuedAt/expiresAt` 的短期 action 完成回执。
5. `expectedHash / expectedStorageRevision / expectedVectorClock`：乐观并发校验前置条件。
6. `SYNC_ACTION_SECRET`：receipt token 唯一签名密钥；缺失时服务端必须 fail-fast。

## 2. 架构边界

```text
PC / Mobile Client
├── path-normalizer
├── file-id-registry
├── detect-local-changes
├── sync-engine runner
├── executor (I/O only)
├── apply-journal
├── recovery-coordinator
└── file-index-publisher
        │
        ▼
Server (NestJS)
├── sync-plan.service
├── sync-upload-contract.service
├── sync-action-token.service
├── sync-object-verify.service
├── sync-commit.service
├── sync-orphan-cleanup.service
├── file-lifecycle-outbox-writer.service
├── file-lifecycle-outbox-lease.service
└── search-live-file-projector.service
```

约束：

1. Server 侧职责拆分固定为 `controller -> application service -> ports/adapters`。
2. Client 侧职责拆分固定为 `trigger -> runner -> journal/recovery/publisher -> adapters`。
3. sync 域不再直接依赖 vectorize / Memox。
4. projection / search 只能消费 `SyncFile` 或其派生事实，不能反向决定同步结果。

## 3. 服务端协议

### 3.1 Diff

1. 客户端上报 `localFiles`。
2. 服务端按 `SyncFile` 真相源和 `vectorClock` 计算 action plan。
3. 返回的每个 action 都包含 `actionId`、`receiptToken` 与固定对象合同。
4. conflict action 额外包含 `remoteStorageRevision`，用于固定远端冲突副本的对象快照。

### 3.2 Upload / Download

1. 上传 URL HMAC 签名覆盖 `userId / vaultId / fileId / contentHash / storageRevision / expectedSize`。
2. 下载 URL 只绑定 `storageRevision + contentHash`，不再混入 upload 专用参数。
3. download endpoint 会校验快照合同：
   - 指定 revision 不存在：`404 FILE_NOT_FOUND`
   - revision 存在但 `contentHash` 不匹配：`409 SNAPSHOT_MISMATCH`
4. `storageRevision` 不等于 R2 `ETag`；删除时才依赖 `If-Match ETag` 做条件删除。

### 3.3 Commit

1. commit 请求只接受 `receipts[]`。
2. 同一 commit request 内，`actionId` 和目标 `fileId` 都不能重复声明。
3. 服务端验签 `receiptToken`，然后校验上传对象合同。
4. 只有对象合同通过后，才会 publish `SyncFile`。
5. publish 成功后，同事务写入 `file lifecycle outbox`。
6. 错误必须显式收口为 4xx / 409，不再冒泡为泛化 `500`。

### 3.4 Delete / Orphan Cleanup

1. 删除依赖 `storageRevision + If-Match ETag` 条件删除。
2. `cleanup-orphans` 只回收当前 `SyncFile` 不再引用的 orphan object。
3. 恢复期允许立即清理 orphan object，不依赖额外时间窗口。

## 4. 客户端执行模型

### 4.1 检测

1. 只读扫描本地文件。
2. 统一 canonical path。
3. 新文件在进入 diff 前必须先注册 `fileId`。
4. 只生成 `pendingChanges / localStates`，不直接修改 FileIndex。

### 4.2 执行

1. upload：上传对象，记录 receipt 与 uploaded object。
2. download：下载到 staging temp，记录 `write_file` staged operation。
3. delete：只记录 `delete_file` staged operation。
4. conflict：下载远端副本、上传 conflict copy 与 local overwrite，并一起记入 staged operations 与 receipts。

### 4.3 Journal / Recovery

1. 同步开始先恢复历史 journal。
2. execute 完成写入 `phase=prepared`。
3. commit success 后写入 `phase=committed`。
4. 恢复器语义固定为：
   - `committed`：replay staged apply，再 publish FileIndex
   - `executing / prepared`：cleanup orphan objects，再清理 journal
5. 非网络失败必须进入 `needs_recovery`，不能直接回 `idle`。

### 4.4 FileIndex Publish

1. 只允许在 `commit success + local replay success` 后 publish。
2. FileIndex publish 必须独立为 `file-index-publisher`。
3. `磁盘状态 / FileIndex / SyncFile` 三者不能再出现部分成功分叉。

## 5. 与 vectorize / Memox 的边界

### 5.1 已冻结边界

1. `SyncCommitRequest.vectorizeEnabled` 已删除。
2. sync 域不再 direct call vectorize。
3. settings 与 API client 不再暴露 vectorize 直连能力。
4. commit 成功后只写 `file lifecycle outbox`。

### 5.2 当前读路径保护

1. Search 查询结果必须经过 `SyncFile` 存活态过滤。
2. projection drift 允许后台 reconcile，但用户读路径不能越过 `SyncFile` 真相源。
3. projection consumer 固定通过内部控制面的 `claim / ack` 契约接入。

## 6. 当前架构收口结论

1. `canonical path`、`fileId`、`storageRevision`、`receipt-only commit`、`apply journal + recovery` 与 `file lifecycle outbox` 都已经闭环落地。
2. 在 cloud sync 这个范围内，当前实现已经满足“最佳实践、模块化、单一职责、零兼容”的上线要求。
3. `vectorize / Memox consumer` 仍是外部能力边界，但已经不会阻断云同步成功，也不会再作为 `fileId`、commit 或 delete 的前置依赖。
4. 协同实时链路的额外 E2E 补充不属于本架构文档范围，不影响同步协议冻结。

## 7. 关键代码索引

### 7.1 Server

- `packages/api/src/cloud-sync/types.ts`
- `apps/moryflow/server/src/sync/dto/sync.dto.ts`
- `apps/moryflow/server/src/sync/sync-plan.service.ts`
- `apps/moryflow/server/src/sync/sync-upload-contract.service.ts`
- `apps/moryflow/server/src/sync/sync-action-token.service.ts`
- `apps/moryflow/server/src/sync/sync-object-verify.service.ts`
- `apps/moryflow/server/src/sync/sync-commit.service.ts`
- `apps/moryflow/server/src/sync/sync-orphan-cleanup.service.ts`
- `apps/moryflow/server/src/sync/file-lifecycle-outbox-writer.service.ts`
- `apps/moryflow/server/src/sync/file-lifecycle-outbox-lease.service.ts`
- `apps/moryflow/server/src/search/search-live-file-projector.service.ts`

### 7.2 Client

- `apps/moryflow/pc/src/main/cloud-sync/**`
- `apps/moryflow/mobile/lib/cloud-sync/**`
- `apps/moryflow/mobile/lib/vault/**`

## 8. 当前验证基线

1. `apps/moryflow/server` 负责 sync 协议、签名、对象合同、outbox 与内部控制面回归。
2. `apps/moryflow/pc` 与 `apps/moryflow/mobile` 负责 path normalizer、file-id registry、journal / recovery 与 file index publish 回归。
3. 变更 sync DTO、receipt token、对象合同、journal / recovery 或 outbox 边界时，按 L2 执行根级校验。
4. 运维恢复、内部 metrics、上线闸门与 `SYNC_ACTION_SECRET` 轮换策略，统一查看 [cloud-sync-operations.md](/Users/lin/.codex/worktrees/17b2/moryflow/docs/design/moryflow/runbooks/cloud-sync-operations.md)。
