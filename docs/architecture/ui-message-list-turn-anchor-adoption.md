---
title: Moryflow PC 消息列表交互复用改造方案（Following 模式）
date: 2026-02-07
scope: ui
status: active
---

<!--
[INPUT]: Moryflow PC 消息列表现状 + @anyhunt/ui Conversation/Viewport + Following AutoScroll（参考 assistant-ui 语义但不引入依赖/拷贝目录）
[OUTPUT]: 给出“低复杂度、可维护”的自动滚动最终交互（Following 模式 + 发送不贴顶）
[POS]: 消息列表自动滚动的单一事实来源（最终交互 + 边界 + 职责分层）

[PROTOCOL]: 本文为当前阶段的最终状态说明；后续变更需同步更新 docs/architecture/CLAUDE.md 与 docs/CLAUDE.md。
-->

# Moryflow PC 消息列表交互复用改造方案（Following 模式）

## TL;DR（最终交互）

- **删除“发送后滚到最顶/用户消息贴顶”**：发送只保证“用户消息 + AI loading”在底部可见，不再把当前轮 user 顶到视口最上方。
- 自动滚动只抽象成一个可解释的 **Following 模式**：
  - 默认 Following=ON（用户在底部时）。
  - **用户任意上滑**立刻 Following=OFF，停止一切追随滚动。
  - 用户滚回底部或点击滚到底部按钮，Following 恢复为 ON。
- **runStart（用户发送触发）**：始终触发一次 `scrollToBottom({ behavior: 'smooth' })`，并强制 following=ON（即使用户当前不在底部也回到底部）。常态下（用户在底部发送）滚动距离≈新增的“用户消息 + AI loading”高度；不额外引入 slack。
  - 同时对“本次新增的 user 消息 + 紧随其后的 AI loading”做一次入场动效（`160ms`，向上滑入 + 淡入），增强“向上出现”的反馈。
- **AI 流式输出**：Following=ON 时使用 `behavior:'auto'`（instant）追随，避免 token 粒度 smooth 带来的抖动与动画叠加。
- 降复杂度的硬约束：不使用 rect 测量、不引入 slack、不引入 tail sentinel；禁用 `overflow-anchor`。

## 清理范围（保留最小集合）

- 保留：
  - `Conversation/ConversationViewport/MessageList`（布局与触发点）
  - `ConversationViewportStore`（`isAtBottom/distanceFromBottom/scrollToBottom`）
  - `useConversationViewportAutoScroll`（Following 状态机 + streaming 追随）
- 删除：
  - `packages/ui/src/ai/assistant-ui/**`（不再保留 assistant-ui 源码拷贝目录）
  - TurnAnchor / TurnTail / slack / tail sentinel / size handle 等“贴顶与测量驱动”方案
  - 事件总线式的 aui-event（滚动行为改为“单一入口 scrollToBottom + Resize/Scroll 指标”）

## 背景与问题

TurnAnchor=top 的目标是“发送后当前轮 user 尽量贴顶，assistant 在下方展开”。为了实现它，往往需要 slack(min-height) 与更复杂的测量/门控，容易被布局抖动放大成可见闪烁。

但“按尾部可见性/遮挡边界触发滚动”的做法会把系统绑死在一组易抖动的测量口径上：任何一帧样式注入/布局计算的不一致，都会直接变成可见的闪烁或提前滚动。

本阶段把目标收敛为更通用、更易维护的交互语义：**Following 模式 + 用户意图优先**。

## 目标体验（用户可感知）

1. 用户发送后能立刻看到：**自己的消息 + 紧随其后的 AI loading**。
2. AI 流式输出时：
   - Following=ON：持续追到最新输出（instant）
   - Following=OFF：不再自动追随（尊重阅读）
3. 消除“无操作也跳一下”的闪烁/回弹：
   - 不靠增加更多 if/锁来掩盖抖动
   - 优先让判定口径更稳定（Following 不再依赖 rect/遮挡）

## 非目标（明确不做）

- **不再支持** “发送后用户消息贴顶 / TurnAnchor=top”。
- 不再定义“尾部即将被 footer/input 遮挡（误差 <= 1px）才触发跟随”的精细规则。
- 不使用 `getBoundingClientRect()` 作为“是否跟随”的核心门控。
- 不在 AutoScroll 里持续扩展边界条件来覆盖布局抖动（这会让维护成本指数上升）。

## Following 模式（最佳实践规格）

### 状态定义

- `following: boolean`（AutoScroll 内部状态即可，不要求进 Store）
  - `true`：允许程序在内容增长时把视口推到底部
  - `false`：禁止追随滚动（除非用户显式恢复）

