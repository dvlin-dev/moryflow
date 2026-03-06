---
title: Moryflow 迁移与切换 Runbook
date: 2026-02-28
scope: apps/moryflow/*, packages/*
status: active
---

# 迁移策略

- 默认零兼容：无历史包袱的场景直接清理旧结构。
- 迁移前先冻结目标事实源，迁移后删除重复源。
- 所有迁移项都要有回归测试与可回滚方案。

## 近期待办已收口事项

- License 系统已全量移除（server/admin/pc/mobile/types 同步收口）。
- 模型与 thinking 已并入 `packages/model-bank` 单一事实源。
- 对话流 runtime 已完成 canonical 协议单轨收口。

## 治理回写记录（需求清理）

- 2026-02-28：docs 治理升级，删除 archive 思路，统一 design 单目录模型。
- 2026-02-27：协作总则升级为“根因治理优先，禁止补丁式修复”。
- 2026-02-26：CI 测试参数治理完成，移除 `--maxWorkers=2` 透传。
