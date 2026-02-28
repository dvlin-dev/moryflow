---
title: Design 文档总索引（双产品极简模型）
date: 2026-02-28
scope: docs/design
status: active
---

# Design

本目录是唯一设计事实源，固定结构如下：

- `docs/design/anyhunt/{core,features,runbooks}`
- `docs/design/moryflow/{core,features,runbooks}`

约束：

1. 一级目录只能是 `anyhunt`、`moryflow`。
2. 二级目录只能是 `core`、`features`、`runbooks`。
3. 二级目录下禁止继续创建子目录。

## 入口

- Anyhunt Core：`docs/design/anyhunt/core/index.md`
- Anyhunt Features：`docs/design/anyhunt/features/index.md`
- Anyhunt Runbooks：`docs/design/anyhunt/runbooks/index.md`
- Moryflow Core：`docs/design/moryflow/core/index.md`
- Moryflow Features：`docs/design/moryflow/features/index.md`
- Moryflow Runbooks：`docs/design/moryflow/runbooks/index.md`

## 维护原则

- 摘要文档用于快速对齐边界。
- 详细文档保留历史有效结论与执行细节。
- 删除仅针对冗余与失效文档，不删除仍可指导开发的资产。
