---
title: Moryflow PC 消息列表交互复用改造方案（Following 模式）
date: 2026-02-08
scope: ui
status: active
---

<!--
[INPUT]: Moryflow PC 消息列表现状 + @moryflow/ui Conversation/Viewport + Following AutoScroll（参考 assistant-ui 语义但不引入依赖/拷贝目录）
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

---

## 附录 A：与 `main` 分支差异（用于合并/回滚）

### 对比基线

- 远端主分支：`origin/main`（当前为 `fa1cfe10`）
- 当前分支：`docs/turn-anchor-adoption`

### Commit 列表（`origin/main..docs/turn-anchor-adoption`）

> 注：此处为快照，用于快速 review；不要求严格包含“本文档后续小修”的 commit。

```text
f65ee2bc refactor(ui): stabilize MessageList key
7cb3178a docs(architecture): add main diff and code review for message list
a444fda8 refactor(ui): simplify message list auto-scroll and remove assistant-ui copy
3c755873 fix(ui): stabilize TurnAnchor top autoscroll
be181bbf feat(ui): 对齐 TurnAnchor 自动滚动
474b70c4 fix(ui): enhance TurnAnchor mechanism and stabilize auto-scroll behavior
0a99b62b fix(ui): align viewport auto-scroll and docs
a38c4a01 fix(ui): stabilize turn anchor scroll
8156ebfe fix(ui): stabilize slack anchor updates
62c21c17 fix(ui): stabilize slack resize auto-scroll
23337461 fix(ui): align conversation viewport and message list
9f92ed7f chore(repo): ignore archive my-app
0c898d0a fix(moryflow/pc): persist assistant stream start
3a483f73 feat(moryflow/pc): align chat loading
6e94f916 feat(console): align agent message loading
da327cba feat(ui): refine message list auto-scroll
c7d20f70 refactor(ui): unify message list viewport and turn anchor
70271241 docs(architecture): add turnAnchor adoption plan
```

### 文件级差异（`git diff --name-status origin/main...HEAD`）

```text
M	.gitignore
M	CLAUDE.md
M	apps/anyhunt/console/CLAUDE.md
M	apps/anyhunt/console/src/features/CLAUDE.md
M	apps/anyhunt/console/src/features/agent-browser-playground/components/AgentMessageList/AgentMessageList.tsx
M	apps/anyhunt/console/src/features/agent-browser-playground/components/AgentMessageList/components/message-row.tsx
M	apps/moryflow/admin/package.json
M	apps/moryflow/pc/CLAUDE.md
M	apps/moryflow/pc/package.json
M	apps/moryflow/pc/src/main/CLAUDE.md
A	apps/moryflow/pc/src/main/chat/__tests__/stream-agent-run.test.ts
M	apps/moryflow/pc/src/main/chat/chat-request.ts
M	apps/moryflow/pc/src/main/chat/handlers.ts
M	apps/moryflow/pc/src/main/chat/messages.ts
M	apps/moryflow/pc/src/renderer/components/chat-pane/CLAUDE.md
M	apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-footer.tsx
M	apps/moryflow/pc/src/renderer/components/chat-pane/components/conversation-section.tsx
M	apps/moryflow/pc/src/renderer/components/chat-pane/components/message/const.ts
M	apps/moryflow/pc/src/renderer/components/chat-pane/components/message/index.tsx
M	apps/moryflow/pc/src/renderer/components/chat-pane/components/task-hover-panel.test.tsx
M	apps/moryflow/pc/src/renderer/components/chat-pane/components/task-hover-panel.tsx
M	apps/moryflow/pc/src/renderer/components/chat-pane/hooks/index.ts
M	apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-stored-messages.ts
M	apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-tasks.ts
M	apps/moryflow/pc/src/renderer/components/chat-pane/index.tsx
M	docs/CLAUDE.md
M	docs/architecture/CLAUDE.md
A	docs/architecture/ui-message-list-turn-anchor-adoption.md
M	docs/index.md
A	docs/research/moryflow-pc-turn-anchor-scroll-tracking.md
M	packages/ui/CLAUDE.md
M	packages/ui/package.json
A	packages/ui/src/ai/conversation-viewport/context.tsx
A	packages/ui/src/ai/conversation-viewport/footer.tsx
A	packages/ui/src/ai/conversation-viewport/index.ts
A	packages/ui/src/ai/conversation-viewport/store.ts
A	packages/ui/src/ai/conversation-viewport/use-auto-scroll.ts
A	packages/ui/src/ai/conversation-viewport/viewport.tsx
M	packages/ui/src/ai/conversation.tsx
M	packages/ui/src/ai/index.ts
M	packages/ui/src/ai/message-list.tsx
M	packages/ui/src/ai/message/base.tsx
D	packages/ui/src/ai/use-conversation-layout.ts
A	packages/ui/test/conversation-viewport.test.tsx
A	packages/ui/test/message-list.test.tsx
A	packages/ui/test/message.test.tsx
M	pnpm-lock.yaml
```

