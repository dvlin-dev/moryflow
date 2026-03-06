---
title: Moryflow 开发与测试基线（产品差异版）
date: 2026-02-28
scope: apps/moryflow/*
status: active
---

<!--
[INPUT]: 平台统一测试门禁 + Moryflow 多端命令矩阵
[OUTPUT]: Moryflow 开发测试差异清单（避免跨产品重复维护）
[POS]: Moryflow Runbooks / Dev & Testing

[PROTOCOL]: 本文件变更需同步 `docs/design/moryflow/runbooks/index.md`、`docs/design/anyhunt/runbooks/dev-and-testing-baseline.md` 与 `docs/index.md`。
-->

# Moryflow 开发与测试基线

## 1. 单一事实源

平台级基础门禁（Node/pnpm/基础设施）见：

- `docs/design/anyhunt/runbooks/dev-and-testing-baseline.md`

本文件只补 Moryflow 多端测试矩阵与额外门禁。

## 2. Moryflow 测试矩阵

- Server：`pnpm --filter @moryflow/server test`、`pnpm --filter @moryflow/server test:e2e`
- PC：`pnpm --filter @moryflow/pc test:unit`
- Mobile：`pnpm --filter @moryflow/mobile test:unit`
- Admin：`pnpm --filter @moryflow/admin test`
- WWW：`pnpm --filter @moryflow/www test`
- Docs：`pnpm --filter @moryflow/docs test`

## 3. 风险分级补充

- L1：至少执行受影响包 `typecheck + test:unit`。
- L2：必须执行全仓门禁：
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test:unit`

## 4. 回归要求（强制）

- 新功能必须补单元测试。
- Bug 修复必须补回归测试。
- 重构不得降低现有测试通过率。

## 5. 测试基础设施

- 使用 `deploy/infra/docker-compose.test.yml` 启动 PostgreSQL/Redis 测试依赖。
