---
title: Reference 文档总索引（协作与工程基线）
date: 2026-03-08
scope: docs/reference
status: active
---

<!--
[INPUT]: 本仓库协作规则、工程规范、验证与部署基线
[OUTPUT]: 按需查阅的 reference 入口
[POS]: docs/reference 总索引

[PROTOCOL]: 仅在 reference 目录结构、文档入口或职责边界失真时更新本文件。
-->

# Reference

本目录承接“协作参考、工程规范、验证流程、部署/构建基线”这类按需查阅内容，包括 PR ready、评论闭环、CI 跟进、merge readiness 与 `docs/plans` 事实回写的稳定规则。

约束：

1. `docs/reference` 不承载产品架构与协议事实；这类内容仍归 `docs/design/*`。
2. `docs/reference` 只保留稳定规则、操作基线与跨模块共用规范。
3. `docs/reference` 采用扁平结构，禁止继续创建子目录。
4. 仅在规则、入口或基线失真时更新；禁止写时间线、PR 过程与验证播报。

## 入口

- 仓库上下文：`docs/reference/repository-context.md`
- 协作与交付：`docs/reference/collaboration-and-delivery.md`（含 PR ready、评论闭环、CI 跟进、可合并状态与 plans 回写规则）
- 测试与验证：`docs/reference/testing-and-validation.md`
- 云同步与 Memox 验证基线：`docs/reference/cloud-sync-and-memox-validation.md`
- 云同步与 Memox 线上验收 Playbook：`docs/reference/cloud-sync-and-memox-production-validation-playbook.md`
- 工程规范：`docs/reference/engineering-standards.md`
- 构建与部署基线：`docs/reference/build-and-deploy-baselines.md`
- Moryflow WWW SEO 内容规范：`docs/reference/moryflow-www-seo-content-guidelines.md`
