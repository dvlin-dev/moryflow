---
title: Anyhunt Dokploy 多项目部署清单
date: 2026-01-08
scope: anyhunt.app, server.anyhunt.app, dokploy, deployment
status: active
---

<!--
[INPUT]: Anyhunt Dev 多项目部署需求（Dokploy）；8c16g 机器部署边界
[OUTPUT]: 可直接照填的 Dokploy 配置清单 + 部署顺序
[POS]: Anyhunt Dev 部署执行文档

[PROTOCOL]: 本文件变更如影响域名/端口/部署口径，需同步更新 `docs/architecture/domains-and-deployment.md` 与根 `CLAUDE.md`。
-->

# Anyhunt Dokploy 多项目部署清单

本清单用于 **Anyhunt Dev（8c16g）** 的 Dokploy 多项目部署，不再使用 `deploy/anyhunt/docker-compose.yml`。

## 先决条件

- PostgreSQL 主库（业务数据）
- PostgreSQL 向量库（pgvector）
- Redis（队列/缓存）
- 域名与证书：`anyhunt.app`、`server.anyhunt.app`、`console.anyhunt.app`、`admin.anyhunt.app`、`docs.anyhunt.app`

## 基础设施配置

| 组件              | 要求                  | 备注                                    |
| ----------------- | --------------------- | --------------------------------------- |
| PostgreSQL 主库   | `DATABASE_URL`        | `postgresql://.../db?schema=public`     |
| PostgreSQL 向量库 | `VECTOR_DATABASE_URL` | `postgresql://.../vector?schema=public` |
| Redis             | `REDIS_URL`           | `redis://...:6379`                      |

## Dokploy 项目配置表

| 项目            | Dockerfile                          | 端口 | 域名/路由                     | 必填变量                                                                                                                                                                                           | Watch Paths（建议）                                                                                                                                                                                                                                     |
| --------------- | ----------------------------------- | ---- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| anyhunt-server  | `apps/anyhunt/server/Dockerfile`    | 3000 | `server.anyhunt.app/api/v1/*` | `DATABASE_URL`<br>`VECTOR_DATABASE_URL`<br>`REDIS_URL`<br>`BETTER_AUTH_SECRET`<br>`BETTER_AUTH_URL`<br>`ADMIN_EMAIL`<br>`ADMIN_PASSWORD`<br>`ALLOWED_ORIGINS`<br>`TRUSTED_ORIGINS`<br>`SERVER_URL` | `apps/anyhunt/server/**`<br>`pnpm-lock.yaml`<br>`package.json`<br>`pnpm-workspace.yaml`<br>`tsconfig.base.json`                                                                                                                                         |
| anyhunt-www     | `apps/anyhunt/www/Dockerfile`       | 3000 | `anyhunt.app`                 | `VITE_API_URL`<br>`VITE_TURNSTILE_SITE_KEY`（可选）                                                                                                                                                | `apps/anyhunt/www/**`<br>`packages/ui/**`<br>`pnpm-lock.yaml`<br>`package.json`<br>`pnpm-workspace.yaml`                                                                                                                                                |
| anyhunt-console | `apps/anyhunt/console/Dockerfile`   | 80   | `console.anyhunt.app`         | Build Args：`VITE_API_URL`<br>`VITE_AUTH_URL`                                                                                                                                                      | `apps/anyhunt/console/**`<br>`packages/types/**`<br>`packages/ui/**`<br>`packages/embed/**`<br>`packages/embed-react/**`<br>`tooling/typescript-config/**`<br>`tooling/eslint-config/**`<br>`pnpm-lock.yaml`<br>`package.json`<br>`pnpm-workspace.yaml` |
| anyhunt-admin   | `apps/anyhunt/admin/www/Dockerfile` | 80   | `admin.anyhunt.app`           | Build Args：`VITE_API_URL`<br>`VITE_AUTH_URL`                                                                                                                                                      | `apps/anyhunt/admin/www/**`<br>`packages/types/**`<br>`packages/ui/**`<br>`tooling/typescript-config/**`<br>`tooling/eslint-config/**`<br>`pnpm-lock.yaml`<br>`package.json`<br>`pnpm-workspace.yaml`                                                   |
| anyhunt-docs    | `apps/anyhunt/docs/Dockerfile`      | 3000 | `docs.anyhunt.app`            | 无必填                                                                                                                                                                                             | `apps/anyhunt/docs/**`<br>`scripts/**`<br>`pnpm-lock.yaml`<br>`package.json`<br>`pnpm-workspace.yaml`                                                                                                                                                   |

> `anyhunt-console`/`anyhunt-admin` 使用 **Build Args**，其余服务使用 **Env**。

## 管理员账号初始化（无需 seed）

`anyhunt-server` 启动时会读取 `ADMIN_EMAIL`/`ADMIN_PASSWORD` 自动创建（或升级）一个 `isAdmin=true` 的账号，用于 `admin.anyhunt.app` 登录。

## 常见部署报错

- `/apps/aiget/www/.env: Directory nonexistent`：Dokploy 项目仍在使用旧路径 `apps/aiget/www`；把项目的 Dockerfile/工作目录/Env 写入路径更新为 `apps/anyhunt/www`（同理：`apps/anyhunt/*`）。

## 部署顺序（建议）

1. 启动基础设施：主库、向量库、Redis
2. 部署 `anyhunt-server`（启动时会执行双库 `prisma migrate deploy`）
3. 部署 `anyhunt-www`、`anyhunt-docs`、`anyhunt-console`、`anyhunt-admin`
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

- `apps/anyhunt/server/prisma/main/migrations/*/migration.sql`
- `apps/anyhunt/server/prisma/vector/migrations/*/migration.sql`

## 变量示例（建议）

- `ALLOWED_ORIGINS=https://anyhunt.app,https://console.anyhunt.app,https://admin.anyhunt.app`
- `TRUSTED_ORIGINS=https://anyhunt.app,https://console.anyhunt.app,https://admin.anyhunt.app`
- `BETTER_AUTH_URL=https://server.anyhunt.app`
- `SERVER_URL=https://server.anyhunt.app`
