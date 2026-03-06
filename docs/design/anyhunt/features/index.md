---
title: Anyhunt Features 索引
date: 2026-02-28
scope: docs/design/anyhunt/features
status: active
---

# Anyhunt Features

## 摘要

- `credits-and-entitlements.md`：Credits 分层、FREE 每日额度、Admin 充值与审计边界（合并版）。
- `memox-memory-architecture-and-moryflow-pc-integration.md`：Memox 开放记忆与检索平台架构；冻结“公开 API 统一、内部存储分治（`MemoryFact / KnowledgeSource / KnowledgeSourceRevision / SourceChunk / ScopeRegistry / Graph`）、Anyhunt 持有统一检索语义与 source/blob 所有权、完整替代 Moryflow `vectorize/search`”的最终方向，并将执行蓝图重排为“两期”：一期只做 Anyhunt Memox 平台（`S1 ~ S5`），二期才做 Moryflow 接入（`S6 ~ S8`）。当前一期 `S1 ~ S5` 已全部完成，`MemoryFact` 持久化模型、graph projection、统一检索与 source 生命周期均已落地。

## Reader / Digest

- `explore-topics-revamp.md`：Explore Topics 目标 IA、路由与交互方案。
- `www-reader-and-developer-split.md`：Reader/Developer 边界与 Reader SRP 收敛（合并版）。
- `v2-intelligent-digest.md`：Digest v2 需求、认证边界与执行计划。

## Agent Browser

- `agent-browser-architecture.md`：模块边界、入口与安全治理（已合并能力边界与风控摘要）。
- `agent-browser-agent-interaction.md`：Agent 工具协议与调用约束。
- `agent-browser-compliance-risk-plan.md`：合规自动化与检测风险治理。
- `agent-browser-stealth-adoption.md`：Stealth 能力引入与差距收敛计划。

## Credits / Entitlements

- 已并入 `credits-and-entitlements.md`（避免重复维护）。
