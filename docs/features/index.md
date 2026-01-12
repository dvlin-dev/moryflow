---
title: Features - 文档入口
date: 2026-01-06
scope: moryflow.com, aiget.dev
status: active
---

<!--
[INPUT]: 跨产品可复用能力（用户系统、订阅/钱包、API Key、发布站点等）
[OUTPUT]: 功能文档索引与写作约束（不使用目录 CLAUDE.md，避免碎片化）
[POS]: `docs/features/` 的入口索引

[PROTOCOL]: 新增/调整功能文档时，需同步更新本文件与 `docs/CLAUDE.md`（结构说明）。
-->

# docs/features/

本目录用于沉淀“功能层”的可执行规范（区别于 `docs/architecture/` 的系统级架构决策）。

## 功能列表

- 用户系统（总览 + 技术方案）：`docs/features/user-system/overview.md`
- 用户系统（改造计划）：`docs/features/user-system/refactor-plan.md`
- 用户系统（快速接入）：`docs/features/user-system/quick-start.md`
- 用户系统（Fetchx 接入方案）：`docs/features/user-system/fetchx-integration-plan.md`
- 定时内容订阅（Email Digest）：`docs/features/scheduled-digest/overview.md`

## 已归档

- Console 改造方案（已完成）：`docs/_archived/console-refactor-plan.md`

## 最近更新

- 2026-01-12：Console 改造方案已完成并归档
- Fetchx 接入方案已更新：Admin 后端已并入 `apps/aiget/server`（不再保留 `apps/aiget/admin/server`）
- 新增需求方案：定时内容订阅（Email Digest）（自定义 cron + 时区、抓全文、AI 摘要、用户全局去重）
