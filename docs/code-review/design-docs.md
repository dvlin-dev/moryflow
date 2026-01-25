---
title: 详细设计/方案文档 Code Review
date: 2026-01-25
scope: docs/architecture, docs/research, docs/products
status: done
---

<!--
[INPUT]: docs/architecture/, docs/research/, docs/products/
[OUTPUT]: 设计/方案文档一致性 review 发现与修复清单
[POS]: Phase 0 / P2 模块审查记录（设计文档）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# 详细设计/方案文档 Code Review

## 范围

- 目录：`docs/architecture/`、`docs/research/`、`docs/products/`
- 目标：对齐“最终架构约束/域名/身份边界”，减少文档漂移与缺失索引

## 结论摘要

- 高风险问题（P0）：无
- 中风险问题（P1）：无
- 低风险/清理项（P2）：已修复（索引缺失、frontmatter 缺失、状态标记不一致、域名规划文档不一致）

## 发现（按严重程度排序）

- [P2] `docs/products/anyhunt-dev/index.md` 引用不存在的文档（已修复）：scheduled-digest、digest-code-review-plan
- [P2] 方案状态与内容说明不一致且缺少 frontmatter：`docs/products/anyhunt-dev/features/homepage-reader-redesign.md`、`docs/products/anyhunt-dev/features/homepage-redesign.md` 标注“已被新信息架构替代”，但仍在 Features 索引中标为“已实现”。（已修复）
- [P2] 关键方案/研究文档缺少 YAML frontmatter（缺少 status/date/scope 等元信息）：（已修复）
  - `docs/products/anyhunt-dev/features/unified-auth-and-digest-architecture.md`
  - `docs/products/anyhunt-dev/features/homepage-reader-redesign.md`
  - `docs/products/anyhunt-dev/features/homepage-redesign.md`
  - `docs/products/anyhunt-dev/features/agent-browser/architecture.md`
- [P2] 域名规划不一致：`docs/architecture/domains-and-deployment.md` 提及 `cdn.anyhunt.app`，`docs/products/anyhunt-dev/features/v2-intelligent-digest.md` 提及 `rss.anyhunt.app`，但根 `CLAUDE.md` 的域名规划未覆盖，需确认是否纳入正式域名表。（已修复）
- [P2] 统一登录与 Digest 前端架构方案（`docs/products/anyhunt-dev/features/unified-auth-and-digest-architecture.md`）涉及跨子域 session/cookie 变更，但未标注状态与是否已进入 `docs/architecture/auth/` 或 ADR，易造成“提案”与“最终决策”边界模糊。（已修复）

## 修复计划与进度

- 已完成：
  - 清理缺失索引引用（scheduled-digest / digest-code-review-plan）
  - 补齐 frontmatter（status/date/scope）
  - 在索引中标注被替代方案为历史参考
  - 同步域名规划（补充 `cdn.anyhunt.app`、`rss.anyhunt.app`）
  - 明确“统一登录方案”为提案（status: draft）
- 状态：done
