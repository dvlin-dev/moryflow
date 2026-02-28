---
title: Aiget → Anyhunt 全量品牌迁移（无历史兼容）
date: 2026-01-16
scope: anyhunt.app, server.anyhunt.app, console.anyhunt.app, admin.anyhunt.app, docs.anyhunt.app, cdn.anyhunt.app
status: active
---

<!--
[INPUT]: 现有 Monorepo（Aiget + Moryflow）与“零历史包袱/可重置 DB”的约束
[OUTPUT]: 可落地执行的 Aiget → Anyhunt 全量 rebrand 迁移步骤（含 Prisma 迁移重置方案）
[POS]: 品牌/域名/包命名/环境变量/DB 的一次性重命名指南

[PROTOCOL]: 本文件变更如影响域名/命名/部署口径，需同步更新：
  - docs/design/anyhunt/core/domains-and-deployment.md
  - docs/design/anyhunt/runbooks/*（Dokploy/反代配置）
  - 根 CLAUDE.md（全局约束/索引）
-->

# 目标

将 Monorepo 内的 **Aiget** 品牌与技术命名 **全量替换为 Anyhunt**，且**不做任何历史兼容**（包括域名、环境变量、API Key 前缀、数据库迁移历史等）。由于当前无真实数据，迁移过程允许直接清库/重建迁移。

用户可见品牌文案（英文）：

- 主口号：`Any topic. AI hunts`
- 副口号：`Always-on updates from across the web.`

本迁移的最终对外拓扑（固定）：

- `https://anyhunt.app`
- `https://server.anyhunt.app/api/v1/...`
- `https://docs.anyhunt.app`
- `https://console.anyhunt.app`
- `https://admin.anyhunt.app`
- `https://cdn.anyhunt.app`（CDN 固定域名；`R2_PUBLIC_URL` 需与之保持一致）
- `https://status.anyhunt.app`（状态页，可选）

> 备注：`Moryflow` 业务线对外域名保持 `moryflow.com / moryflow.app` 不变；但由于本次要求“全仓改名”，内部 npm scope、共享包引用等也会随之统一改名。

# 已对齐口径（可以开始迁移的前提）

- 域名矩阵：保持原有子域名形态，仅根域名从 `aiget.dev` 切到 `anyhunt.app`
- API：`https://server.anyhunt.app/api/v1/...`（路径规范 `/api/v1` 不变）
- Auth：需要跨子域登录（`Domain=.anyhunt.app`）
- 范围：全仓改名（目录/包名/npm scope/env 前缀/文案等全部改）
- npm scope：`@aiget/*` → `@anyhunt/*`
- API Key 前缀：`ah_`（不兼容旧前缀）
- Env var 前缀：`AIGET_*` → `ANYHUNT_*`（不兼容旧变量名）
- 数据库：沿用你当前环境的 `DATABASE_URL` / `VECTOR_DATABASE_URL`，允许重置为“干净新项目”
- 邮件/回调：统一以 `anyhunt.app` 为准
- 旧域名：不做跳转，直接废弃

# 关键规范（必须一致）

## 命名映射（旧 → 新）

| 类型                 | 旧                        | 新                    |
| -------------------- | ------------------------- | --------------------- |
| Brand                | Aiget / Aiget Dev / AIGet | Anyhunt / Anyhunt Dev |
| 根 package.json name | `aiget`                   | `anyhunt`             |
| npm scope            | `@aiget/*`                | `@anyhunt/*`          |
| 目录                 | `apps/aiget/**`           | `apps/anyhunt/**`     |
| API 基础域名         | `server.aiget.dev`        | `server.anyhunt.app`  |
| 官网                 | `aiget.dev`               | `anyhunt.app`         |
| Console              | `console.aiget.dev`       | `console.anyhunt.app` |
| Admin                | `admin.aiget.dev`         | `admin.anyhunt.app`   |
| Docs                 | `docs.aiget.dev`          | `docs.anyhunt.app`    |
| CDN（示例）          | `cdn.aiget.dev`           | `cdn.anyhunt.app`     |
| Cookie Domain        | `.aiget.dev`              | `.anyhunt.app`        |
| API Key prefix       | `ag_`                     | `ah_`                 |
| Env var 前缀         | `AIGET_*`                 | `ANYHUNT_*`           |

## API Key 规则（Anyhunt Dev）

- 前缀：`ah_`
- 格式：`ah_<64 hex chars>`
- DB 存储：仅存 `SHA256`，明文仅创建时返回一次（沿用现有安全策略）

## 生产环境 CORS / CSRF / Cookie

- `ALLOWED_ORIGINS` / `TRUSTED_ORIGINS`（逗号分隔）至少包含：
  - `https://anyhunt.app`
  - `https://console.anyhunt.app`
  - `https://admin.anyhunt.app`
- Better Auth 跨子域 Cookie：`Domain=.anyhunt.app`
- API 入口固定：`https://server.anyhunt.app/api/v1`（不再使用 `anyhunt.app` 作为 API 域名）

# 迁移步骤（建议按顺序执行）

## 0. 前置与原则

- 确保工作区无未提交改动（建议新建分支，例如 `chore/rebrand-anyhunt`）。
- 本次迁移不修改 `archive/**`（外部仓库快照保留原貌，避免巨大 diff 与历史语义污染）。
- Generated 文件（如 `**/.tanstack/**` 等）不要手改。

## 1. 结构性重命名（目录与包名）

1. 目录改名（建议使用 `git mv`）：
   - `apps/aiget` → `apps/anyhunt`
2. `package.json` 全量替换：
   - 根 `package.json`：`name: "aiget"` → `name: "anyhunt"`
   - 工作区所有包：`"name": "@aiget/..."` → `"name": "@anyhunt/..."`
3. 代码 import 与 pnpm filter 全量替换：
   - `@aiget/` → `@anyhunt/`
   - `pnpm --filter @aiget/...` → `pnpm --filter @anyhunt/...`

> 注意：这一步会波及 `Moryflow`（其代码大量依赖共享包），属于预期行为。

## 2. 域名替换（硬编码 + 文档 + SEO）

全仓替换以下域名（不含 `archive/**`）：

- `aiget.dev` → `anyhunt.app`
- `server.aiget.dev` → `server.anyhunt.app`
- `docs.aiget.dev` → `docs.anyhunt.app`
- `console.aiget.dev` → `console.anyhunt.app`
- `admin.aiget.dev` → `admin.anyhunt.app`
- `cdn.aiget.dev` → `cdn.anyhunt.app`

重点检查点（必须手动复核）：

- 认证 cookie domain：`.anyhunt.app`
- redirect 白名单（防 open redirect）
- 前端 canonical/og:url/站点名（避免 SEO 混乱）
- 邮件链接生成（Digest/通知类）

## 3. 环境变量改名（不兼容旧名）

将所有 `AIGET_*` 改为 `ANYHUNT_*`，并同步更新：

- `.env.example`（所有 app/server）
- 运行手册（deploy/runbooks）
- 代码读取点（`ConfigService.get(...)` 等）

示例（迁移后）：

- `ANYHUNT_WWW_URL=https://anyhunt.app`
- `BETTER_AUTH_URL=https://server.anyhunt.app`
- `SERVER_URL=https://server.anyhunt.app`

## 4. API Key 前缀切换（ag* → ah*）

需要同步更新的类别：

- 服务端常量与校验：`API_KEY_PREFIX`
- 单元测试与 fixtures（断言正则等）
- 文档示例与 Console/UI 示例代码
- `packages/types` 内的产品信息与 `ApiKeyPrefix` 定义

## 5. Prisma 迁移重置（方案 B：rebase / 重新 baseline）

### 5.1 为什么选择 rebase

- 你明确允许“零历史兼容 + 可重置 DB”
- 迁移历史里存在 Aiget 文案/示例（如 demo email），继续保留会污染后续语义

### 5.2 操作步骤（双库：main + vector）

1. **确保数据库为空**（你已确认可直接重置为“干净新项目”）：
   - 主库：`DATABASE_URL` 指向的库（例如 `...:5432/db?...`）
   - 向量库：`VECTOR_DATABASE_URL` 指向的库（例如 `...:5433/vector?...`）
2. 删除旧 migration 历史（在 server 包内）：
   - `prisma/main/migrations/**`
   - `prisma/vector/migrations/**`
   - 对应的 `migration_lock.toml`
3. 基于当前 schema 生成全新的 `init` 迁移（推荐：`migrate diff`，无需 shadow DB 权限）：

```bash
# 以 server 包为工作目录执行
ts=$(date +%Y%m%d%H%M%S)
mkdir -p "prisma/main/migrations/${ts}_init" "prisma/vector/migrations/${ts}_init"

pnpm exec prisma migrate diff --config prisma.main.config.ts --from-empty --to-schema=prisma/main/schema.prisma --script --output "prisma/main/migrations/${ts}_init/migration.sql"
pnpm exec prisma migrate diff --config prisma.vector.config.ts --from-empty --to-schema=prisma/vector/schema.prisma --script --output "prisma/vector/migrations/${ts}_init/migration.sql"
```

4. 重置数据库 schema（你已确认可清空重建）：

```bash
echo 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;' | pnpm exec prisma db execute --config prisma.main.config.ts --stdin
echo 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;' | pnpm exec prisma db execute --config prisma.vector.config.ts --stdin
```

5. 部署迁移（本地/CI/生产口径一致）：

```bash
pnpm exec prisma migrate deploy --config prisma.main.config.ts
pnpm exec prisma migrate deploy --config prisma.vector.config.ts
```

6. 重新生成 Prisma Client（确保类型与 generated 目录匹配）：

```bash
pnpm prisma:generate
```

7. 初始管理员账号：通过 `ADMIN_EMAILS` 邮箱白名单，注册后自动授予 `isAdmin=true`（不在启动期注入密码）。

## 6. 运行与验证

至少通过：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

并做一次手动验收（建议顺序）：

1. `server` 启动后 `/health` 正常
2. `console/admin` 登录成功（Cookie Domain `.anyhunt.app` 生效）
3. 用 `ah_` API Key 调用 `/api/v1/scrape`（401/403 与成功场景都验证；具体能力与路由待以实现为准）
4. 关键页面 SEO（`anyhunt.app` canonical/og:url）

# 风险与注意事项

- “全仓 npm scope 改名”会影响所有工作区包（包括 Moryflow）；需要一次性修正所有 import、tsconfig path、构建脚本与 Dockerfile filter。
- `archive/**` 不改：后续如需要“对外开源拆分/迁移参考”，保留原快照语义更有价值。

# 迁移完成后需要你人工修改/配置的事项（清单）

- DNS：为 `anyhunt.app` 及子域名（`server/console/admin/docs/cdn/status`）配置解析记录（A/AAAA/CNAME），并确认反代上游 `Host`/`X-Forwarded-Proto` 转发正确
- 域名口径：canonical 固定 `anyhunt.app`（在反代层把 `www.anyhunt.app` 301 到 `anyhunt.app`）
- 证书：为所有子域名签发/续期 TLS（可用泛域名 `*.anyhunt.app`，或逐个域名）
- 反代路由：在 Dokploy/1panel/Nginx 上把各子域名路由到对应服务（并确保应用侧开启 `trust proxy` 口径不变）
- 环境变量：在部署平台里更新为 `ANYHUNT_*`（不保留 `AIGET_*`），并设置 `DATABASE_URL`/`VECTOR_DATABASE_URL`/`R2_PUBLIC_URL` 等敏感项（不要把真实密钥写入仓库）
- npm：创建/确认 `@anyhunt` scope（组织/权限/2FA），并在 CI/部署平台配置 `NPM_TOKEN`（如需发布共享包）
- GitHub：组织统一使用 `https://github.com/anyhunt`，并更新 CI secrets/webhook，以及文档中的仓库链接
- OAuth/第三方回调：在 Google/Apple（以及其他 OAuth 提供方）里把 redirect/callback origins 改为 `*.anyhunt.app`
- 邮件：在 Resend 验证 `anyhunt.app` 发信域名与 From（`Anyhunt <noreply@anyhunt.app>`），并同步更新邮件模板里的链接域名
- Storage/CDN：`R2_PUBLIC_URL` 固定为 `https://cdn.anyhunt.app`，并更新 CORS 策略
- pgvector：确认向量库 PostgreSQL 已安装 `vector` 扩展（Prisma 迁移会执行 `CREATE EXTENSION`，但前提是数据库已具备该扩展）
- 监控与健康检查：更新探活 URL（例如 `https://server.anyhunt.app/health`）与告警规则/面板上的域名展示
