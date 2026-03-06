---
title: Chat 意图驱动视口滚动方案
date: 2026-03-06
scope: packages/ui + moryflow/pc + anyhunt/console + moryflow/admin
status: completed
---

<!--
[INPUT]:
- 用户需求：聊天消息区中，除流式消息追随与显式“去最新消息”外，所有手动 inspection/layout 交互都不应把视口自动拉到底部。
- 关键约束：最佳实践、零历史包袱、允许重构；优先根因治理，不做针对单个组件的补丁。

[OUTPUT]:
- 将滚动能力从“DOM 变化驱动”重构为“用户意图驱动”。
- 为 shared web viewport 定义统一的 scroll intent / follow mode / anchor preservation 语义。
- 给出实施步骤、端侧接入边界与测试验收标准。

[POS]: Moryflow Features / Chat 视口滚动语义重构方案

[PROTOCOL]: 本文件变更需同步 `docs/design/moryflow/features/index.md` 与 `docs/CLAUDE.md`。
-->

# Chat 意图驱动视口滚动方案

## 1. 摘要

1. 当前 shared web viewport 把“内容高度变化”统一视为需要自动追随的信号，导致用户手动展开/折叠历史内容时也会被自动拉到底部。
2. 根因不是某个折叠组件实现错误，而是 `ConversationViewport` 缺少“交互意图”这一层语义，只有 `ResizeObserver/MutationObserver + following` 的 DOM 级判断。
3. 新方案将滚动系统重构为“意图驱动”：
   - 只有 `navigate-to-latest` 和 `stream-append-while-following` 可以移动视口；
   - 所有 inspection/layout 交互统一走 `preserve-anchor`，保持点击锚点视觉位置不变。
4. 这是一层 shared web viewport 能力重构，不是针对 `AssistantRoundSummary` 的局部补丁。

## 2. 问题定义

### 2.1 当前错误行为

1. 用户点击 `已处理` 展开/折叠过程消息。
2. 消息区高度变化触发 shared viewport 的 `ResizeObserver/MutationObserver`。
3. 若当前 `following=true`，视口自动执行“去最新消息”滚动。
4. 用户被带到消息底部，阅读上下文丢失。

### 2.2 根因

1. `packages/ui/src/ai/conversation-viewport/use-auto-scroll.ts`
   - 只区分 “following / not following”
   - 不区分“流式追加内容”和“用户手动 inspection 布局变化”
2. `packages/ui/src/ai/message-list.tsx`
   - 只有 `runStart -> navigateToLatest`
   - 没有统一的 scroll intent 语义层
3. `AssistantRoundSummary` / `Reasoning` / `Tool`
   - 只负责开合
   - 没有能力向 viewport 声明“这次是 inspection，不是去最新消息”

## 3. 冻结交互语义

### 3.1 允许移动视口的场景

1. `navigate-to-latest`
   - 用户发送消息
   - 用户点击“滚到底部”
   - 用户切换线程
   - 用户显式重试并进入新的运行轮次
2. `stream-append-while-following`
   - AI 正在流式输出
   - 用户仍停留在底部或已明确恢复 following

### 3.2 不允许移动视口的场景

1. `inspection/layout`
   - 展开/折叠 Assistant Round Summary
   - 展开/折叠 Tool
   - 展开/折叠 Reasoning
   - 未来任何 disclosure / accordion / details / 历史过程查看交互
2. 这些场景统一要求：
   - 不自动滚到底部
   - 交互锚点保持在原视觉位置

## 4. 架构设计

### 4.1 单一职责拆分

1. `ConversationViewport`
   - 负责滚动状态机、following 模式、anchor preservation
   - 不再根据 DOM 变化自行猜测业务语义
2. `MessageList`
   - 负责把“消息流事件”映射为 viewport intent
   - 例如 `run-start`、`stream-append`
3. `AssistantRoundSummary / Tool / Reasoning`
   - 负责上报 inspection intent
   - 不直接操作 `scrollTop`

### 4.2 新的 shared scroll model

1. `followMode`
   - `following`
   - `manual-inspect`
2. `intent`
   - `navigate-to-latest`
   - `stream-append`
   - `preserve-anchor`
3. `anchor snapshot`
   - `anchorId`
   - `anchorTop`
   - `scrollTop`

### 4.3 关键原则

1. DOM observer 只负责“观测布局变化”，不负责“决定业务动作”。
2. 视口是否滚动，由显式 intent 决定，而不是由“scrollHeight 变了”决定。
3. inspection 交互的默认语义永远是 `preserve-anchor`。

## 5. 共享接口重构

### 5.1 `packages/ui/src/ai/conversation-viewport/store.ts`

新增统一 viewport controller action：

1. `navigateToLatest(config?)`
2. `preserveAnchor(anchorId: string)`
3. `pauseFollowing()`
4. `resumeFollowing()`

同时保留已有只读状态：

1. `isAtBottom`
2. `distanceFromBottom`

