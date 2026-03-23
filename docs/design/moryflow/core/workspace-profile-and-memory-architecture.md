---
title: Workspace Profile 与 Memory/Sync 解耦架构
date: 2026-03-14
scope: apps/moryflow/server + apps/moryflow/pc + apps/anyhunt/server
status: active
---

<!--
[INPUT]: Workspace Profile reset rewrite 后的服务端/PC/Anyhunt 主链实现
[OUTPUT]: Workspace / Memory / Cloud Sync 最终边界、实体关系、关键流程与不变量
[POS]: Moryflow Core / Workspace Profile + Memory + Sync 唯一事实源

[PROTOCOL]: 仅在主实体、跨模块契约、稳定身份模型、关键流程或代码入口失真时更新。
-->

# Workspace Profile 与 Memory/Sync 解耦架构

## TL;DR

1. `Workspace` 是逻辑主实体；`Memory` 的作用域固定为 `workspaceId`。
2. `Workspace Profile = 本地工作区 + 当前账号`，是 PC 端所有远端能力的唯一装配点。
3. `Cloud Sync` 是可选 transport；不开 Sync 不影响 `Memory`。
4. `Document Registry` 提供稳定 `documentId`；rename/move 不会改变文档身份。
5. `Workspace Content API + WorkspaceContentOutbox + Memox consumer` 是 source-derived memory 的正式写链。
6. `WorkspaceContentOutbox` 持久化 canonical 写链的终态结果：`INDEXED | QUIET_SKIPPED | DELETED`。
7. 运行期通过 bounded retry + 周期 reconcile 自动自愈；用户侧不暴露 `Retry / Rebuild`。

## 1. 产品边界

### 1.1 逻辑模型

```text
Local Workspace
└── Workspace Marker (.moryflow/workspace.json)
    └── clientWorkspaceId

Account + Local Workspace
└── Workspace Profile
    ├── workspaceId
    ├── memoryProjectId (= workspaceId)
    ├── syncVaultId? (optional)
    ├── syncEnabled
    ├── memory mirror state
    └── sync mirror state / apply journal
```

### 1.2 能力边界

1. `Memory` 是默认能力：
   - 用户登录后即可在当前工作区使用 `overview / search / facts / graph / export`
   - 不以 `syncVaultId` 为前置条件
2. `Cloud Sync` 是可选能力：
   - 只负责跨设备文件 transport
   - 只有启用 Sync 时才需要 `syncVaultId`
3. `Memox` 是 Anyhunt 平台能力：
   - 只接收 `workspace content` 投影
   - 不再消费旧 `sync file lifecycle outbox`
4. 移动端在正式迁到 `Workspace Profile` 前，只保留 `Cloud Sync unavailable` 信息面；first-party transport 当前只覆盖 PC。

## 2. 服务端模型

### 2.1 Workspace

`apps/moryflow/server/src/workspace/**`

1. `Workspace` 是 Memory 作用域与可选 Sync transport 的共同父实体。
2. `POST /api/v1/workspaces/resolve` 固定按 `(userId, clientWorkspaceId)` 解析。
3. `memoryProjectId` 固定等于 `workspaceId`。
4. `syncVaultId` 只在 `syncRequested=true` 且当前 workspace 尚未开通 Sync 时创建。
5. `resolveWorkspace` 必须是并发幂等的：
   - 同一 `(userId, clientWorkspaceId)` 的并发首次请求不能返回 500
   - 同一 `workspaceId` 上的并发 `syncRequested=true` 只能生成一个 `syncVault`
   - 发生唯一键竞争时必须回读现有记录，而不是把唯一键错误暴露给客户端

### 2.2 Memory Gateway

`apps/moryflow/server/src/memory/**`

1. 所有 Memory API 固定要求 `workspaceId`。
2. `MemoryService.resolveScope()` 只按 `workspaceId` 校验用户归属。
3. Moryflow 对 Anyhunt 的 `project_id` 固定传 `workspaceId`，不再传 `vaultId`。
4. `Memory overview` 必须同时返回当前 `workspaceId` 下 `WorkspaceContentOutbox` 的 pending backlog，用于表达“本地内容已进入服务端 canonical 写链，但下游 Memox projection 尚未完成”的窗口。

