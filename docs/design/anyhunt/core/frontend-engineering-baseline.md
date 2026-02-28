---
title: Anyhunt 前端工程基线（表单/渲染/图标）
date: 2026-02-28
scope: apps/anyhunt/*, packages/ui
status: active
---

# 范围

本文是 Anyhunt 前端强约束汇总，回写自历史 guides 文档（forms-zod-rhf、streamdown、icon migration、component quality）。

## 表单与 Zod（强制）

- 前端表单统一 `import { z } from 'zod/v3'`。
- 原因：兼容 `@hookform/resolvers` 的类型签名，避免 Docker/CI 环境 `_zod.version.minor` 冲突。
- 后端 server 禁止使用 `zod/v3`，后端保持 `import { z } from 'zod'`。

## Streamdown 渲染与流式动画（强制）

- Markdown 渲染统一通过 `@moryflow/ui` 的消息组件，不在应用侧重复造轮子。
- 流式动画参数单一事实源：`packages/ui/src/ai/streamdown-anim.ts`。
- 应用侧只控制 `animated/isAnimating`，不在业务层散落动画参数。
- `streamdown/styles.css` 不直接从包导入；样式以内联方式维护在 UI 样式层。

## 图标规范（强制）

- Web/PC 统一 `lucide-react`。
- 禁用 `@hugeicons/*` 与其它平行图标体系混用。
- 能直接用 Lucide 组件就直接用，不新增无意义 Icon 包装层。

## 组件质量约束（强制）

- 组件遵循单一职责：容器编排与展示组件分离。
- 共享业务状态仍遵循 Store-first（store/methods/api 分层）。
- 多状态渲染使用状态片段化 + switch/renderByState，禁止链式三元。
