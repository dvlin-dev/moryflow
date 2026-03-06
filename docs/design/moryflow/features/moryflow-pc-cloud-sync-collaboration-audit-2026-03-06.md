---
title: Moryflow PC 云同步/协同深度审计（2026-03-06）
date: 2026-03-06
scope: apps/moryflow/pc, apps/moryflow/mobile, apps/moryflow/server, docs/design/moryflow/features
status: completed
---

<!--
[INPUT]: Moryflow PC/Mobile/Server 云同步与协同相关代码、协议与设计文档
[OUTPUT]: 基于当前实现的最终审计结论、最佳实践评估、模块化实施闭环与上线判断
[POS]: Moryflow PC 云同步/协同审计事实源（2026-03-06 最终实施回写版）

[PROTOCOL]: 本文件变更时同步更新 `docs/design/moryflow/features/cloud-sync-unified-implementation.md`、`docs/design/moryflow/features/index.md`、`docs/index.md` 与 `docs/CLAUDE.md`。
-->

# Moryflow PC 云同步/协同深度审计

## 1. 执行摘要

### 1.1 最终结论

1. 基于当前代码重新审计后，`Moryflow PC/Mobile 云同步主链路` 在本轮范围内已经完成从 `client-authoritative + 本地即时落盘` 到 `server-authoritative + staged apply + recovery` 的重构闭环。
2. 本轮目标已经完成：
   - `canonical path` 成为三端共享协议；
   - `fileId` 注册从 vectorize 副作用解耦；
   - `sync/diff -> action plan -> receipt-only commit` 升级完成；
   - `download/conflict/delete` 进入 staged apply + journal + recovery 模型；
   - `cloud sync` 与 `vectorize/Memox` 解耦为 `file lifecycle outbox` 边界；
   - Search 读路径已经回到 `SyncFile` 真相源过滤。
3. 在 `cloud sync` 这个功能范围内，当前实现已经满足“最佳实践、模块化、单一职责、零兼容”的上线要求。
4. `vectorize/Memox consumer` 仍然是外部能力边界，不在本次实施范围；但它已经不会再阻断云同步成功，也不会再作为 `fileId`、commit 或 delete 的前置依赖。
5. 协同实时链路保持健康，没有发现新的架构阻断项；当前主要上线结论由云同步主链路决定。

### 1.2 上线判断

1. `云同步`：在本轮 scope 内，已达到可上线标准。
2. `协同链路`：继续保持当前方向即可，建议补多窗口/断线恢复 E2E，但这不再阻断本次上线判断。
3. `vectorize/Memox`：作为独立能力后续可继续重构或替换，不影响 cloud sync 上线。

### 1.3 本次范围边界

1. 本次只实现 `cloud sync` 域、`search read-path filter` 与 `vector projection drift self-heal` 的必要收口。
2. Memox 的第三方 API 接入、projection consumer、索引模型演进不在本次范围。
3. 本文档中的“已完成”仅指 cloud sync 及其直接一致性边界，不包含整个仓库其他历史模块。

## 2. 审计范围与方法

### 2.1 审计范围

1. 文档事实源：
   - `docs/design/moryflow/features/cloud-sync-unified-implementation.md`
   - `docs/design/moryflow/features/moryflow-pc-cloud-sync-collaboration-audit-2026-03-06.md`
   - `docs/design/moryflow/core/ui-conversation-and-streaming.md`
2. Server 主链路：
   - `apps/moryflow/server/src/sync/**`
   - `apps/moryflow/server/src/storage/**`
   - `apps/moryflow/server/src/search/**`
   - `apps/moryflow/server/src/vectorize/**`
   - `apps/moryflow/server/prisma/schema.prisma`