### 2.3 Workspace Content

`apps/moryflow/server/src/workspace-content/**`

1. `POST /api/v1/workspace-content/batch-upsert` 是 source-derived memory 的正式 ingest 入口。
2. `POST /api/v1/workspace-content/batch-delete` 是文档删除/tombstone 的正式入口。
3. `WorkspaceDocument` 持有稳定文档身份；`WorkspaceDocumentRevision` 持有内容版本。
4. revision 支持两种模式：
   - `INLINE_TEXT`
   - `SYNC_OBJECT_REF`
5. 每次 upsert / delete 都写 `WorkspaceContentOutbox`，作为后续 Memox 投影的单一派生事实源。
6. `WorkspaceContentOutbox` 的处理结果必须 durable 落为：
   - `INDEXED`
   - `QUIET_SKIPPED`
   - `DELETED`
7. `QUIET_SKIPPED` 表示当前 canonical revision 没有可检索文本；这是健康终态，不是失败，也不是“仍在索引中”。
8. 服务端必须校验：
   - 已存在的 `documentId` 只能属于当前 `workspaceId`
   - `sync_object_ref.vaultId` 必须等于当前 workspace 的 `syncVaultId`
   - 不允许跨 workspace / 跨 vault 的客户端注入
9. `Sync commit` 在 publish `SyncFile` 时，必须先确保同一 `documentId` 的 `WorkspaceDocument` 已存在且归属于 `vault.workspaceId`。
   - `SyncFile.documentId` 与 `WorkspaceDocument.id` 是强一致外键
   - 不允许依赖异步 Memory ingest 先行创建 document
10. `SyncCommitService` 只负责确保 `WorkspaceDocument` identity 存在并归属正确；不负责写 `WorkspaceContentOutbox`。PC 客户端在 sync commit 成功后，由 `Memory Indexing Engine` 单独调用 `workspace-content batch-upsert` 产生 outbox 事件。

### 2.4 Memox Bridge

`apps/moryflow/server/src/memox/**`

1. `MemoxWorkspaceContentConsumerService` 只消费 `WorkspaceContentOutbox`。
2. `MemoxWorkspaceContentDrainService` 固定以 bounded direct drain + database lease 推进 outbox；正确性不得依赖 Bull queue worker 注册或 Redis queue delivery。
2. source contract 固定为：
   - `source_type = moryflow_workspace_markdown_v1`
   - `project_id = workspaceId`
   - `external_id = documentId`
3. `MemoxWorkspaceContentProjectionService` 对 `inline_text` 和 `sync_object_ref` 两种 payload 做统一投影。
4. canonical indexability 判定必须在 projection 阶段统一执行；`no indexable text` 固定收敛为 quiet skip，并删除旧 source（若存在）。
5. delete event 必须删除对应 source；source 已不存在时按 no-op 成功处理。
6. `MemoxWorkspaceContentReconcileService` 只允许修复真实漂移：
   - 缺失且仍应存在的 indexed source
   - 失效的 delete 投影
   - 冷却窗口后的真实死信
7. reconcile 必须把 `QUIET_SKIPPED` 视为健康终态，不得把 quiet skip 文档重新补回 outbox。
8. source-first 搜索固定下推 `source_types=['moryflow_workspace_markdown_v1']`。
9. `WorkspaceContentOutbox` 的 pending event backlog（含 `UPSERT + DELETE`）是服务端 projection 进度事实源；PC 端 Memory UI 不得把这个窗口误显示为 truly empty。

## 3. PC 模型

### 3.1 Workspace Marker

`apps/moryflow/pc/src/main/workspace-meta/**`

1. 每个本地工作区固定生成 `.moryflow/workspace.json`。
2. `clientWorkspaceId` 是本地工作区稳定身份，不再由路径推导。
3. 目录改名不会改变工作区身份。