### 事件规则

1. initialize / threadSwitch
   - 目标：打开历史/切换线程时进入“最新消息视角”
   - 行为：`scrollToBottom({ behavior: 'auto' })`（instant）
   - following：置为 `true`

2. runStart（用户发送触发，status: idle -> submitted/streaming）
   - 目标：确保“用户消息 + AI loading”可见；并将 following 重新打开（2.A：即使用户不在底部也强制回到底部）
   - 行为：触发一次 `scrollToBottom({ behavior: 'smooth' })`（仅本次 smooth；后续流式追随用 auto）
   - 视觉反馈：对“新增 user 消息 + AI loading”做一次入场动效（`160ms`）
   - following：置为 `true`
   - 用户打断：若 smooth 期间用户上滑，following 立刻变为 `false`（并依赖浏览器默认行为取消 smooth）

3. 流式追随（内容增长）
   - 触发：ResizeObserver/MutationObserver 观察到内容高度增长
   - 条件：following=true 且当前 “在底部”（或足够接近底部）
   - 行为：`scrollToBottom({ behavior: 'auto' })`

4. 暂停追随（用户意图优先）
   - 条件：出现“向上滚动且离开底部”的滚动变化（scrollTop decrease + not at bottom），并且该变化不是由布局 shrink 或视口高度变化导致
   - 行为：following=false

5. 恢复追随
   - 条件：用户滚回到底部，或点击 ScrollButton / 执行 `scrollToBottom` 事件
   - 行为：following=true

> 注：实现层面必须避免把“布局 shrink / 视口高度变化导致的 scrollTop 被动回退”当成用户上滑（否则会出现无操作也暂停追随）。
> 本阶段采用纯滚动指标 + layout delta 过滤（scrollHeightDelta/clientHeightDelta）来做稳定判定，避免依赖浏览器对 scrollbar drag 的事件分发差异。

## 分层与职责（单一职责）

- 布局层（经典 chat）：
  - 目标：消息列表可滚动、Footer 可用、滚动按钮可用
  - 代表文件：
    - `packages/ui/src/ai/conversation.tsx`
    - `packages/ui/src/ai/conversation-viewport/viewport.tsx`
    - `packages/ui/src/ai/message-list.tsx`
- 滚动层（AutoScroll）：
  - 目标：Following 状态机 + streaming instant（auto）
  - 代表文件：
    - `packages/ui/src/ai/conversation-viewport/use-auto-scroll.ts`
    - `packages/ui/src/ai/conversation-viewport/store.ts`
- 事件层（业务触发）：
  - 目标：把“什么时候算 initialize/runStart/threadSwitch”固定在业务侧
  - 代表文件：
    - `packages/ui/src/ai/message-list.tsx`

## vNext 重构清单（从复杂到简单）

- 已完成：移除 TurnAnchor=top / slack / tail sentinel 相关逻辑
- 保留：Following 状态机（用户上滑立即 following=false；回到底部恢复）
- 新增/对齐：runStart 改为 `behavior:'smooth'`（一次），用于“发出后滚一下”的反馈（不再滚到最顶/不贴顶）

## 单测与验证（最低要求）

单测（Vitest）至少覆盖：

- following=true 且在底部：内容增长会触发 `scrollToBottom({ behavior: 'auto' })`
- 用户上滑一次：following 立刻变 false；后续内容增长不再触发滚动
- 用户滚回到底部 / 触发 scrollToBottom 事件：following 恢复；后续内容增长继续追随
- runStart 使用 `behavior: 'smooth'`（仅一次；后续 streaming 追随仍为 auto）

手动验证：

- 长流式输出时持续追随，不会“输出太多看不见”
- 上滑阅读历史后不会被拉回；点击滚到底部按钮可恢复
- 无操作时不应出现跳动/闪烁
- 用户发送时不会“滚到最顶/贴顶”，而是只回到底部展示新一轮（用户消息 + AI loading）

## 关键实现入口

- `packages/ui/src/ai/conversation-viewport/use-auto-scroll.ts`
- `packages/ui/src/ai/conversation-viewport/store.ts`
- `packages/ui/src/ai/conversation-viewport/viewport.tsx`
- `packages/ui/src/ai/conversation.tsx`
- `packages/ui/src/ai/message-list.tsx`

## 调试

- 默认不输出 AutoScroll 日志；如需排查滚动边界，可在 DevTools Console 执行：`globalThis.__AUI_DEBUG_AUTO_SCROLL__ = true`（关闭设为 `false`）。
