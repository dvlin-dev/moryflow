---
title: Moryflow PC 消息列表交互复用改造方案（TurnAnchor 机制）
date: 2026-02-06
scope: ui
status: active
---

<!--
[INPUT]: Moryflow PC 现有消息列表实现 + @anyhunt/ui 组件库封装现状 + assistant-ui 行为基线
[OUTPUT]: 记录当前落地状态、当前分支目标、未来需求与未完成事项
[POS]: TurnAnchor 交互复用与滚动行为的最新现状/交接入口

[PROTOCOL]: 本文为当前阶段的最终状态说明；后续变更需同步更新 docs/architecture/CLAUDE.md 与 docs/CLAUDE.md。
-->

# Moryflow PC 消息列表交互复用改造方案（TurnAnchor 机制）

## 当前现状（已落地）

- 交互基线：TurnAnchor 固定为 `top`，用户消息固定顶住可视区域顶部，助手在下方展开。
- 结构对齐：Conversation/Viewport/Slack/AutoScroll 与 assistant-ui v0.12.6 对齐，组件职责已拆分到 `@anyhunt/ui`。
- 滚动稳定性：
  - runStart/initialize/threadSwitch 事件驱动自动滚动。
  - runStart 支持滚动锁，避免 Slack/min-height 更新后下坠。
  - runStart 在测量未就绪时延后滚动，避免短列表抖动。
  - 用户上滚时立即取消 runStart 自动滚动，避免手动滚动抖动。
  - Viewport 使用 `scrollbar-gutter: stable`，避免滚动条引发换行抖动。
- 可视区遮挡：
  - ConversationContent 顶部 padding 使用 CSS 变量（Header 高度透传）。
  - Slack 计算扣除顶部 padding，避免用户消息被 header 遮挡。
- 滚动按钮：
  - ScrollButton 基于 `distanceFromBottom` 阈值显示（默认 200px）。

## 当前分支目标（docs/turn-anchor-adoption）

- 将 Moryflow PC 与 Anyhunt Console 统一到 `@anyhunt/ui` 的 TurnAnchor 交互层。
- 复刻 assistant-ui 的 primitives 与职责划分，减少自研分叉。
- 解决“短列表下坠/抖动/遮挡/按钮误显”的交互问题。
- 为 AI 跟随行为提供最小可行实现（不引入额外复杂度）。

## 未来需求（需求方口径）

- AI 回复仅在“尾部不可见”时才自动跟随；尾部仍可见时不滚动。
- 用户上滑超过 10px 本轮不再跟随，尊重阅读位置。
- 保留 runStart 的平滑滚动动画（不回退为 instant）。
- 交互与逻辑保持模块化、单一职责；不做历史兼容，无用逻辑直接删除。
- 验证通过后移除临时日志，恢复默认静默。

## 未完成 / 待验证

- 验证 AI 跟随“触发时机与延迟”是否符合预期（尾部不可见即触发）。
- 验证 runStart 平滑滚动与 AI 跟随的时序不会互相打架（避免先下坠再上滚）。
- 若仍有延迟/抖动：补充尾部可见性对 footer/inset 遮挡的修正判定。
- 实现“assistant 尾部可见性驱动跟随”与“用户上滑取消”逻辑。

## 验证记录

- 2026-02-06：已完成 `pnpm lint / pnpm typecheck / pnpm test:unit` 全部通过；`better-sqlite3` 仍有上游编译警告（沿用现状）。

## 关键实现入口

- `packages/ui/src/ai/assistant-ui/primitives/thread/useThreadViewportAutoScroll.tsx`
- `packages/ui/src/ai/conversation-viewport/viewport.tsx`
- `packages/ui/src/ai/conversation-viewport/slack.tsx`
- `packages/ui/src/ai/message/root.tsx`
- `packages/ui/src/ai/message-list.tsx`
- `packages/ui/src/ai/conversation.tsx`
- `apps/moryflow/pc/src/renderer/components/chat-pane/index.tsx`
