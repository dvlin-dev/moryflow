---
title: Anyhunt Dev（内部方案）
date: 2026-01-12
scope: anyhunt.app, server.anyhunt.app
status: active
---

<!--
[INPUT]: Anyhunt Dev 业务线内的设计/迁移/功能方案
[OUTPUT]: Anyhunt Dev 的内部文档索引
[POS]: 产品线内文档入口（不与对外 docs 站点耦合）

[PROTOCOL]: 本文件变更需同步更新 `docs/index.md` 与 `docs/CLAUDE.md`。
-->

# Anyhunt Dev（内部方案）

## Migrations

- Fetchx 接入方案：`docs/products/anyhunt-dev/migrations/fetchx-integration.md`

## Features

- 定时内容订阅（Email Digest）：`docs/products/anyhunt-dev/features/scheduled-digest.md`
- v2 智能信息订阅：`docs/products/anyhunt-dev/features/v2-intelligent-digest.md`
- 统一登录与 Digest 前端架构：`docs/products/anyhunt-dev/features/unified-auth-and-digest-architecture.md`
- 首页 Reader 三栏布局设计（已实现）：`docs/products/anyhunt-dev/features/homepage-reader-redesign.md`
- 首页 Discover 增强（已实现）：`docs/products/anyhunt-dev/features/homepage-redesign.md`
- Reader 顶部导航 + Explore Topics 专用页（已实现）：`docs/products/anyhunt-dev/features/explore-topics-revamp.md`
- 免费用户每日赠送 100 Credits（方案）：`docs/products/anyhunt-dev/features/daily-free-credits.md`
- www：Reader 与 Developer 双模块布局方案（提案）：`docs/products/anyhunt-dev/features/www-reader-and-developer-split.md`
- www Reader SRP 与 Props 收敛重构计划（提案）：`docs/products/anyhunt-dev/features/www-reader-srp-and-props-refactor.md`

## Reviews

- Digest 全量 Code Review 计划：`docs/products/anyhunt-dev/reviews/digest-code-review-plan.md`
