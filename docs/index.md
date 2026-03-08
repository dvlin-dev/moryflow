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

本目录采用“双主线”模型：

- `docs/design/*`：架构、协议、运维与验收事实源
- `docs/reference/*`：协作规则、工程规范、验证流程、构建与部署基线

## 入口

- Design 总索引：`docs/design/index.md`
- Reference 总索引：`docs/reference/index.md`
- Anyhunt Core：`docs/design/anyhunt/core/index.md`
- Anyhunt Features：`docs/design/anyhunt/features/index.md`
- Anyhunt Runbooks：`docs/design/anyhunt/runbooks/index.md`
- Moryflow Core：`docs/design/moryflow/core/index.md`
- Moryflow Features：`docs/design/moryflow/features/index.md`
- Moryflow Runbooks：`docs/design/moryflow/runbooks/index.md`

## 目录治理

- `docs/design` 只放架构正文，`docs/reference` 只放查阅型规范。
- 删除文档前必须先回写有效事实。
- 禁止使用 `archive/` 作为文档保留机制。
- 同功能文档优先合并为单一事实源，避免并行维护。
- 允许“摘要入口 + 详细正文”双层保留，但仅限不同抽象层级；禁止平级重复维护。
- `completed` 文档应优先并回主架构文档或 runbook；禁止仅为历史过程单独保留设计稿。
- 仅在仍存在独立架构边界、运维边界或产品边界时，才保留单独专题文档。
- 涉及 Agent Prompt/产物生成的方案，必须明确“在用户 Vault 内优先选择合适目录落盘，禁止默认根目录直写”。