### 3.2 Workspace Profile

`apps/moryflow/pc/src/main/workspace-profile/**`

1. profile key 固定为 `(userId, clientWorkspaceId)`。
2. profile 记录固定持有：
   - `workspaceId`
   - `memoryProjectId`
   - `syncVaultId?`
   - `syncEnabled`
3. 切账号时只切 active profile，不弹 `binding conflict`。

### 3.2.1 Chat Session Scope

`apps/moryflow/pc/src/main/chat-session-store/**` + `apps/moryflow/pc/src/main/chat/**`

1. `chat session` 也是 workspace profile 作用域内的本地状态，不允许脱离 `profileKey` 独立存在。
2. 分支会话、自动审批批处理、会话列表和任意基于 `sessionId` 的操作都必须受当前 `(vaultPath, profileKey)` scope 约束。
3. `fork` 必须继承源会话的 `profileKey`；禁止产生 `profileKey = null/undefined` 的跨账号孤儿分支会话。
4. 主进程 handler 不得以“知道 sessionId”为前提绕过 scope 校验；当前 active workspace/profile 不可见的会话必须按不存在处理。
5. `quick chat sessionId` 属于运行时缓存，不得跨账号/profile 复活旧会话；账号切换或运行时重置后必须失效，并且每次恢复都要重新校验当前 scope 可见性。

### 3.3 Device Config

`apps/moryflow/pc/src/main/device-config/**`

1. `deviceId / deviceName` 是设备级配置，不归属于具体 profile。
2. Sync 注册设备时只读取 `device-config`，不再从旧 cloud-sync store 读取。

### 3.4 Document Registry

`apps/moryflow/pc/src/main/workspace-doc-registry/**`

1. Markdown 文件固定由 `Document Registry` 分配稳定 `documentId`。
2. path 变化只更新 `path/title`，不会换 `documentId`。
3. `Memory Indexing Engine` 与 `Sync Engine` 共用同一文档身份。
4. unlink 后允许 registry 临时保留缺失文档条目，直到 delete propagation 与 sync reconciliation 都完成；禁止在下游 delete 之前抢先销毁 `documentId`。

### 3.5 Memory Indexing Engine

`apps/moryflow/pc/src/main/memory-indexing/**`

1. watcher 检测到 Markdown `add / change / unlink` 后，先走 `Document Registry` 获取稳定 `documentId`。
2. 未开 Sync 时，直接走 `inline_text` 上传。
3. 已开 Sync 且已有对象快照时，走 `sync_object_ref` 上传，避免双传正文。
4. rename / move 即使正文哈希不变，也必须重新 upsert `path/title` 元数据。
5. unlink 必须走正式 delete/tombstone 链路，不能只在本地忽略。
6. 该链路只依赖 `profile.workspaceId`，不依赖 `syncVaultId`。
7. 账号身份切换后，旧 profile 上尚未完成的 debounce / retry 任务必须立即失效，不能继续把内容写到旧 workspace。
8. 当前 active workspace 的 profile scope 或 binding 发生变化、但 `vaultPath` 未变化时，PC 仍必须对该 workspace 自动触发一次 reconcile/bootstrap；不得把 bootstrap 机会只绑在文件事件上。
9. 这类 bootstrap 固定只做“基于当前本地 Markdown 文件的一次 reconcile”，不做全量暴力重建，也不复用旧账号的派生数据。
10. membership runtime 必须先为当前 token 建立 `userId` 基线，再把后续 token 变化当作账号切换判定输入；同用户 token refresh 只能走最小恢复路径，不能误触发 full bootstrap。
11. PC Memory overview 的初始化语义必须同时考虑两类 pending：
   - 本地 `memory-indexing` bootstrap pending
   - 服务端 `WorkspaceContentOutbox` unresolved projection backlog（包含尚未处理和 dead-letter 后仍未收敛的事件）
