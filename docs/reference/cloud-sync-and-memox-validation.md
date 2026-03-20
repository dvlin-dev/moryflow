---
title: Workspace Profile / Memory / Sync 验证基线
date: 2026-03-14
scope: apps/moryflow/server + apps/moryflow/pc + apps/anyhunt/server + scripts/reset-rewrite-state.mjs
status: active
---

<!--
[INPUT]: Workspace Profile reset rewrite 后的服务端/PC/Anyhunt 主链、reset runbook 与固定验证入口
[OUTPUT]: 当前唯一验证基线、执行顺序、分层职责与成功标准
[POS]: docs/reference 核心功能验证参考

[PROTOCOL]: 当验证范围、执行顺序、固定命令、成功标准或失败分流失真时更新本文件；不维护时间线式排查日志。
-->

# Workspace Profile / Memory / Sync 验证基线

## 目标

本文件定义 `Workspace Profile + Memory/Sync 解耦` 重写后的统一验证口径，覆盖：

1. `Workspace` / `Workspace Profile` 主链是否成立。
2. `Memory` 是否在未开启 `Cloud Sync` 时独立可用。
3. `Workspace Content -> Memox` 写链与搜索读链是否闭环。
4. `Cloud Sync` 是否作为可选 transport 正常工作。
5. `reset rewrite` 的 dry-run / destructive cleanup 是否有固定入口。
6. 删除、rename、账号切换等运行时边界是否与新架构不变量一致。

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

优先入口：

- `apps/moryflow/server/src/workspace/**/*.spec.ts`
- `apps/moryflow/server/src/workspace-content/**/*.spec.ts`
- `apps/moryflow/server/src/memory/**/*.spec.ts`
- `apps/moryflow/server/src/memox/**/*.spec.ts`

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

1. `pnpm reset:rewrite:plan`
2. `pnpm reset:rewrite:execute -- --skip-databases --skip-redis --skip-r2`
3. `pnpm harness:check`
4. 生产验收入口只允许使用新 source contract：
   - `moryflow_workspace_markdown_v1`
   - `workspaceId + documentId`

目的：

1. 确认 env 路径被正确解析
2. 确认 plan/execute 入口稳定存在
3. 确认文档索引与 runbook 没有悬空引用

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
pnpm reset:rewrite:plan
pnpm harness:check
```

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

### Cloud Sync

1. Sync 只在当前 `Workspace Profile` 下运行
2. 切账号后不会复用旧账号 journal / recovery 状态
3. `cleanup-orphans 403` 不再作为跨账号状态串用的可复现路径

### Reset / Handoff

1. `pnpm reset:rewrite:plan` 能打印三套数据库、Redis、R2 目标与 migrate handoff
2. `pnpm reset:rewrite:execute` 具备真实 destructive cleanup 能力
3. 部署阶段的 schema 入口只允许执行文档中冻结的 `prisma migrate deploy`
4. 若目标环境存在历史 Memox 数据，部署后还必须执行 feature runbook 里的 `sources/reindex-all` 与 `graph/rebuild`；不能把这两步误认为 migration 会自动完成

## 失败分流

1. `workspace resolve` 失败：
   - 先查 `workspace/` 与 `workspace-profile/`
2. `Memory` 在未开 Sync 时不可用：
   - 先查 `memory-ipc-handlers` 是否仍要求 binding
3. source-derived memory 不落库：
   - 先查 `workspace-content` 与 `memox-workspace-content-consumer`
4. 切账号后 Sync 异常：
   - 先查 `profileKey`、`apply-journal`、`sync-mirror-state`
5. reset script 失败：
   - 先查 env 路径、数据库 URL、Redis URL、R2 bucket 名称
6. 删除后 Memory 结果残留或 rename 路径未刷新：
   - 先查 `memory-indexing`、`workspace-content batch-delete`、`memox-workspace-content-projection`
