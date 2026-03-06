---
title: Moryflow 对话 UI 与流式运行时规范
date: 2026-02-28
scope: apps/moryflow/pc, packages/ui, packages/agents-runtime, packages/model-bank
status: active
---

# 对话流协议（已冻结）

- canonical 单轨协议：`text-delta / reasoning-delta / done`。
- provider 差异统一上收 normalizer，不在 UI 层扩散分支。
- 运行时事件处理遵循单一状态机，避免原始事件与语义事件混用。

## 消息滚动与交互

- 采用 Following 模式：
  - `runStart` 一次 `smooth` 回到底部。
  - 流式阶段使用 `auto` 追随。
- 禁止 turn-anchor 贴顶逻辑、slack/tail sentinel 复杂补丁。
- 禁用 `overflow-anchor`，减少抖动。

## 输入与状态规范

- 共享业务状态遵循 Store-first；子组件优先 `useXxxStore(selector)` 就地取数。
- Zustand selector 禁止返回对象/数组字面量。
- `useSync*Store` 写入前必须做 `shouldSync` 判断。

## Thinking 与模型

- `packages/model-bank` 是模型 + thinking 唯一事实源。
- `thinking_profile` 为统一契约；等级映射由运行时适配，不在 UI 写死 provider patch。

## 需求清理与治理回写记录

- 2026-02-28：Moryflow PC 对话流 follow-up 完成，canonical 单轨 + normalizer 落地并补齐回归。
- 2026-02-26：Thinking 统一重构生效（平台预设约束、统一契约）。
- 2026-02-26：Store-first 与 Zustand 稳定性规范生效。
- 2026-02-25：多状态 UI 统一 `renderByState/switch`，禁链式三元。