### 统计（`git diff --stat origin/main...HEAD`）

```text
47 files changed, 2423 insertions(+), 647 deletions(-)
```

---

## 附录 B：Code Review（相关模块）

### 范围

- UI 包（跨端复用）：`packages/ui/src/ai/message-list.tsx`、`packages/ui/src/ai/conversation.tsx`、`packages/ui/src/ai/conversation-viewport/*`、`packages/ui/src/ai/message/*`
- PC（Renderer）：`apps/moryflow/pc/src/renderer/components/chat-pane/components/conversation-section.tsx`、`apps/moryflow/pc/src/renderer/components/chat-pane/components/message/index.tsx`
- Anyhunt Console（Web）：`apps/anyhunt/console/src/features/agent-browser-playground/components/AgentMessageList/*`

### 结论（总体）

- 当前实现符合“**经典 chat + Following 模式 + 发送不贴顶**”的最终交互目标，结构相对清晰，跨端复用路径明确（PC/Console 同用 `@moryflow/ui/ai/message-list` + `@moryflow/ui/ai/message`）。
- 删除 `packages/ui/src/ai/assistant-ui/**` 后，滚动相关逻辑内聚到 `ConversationViewport` 子模块，复杂度显著下降，维护面更可控。

### 做得好的点（保持即可）

- **模块职责清晰**：
  - `MessageList` 只负责布局 + runStart 触发（一次 smooth）+ 入场动画（`160ms`），不再承担测量/贴顶策略。
  - `ConversationViewportAutoScroll` 只负责 Following 状态机（滚动指标 + Resize/Mutation coalesce），避免 rect 测量与 slack 体系。
- **多端复用合理**：
  - PC/Console 的“消息样式原语”统一走 `@moryflow/ui/ai/message/*`，业务差异（工具审批、打开文件、i18n）留在各自应用层，UI 包不绑定 `desktopAPI`。
- **测试覆盖对关键语义有效**：
  - UI 包覆盖 following on/off、layout shrink rollback、不被 smooth 中断、runStart 触发与入场动效等关键路径。

### 问题与建议（按优先级，偏“简化/可维护”）

- P1（文档一致性）：已清理各端 `CLAUDE.md` 中旧的 TurnAnchor/发送贴顶描述；后续以本文作为单一事实来源（Following + runStart smooth + 160ms 入场）。
- P2（可预期性）：`MessageList` 未传 `threadId` 时使用稳定的默认 key，避免消息数组“压缩/截断”导致意外 remount；但如果业务存在线程切换，上层仍应显式传入 `threadId` 作为唯一事实来源（类似 PC 的 `activeSessionId`）。
- P3（重复逻辑）：已抽出纯函数级 util（`@moryflow/ui/ai/message/parts.ts`：`splitMessageParts/cleanFileRefMarker`），PC/Console 统一复用，避免语义漂移。
