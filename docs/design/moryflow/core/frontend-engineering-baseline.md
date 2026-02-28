---
title: Moryflow 前端工程基线（产品差异版）
date: 2026-02-28
scope: apps/moryflow/*, packages/ui
status: active
---

<!--
[INPUT]: 平台前端统一约束 + Moryflow 端侧差异（PC/Mobile）
[OUTPUT]: Moryflow 前端工程差异清单（避免双份基线并行维护）
[POS]: Moryflow Core / Frontend Baseline

[PROTOCOL]: 本文件变更需同步 `docs/design/moryflow/core/index.md`、`docs/design/anyhunt/core/frontend-engineering-baseline.md` 与 `docs/index.md`。
-->

# Moryflow 前端工程基线

## 1. 单一事实源

平台通用前端基线维护在：

- `docs/design/anyhunt/core/frontend-engineering-baseline.md`

本文件只维护 Moryflow 的产品差异与增量约束。

## 2. Moryflow 差异约束

### 2.1 多端图标策略

- PC/Web：`lucide-react`
- Mobile：`lucide-react-native`
- 禁止混用 `@hugeicons/*` 或并行图标体系。

### 2.2 Chat 场景渲染约束

- Markdown 消息渲染统一走 `packages/ui` 消息组件。
- Streamdown 动画参数只允许来自 `packages/ui/src/ai/streamdown-anim.ts`。
- 应用层只能决定是否启用动画，不允许复制一套本地动画参数。

### 2.3 状态管理与交互约束

- 共享业务状态继续执行 Store-first（Zustand + methods）。
- selector 稳定性为强约束：禁止返回对象/数组字面量。
- 多状态 UI 统一“状态片段化 + switch/renderByState”，禁止链式三元。

### 2.4 表单规范

- 前端表单统一 `zod/v3`（与 `@hookform/resolvers` 对齐）。
- 服务端仍使用 `zod` 主入口，禁止服务端引用 `zod/v3`。

## 3. 代码落点

- PC：`apps/moryflow/pc/src/renderer/`
- Mobile：`apps/moryflow/mobile/`
- WWW：`apps/moryflow/www/`
- UI：`packages/ui/src/ai/`

## 4. 变更门禁

涉及以下改动时，必须同步回写共享基线文档：

1. Zod/RHF 兼容策略变化
2. Streamdown 动画参数/样式策略变化
3. 图标体系变化（lucide 迁移或替换）
