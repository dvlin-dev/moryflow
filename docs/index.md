---
title: 文档索引（内部协作）
date: 2026-02-28
scope: monorepo
status: active
---

<!--
[INPUT]: 本仓库内部协作文档
[OUTPUT]: 精简、可执行、可维护的文档入口
[POS]: docs/ 总入口

[PROTOCOL]: 本文件变更需同步更新 `docs/CLAUDE.md`；若影响全局协作边界，需同步根 `CLAUDE.md`。
-->

# docs/（内部协作）索引

本目录采用“单目录设计库”模型：正文文档仅保留在 `docs/design/*`。
当前包含摘要与详细文档两层价值，不再只保留简版说明。

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
- 允许在 `core/features/runbooks` 下保留有价值的详细历史结论文档（非冗余）。
