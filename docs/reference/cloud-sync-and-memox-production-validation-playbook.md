---
title: Workspace Profile / Memory / Sync 生产验收 Playbook
date: 2026-03-14
scope: apps/anyhunt/server + apps/moryflow/server + apps/moryflow/pc + scripts/reset-rewrite-state.mjs
status: active
---

<!--
[INPUT]: reset rewrite runbook、生产 env 路径、部署 handoff 命令与当前最终架构
[OUTPUT]: 发布窗口前后固定执行顺序、健康检查、reset/cleanup、部署交接与 smoke 验收步骤
[POS]: docs/reference 生产功能验收操作手册

[PROTOCOL]: 仅在生产验收顺序、env 路径、固定命令、成功标准或 handoff 口径失真时更新。
-->

# Workspace Profile / Memory / Sync 生产验收 Playbook

## 目标

本手册定义 `Workspace Profile + Memory/Sync 解耦` 重写后的生产验收流程，用于保证：

1. 发布窗口前的 destructive reset 有固定入口。
2. 部署阶段的 migration handoff 明确且唯一。
3. 部署后的最小 smoke 能证明：
   - `Workspace` 主实体可用
   - `Memory` 不依赖 `Cloud Sync`
   - `Cloud Sync` 作为可选 transport 正常工作
   - `Workspace Content -> Memox` 搜索闭环成立

## 核心原则

1. 本次执行是 `reset rewrite`，不是升级迁移。
2. 不考虑历史兼容，不验证旧 `vaultId / note_markdown / binding-conflict` 路径。
3. reset 与 cleanup 由固定脚本执行；部署与发版由用户执行。
4. 验收优先验证“新世界是否成立”，不再围绕旧故障做兼容诊断。

## 固定输入

### 生产 env 路径

- Moryflow server env：`/Users/lin/code/moryflow/apps/moryflow/server/.env`
- Anyhunt server env：`/Users/lin/code/moryflow/apps/anyhunt/server/.env`

### 固定脚本入口

```bash
pnpm reset:rewrite:plan
pnpm reset:rewrite:execute
```

### 部署阶段 handoff 命令

```bash
pnpm --filter @moryflow/server exec prisma migrate deploy --config prisma.config.ts
pnpm --filter @anyhunt/anyhunt-server exec prisma migrate deploy --config prisma.main.config.ts
pnpm --filter @anyhunt/anyhunt-server exec prisma migrate deploy --config prisma.vector.config.ts
```

## 发布窗口固定顺序

### Step 1: 生产探活

```bash
curl -fsS https://server.anyhunt.app/health/live
curl -fsS https://server.anyhunt.app/health/ready
curl -fsS https://server.moryflow.com/health/live
curl -fsS https://server.moryflow.com/health/ready
```

通过标准：

1. 四个端点均返回 `200`
2. `ready` 显示数据库与 Redis 可用

### Step 2: dry-run

```bash
pnpm reset:rewrite:plan
```

必须确认：

1. Moryflow `DATABASE_URL`
2. Anyhunt `DATABASE_URL`
3. Anyhunt `VECTOR_DATABASE_URL`
4. Moryflow / Anyhunt `REDIS_URL`
5. Moryflow / Anyhunt `R2_BUCKET_NAME`
6. deploy handoff 命令

### Step 3: destructive cleanup

```bash
pnpm reset:rewrite:execute
```

如需一并清理站点发布桶：

```bash
pnpm reset:rewrite:execute -- --include-moryflow-sites-bucket
```

当前脚本职责固定为：

1. reset 三套数据库 schema
2. flush Moryflow / Anyhunt Redis
3. 清空 Moryflow / Anyhunt R2 bucket

### Step 4: 部署 handoff

本阶段不由代理代管。用户执行：

```bash
pnpm --filter @moryflow/server exec prisma migrate deploy --config prisma.config.ts
pnpm --filter @anyhunt/anyhunt-server exec prisma migrate deploy --config prisma.main.config.ts
pnpm --filter @anyhunt/anyhunt-server exec prisma migrate deploy --config prisma.vector.config.ts
```

### Step 5: 部署后 smoke

部署完成后，至少验证以下链路：

#### A. Workspace Resolve

1. 打开任意本地工作区
2. 登录账号
3. 确认当前工作区能够 resolve 出 `workspaceId`

#### B. Memory Without Sync

1. 保持 `Cloud Sync` 关闭
2. 在当前工作区写入或修改 Markdown
3. 确认：
   - `Memory overview` 可用
   - `Memory search` 可用
   - `source-derived facts` 可在后续轮询中出现

#### C. Optional Sync

1. 在设置页开启 `Cloud Sync`
2. 确认同步状态进入当前 profile
3. 确认不会弹出旧 `binding conflict` 阻断框
4. 切换账号后，确认不会复用旧 profile 的 journal / recovery

#### D. Memox Search

1. 通过 Anyhunt `sources/search` 检索刚写入的文档
2. 确认 source contract 为：
   - `source_type = moryflow_workspace_markdown_v1`
   - `project_id = workspaceId`
   - `external_id = documentId`
3. 通过 Moryflow `Memory search` 搜回同一文档
4. 确认 workspace-content 链路闭环：
   - 确认 `WorkspaceContentOutbox` 有对应的已处理事件（`processedAt IS NOT NULL`）
   - 确认 Memox source 的 `external_id` 匹配 workspace document registry 的 `documentId`

## 成功标准

1. 发布窗口内 reset/cleanup 只通过固定脚本完成，无需手写临时 SQL/Redis/R2 命令。
2. 部署后 `Memory` 在未开 Sync 时可正常使用。
3. `Cloud Sync` 仅作为可选 transport 工作，不阻断 `Memory`。
4. `Workspace Content -> Memox` 闭环成立，搜索能命中新写入文档。
5. 切账号后不再出现旧 `cleanup-orphans 403` 串状态路径。

## 失败分流

1. dry-run 目标不对：
   - 先停在 Step 2，不执行 destructive reset
2. reset 失败：
   - 先查 env 路径、数据库权限、Redis URL、bucket 名称
3. deploy 后 `Memory` 不可用：
   - 先查 `workspace/profile` resolve
4. deploy 后 source-derived memory 不落库：
   - 先查 `workspace-content` / `memox-workspace-content-consumer`
5. deploy 后 Sync 串账号：
   - 先查 `profileKey`、`apply-journal`、`sync-mirror-state`
