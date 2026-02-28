---
title: Anyhunt 开发与测试基线
date: 2026-02-28
scope: apps/anyhunt/*
status: active
---

# 本地开发基线

- Node 版本以仓库 `.node-version` 为准。
- pnpm 固定 `9.12.2`。
- 安装命令：`pnpm install`。

## 统一质量门禁

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:unit`

## 测试基础设施

- 启动测试数据库：
  - `docker compose -f deploy/infra/docker-compose.test.yml up -d`

## 常用应用测试命令

- Anyhunt Server：`pnpm --filter @anyhunt/anyhunt-server test`、`pnpm --filter @anyhunt/anyhunt-server test:e2e`
- Anyhunt Admin：`pnpm --filter @anyhunt/admin test`、`pnpm --filter @anyhunt/admin test:e2e`
- Anyhunt Console：`pnpm --filter @anyhunt/console test`、`pnpm --filter @anyhunt/console test:e2e`
