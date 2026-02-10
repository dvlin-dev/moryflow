---
title: Moryflow（内部方案）
date: 2026-02-10
scope: moryflow.com, moryflow.app
status: draft
---

<!--
[INPUT]: Moryflow 业务线内的内部技术方案与运行手册
[OUTPUT]: Moryflow 的内部文档索引与迁移 TODO
[POS]: 产品线内文档入口（内部）

[PROTOCOL]: 本文件变更需同步更新 `docs/index.md` 与 `docs/CLAUDE.md`。
-->

# Moryflow（内部方案）

对外文档站点源码见：`apps/moryflow/docs`。

本目录用于沉淀“内部技术方案”（例如：云同步、站点发布、积分/会员、桌面端/移动端工程规范）。

## Features（内部技术方案）

- 云同步（统一方案与现状）：`docs/products/moryflow/features/cloud-sync/unified-implementation.md`
- PC 左侧 Sidebar 导航方案（Implicit Agent + Modules）：`docs/products/moryflow/features/app-modes/agent-sites-nav-hierarchy.md`（2026-02-10：implemented）
- PC App Modes 方案（Legacy: Chat / Workspace / Sites；superseded）：`docs/products/moryflow/features/app-modes/chat-and-workspace-modes.md`
- 站点发布（技术方案）：`docs/products/moryflow/features/site-publish/tech.md`
- 站点模板系统：`docs/products/moryflow/features/site-publish/template-system.md`
- 积分系统：`docs/products/moryflow/features/credits-system/tech.md`
- 语音转写：`docs/products/moryflow/features/speech-to-text/tech.md`
- Mobile 设计系统：`docs/products/moryflow/features/mobile-design-system/proposal.md`
- PC 输入框重构方案（执行级 + Notion 交互规范）：`docs/products/moryflow/features/chat-input/pc-prompt-input-refactor.md`
- PC 输入框改造方案（+ 菜单 / @ 引用 / 主按钮统一）：`docs/products/moryflow/features/chat-input/pc-prompt-input-plus-menu.md`（更新：2026-01-28：二级面板对齐到对应项）
- PC 悬浮任务面板改造方案：`docs/products/moryflow/features/chat-pane/task-hover-panel-redesign.md`

## Runbooks（发布/签名）

- macOS 签名与公证（Electron）：`docs/products/moryflow/runbooks/release/macos-code-signing.md`
- iOS 签名与发布（Expo + EAS）：`docs/products/moryflow/runbooks/release/ios-code-signing.md`

## Research（调研/方案草案）

- 云同步重构方案（向量时钟）：`docs/products/moryflow/research/sync-refactor-proposal.md`
- 同步方案深度分析（对比）：`docs/products/moryflow/research/sync-solutions-analysis.md`

## 迁移来源（仅查阅）

若需要继续迁移旧文档，请优先从：

- `archive/external-repos/moryflow/docs/`

开始抽取“仍然有效”的部分，按主题归位到本目录。
