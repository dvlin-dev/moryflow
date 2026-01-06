---
title: 用户系统快速接入（Auth Service 模板）
date: 2026-01-06
scope: moryflow.com, aiget.dev
status: draft
---

<!--
[INPUT]: templates/auth-service, @aiget/auth-client, @aiget/identity-db
[OUTPUT]: Auth 服务快速接入步骤（仓库内/外部项目）
[POS]: 用户系统快速接入文档

[PROTOCOL]: 本文件变更需同步更新 docs/features/index.md、docs/CLAUDE.md 与根 CLAUDE.md。
-->

# 用户系统快速接入（Auth Service 模板）

## 目标

- 在 1 天内落地一套可部署的 Auth 服务。
- 保持两条业务线账号/Token/数据库完全隔离。
- 能被新项目快速复用（含开源场景）。

## 模板位置

- `templates/auth-service`

## 快速接入（本仓库内）

1. 选择落点：
   - 推荐：复制到 `apps/<business>/server`。
   - 或者：在 `pnpm-workspace.yaml` 中加入 `templates/*`。
2. 准备数据库：
   - 启动本地 Postgres：`docker compose up -d`（模板内自带）。
   - 推送 schema：`pnpm --filter @aiget/identity-db prisma:push`。
3. 配置环境变量：
   - 复制 `.env.example` → `.env`。
   - 至少设置 `BETTER_AUTH_SECRET`、`IDENTITY_DATABASE_URL`、`TRUSTED_ORIGINS`。
4. 启动服务：
   - `pnpm dev`（模板内）或 `pnpm --filter <app> start:dev`（应用内）。

## 快速接入（外部项目）

1. 复制模板到新项目根目录。
2. 替换 `package.json` 中的 `@aiget/*` 依赖为可安装版本（已发布或本地路径）。
3. 准备数据库并同步 schema（可直接复制 `packages/identity-db/prisma/schema.prisma`）。
4. 配置 `.env` 后启动服务。

## 客户端接入（推荐）

使用 `@aiget/auth-client`：

```ts
import { createAuthClient } from '@aiget/auth-client';

const auth = createAuthClient({
  baseUrl: 'https://app.moryflow.com/api/v1/auth',
  clientType: 'web',
});
```

## OAuth 配置（可选）

- Google：`GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`。
- Apple：`APPLE_CLIENT_ID` + `APPLE_CLIENT_SECRET`（Apple JWT client secret）。

## 反代与域名建议

- Auth 服务建议挂在同域名：`{host}/api/v1/auth/*`。
- 生产环境必须正确配置 `COOKIE_DOMAIN` 与 `TRUSTED_ORIGINS`。

## 验收清单

- `/api/v1/auth/register`、`/login`、`/refresh`、`/logout`、`/me` 可用。
- Google/Apple 登录可选开关生效。
- Cookie 与 JWT 不能跨业务线互通。
