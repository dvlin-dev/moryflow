---
title: Moryflow（内部方案）
date: 2026-01-12
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

- 云同步（技术方案）：`docs/products/moryflow/features/cloud-sync/tech.md`
- 云同步（自动绑定）：`docs/products/moryflow/features/cloud-sync/auto-binding-impl.md`
- 站点发布（技术方案）：`docs/products/moryflow/features/site-publish/tech.md`
- 站点模板系统：`docs/products/moryflow/features/site-publish/template-system.md`
- 积分系统：`docs/products/moryflow/features/credits-system/tech.md`
- 语音转写：`docs/products/moryflow/features/speech-to-text/tech.md`
- Mobile 设计系统：`docs/products/moryflow/features/mobile-design-system/proposal.md`

## Runbooks（发布/签名）

- macOS 代码签名：`docs/products/moryflow/runbooks/release/macos-code-signing.md`
- iOS 证书与签名（EAS）：`docs/products/moryflow/runbooks/release/ios-code-signing.md`

## Research（调研/方案草案）

- 云同步重构方案（向量时钟）：`docs/products/moryflow/research/sync-refactor-proposal.md`
- 同步方案深度分析（对比）：`docs/products/moryflow/research/sync-solutions-analysis.md`

## 迁移来源（仅查阅）

若需要继续迁移旧文档，请优先从：

- `archive/external-repos/moryflow/docs/`

开始抽取“仍然有效”的部分，按主题归位到本目录。
