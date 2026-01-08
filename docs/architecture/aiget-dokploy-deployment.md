---
title: Aiget Dokploy 多项目部署清单
date: 2026-01-08
scope: aiget.dev, dokploy, deployment
status: active
---

<!--
[INPUT]: Aiget Dev 多项目部署需求（Dokploy）；8c16g 机器部署边界
[OUTPUT]: 可直接照填的 Dokploy 配置清单 + 部署顺序
[POS]: Aiget Dev 部署执行文档
-->

# Aiget Dokploy 多项目部署清单

本清单用于 **Aiget Dev（8c16g）** 的 Dokploy 多项目部署，不再使用 `deploy/aiget/docker-compose.yml`。

## 先决条件

- PostgreSQL 主库（业务数据）
- PostgreSQL 向量库（pgvector）
- Redis（队列/缓存）
- 域名与证书：`aiget.dev`、`console.aiget.dev`、`admin.aiget.dev`、`docs.aiget.dev`

## 基础设施配置

| 组件              | 要求                  | 备注                                          |
| ----------------- | --------------------- | --------------------------------------------- |
| PostgreSQL 主库   | `DATABASE_URL`        | `postgresql://.../aiget?schema=public`        |
| PostgreSQL 向量库 | `VECTOR_DATABASE_URL` | `postgresql://.../aiget_vector?schema=public` |
| Redis             | `REDIS_URL`           | `redis://...:6379`                            |

## Dokploy 项目配置表

| 项目          | Dockerfile                        | 端口 | 域名/路由                  | 必填变量                                                                                                                                                                          | Watch Paths（建议）                                                                                                                                                                                                                                                                |
| ------------- | --------------------------------- | ---- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| aiget-server  | `apps/aiget/server/Dockerfile`    | 3000 | `aiget.dev` 的 `/api/v1/*` | `DATABASE_URL`<br>`VECTOR_DATABASE_URL`<br>`REDIS_URL`<br>`BETTER_AUTH_SECRET`<br>`BETTER_AUTH_URL`<br>`ADMIN_PASSWORD`<br>`ALLOWED_ORIGINS`<br>`TRUSTED_ORIGINS`<br>`SERVER_URL` | `apps/aiget/server/**`<br>`pnpm-lock.yaml`<br>`package.json`<br>`pnpm-workspace.yaml`<br>`tsconfig.base.json`                                                                                                                                                                      |
| aiget-www     | `apps/aiget/www/Dockerfile`       | 3000 | `aiget.dev`                | `VITE_API_URL`<br>`VITE_TURNSTILE_SITE_KEY`（可选）                                                                                                                               | `apps/aiget/www/**`<br>`packages/ui/**`<br>`pnpm-lock.yaml`<br>`package.json`<br>`pnpm-workspace.yaml`                                                                                                                                                                             |
| aiget-console | `apps/aiget/console/Dockerfile`   | 80   | `console.aiget.dev`        | Build Args：`VITE_API_URL`<br>`VITE_AUTH_URL`                                                                                                                                     | `apps/aiget/console/**`<br>`packages/types/**`<br>`packages/auth-client/**`<br>`packages/ui/**`<br>`packages/embed/**`<br>`packages/embed-react/**`<br>`tooling/typescript-config/**`<br>`tooling/eslint-config/**`<br>`pnpm-lock.yaml`<br>`package.json`<br>`pnpm-workspace.yaml` |
| aiget-admin   | `apps/aiget/admin/www/Dockerfile` | 80   | `admin.aiget.dev`          | Build Args：`VITE_API_URL`<br>`VITE_AUTH_URL`                                                                                                                                     | `apps/aiget/admin/www/**`<br>`packages/types/**`<br>`packages/auth-client/**`<br>`packages/ui/**`<br>`tooling/typescript-config/**`<br>`tooling/eslint-config/**`<br>`pnpm-lock.yaml`<br>`package.json`<br>`pnpm-workspace.yaml`                                                   |
| aiget-docs    | `apps/aiget/docs/Dockerfile`      | 3000 | `docs.aiget.dev`           | 无必填                                                                                                                                                                            | `apps/aiget/docs/**`<br>`scripts/**`<br>`pnpm-lock.yaml`<br>`package.json`<br>`pnpm-workspace.yaml`                                                                                                                                                                                |

> `aiget-console`/`aiget-admin` 使用 **Build Args**，其余服务使用 **Env**。

## 部署顺序（建议）

1. 启动基础设施：主库、向量库、Redis
2. 部署 `aiget-server`（启动时会执行双库 `prisma db push`）
3. 部署 `aiget-www`、`aiget-docs`、`aiget-console`、`aiget-admin`
4. 验收：`/health`、登录/刷新 token、Console/Admin 核心流程

## 数据库初始化（Prisma Migrate）

初始化时使用 Prisma Migrate 生成 `migration.sql` 并部署：

```bash
# 生成迁移（空库初始化，create-only）
pnpm exec prisma migrate dev --config prisma.main.config.ts --name init --create-only
pnpm exec prisma migrate dev --config prisma.vector.config.ts --name init --create-only

# 部署迁移
pnpm exec prisma migrate deploy --config prisma.main.config.ts
pnpm exec prisma migrate deploy --config prisma.vector.config.ts
```

迁移文件位置：

- `apps/aiget/server/prisma/main/migrations/*/migration.sql`
- `apps/aiget/server/prisma/vector/migrations/*/migration.sql`

## 变量示例（建议）

- `ALLOWED_ORIGINS=https://aiget.dev,https://console.aiget.dev,https://admin.aiget.dev`
- `TRUSTED_ORIGINS=https://aiget.dev,https://console.aiget.dev,https://admin.aiget.dev`
- `BETTER_AUTH_URL=https://aiget.dev`
- `SERVER_URL=https://aiget.dev`
