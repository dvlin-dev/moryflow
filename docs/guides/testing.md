---
title: 测试指南（要求 + 命令）
date: 2026-01-12
scope: testing
status: active
---

<!--
[INPUT]: Vitest（unit）；Playwright（e2e）；Docker Compose（测试 DB/Redis）
[OUTPUT]: 可执行的测试约束与命令入口
[POS]: “怎么测”与“测到什么程度”的统一口径

[PROTOCOL]: 本文件变更需同步更新 `docs/index.md`、`docs/CLAUDE.md` 与根 `CLAUDE.md`（若改变强制约束）。
-->

# 测试指南

## 强制要求

- 新功能：必须新增单元测试（核心业务逻辑覆盖）
- Bug 修复：必须补回归测试
- 合并前：必须通过 `pnpm lint` / `pnpm typecheck` / `pnpm test:unit`

## 测试基础设施（本地）

启动测试数据库：

```bash
docker compose -f deploy/infra/docker-compose.test.yml up -d
```

## 常用命令

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

## 产品/应用维度

- Aiget Server：`pnpm --filter @aiget/aiget-server test`、`pnpm --filter @aiget/aiget-server test:e2e`
- Admin：`pnpm --filter @aiget/admin test`、`pnpm --filter @aiget/admin test:e2e`
