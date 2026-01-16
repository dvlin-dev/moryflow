---
title: Aiget → Anyfeed 全量品牌迁移（无历史兼容）
date: 2026-01-16
scope: anyfeed.dev, server.anyfeed.dev, console.anyfeed.dev, admin.anyfeed.dev, docs.anyfeed.dev, cdn.anyfeed.dev
status: active
---

<!--
[INPUT]: 现有 Monorepo（Aiget + Moryflow）与“零历史包袱/可重置 DB”的约束
[OUTPUT]: 可落地执行的 Aiget → Anyfeed 全量 rebrand 迁移步骤（含 Prisma 迁移重置方案）
[POS]: 品牌/域名/包命名/环境变量/DB 的一次性重命名指南

[PROTOCOL]: 本文件变更如影响域名/命名/部署口径，需同步更新：
  - docs/architecture/domains-and-deployment.md
  - docs/runbooks/deploy/*（Dokploy/反代配置）
  - 根 CLAUDE.md（全局约束/索引）
-->

# 目标

将 Monorepo 内的 **Aiget** 品牌与技术命名 **全量替换为 Anyfeed**，且**不做任何历史兼容**（包括域名、环境变量、API Key 前缀、数据库迁移历史等）。由于当前无真实数据，迁移过程允许直接清库/重建迁移。

本迁移的最终对外拓扑（固定）：

- `https://anyfeed.dev`
- `https://server.anyfeed.dev/api/v1/...`
- `https://docs.anyfeed.dev`
- `https://console.anyfeed.dev`
- `https://admin.anyfeed.dev`
- `https://cdn.anyfeed.dev`（仅作为示例域名；真实以 `R2_PUBLIC_URL` 为准）

> 备注：`Moryflow` 业务线对外域名保持 `moryflow.com / moryflow.app` 不变；但由于本次要求“全仓改名”，内部 npm scope、共享包引用等会随之统一改为 `@feedex/*`。

# 关键规范（必须一致）

## 命名映射（旧 → 新）

| 类型                 | 旧                        | 新                    |
| -------------------- | ------------------------- | --------------------- |
| Brand                | Aiget / Aiget Dev / AIGet | Anyfeed / Anyfeed Dev |
| 根 package.json name | `aiget`                   | `anyfeed`             |
| npm scope            | `@aiget/*`                | `@anyfeed/*`          |
| 目录                 | `apps/aiget/**`           | `apps/anyfeed/**`     |
| API 基础域名         | `server.aiget.dev`        | `server.anyfeed.dev`  |
| 官网                 | `aiget.dev`               | `anyfeed.dev`         |
| Console              | `console.aiget.dev`       | `console.anyfeed.dev` |
| Admin                | `admin.aiget.dev`         | `admin.anyfeed.dev`   |
| Docs                 | `docs.aiget.dev`          | `docs.anyfeed.dev`    |
| CDN（示例）          | `cdn.aiget.dev`           | `cdn.anyfeed.dev`     |
| Cookie Domain        | `.aiget.dev`              | `.anyfeed.dev`        |
| API Key prefix       | `ag_`                     | `af_`                 |
| Env var 前缀         | `AIGET_*`                 | `ANYFEED_*`           |

## API Key 规则（Anyfeed Dev）

- 前缀：`af_`
- 格式：`af_<64 hex chars>`
- DB 存储：仅存 `SHA256`，明文仅创建时返回一次（沿用现有安全策略）

## 生产环境 CORS / CSRF / Cookie

- `ALLOWED_ORIGINS` / `TRUSTED_ORIGINS`（逗号分隔）至少包含：
  - `https://anyfeed.dev`
  - `https://console.anyfeed.dev`
  - `https://admin.anyfeed.dev`
- Better Auth 跨子域 Cookie：`Domain=.anyfeed.dev`
- API 入口固定：`https://server.anyfeed.dev/api/v1`（不再使用 `anyfeed.dev` 作为 API 域名）

# 迁移步骤（建议按顺序执行）

## 0. 前置与原则

- 确保工作区无未提交改动（建议新建分支，例如 `chore/rebrand-feedex`）。
- 本次迁移不修改 `archive/**`（外部仓库快照保留原貌，避免巨大 diff 与历史语义污染）。
- Generated 文件（如 `**/.tanstack/**` 等）不要手改。

## 1. 结构性重命名（目录与包名）

1. 目录改名（建议使用 `git mv`）：
   - `apps/aiget` → `apps/anyfeed`
2. `package.json` 全量替换：
   - 根 `package.json`：`name: "aiget"` → `name: "anyfeed"`
   - 工作区所有包：`"name": "@aiget/..."` → `"name": "@anyfeed/..."`
3. 代码 import 与 pnpm filter 全量替换：
   - `@aiget/` → `@anyfeed/`
   - `pnpm --filter @aiget/...` → `pnpm --filter @anyfeed/...`

> 注意：这一步会波及 `Moryflow`（其代码大量依赖共享包），属于预期行为。

## 2. 域名替换（硬编码 + 文档 + SEO）

全仓替换以下域名（不含 `archive/**`）：

- `aiget.dev` → `anyfeed.dev`
- `aiget.dev` → `anyfeed.dev`
- `server.aiget.dev` → `server.anyfeed.dev`
- `docs.aiget.dev` → `docs.anyfeed.dev`
- `console.aiget.dev` → `console.anyfeed.dev`
- `admin.aiget.dev` → `admin.anyfeed.dev`
- `cdn.aiget.dev` → `cdn.anyfeed.dev`

重点检查点（必须手动复核）：

- 认证 cookie domain：`.anyfeed.dev`
- redirect 白名单（防 open redirect）
- 前端 canonical/og:url/站点名（避免 SEO 混乱）
- 邮件链接生成（Digest/通知类）

## 3. 环境变量改名（不兼容旧名）

将所有 `AIGET_*` 改为 `ANYFEED_*`，并同步更新：

- `.env.example`（所有 app/server）
- 运行手册（deploy/runbooks）
- 代码读取点（`ConfigService.get(...)` 等）

示例（迁移后）：

- `ANYFEED_WWW_URL=https://anyfeed.dev`
- `BETTER_AUTH_URL=https://server.anyfeed.dev`
- `SERVER_URL=https://server.anyfeed.dev`

## 4. API Key 前缀切换（ag* → af*）

需要同步更新的类别：

- 服务端常量与校验：`API_KEY_PREFIX`
- 单元测试与 fixtures（断言正则、seed key hash）
- 文档示例与 Console/UI 示例代码
- `packages/types` 内的产品信息与 `ApiKeyPrefix` 定义

## 5. Prisma 迁移重置（方案 B：rebase / 重新 baseline）

### 5.1 为什么选择 rebase

- 你明确允许“零历史兼容 + 可重置 DB”
- 迁移历史里存在 Aiget 文案/示例（如 demo email），继续保留会污染后续语义

### 5.2 操作步骤（双库：main + vector）

1. **确保数据库为空**（建议直接 drop 并重建）：
   - 主库：`anyfeed`
   - 向量库：`anyfeed_vector`
2. 删除旧 migration 历史（在 server 包内）：
   - `prisma/main/migrations/**`
   - `prisma/vector/migrations/**`
   - 对应的 `migration_lock.toml`
3. 基于当前 schema 生成全新的 `init` 迁移（create-only）：

```bash
# 以 server 包为工作目录执行
pnpm exec prisma migrate dev --config prisma.main.config.ts --name init --create-only
pnpm exec prisma migrate dev --config prisma.vector.config.ts --name init --create-only
```

4. 部署迁移（本地/CI/生产口径一致）：

```bash
pnpm exec prisma migrate deploy --config prisma.main.config.ts
pnpm exec prisma migrate deploy --config prisma.vector.config.ts
```

5. 重新生成 Prisma Client（确保类型与 generated 目录匹配）：

```bash
pnpm prisma:generate
```

6. 如有 seed（演示账号/默认数据），统一改为 Anyfeed 语义并重新执行：

```bash
pnpm exec prisma db seed
```

> 说明：本仓库 server 已维护 `prisma:generate`/`prisma db seed` 入口；以它们为准，避免漏掉双库 client。

## 6. 运行与验证

至少通过：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

并做一次手动验收（建议顺序）：

1. `server` 启动后 `/health` 正常
2. `console/admin` 登录成功（Cookie Domain `.anyfeed.dev` 生效）
3. 用 `fd_` API Key 调用 `/api/v1/scrape`（401/403 与成功场景都验证）
4. 关键页面 SEO（`anyfeed.dev` canonical/og:url）

# 风险与注意事项

- `feedex` 与 `FedEx` 易混淆：建议在官网与文档中避免任何“FedEx”相关文案或视觉暗示；上线前做一次商标/域名/搜索引擎混淆风险检查。
- “全仓 npm scope 改名”会影响所有工作区包（包括 Moryflow）；需要一次性修正所有 import、tsconfig path、构建脚本与 Dockerfile filter。
- `archive/**` 不改：后续如需要“对外开源拆分/迁移参考”，保留原快照语义更有价值。