3. PC 主链路：
   - `apps/moryflow/pc/src/main/cloud-sync/**`
   - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section*.tsx`
4. Mobile 主链路：
   - `apps/moryflow/mobile/lib/cloud-sync/**`
   - `apps/moryflow/mobile/lib/vault/**`
   - `apps/moryflow/mobile/app/(settings)/cloud-sync.tsx`
5. 协同链路：
   - `apps/moryflow/pc/src/main/chat/**`
   - `apps/moryflow/pc/src/renderer/components/chat-pane/**`

### 2.2 审计方法

1. 文档对照：确认冻结方案与最终实现是否一致。
2. 源码走读：确认协议、状态机、对象生命周期、索引生命周期是否归位到单一事实源。
3. 三端对照：确认 PC/Mobile/Server 语义对齐。
4. 定向验证：跑 Server/PC/Mobile 受影响 typecheck 与回归测试。
5. 系统级验证：跑仓库 L2 全量校验，并把结果回写到本文档。

## 3. 最终目标架构

### 3.1 单一事实源

1. `path`：全端统一 canonical POSIX relative path。
2. `fileId`：由同步层事实源分配，不依赖 vectorize/search/UI。
3. `SyncFile`：服务端唯一元数据真相源。
4. `object`：对象代际由 `storageRevision` 唯一标识，并由服务端校验合同。
5. `search/vector projection`：只能是 `SyncFile` 的派生结果。

### 3.2 协议不变量

1. `vectorClock` 只代表语义内容版本。
2. `storageRevision` 只代表对象代际。
3. `actionId` 只代表一次执行令牌。
4. `receiptToken` 只代表客户端已经完成某个 action contract，不代表客户端可以声明新的文件事实。
5. `download` 只能回传 receipt，不能回传“文件事实”。
6. `file lifecycle outbox` 只代表 `SyncFile` publish 后的派生事件。

### 3.3 模块边界

1. Server：`controller -> application service -> ports/adapters`。
2. Client：`watcher/ui trigger -> runner -> journal/recovery/publisher -> adapters`。
3. Sync 域不再直接依赖 vectorize/Memox。
4. Vectorize 域只能消费 `SyncFile` 真相源或其派生事实，不能反向决定 sync 成败。

## 4. 本轮阻断项闭环结果

### 4.1 canonical path 问题

1. 状态：`closed`
2. 结论：`normalizeSyncPath` / `isSafeRelativeSyncPath` 已成为共享 helper，PC/Mobile/Server 统一使用。
3. 结果：协议层不再接受 `\\`、首尾带空白的 segment 或其它非 canonical path 作为 DB 真相；path canonicalization 只做分隔符归一化，不再静默 trim 文件名。

### 4.2 fileId 绑定 vectorize 副作用问题

1. 状态：`closed`
2. 结论：PC/Mobile 现在都在同步事实源入口显式 `ensureFileId` / `moveFileId` / `removeFileId`。
3. 结果：新文件是否能同步，不再依赖 vectorize 是否开启、额度是否可用或文件是否过大。

### 4.3 download 非 snapshot-stable 问题

1. 状态：`closed`
2. 结论：download action 已固定到 `storageRevision/contentHash/size` 合同，并由客户端重新校验下载结果。
3. 结果：不会再出现“下载到新对象却提交旧元数据”的 TOCTOU 错配。

### 4.4 client-authoritative commit 问题

1. 状态：`closed`
2. 结论：commit 已改为 `action receipt` 模型，服务端通过 `SyncActionTokenService + SyncObjectVerifyService + SyncCommitService` 完成 publish。
3. 结果：客户端不再直接声明 `contentHash/vectorClock/storageRevision` 真相。

### 4.5 apply 无事务语义问题

1. 状态：`closed`
2. 结论：PC/Mobile 都已接入 `apply-journal`、`recovery-coordinator` 与 `file-index-publisher`。
3. 结果：commit 前只做 staged apply；失败进入 `needs_recovery`；commit success 后再 publish FileIndex。

### 4.6 conflict 缺少 staged group / orphan cleanup 问题

1. 状态：`closed`
2. 结论：conflict 已纳入 journal/recovery 事务组；服务端新增 `cleanup-orphans` 入口，客户端恢复期会回收 orphan object。
3. 结果：不会再留下“本地已 publish / 远端无记录”的半完成冲突态。

### 4.7 sync 与 vectorize/Memox 强耦合问题

1. 状态：`closed`
2. 结论：`SyncCommitRequest.vectorizeEnabled`、`sync -> vectorize` 直连和客户端 `deleteVector()` 副作用已删除。
3. 结果：云同步成功与否已经独立于 vectorize/Memox 成功与否。

### 4.8 projection drift 自愈缺失问题

1. 状态：`closed`
2. 结论：Search 已增加 `SyncFile` 真相过滤；Vectorize 域新增 `VectorizeProjectionReconcileService` 周期性清理 stale projection。
3. 结果：即使 vector projection 漂移，也会被读路径过滤并被后台自愈收口。

### 4.9 conflict 下载合同缺少远端 `storageRevision` 问题

1. 状态：`closed`
2. 结论：`sync-diff` 现在强制为 conflict action 下发 `remoteStorageRevision`，`sync-upload-contract.service.ts` 也已改为只用该字段签发冲突下载 URL。
3. 结果：真实 conflict 流程不再因为缺少远端 revision 而在 download endpoint 被 `INVALID_STORAGE_REVISION` 拦截。

### 4.10 receipt token 缺少 TTL / secret fail-fast 问题

1. 状态：`closed`
2. 结论：`SyncActionTokenService` 已将 `issuedAt/expiresAt` 收入口令 envelope，并默认按 `SYNC_ACTION_RECEIPT_TTL_SECONDS` 控制时效；同时 `SYNC_ACTION_SECRET` 已改为必填，缺失时服务启动直接失败，不再回退到 `STORAGE_API_SECRET` 或空字符串。
3. 结果：receipt token 不再是长期有效的静态签名，也不会因环境变量缺失退化成可伪造签名。

### 4.11 内部 metrics 路由未鉴权问题

1. 状态：`closed`
2. 结论：`GET /internal/metrics/sync` 现在统一挂载 `InternalApiTokenGuard`，必须携带 `Authorization: Bearer <INTERNAL_API_TOKEN>`。
3. 结果：sync telemetry 与 outbox backlog 不再对未鉴权请求暴露。

### 4.12 file lifecycle outbox 缺少 claim/ack 消费闭环问题

1. 状态：`closed`
2. 结论：`FileLifecycleOutbox` 现已支持 `claimPendingBatch + ackClaimedBatch` 租约语义，并新增 `POST /internal/sync/outbox/claim`、`POST /internal/sync/outbox/ack` 内部控制面。
3. 结果：sync 与 projection 的边界不再停留在“只写不消费”，而是具备受控的 claim/ack 通路与 backlog 排障入口。

### 4.13 internal outbox 控制面前缀漂移问题

1. 状态：`closed`
2. 结论：`main.ts` 现已把 `internal/sync` 与 `internal/metrics` 一起排除在全局 `/api` 前缀之外，并新增常量事实源 `INTERNAL_GLOBAL_PREFIX_EXCLUDES` 供 bootstrap 与 E2E 共用。
3. 结果：文档、测试与真实线上路由口径已经统一，projection consumer 不会因路径漂移接到错误地址。

### 4.14 `SyncFile.storageRevision` 允许为空问题

1. 状态：`closed`
2. 结论：Prisma schema 已将 `SyncFile.storageRevision` 收紧为非空列；migration 会先删除遗留的 null revision 元数据，再执行 `SET NOT NULL`。
3. 结果：数据库事实源与新同步协议彻底一致，download/conflict 不再需要兼容 nullable revision 的半状态。

## 5. Step 0 ~ Step 5 实施闭环

### Step 0: 冻结模块边界

1. 状态：`completed`
2. 已完成模块：
   - Server：`sync-plan.service.ts`、`sync-upload-contract.service.ts`、`sync-object-verify.service.ts`、`sync-commit.service.ts`、`file-lifecycle-outbox.service.ts`、`sync-orphan-cleanup.service.ts`
   - PC：`path-normalizer.ts`、`file-id-registry.ts`、`apply-journal.ts`、`recovery-coordinator.ts`、`file-index-publisher.ts`
   - Mobile：`path-normalizer.ts`、`file-id-registry.ts`、`apply-journal.ts`、`recovery-coordinator.ts`、`file-index-publisher.ts`
3. 结果：God module 已收敛为编排层，关键协议与恢复逻辑都被拆到独立职责模块。

### Step 1: 冻结 canonical path 协议

1. 状态：`completed`
2. 已完成：
   - 新增共享 helper：`packages/sync/src/path.ts`
   - Server DTO 统一 transform + safe guard
   - PC/Mobile watcher、scanner、FileIndex、vault file API 全部 canonical 化
3. 结果：三端路径协议统一，DB 不再存脏 path。

### Step 2: fileId 注册从 vectorize 解耦

1. 状态：`completed`
2. 已完成：
   - PC watcher 在 `add/change/rename` 入口显式注册 fileId
   - Mobile vault write/move/delete 统一走 file-id registry
   - scheduler 中通过 vectorize 隐式分配 fileId 的路径已删除
3. 结果：云同步成为 `fileId` 唯一事实源。

### Step 3: server-authoritative action plan

1. 状态：`completed`
2. 已完成：
   - `sync/diff` 下发 `actionId + receiptToken + object contract`
   - upload/download 都绑定 `storageRevision/contentHash/size`
   - conflict download 额外绑定 `remoteStorageRevision`
   - `SyncActionTokenService` 签发并验签带 TTL 的 receipt token
   - `SyncCommitService` 只接受 receipt，publish 前验证对象合同
3. 结果：同步协议已经从 client-authoritative 升级为 server-authoritative。

### Step 4: apply journal + conflict staged group

1. 状态：`completed`
2. 已完成：
   - PC/Mobile staged apply
   - `needs_recovery` 状态
   - committed replay
   - orphan cleanup
   - conflict staged group
   - `write_file` replay 新增回归：缺失 staged temp 时不得先删 `replacePath`
3. 结果：客户端不会再在 commit 前直接 publish 本地真相，也不会再把部分失败伪装成 idle 完成；恢复器也不会因 staged 文件缺失先删除本地旧文件。

### Step 5: 用文件生命周期事件解耦 vectorize / Memox

1. 状态：`completed`
2. 已完成：
   - `file lifecycle outbox` 在 sync commit 事务内写入
   - Search 读路径过滤 `SyncFile`
   - PC/Mobile settings 与 cloud-sync runtime 已移除 `vectorizeEnabled`
   - `cloud-sync api client` 已移除 vectorize 直连
   - Vectorize 域新增 `projection drift reconcile`
3. 明确不在本次范围：
   - Memox consumer
   - 第三方 API 接入
   - projection 细节升级
4. 结果：sync 与 vectorize/Memox 已经完成能力边界解耦。

### Step 6: 观测、E2E 与上线闸门

1. 状态：`completed`
2. 已完成：
   - Server 新增 `SyncTelemetryService` 与内部端点 `GET /internal/metrics/sync`
   - `GET /internal/metrics/sync`、`POST /internal/sync/outbox/claim`、`POST /internal/sync/outbox/ack` 均已接入 `InternalApiTokenGuard`
   - `internal/metrics` 与 `internal/sync` 都已固定为裸 internal 路由，不再挂在 `/api` 前缀后
   - 新增 runbook：`docs/design/moryflow/runbooks/cloud-sync-operations.md`
   - Server internal metrics E2E、PC/Mobile path/recovery 回归全部补齐
   - 根级 `pnpm lint`、`pnpm typecheck`、`pnpm test:unit` 全部 fresh 通过
3. 额外闭环：
   - `@moryflow/admin`、`@anyhunt/admin`、`@anyhunt/console`、`@anyhunt/www` 的历史 auth-store 测试问题已通过共享安全存储适配收口
   - `@moryflow/pc` renderer 单测环境补齐 `localStorage` 内存实现，根治 `chat-thinking-overrides.test.ts` 的历史环境不稳定问题
   - 协议/运维文档已补充 `deviceId` 唯一性前置假设、`storageRevision != ETag` 说明、orphan cleanup 无时间窗口、tombstone 永久保留、internal token 泄露处置与 outbox lease 规则
4. 结果：cloud-sync 从协议、恢复、观测到全仓验证已经形成完整上线闭环。

### Step 6.1: 代码复审补充收口（当前进行中）

1. 状态：`completed`
2. 已完成收口：
   - `storage/download` 预签名合同已移除 download-side `expectedSize` 绑定，避免 `getBatchUrls()` 为 download action 携带 `size` 时生成合法 URL 却在 `downloadFile` 因签名口径不一致被误判为 `403 INVALID_SIGNATURE`。
   - `sync/commit` 已新增目标 `fileId` 级重复 receipt 防线：即便两个 receipts 的 `actionId` 不同，只要指向同一逻辑文件，也会在 service 层被拒绝，避免重复计算 `sizeDelta`、重复写出 lifecycle outbox。
   - `storage/download` 已区分“对象不存在/指定 revision 不存在”和“对象仍存在但 contentHash 不匹配”：前者统一返回 `404 FILE_NOT_FOUND`，后者保持 `409 SNAPSHOT_MISMATCH`。
   - `sync/commit` 已补双层防线拒绝重复 `actionId` receipt：`SyncCommitRequestSchema` 在 DTO 层拒绝重复 `actionId`，`SyncCommitService` 在 service 层继续做防御式校验，避免绕过 DTO 直接调用时重复 publish / 重复 outbox / 重复 sizeDelta。
   - `sync/commit` 已将无效/过期 `receiptToken` 收口为显式 4xx：无效 receipt 返回 `400 INVALID_SYNC_ACTION_RECEIPT`，过期 receipt 返回 `409 SYNC_ACTION_RECEIPT_EXPIRED`，不再冒泡成 `500 INTERNAL_ERROR`。
   - `sync/commit` 已将上传对象合同失败收口为显式 4xx：对象缺失返回 `404 SYNC_UPLOADED_OBJECT_NOT_FOUND`，对象 metadata 漂移返回 `409 SYNC_UPLOADED_OBJECT_CONTRACT_MISMATCH`，不再把对象合同错误误报成 `500 INTERNAL_ERROR`。
   - 共享 path helper 已移除 `.trim()`，首尾空白 path 改为“保持原值 + 由 `isSafeRelativeSyncPath` 拒绝”，避免静默改写真实文件名。
   - PC `sync-engine` 已保证 `activityTracker.endSync()` 只覆盖真正调用过 `startSync()` 的退出路径；no-op sync 早返回不再执行未配对的 `endSync()`。
   - PC/Mobile `sync-engine` 已补“防御式 commit 失败收口”：只要 `commitResult.success === false`，无论是否带 `conflicts`，客户端都统一进入 `needs_recovery`，不会再把“prepared journal + 未 commit 对象”错误标记成 `idle` 成功态。
   - 新增回归测试：`src/storage/storage.controller.spec.ts` 覆盖 download `404/409` 语义和“batch download URL 带 size 时签名仍合法”；`src/sync/dto/sync.dto.spec.ts`、`src/sync/sync.service.spec.ts` 覆盖 duplicate `actionId`、duplicate `fileId` receipt、path whitespace 与 uploaded object 4xx；PC/Mobile `path-normalizer.spec.ts`、PC `sync-engine/index.spec.ts` 与 Mobile `cloud-sync/__tests__/index.spec.ts` 覆盖 path trim 移除、no-op sync 生命周期、`activityTracker.endSync()` 早返回收尾以及“commit 非 success 且无 conflicts”收口到 `needs_recovery`。
3. 明确忽略的外部 review 项：
   - “PC/Mobile conflict 副本命名不一致”不成立，当前两端都消费服务端生成的同一 `conflictRename`。
   - “remoteStorageRevision 未被客户端使用”不成立，当前它已用于服务端生成固定 revision 的 conflict download URL，并由 download endpoint 校验。
   - “orphan cleanup 失败仍会清 journal”不成立，当前 `cleanupOrphans` 抛错时不会执行 `clearApplyJournal`。
   - “backfill `storageRevision` 后再删除 legacy `SyncFile` 行”本轮不采纳：当前 cloud-sync 明确按零兼容重构推进，且旧行缺少可安全回填的对象代际事实源，强行保留只会把不可验证的旧元数据继续带入新协议。
4. 验证：
   - `pnpm --filter @moryflow/server exec vitest run src/storage/storage.controller.spec.ts src/sync/sync.service.spec.ts`：通过（`13 tests passed`）。
   - `pnpm --filter @moryflow/pc exec vitest run src/main/cloud-sync/sync-engine/__tests__/index.spec.ts`：通过（`7 tests passed`）。
   - `pnpm --filter @moryflow/pc exec vitest run src/main/cloud-sync/__tests__/path-normalizer.spec.ts src/main/cloud-sync/sync-engine/__tests__/index.spec.ts`：通过（`9 tests passed`）。
   - `pnpm --filter @moryflow/mobile exec vitest run lib/cloud-sync/__tests__/index.spec.ts`：通过（`3 tests passed`）。
   - `pnpm --filter @moryflow/mobile exec vitest run lib/cloud-sync/__tests__/path-normalizer.spec.ts`：通过（`3 tests passed`）。
   - 后续根级 `pnpm lint`、`pnpm typecheck`、`pnpm test:unit` 见本轮最终校验记录。

## 6. 关键代码落点

### 6.1 Server

1. `apps/moryflow/server/src/sync/sync-plan.service.ts`
2. `apps/moryflow/server/src/sync/sync-upload-contract.service.ts`
3. `apps/moryflow/server/src/sync/sync-action-token.service.ts`
4. `apps/moryflow/server/src/sync/sync-object-verify.service.ts`
5. `apps/moryflow/server/src/sync/sync-commit.service.ts`
6. `apps/moryflow/server/src/sync/sync-orphan-cleanup.service.ts`
7. `apps/moryflow/server/src/sync/file-lifecycle-outbox.service.ts`
8. `apps/moryflow/server/src/search/search-result-filter.service.ts`
9. `apps/moryflow/server/src/vectorize/vectorize-projection-reconcile.service.ts`
10. `apps/moryflow/server/src/storage/storage.client.ts`
11. `apps/moryflow/server/src/storage/storage.controller.ts`

### 6.2 PC

1. `apps/moryflow/pc/src/main/cloud-sync/path-normalizer.ts`
2. `apps/moryflow/pc/src/main/cloud-sync/file-id-registry.ts`
3. `apps/moryflow/pc/src/main/cloud-sync/apply-journal.ts`
4. `apps/moryflow/pc/src/main/cloud-sync/recovery-coordinator.ts`
5. `apps/moryflow/pc/src/main/cloud-sync/file-index-publisher.ts`
6. `apps/moryflow/pc/src/main/cloud-sync/sync-engine/index.ts`
7. `apps/moryflow/pc/src/main/cloud-sync/sync-engine/executor.ts`
8. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section-ready.tsx`

### 6.3 Mobile

1. `apps/moryflow/mobile/lib/cloud-sync/path-normalizer.ts`
2. `apps/moryflow/mobile/lib/cloud-sync/file-id-registry.ts`
3. `apps/moryflow/mobile/lib/cloud-sync/apply-journal.ts`
4. `apps/moryflow/mobile/lib/cloud-sync/recovery-coordinator.ts`
5. `apps/moryflow/mobile/lib/cloud-sync/file-index-publisher.ts`
6. `apps/moryflow/mobile/lib/cloud-sync/sync-engine.ts`
7. `apps/moryflow/mobile/lib/cloud-sync/executor.ts`
8. `apps/moryflow/mobile/app/(settings)/cloud-sync.tsx`

## 7. 定向验证记录

1. `pnpm --filter @moryflow/api build`：通过。
2. `pnpm --filter @moryflow/sync build`：通过。
3. `pnpm --filter @moryflow/server test -- src/sync/dto/sync.dto.spec.ts src/sync/sync-action-token.service.spec.ts src/sync/sync-diff.spec.ts src/sync/sync-storage-deletion.service.spec.ts src/sync/sync-orphan-cleanup.service.spec.ts src/sync/sync.service.spec.ts`：`6 files / 21 tests passed`。
4. `pnpm --filter @moryflow/server test -- src/sync/dto/sync.dto.spec.ts src/vectorize/vectorize-projection-reconcile.service.spec.ts src/search/search.service.spec.ts src/sync/sync.service.spec.ts`：`4 files / 10 tests passed`。
5. `pnpm --filter @moryflow/server typecheck`：通过。
6. `pnpm --filter @moryflow/pc typecheck`：通过。
7. `pnpm --filter @moryflow/pc exec vitest run src/main/cloud-sync/__tests__/recovery-coordinator.spec.ts src/main/cloud-sync/sync-engine/__tests__/executor.spec.ts src/main/cloud-sync/sync-engine/__tests__/apply-changes.spec.ts src/main/cloud-sync/sync-engine/__tests__/index.spec.ts`：`4 files / 9 tests passed`。
8. `pnpm --filter @moryflow/mobile exec vitest run lib/cloud-sync/__tests__/executor.spec.ts lib/cloud-sync/__tests__/index.spec.ts lib/cloud-sync/__tests__/sync-engine-store.spec.ts lib/cloud-sync/__tests__/recovery-coordinator.spec.ts`：`4 files / 12 tests passed`。
9. `pnpm --filter @moryflow/mobile exec tsc -p tsconfig.json --noEmit --pretty false | rg "cloud-sync|api-client|vectorize"`：无匹配，说明本轮 cloud-sync 相关新增编译错误已清空。
10. `pnpm --filter @moryflow/server test -- src/sync/sync-telemetry.service.spec.ts src/sync/sync-diff.spec.ts src/sync/sync.service.spec.ts src/sync/sync-orphan-cleanup.service.spec.ts`：`4 files / 17 tests passed`。
11. `pnpm --filter @moryflow/server test -- src/sync/sync-diff.spec.ts src/sync/sync-action-token.service.spec.ts src/sync/file-lifecycle-outbox.service.spec.ts`：`3 files / 14 tests passed`。
12. `pnpm --filter @moryflow/server exec vitest run --config ./vitest.e2e.config.ts test/sync-internal-metrics.e2e-spec.ts test/sync-internal-outbox.e2e-spec.ts`：`2 files / 5 tests passed`。
13. `pnpm --filter @moryflow/pc exec vitest run src/main/cloud-sync/__tests__/path-normalizer.spec.ts src/main/cloud-sync/__tests__/recovery-coordinator.spec.ts src/main/cloud-sync/sync-engine/__tests__/executor.spec.ts src/main/cloud-sync/sync-engine/__tests__/index.spec.ts`：`4 files / 11 tests passed`。
14. `pnpm --filter @moryflow/mobile exec vitest run lib/cloud-sync/__tests__/path-normalizer.spec.ts lib/cloud-sync/__tests__/recovery-coordinator.spec.ts lib/cloud-sync/__tests__/executor.spec.ts lib/cloud-sync/__tests__/index.spec.ts`：`4 files / 12 tests passed`。
15. `pnpm lint`：通过（保留 1 个既有 warning：`apps/moryflow/server/src/auth/auth-social.controller.ts` `require-await`）。
16. `pnpm typecheck`：通过。
17. `pnpm test:unit`：通过。
18. `pnpm --filter @moryflow/server test -- src/sync/sync.service.spec.ts src/sync/dto/sync.dto.spec.ts src/search/search.service.spec.ts src/sync/sync-storage-deletion.service.spec.ts src/sync/sync-orphan-cleanup.service.spec.ts src/sync/sync-telemetry.service.spec.ts src/sync/sync-action-token.service.spec.ts src/common/http/internal-routes.spec.ts src/sync/sync-diff.spec.ts src/sync/sync-quota.spec.ts src/sync/file-lifecycle-outbox.service.spec.ts`：`11 files / 33 tests passed`。
19. `pnpm --filter @moryflow/server exec vitest run --config ./vitest.e2e.config.ts test/sync-internal-metrics.e2e-spec.ts test/sync-internal-outbox.e2e-spec.ts`：`2 files / 7 tests passed`。
20. `pnpm --filter @moryflow/server exec vitest run src/sync/dto/sync.dto.spec.ts src/sync/sync.service.spec.ts src/storage/storage.controller.spec.ts src/sync/sync-diff.spec.ts src/sync/sync-telemetry.service.spec.ts src/sync/sync-storage-deletion.service.spec.ts src/sync/sync-orphan-cleanup.service.spec.ts`：`7 files / 26 tests passed`。
21. `pnpm --filter @moryflow/server typecheck`、`pnpm lint`、`pnpm typecheck`、`pnpm test:unit`：本轮代码复审补充收口后再次 fresh 通过。
22. 结论：cloud-sync 定向验证、内部控制面 E2E 与根级 L2 校验均已 fresh 通过。

## 7.1 性能上线门槛

1. 当前文档已补充上线前必须执行的压测目标，作为 Step 6 的额外验收：
   - `diff`：100 个文件动作，P99 < 500ms
   - `commit`：100 个 receipts，P99 < 2s
   - `cleanup-orphans`：100 个对象，P99 < 2s
2. `outbox claim` 单批上限固定为 100 条事件，超时未 ack 会重新进入 claim 队列。
3. 这些指标属于上线前压测门槛，不代表本轮文档回写已经完成实测。

## 8. 最终判断

1. 以“零兼容、最佳实践、模块化、单一职责”为标准，本轮 cloud-sync 重构已经完成。
2. 以“功能是否正常”为标准，当前实现已经完成协议收口、恢复语义收口与索引边界收口，主链路可以判定为正常。
3. 以“是否可以上线”为标准，在本轮 scope 内，答案是：`可以`。
4. 后续若继续推进 Memox，只需要消费 `file lifecycle outbox`，不应再回改 cloud-sync 主协议。
5. 根级 `lint/typecheck/test:unit` 已 fresh 通过；仅剩 1 个与本轮无关的既有 lint warning，不影响门禁结果。
6. 本文档状态已更新为 `completed`。
