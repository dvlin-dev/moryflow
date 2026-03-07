---
title: 文档索引（内部协作）
date: 2026-03-08
scope: monorepo
status: active
---

<!--
[INPUT]: 本仓库内部协作文档
[OUTPUT]: 精简、可执行、可维护的文档入口
[POS]: docs/ 总入口

[PROTOCOL]: 仅在 docs 入口、导航职责或全局协作边界失真时，才同步更新相关文档。
-->

# docs/（内部协作）索引

本目录采用“单目录设计库”模型：正文文档仅保留在 `docs/design/*`。

## 入口

- 重构执行计划：`docs/design-reorganization-plan.md`
- Design 总索引：`docs/design/index.md`
- Anyhunt Core：`docs/design/anyhunt/core/index.md`
- Anyhunt Features：`docs/design/anyhunt/features/index.md`
- Anyhunt Runbooks：`docs/design/anyhunt/runbooks/index.md`
- Moryflow Core：`docs/design/moryflow/core/index.md`
- Moryflow Features：`docs/design/moryflow/features/index.md`
- Moryflow Runbooks：`docs/design/moryflow/runbooks/index.md`

## 目录治理

- `docs/design` 之外不再保留正文目录。
- 删除文档前必须先回写有效事实。
- 禁止使用 `archive/` 作为文档保留机制。
- 同功能文档优先合并为单一事实源，避免并行维护。
- `completed` 文档应优先并回主架构文档或 runbook；禁止仅为历史过程单独保留设计稿。
- 仅在仍存在独立架构边界、运维边界或产品边界时，才保留单独专题文档。
- 涉及 Agent Prompt/产物生成的方案，必须明确“在用户 Vault 内优先选择合适目录落盘，禁止默认根目录直写”。
