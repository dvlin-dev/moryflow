---
title: docs 目录重构规划（极简双产品模型）
date: 2026-02-28
scope: docs/*
status: completed
---

# 目标

将 `docs` 收敛为“`design` 单目录 + 双产品 + 三分类”的稳定结构：

- `docs/design/anyhunt/{core,features,runbooks}`
- `docs/design/moryflow/{core,features,runbooks}`

并移除所有冗余历史目录。

## 强约束

1. `docs/design/*` 第一层仅 `anyhunt`、`moryflow`。
2. 产品目录第二层仅 `core`、`features`、`runbooks`。
3. 第二层下只允许 `.md` 文件，不允许继续分层。
4. `CLAUDE.md` 禁止承载“最近更新”流水日志。

## 执行顺序（已完成）

1. 模块 0：CLAUDE 时间线清理与事实分发。
2. 模块 1：Anyhunt Core/Features 合并。
3. 模块 2：Moryflow Core/Features 合并。
4. 模块 3：工程规范沉淀到 Core。
5. 模块 4：Runbooks 与迁移结论沉淀。
6. 模块 5：删除旧目录并修复索引。
7. 模块 6：全模块同功能文档合并去重（保留事实、消除重复维护）。

## 结果

- 已完成 design 结构落地与索引建设。
- 已将“需求清理/治理升级”信息迁移到对应核心文档。
- 已按“摘要 + 详细文档”双层保留策略回填高价值历史结论，避免价值丢失。
- 已删除旧正文目录（architecture/products/guides/runbooks/research/code-review/migrations/skill）。
- 已完成全模块去重：Features/Core/Runbooks 中同功能文档统一收口到单一事实源，重复文档已并入并删除。

## 验收标准（DoD）

- `docs/design` 之外无正文目录。
- 产品目录层级满足 2 层限制。
- 无 archive 文档机制。
- 索引可从根入口 10 分钟内定位关键设计事实。
