---
title: ADR-0001：两条业务线永不互通
date: 2026-01-12
scope: moryflow.com, aiget.dev
status: active
---

<!--
[INPUT]: 统一平台的多产品现实；账号/计费/数据库隔离诉求；部署与风险控制
[OUTPUT]: 关键架构决策记录（ADR），用于停止重复争议
[POS]: `docs/architecture/auth.md` 与 `docs/architecture/domains-and-deployment.md` 的顶层前提

[PROTOCOL]: 本文件变更需同步更新 `docs/architecture/auth.md`、`docs/architecture/domains-and-deployment.md` 与根 `CLAUDE.md`（若改变约束）。
-->

# ADR-0001：两条业务线永不互通

## 决策

当前仓库的默认架构是 **两条互不互通的业务线**：

1. Moryflow：`www.moryflow.com` / `app.moryflow.com`
2. Aiget Dev：`aiget.dev` / `server.aiget.dev` / `console.aiget.dev` / `admin.aiget.dev`

两条业务线：

- 不共享账号/Token/数据库（永不互通）
- 只共享代码（抽到 `packages/*` 复用）

## 影响

- Auth、Cookie domain、OAuth client、JWT issuer、数据库连接全部按业务线隔离
- 任何“统一账号/统一钱包/统一订阅”的需求必须作为新 ADR 单独讨论，不默认引入