12. 只要这两类 pending 之一仍成立，且文件级 ingest read model 还未产出真实 attention/indexing 项，Memory 页面都必须保持诚实的 `Scanning` 初始化态，而不是落成整页空态。
13. `Memory overview` 对 `WorkspaceContentOutbox` unresolved backlog 的查询必须固定走 `workspaceId + processedAt` 的热路径复合索引，不能把前台轮询路径退化成全表扫描。
14. `WorkspaceContentOutbox` 中已被当前 canonical 状态成功覆盖的旧 revision / stale delete / same-revision retry duplicate unresolved 行，必须在 consumer ack 路径里立即收敛掉；它们不能继续占用 projection backlog。
15. 这类 superseded-row 收敛只能命中“当前仍 unresolved 且没有有效 lease”的记录；active lease 代表并发 consumer 正在处理中的事实，不能被别的 ack 路径提前撤销。

### 3.6 Sync Engine

`apps/moryflow/pc/src/main/cloud-sync/**`

1. Sync 固定以当前 active `Workspace Profile` 运行。
2. `apply journal`、`staging`、`sync mirror state` 都按 `profileKey` 隔离。
3. `Cloud Sync` 只负责 transport / recovery / orphan cleanup，不再承接 Memory ingest。
4. Sync 不得在下游 delete/tombstone 传播前提前销毁共享 `documentId`。

### 3.7 Vault Teardown

`apps/moryflow/server/src/vault/**`

1. 删除 `Vault` 只表示删除 Sync transport，不表示删除 `Workspace`。
2. `Workspace` 是 Memory 主作用域；即便 Sync transport 被删除，workspace / document identity / Anyhunt source 仍然保留。
3. Vault teardown 必须完成三件事：
   - 删除 `SyncFile` / `VaultDevice` / 对象存储中的 sync object
   - 清理仍未处理的 `sync_object_ref` 型 `WorkspaceContentOutbox` 事件，避免 consumer 在 transport 被删后继续重试无效对象引用
   - 回算用户存储用量
4. Vault teardown 不得删除 `WorkspaceDocument`、`WorkspaceDocumentRevision` 或现有 Memox source；后续本地编辑会按当前 profile 状态重新以 `inline_text` 或新的 `sync_object_ref` 继续投影。

## 4. 用户流程

### 4.1 登录

1. 用户登录
2. 解析当前本地工作区 marker
3. resolve 当前账号对应的 `Workspace Profile`
4. `Memory` 立即可用

### 4.2 开启 Sync

1. 用户在设置页启用 `Cloud Sync`
2. PC 复用当前 `Workspace Profile`
3. Server 为该 workspace 创建或返回 `syncVaultId`
4. Sync engine 开始同步文件 transport

### 4.3 切换账号

1. 用户切换账号
2. PC 基于 `(新 userId, 同一个 clientWorkspaceId)` 切换到新的 profile
3. Memory scope 切到新 `workspaceId`
4. Sync 只接管新 profile 的 `syncVaultId/journal/mirror`
5. 若当前仍有 active workspace，PC 必须复用统一的 active workspace bootstrap 入口重建 runtime，并对现有本地 Markdown 文件自动触发一次 reconcile/bootstrap

### 4.4 删除文档

1. 本地 Markdown 删除
2. `Document Registry` 继续保留该文档的稳定 `documentId`
3. `Memory Indexing Engine` 发送 `workspace-content batch-delete`
4. Server 写入 `WorkspaceContentOutbox.DELETE`
5. Memox consumer 删除对应 `moryflow_workspace_markdown_v1`
6. Sync reconciliation 在确认缺失文档不再需要本地 mirror 后，再清理本地同步状态

## 5. 不变量