### 5.2 `packages/ui/src/ai/conversation-viewport/use-auto-scroll.ts`

改造目标：

1. `ResizeObserver/MutationObserver` 到来时：
   - 若存在 pending `preserveAnchor`，优先执行 anchor compensation
   - 否则仅在 `followMode=following` 且 intent 合法时追随到底部
2. 用户上滑：
   - 进入 `manual-inspect`
3. 回到底部或显式 `navigateToLatest`
   - 恢复 `following`

### 5.3 Anchor 协议

统一使用稳定的 `anchorId`，不把 DOM ref 存进 store。

约定：

1. DOM 元素通过 `data-ai-anchor="<anchorId>"` 标识
2. inspection 触发前调用 `preserveAnchor(anchorId)`
3. 布局变化后，viewport 重新查找同一个 anchor 元素并补偿 `scrollTop`

## 6. 端侧接入边界

### 6.1 Shared Web 组件

1. `packages/ui/src/ai/assistant-round-summary.tsx`
   - 增加 `viewportAnchorId` 输入
   - 点击前先声明 `preserveAnchor(viewportAnchorId)`
2. `packages/ui/src/ai/reasoning.tsx`
   - 顶层 `Reasoning` 增加 `viewportAnchorId`
   - 手动开合前声明 `preserveAnchor`
3. `packages/ui/src/ai/tool.tsx`
   - 顶层 `Tool` 增加 `viewportAnchorId`
   - 手动开合前声明 `preserveAnchor`

### 6.2 PC

1. `apps/moryflow/pc/src/renderer/components/chat-pane/components/conversation-section.tsx`
   - round summary 传入 `viewportAnchorId = round:${roundId}`
2. `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/message-body.tsx`
   - reasoning part 传入 `viewportAnchorId = reasoning:${messageId}:${partIndex}`
3. `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/tool-part.tsx`
   - tool part 传入 `viewportAnchorId = tool:${messageId}:${partIndex}`

### 6.3 Console / Admin

与 PC 同步接入同一套 anchor 协议：

1. Console `message-row.tsx` / `message-tool.tsx`
2. Admin `message.tsx` / `message-tool.tsx`

### 6.4 Mobile

1. 本次实现范围不直接修改 RN `FlatList` 滚动控制器。
2. 但交互语义与命名保持一致：
   - future parity 时，RN scroll controller 复用同一 intent 模型

## 7. 非范围

1. 不重写移动端滚动控制器
2. 不引入旧滚动语义兼容开关
3. 不做“仅对 AssistantRoundSummary 特判”的局部补丁

## 8. 测试场景

### 8.1 Shared Viewport

1. `navigate-to-latest` 会滚到底部
2. `stream-append while following` 会自动追随
3. `preserve-anchor` 后发生 resize/mutation，不会滚到底部
4. `preserve-anchor` 后锚点元素的视觉 top 保持不变

### 8.2 PC / Console / Admin

1. 点击 `已处理` 展开/折叠时，视口保持在摘要行
2. 点击 Tool 展开/折叠时，视口保持在 Tool trigger
3. 点击 Reasoning 展开/折叠时，视口保持在 Reasoning trigger
4. 发送消息/流式输出仍维持原有贴底行为

## 9. 实施步骤

### Step 1（completed）：Shared viewport intent model 重构

1. 重构 `conversation-viewport/store.ts`
2. 重构 `use-auto-scroll.ts`
3. 新增 viewport anchor 协议与 shared 单测

执行结果：

1. `packages/ui/src/ai/conversation-viewport/store.ts` 已新增 `navigateToLatest / onNavigateToLatest / preserveAnchor / onPreserveAnchor`，由 shared viewport store 统一承接滚动意图。
2. `packages/ui/src/ai/conversation-viewport/use-auto-scroll.ts` 已重构为“intent-driven following + anchor preservation”：
   - `navigateToLatest` 仍负责发送/回到底部/显式去最新消息；
   - `preserveAnchor` 记录 `anchorTop` 并在下一次布局变更时做 `scrollTop` 补偿；
   - Resize/Mutation 只负责观测，不再直接承载业务语义。
3. `packages/ui/test/conversation-viewport.test.tsx` 已补齐 `preserve-anchor` 回归，确认 inspection 交互不会贴底且能保持锚点位置。

### Step 2（completed）：Shared UI 组件接入 preserve-anchor

1. `AssistantRoundSummary`
2. `Reasoning`
3. `Tool`

执行结果：

1. `packages/ui/src/ai/assistant-round-summary.tsx` 新增 `viewportAnchorId` 与 `data-ai-anchor`，点击前先声明 `preserveAnchor`。
2. `packages/ui/src/ai/reasoning.tsx` 的 `ReasoningTrigger` 新增 `viewportAnchorId`，统一在手动开合前声明 `preserveAnchor`。
3. `packages/ui/src/ai/tool.tsx` 的 `ToolSummary` 新增 `viewportAnchorId`，并顺手清理了 `ToolHeader` 非 DOM props 泄漏。

