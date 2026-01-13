---
title: 文档索引（内部协作）
date: 2026-01-12
scope: monorepo
status: active
---

<!--
[INPUT]: 本仓库的内部协作文档（非对外 docs 站点内容）
[OUTPUT]: 统一入口索引 + “哪里写什么”的规则
[POS]: 根 docs/ 的入口；新增/移动文档时首先更新这里

[PROTOCOL]: 本文件变更需同步更新 `docs/CLAUDE.md`；若涉及全局约束/域名/架构入口，需同步更新根 `CLAUDE.md`。
-->

# docs/（内部协作）索引

本目录用于沉淀“可执行的工程真相”（架构决策、运行手册、开发指南、迁移方案）。对外文档站点是独立项目：

- Aiget Dev Docs：`apps/aiget/docs`
- Moryflow Docs：`apps/moryflow/docs`

## Architecture（系统级决策 / 不变量）

- 域名与部署架构（两条业务线）：`docs/architecture/domains-and-deployment.md`
- Auth 系统入口（两条业务线不互通）：`docs/architecture/auth.md`
- Auth 拆分文档：`docs/architecture/auth/`
- ADR（架构决策记录）：`docs/architecture/adr/`

## Guides（开发指南 / 可复用做法）

- 本地开发环境：`docs/guides/dev-setup.md`
- 测试指南：`docs/guides/testing.md`
- Auth：流程与接口约定：`docs/guides/auth/auth-flows-and-endpoints.md`
- Auth Service 模板快速接入：`docs/guides/auth/auth-service-quick-start.md`
- 前端表单：Zod + RHF 兼容：`docs/guides/frontend/forms-zod-rhf.md`
- 开源拆分：Git Subtree 双向同步：`docs/guides/open-source-package-subtree.md`

## Runbooks（运维手册 / 照做即可）

- Aiget Dev（8c16g / Dokploy）：`docs/runbooks/deploy/aiget-dokploy.md`
- megaboxpro（1panel）反代路由：`docs/runbooks/deploy/megaboxpro-1panel-reverse-proxy.md`
- Moryflow（4c6g / docker compose）：`docs/runbooks/deploy/moryflow-compose.md`

## Products（产品线内的内部方案）

- Aiget Dev：`docs/products/aiget-dev/`
- Moryflow：`docs/products/moryflow/`
  - 入口：`docs/products/moryflow/index.md`

## Archived（归档）

- 归档计划：`docs/_archived/plans/`
- 归档迁移记录：`docs/_archived/migrations/`
- 其他归档：`docs/_archived/`