1. `Memory` 不得依赖 `syncVaultId` 才能工作。
2. `workspaceId` 是 Moryflow Memory 的唯一远端作用域。
3. `documentId` 是 Moryflow 文档的唯一稳定身份；`path` 只负责展示与本地定位。
4. `Cloud Sync` 与 `Workspace Content` 是两条并行写链；只有在 `sync_object_ref` 模式下才共享对象快照。
5. `Memox` 只认 `moryflow_workspace_markdown_v1 + workspaceId + documentId`，不再认旧 `note_markdown + vaultId + fileId`。
6. 所有本地同步状态都必须以 `profileKey` 为分片键；禁止不同账号共享一套 journal/mirror/binding 状态。
7. 文档删除必须沿 `workspace-content delete -> outbox delete -> memox delete` 传播，禁止留下孤儿 source。
8. 文档 rename / move 不能因为正文哈希不变而跳过 metadata 刷新。
9. 发布验收脚本必须验证新 `moryflow_workspace_markdown_v1` 合同，不能再把旧 `note_markdown` 当成主链成功标准。
10. Electron 主进程在窗口关闭、账号切换与 `before-quit` 时，必须停止 `Memory Indexing Engine` 与 `Cloud Sync Engine`，并清理当前工作区 registry cache，禁止旧 profile 的延迟任务跨生命周期继续写入。
11. `WorkspaceDocument` 是工作区内文档 identity 真相；当文档仍被 `SyncFile` 引用时，`workspace-content delete` 只能删除当前 revision 与 Memory 投影，不能销毁 `WorkspaceDocument` identity 本身。
12. `SyncFile.id == SyncFile.documentId == WorkspaceDocument.id == documentId` 是当前 rewrite 基线的冻结等式；PC `Document Registry` 生成的稳定 `documentId` 也是 Sync transport 的 `fileId`。
13. `WorkspaceContentOutbox.UPSERT` 一旦以 `QUIET_SKIPPED` 处理完成，就表示“当前 canonical revision 无需索引且链路健康”；后续 reconcile 不得再将其视为缺失 source。
14. 运行期不提供任何用户可见的 `Retry / Retry all / Rebuild` 入口；所有知识索引修复都由 bounded retry、queue redrive 和周期 reconcile 自动完成。
15. `Cloud Sync Engine` 在 `diff -> execute -> commit -> recovery` 长链路中必须绑定单个 `(vaultPath, profileKey, userId)` 同步会话；会话一旦漂移，当前批次必须立即中止，不能继续写 journal 或 mirror。
16. `WorkspaceContentOutbox` 的结构性坏 payload 必须首次处理即进入 DLQ；`schema parse` 失败不得进入可重试队列。
17. `chat session` 的隔离边界必须与 `Workspace Profile` 保持一致；任意 `sessionId` 操作不得穿透当前 `(vaultPath, profileKey)` scope。
18. PC 全局搜索中的 thread 索引也必须是 profile-scoped；同一 `vaultPath` 下不同 `profileKey` 的聊天会话不得互相进入搜索结果。
19. active workspace runtime bootstrap 必须只有一个正式入口；首次打开 workspace、切换 workspace、账号切换后 profile scope 变化、以及未来任何“scope 变了但 vault 没变”的场景，都必须复用这条入口，禁止再维护分裂的 `reinit`/`rescan` 特判链路。

## 6. 关键代码索引

### Server

- `apps/moryflow/server/src/workspace/workspace.service.ts`
- `apps/moryflow/server/src/workspace-content/workspace-content.service.ts`
- `apps/moryflow/server/src/memory/memory.service.ts`
- `apps/moryflow/server/src/memox/memox-source-contract.ts`
- `apps/moryflow/server/src/memox/memox-workspace-content-consumer.service.ts`
- `apps/moryflow/server/src/memox/memox-workspace-content-projection.service.ts`

### PC

- `apps/moryflow/pc/src/main/workspace-meta/identity.ts`
- `apps/moryflow/pc/src/main/workspace-profile/context.ts`
- `apps/moryflow/pc/src/main/workspace-doc-registry/index.ts`
- `apps/moryflow/pc/src/main/memory-indexing/engine.ts`
- `apps/moryflow/pc/src/main/cloud-sync/sync-engine/index.ts`
- `apps/moryflow/pc/src/main/app/ipc/memory-domain/*`