### Step 3（completed）：PC / Console / Admin 传入稳定 anchorId

1. PC round summary / reasoning / tool
2. Console round summary / reasoning / tool
3. Admin round summary / reasoning / tool

执行结果：

1. PC：
   - `components/conversation-section.tsx` 为 round summary 透传 `round:${roundId}`；
   - `components/message/message-body.tsx` 为 reasoning 透传 `reasoning:${messageId}:${partIndex}`；
   - `components/message/tool-part.tsx` 为 tool 透传 `tool:${messageId}:${partIndex}`。
2. Console：
   - `AgentMessageList.tsx` 为 round summary 透传稳定 round anchor；
   - `message-row.tsx` 为 reasoning/tool 透传稳定 anchor 所需的 `viewportAnchorId/messageId/partIndex`；
   - `message-tool.tsx` 显式要求上层提供 `messageId + partIndex`。
3. Admin：
   - `conversation-section.tsx` 为 round summary 透传稳定 round anchor；
   - `message.tsx` 为 reasoning/tool 透传稳定 anchor 所需的 `viewportAnchorId/messageId/partIndex`；
   - `message-tool.tsx` 显式要求上层提供 `messageId + partIndex`。

### Step 4（completed）：测试与验证

1. shared viewport 单测
2. PC/Console/Admin 回归
3. 受影响包 lint / typecheck / test

执行结果：

1. 定向单测通过：
   - `pnpm --filter @moryflow/ui exec vitest run test/conversation-viewport.test.tsx test/message-list.test.tsx`
   - `pnpm --filter @moryflow/pc exec vitest run src/renderer/components/chat-pane/components/conversation-section.test.tsx src/renderer/components/chat-pane/components/message/index.test.tsx src/renderer/components/chat-pane/components/message/tool-part.test.tsx src/renderer/components/chat-pane/components/message/message-body.test.tsx`
   - `pnpm --filter @anyhunt/console exec vitest run src/features/agent-browser-playground/components/AgentMessageList/AgentMessageList.test.tsx src/features/agent-browser-playground/components/AgentMessageList/components/message-tool.test.tsx src/features/agent-browser-playground/components/AgentMessageList/components/message-row.test.tsx`
   - `pnpm --filter @moryflow/admin exec vitest run src/features/chat/components/conversation-section.test.tsx src/features/chat/components/message-tool.test.tsx src/features/chat/components/message.test.tsx`
2. 受影响包类型检查通过：
   - `pnpm --filter @moryflow/ui typecheck`
   - `pnpm --filter @moryflow/pc typecheck`
   - `pnpm --filter @anyhunt/console typecheck`
   - `pnpm --filter @moryflow/admin typecheck`
3. 根级校验：
   - `pnpm lint` 通过
   - `pnpm typecheck` 通过
   - `pnpm test:unit` 未全绿，但失败为仓库既有基线：
     - `apps/moryflow/admin/src/stores/auth.test.ts`
     - `apps/anyhunt/console/src/stores/auth.test.ts`
     - `apps/anyhunt/admin/www/src/lib/auth/auth-methods.test.ts`
     - `@moryflow/pc` 的 `better-sqlite3` rebuild/test 环境中断

### Step 5（completed）：文档与 CLAUDE 回写

1. 更新本文档状态与执行结果
2. 更新 `docs/design/moryflow/features/index.md`
3. 更新 `docs/CLAUDE.md`
4. 更新受影响目录 `CLAUDE.md`

执行结果：

1. 本文档已回写为 `completed`，并补充实现与验证结果。
2. `docs/design/moryflow/features/index.md`、`docs/CLAUDE.md`、`docs/index.md` 已同步增加本方案入口与完成状态。
3. `packages/ui/CLAUDE.md`、`apps/moryflow/pc/src/renderer/components/chat-pane/CLAUDE.md`、`apps/anyhunt/console/src/features/CLAUDE.md`、`apps/moryflow/admin/CLAUDE.md` 已同步记录“意图驱动视口滚动 + preserve-anchor”事实。

## 10. 验收标准

1. 除 `navigate-to-latest` 与 `stream-append-while-following` 外，其余手动 inspection/layout 交互都不应自动滚到底部。
2. 点击展开/折叠后，触发器锚点位置保持稳定。
3. 发送消息、点击滚到底部、线程切换、流式输出不回归。
4. shared viewport 成为唯一滚动语义事实源。

## 11. 实际结果

1. PC 现已支持：
   - 点击 `已处理` 摘要行展开/折叠时保持摘要行位置不变；
   - 点击 Tool/Reasoning 开合时保持对应 trigger 位置不变；
   - 发送消息、回到底部、流式追随仍保持原行为。
2. Console/Admin 已接入同一套 anchor 协议与 shared UI 语义，避免后续再次分叉。
3. 移动端滚动控制器本轮未重构，仍属于明确的非范围项。
