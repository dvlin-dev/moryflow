---
title: Workspace Profile Reset Rewrite 执行手册
date: 2026-03-14
scope: moryflow, anyhunt, workspace-profile, memory, cloud-sync, memox
status: active
---

<!--
[INPUT]: Workspace Profile + Memory/Sync 解耦重写方案、双边 reset rewrite 原则、现有生产 env 路径
[OUTPUT]: destructive reset/cleanup 固定入口、执行边界、发布交接命令与检查清单
[POS]: Workspace Profile / Memory / Cloud Sync 重构发布窗口的 reset runbook

[PROTOCOL]: 仅在 env 路径、reset 范围、脚本入口、发布边界或部署交接命令失真时更新。
-->

# Workspace Profile Reset Rewrite 执行手册

## 1. 目标

这份 runbook 只服务于当前这次 `Workspace Profile + Memory/Sync 解耦` 重写。

它的目标不是兼容旧系统，而是在 **无真实用户、允许全量清空** 的前提下，给出一个固定的 destructive reset / cleanup 入口，使发布窗口内的清理动作可以稳定重复执行。

## 2. 硬原则

1. 本次执行是 **全量 reset rewrite**，不是升级迁移。
2. 不考虑历史兼容，不保留旧 `vaultId` memory scope，不写 upgrade script。
3. `Moryflow` 与 `Anyhunt` 数据一起清空；旧 migration 历史一起废弃。
4. 本 runbook 只负责：
   - 数据库 reset
   - Redis/Bull 状态清理
   - R2 对象清理
   - 发布阶段 handoff 命令交付
5. 本 runbook 不负责：
   - 合并主分支
   - 部署服务
   - 发布 PC 安装包
6. 默认不清理 `Moryflow sites bucket`；只有显式要求时才一起清理。

## 3. 固定 env 路径

当前发布窗口的事实源固定为：

- Moryflow server env：`/Users/lin/code/moryflow/apps/moryflow/server/.env`
- Anyhunt server env：`/Users/lin/code/moryflow/apps/anyhunt/server/.env`

脚本会读取这两个文件，但不会回显敏感值。

## 4. 固定入口

仓库根目录提供了统一入口：

```bash
pnpm reset:rewrite:plan
pnpm reset:rewrite:execute
```

真实脚本路径：

`/Users/lin/.codex/worktrees/aa87/moryflow/scripts/reset-rewrite-state.mjs`

执行模式默认假设当前工作树已经完成依赖安装；`dry-run` 不依赖这些运行时依赖，`--execute` 会在真正清理数据库、Redis 和 R2 时按需加载相关包。

## 5. 默认执行内容

### 5.1 数据库

默认会 reset 这三个数据库 schema：

1. Moryflow `DATABASE_URL`
2. Anyhunt `DATABASE_URL`
3. Anyhunt `VECTOR_DATABASE_URL`

reset 方式固定为：

- `DROP SCHEMA public CASCADE`
- `CREATE SCHEMA public`

不保留 `_prisma_migrations`，也不做 data migration。

### 5.2 Redis / Bull

默认会对 env 中配置的 Redis 执行 `flushdb`：

1. Moryflow `REDIS_URL`
2. Anyhunt `REDIS_URL`

如果两个服务实际指向同一个 Redis URL，脚本会自动去重，只执行一次。

### 5.3 R2

默认会清空：

1. Moryflow `R2_BUCKET_NAME`
2. Anyhunt `R2_BUCKET_NAME`

默认不会清空：

1. Moryflow `R2_SITES_BUCKET_NAME`

如果确实需要一起清理站点发布桶，必须显式追加：

```bash
pnpm reset:rewrite:execute -- --include-moryflow-sites-bucket
```

## 6. 推荐执行顺序

### 6.1 先做 dry-run

```bash
pnpm reset:rewrite:plan
```

dry-run 必须确认以下信息：

1. 读到的 env 路径正确
2. 计划清理的数据库目标正确
3. 计划清理的 Redis 目标正确
4. 计划清理的 bucket 目标正确
5. 部署 handoff 命令正确

### 6.2 确认发布窗口后执行 destructive cleanup

```bash
pnpm reset:rewrite:execute
```

如果只想跳过某一类动作，可以使用：

```bash
pnpm reset:rewrite:execute -- --skip-databases
pnpm reset:rewrite:execute -- --skip-redis
pnpm reset:rewrite:execute -- --skip-r2
```

### 6.3 如需覆盖 env 路径

```bash
pnpm reset:rewrite:plan -- --moryflow-env /abs/path/to/moryflow.env --anyhunt-env /abs/path/to/anyhunt.env
pnpm reset:rewrite:execute -- --moryflow-env /abs/path/to/moryflow.env --anyhunt-env /abs/path/to/anyhunt.env
```

## 7. 发布交接命令

清理完成后，部署阶段由用户执行以下命令：

```bash
pnpm --filter @moryflow/server exec prisma migrate deploy --config prisma.config.ts
pnpm --filter @anyhunt/anyhunt-server exec prisma migrate deploy --config prisma.main.config.ts
pnpm --filter @anyhunt/anyhunt-server exec prisma migrate deploy --config prisma.vector.config.ts
```

这三条命令属于部署阶段，不属于本 runbook 代管范围。

## 8. 本地状态清理口径

线上 reset 之外，本次重构还要求清理旧本地状态。需要清理的旧状态包括：

1. `cloud-sync` store
2. 旧 `binding` 数据
3. 旧 `file-index`
4. 旧 `apply-journal`
5. 旧 `staging` 目录
6. 旧 `binding-conflict` 决策残留

这些状态不由当前线上 reset 脚本代管，但必须在新版本 PC 初始化逻辑中视为废弃世界，不做兼容读取。

## 9. 失败与回滚口径

本 runbook 没有“恢复旧数据”的回滚路径。

如果 cleanup 执行后需要重新来一次，唯一正确动作是：

1. 修正代码或 env
2. 重新执行 reset
3. 重新部署新基线

由于这次明确不保留历史兼容，所以“回滚”不代表恢复旧世界，只代表重新建立新世界。

## 10. 验收最低标准

执行完成后，至少需要满足：

1. 三套数据库 schema 已清空
2. Redis/Bull 队列残留已清空
3. 旧 Sync / Memox 对象残留已清空
4. 部署 handoff 命令已明确
5. 部署后的新链路只使用：
   - `workspaceId`
   - `documentId`
   - `moryflow_workspace_markdown_v1`
