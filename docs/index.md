---
title: 文档索引（内部协作）
date: 2026-01-25
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

- Anyhunt Dev Docs：`apps/anyhunt/docs`
- Moryflow Docs：`apps/moryflow/docs`

## Architecture（系统级决策 / 不变量）

- 域名与部署架构（两条业务线）：`docs/architecture/domains-and-deployment.md`
- Auth 系统入口（两条业务线不互通）：`docs/architecture/auth.md`
- Auth 拆分文档：`docs/architecture/auth/`
- Auth 交互统一与数据库重置方案：`docs/architecture/auth/unified-auth-rebuild-plan.md`
- Auth 统一改造文件清单：`docs/architecture/auth/unified-auth-rebuild-file-map.md`
- Admin 动态配置 LLM Providers/Models（参考 Moryflow）：`docs/architecture/admin-llm-provider-config.md`
- 消息列表与输入框 UI 组件抽离方案（Moryflow/Anyhunt 统一）：`docs/architecture/ui-message-list-unification.md`
- ADR（架构决策记录）：`docs/architecture/adr/`

## Guides（开发指南 / 可复用做法）

- 本地开发环境：`docs/guides/dev-setup.md`
- 测试指南：`docs/guides/testing.md`
- Auth：流程与接口约定：`docs/guides/auth/auth-flows-and-endpoints.md`
- 前端表单：Zod + RHF 兼容：`docs/guides/frontend/forms-zod-rhf.md`
- 开源拆分：Git Subtree 双向同步：`docs/guides/open-source-package-subtree.md`

## Runbooks（运维手册 / 照做即可）

- Anyhunt Dev（8c16g / Dokploy）：`docs/runbooks/deploy/anyhunt-dokploy.md`
- megaboxpro（1panel）反代路由：`docs/runbooks/deploy/megaboxpro-1panel-reverse-proxy.md`
- Moryflow（4c6g / docker compose）：`docs/runbooks/deploy/moryflow-compose.md`

## Migrations（迁移方案 / 一次性执行）

- Aiget → Anyhunt 全量品牌迁移（无历史兼容）：`docs/migrations/aiget-to-anyhunt.md`

## Products（产品线内的内部方案）

- Anyhunt Dev
  - 入口：`docs/products/anyhunt-dev/index.md`
  - Reader 顶部导航 + Explore Topics 专用页（提案）：`docs/products/anyhunt-dev/features/explore-topics-revamp.md`
  - Admin：手动充值 Credits（已落地）：`docs/products/anyhunt-dev/features/admin-credits-and-entitlements.md`
  - 免费用户每日赠送 100 Credits（方案）：`docs/products/anyhunt-dev/features/daily-free-credits.md`
  - www Reader/Developer 双模块布局方案：`docs/products/anyhunt-dev/features/www-reader-and-developer-split.md`
  - www Reader SRP 与 Props 收敛重构计划：`docs/products/anyhunt-dev/features/www-reader-srp-and-props-refactor.md`
- Moryflow：`docs/products/moryflow/`
  - 入口：`docs/products/moryflow/index.md`
  - 发布/签名 Runbooks：`docs/products/moryflow/runbooks/release/`
  - Moryflow PC 自动更新（R2-only）：`docs/products/moryflow/runbooks/release/electron-auto-update-r2.md`

## Code Review（全量评审计划与进度）

- 全量 Code Review（模块拆分 + 阶段顺序 + 统一审查标准 + 执行步骤清单 + 进度同步）：`docs/code-review/index.md`
- 工程基线 / Root Tooling Code Review：`docs/code-review/root-tooling.md`（更新：2026-01-23，修复完成）
- Moryflow Server Auth/Quota/Payment Code Review：`docs/code-review/moryflow-server-auth-quota-payment.md`（更新：2026-01-23，修复完成）
- Anyhunt Server Auth & Session Code Review：`docs/code-review/anyhunt-server-auth.md`（更新：2026-01-25，修复完成）
- Anyhunt Server API Key & Quota Code Review：`docs/code-review/anyhunt-server-api-key-quota.md`（更新：2026-01-25，修复完成）
- Anyhunt Server Billing & Payment Code Review：`docs/code-review/anyhunt-server-billing-payment.md`（更新：2026-01-25，修复完成）
- Anyhunt Server SSRF & Network Isolation Code Review：`docs/code-review/anyhunt-server-ssrf-sandbox.md`（更新：2026-01-26，修复完成）
- Anyhunt Server Queue/异步一致性 Code Review：`docs/code-review/anyhunt-server-queue.md`（更新：2026-01-24，修复完成）
- Anyhunt Server Prisma/迁移/多数据库边界 Code Review：`docs/code-review/anyhunt-server-prisma.md`（更新：2026-01-26，review 完成）
- Moryflow Publish/AI Proxy Code Review：`docs/code-review/moryflow-publish-vectorize-ai-proxy.md`（更新：2026-01-23，修复完成）
- deploy/infra 测试环境 Code Review：`docs/code-review/deploy-infra.md`（更新：2026-01-22，修复完成）
- 详细设计/方案文档 Code Review：`docs/code-review/design-docs.md`（更新：2026-01-22，修复完成）
- Moryflow Vectorize 将由 Anyhunt Memox 替换：已标记暂不处理（详见 `docs/code-review/index.md`）

## Archived（归档）

- 归档目录已移除（如需重新归档再创建）。

## Research（调研 / 功能需求）

- Fetchx Browser & Agent 功能需求（L2 Browser API + L3 Agent API）：`docs/research/agent-browser-integration.md`
- 设计方案：Console Agent Browser Playground（L2 Browser + L3 Agent）：`docs/research/console-agent-browser-playground-design.md`（更新：2026-01-20，独立模块 + 多页面拆分）
- 方案：Agent Browser Chat 流式消息分段（对齐 Moryflow/pc：UIMessageChunk 单协议）：`docs/research/agent-browser-chat-streaming-uimessagechunk.md`（更新：2026-01-21）
- 方案：API Key 级别 LLM 策略 + 输出 Schema 入参收紧：`docs/research/agent-llm-policy-and-output-schema.md`（更新：2026-01-20）
- 梳理：apps/anyhunt 大模型调用逻辑（Agent / LLM / Embedding）：`docs/research/apps-anyhunt-llm-call-map.md`（更新：2026-01-20）

## Skills（内部协作 / Prompt 规范）

- Code Simplifier：`docs/skill/code-simplifier.md`
