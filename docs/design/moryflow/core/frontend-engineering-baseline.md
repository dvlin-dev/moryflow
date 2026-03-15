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

[PROTOCOL]: 仅在相关索引、跨文档事实引用或全局协作边界失真时，才同步更新对应文档。
-->

# Moryflow 前端工程基线

## 1. 事实源

- 平台通用前端基线：`docs/design/anyhunt/core/frontend-engineering-baseline.md`
- 设计系统（图标、颜色、圆角、动效、交互原则）：`docs/reference/design-system.md`

本文件只维护 Moryflow 的产品差异与增量约束。

## 2. Moryflow 差异约束

### 2.1 Chat 场景渲染约束

- Markdown 消息渲染统一走 `packages/ui` 消息组件。
- Streamdown 动画参数只允许来自 `packages/ui/src/ai/streamdown-anim.ts`。
- 应用层只能决定是否启用动画，不允许复制一套本地动画参数。

### 2.2 状态管理与交互约束

- 共享业务状态继续执行 Store-first（Zustand + methods）。
- selector 稳定性为强约束：禁止返回对象/数组字面量。
- 多状态 UI 统一"状态片段化 + switch/renderByState"，禁止链式三元。

### 2.3 表单规范

- 前端表单统一 `zod/v3`（与 `@hookform/resolvers` 对齐）。
- 服务端仍使用 `zod` 主入口，禁止服务端引用 `zod/v3`。

## 3. 代码落点

- PC：`apps/moryflow/pc/src/renderer/`
- Mobile：`apps/moryflow/mobile/`
- WWW：`apps/moryflow/www/`
- UI：`packages/ui/src/ai/`

## 4. 变更门禁

涉及以下改动时，必须同步回写对应文档：

1. Zod/RHF 兼容策略变化
2. Streamdown 动画参数/样式策略变化
3. 设计系统变更 → 回写 `docs/reference/design-system.md`
