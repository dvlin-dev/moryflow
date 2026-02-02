---
title: Moryflow PC 消息列表交互复用改造方案（TurnAnchor 机制）
date: 2026-02-02
scope: ui
status: proposal
---

<!--
[INPUT]: Moryflow PC 现有消息列表实现 + @anyhunt/ui 组件库封装现状 + 参考项目的 turnAnchor 交互
[OUTPUT]: 在 @anyhunt/ui 内引入可复用的 TurnAnchor 机制与组件分层改造计划，并落地到 Moryflow PC
[POS]: 消息列表交互复用与组件库演进的执行方案

[PROTOCOL]: 本文为方案草案；落地时需同步更新相关 CLAUDE.md 与 docs/index.md。
-->

# Moryflow PC 消息列表交互复用改造方案（TurnAnchor 机制）

## 背景

当前 Moryflow PC 消息列表的“发送后顶部锚定用户消息、助手回复在下方展开”的交互，主要依赖 `@anyhunt/ui/ai/use-conversation-layout` 的占位与滚动逻辑；而参考项目（my-app）采用了更系统化的 **Viewport + TurnAnchor** 机制：通过视口状态、消息高度注册与 slack 区域计算，保证交互一致性与组件层清晰分层。

本方案目标是在 **不改变业务逻辑** 的前提下，将参考项目的“消息列表交互 + 组件库封装”最佳实践迁移至 `@anyhunt/ui`，并在 Moryflow PC 中复用。

## 现状梳理

### Moryflow PC（应用层）

- 消息列表渲染：`apps/moryflow/pc/src/renderer/components/chat-pane/components/conversation-section.tsx`
- 布局与占位策略：`packages/ui/src/ai/use-conversation-layout.ts`
- 消息 UI 组件：`packages/ui/src/ai/message/*` + `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/index.tsx`
- 容器与滚动：`packages/ui/src/ai/conversation.tsx`（基于 `use-stick-to-bottom`）

当前策略要点：

- 使用 placeholder message + minHeight 计算，保证用户消息滚到顶部后仍有“可用滚动空间”。
- `use-stick-to-bottom` 负责滚动上下文与“滚动到底部”的按钮。
- 布局逻辑分散在 `useConversationLayout` 与应用层渲染过程中。

### 参考项目（my-app）

交互与封装特征：

- 以 **Viewport Store** 管理滚动状态与高度信息（viewport/inset/user message）。
- `turnAnchor="top"` 作为统一开关，决定“用户消息锚定顶部”的行为。
- Message root 注册用户消息高度；最后一条 assistant message 通过 slack 计算得到 `min-height`。
- `ViewportFooter` 负责测量输入框等底部区域的高度。
- 自动滚动与 “Scroll to bottom” 由独立 hook 处理，避免业务逻辑耦合。

## 目标

1. 在 `@anyhunt/ui` 内提供 **TurnAnchor 机制**，统一实现“用户消息顶住顶部”的交互。
2. 将滚动/布局逻辑从业务层抽离为 UI 组件/Hook，形成稳定可复用的封装层。
3. Moryflow PC 采用新的 UI 交互层，实现与参考项目一致的用户体验。
4. 保持 `@anyhunt/ui` **纯 UI、无业务副作用** 的原则。

## 非目标

- 不改变 `UIMessage` 数据结构与业务层消息处理逻辑。
- 不引入业务相关的文案或副作用（如 toast、Electron API）。
- 不在本方案中处理移动端的消息列表重构（可作为后续扩展）。

## 已确认决策

1. **PC 默认启用 `turnAnchor="top"`**，保持“用户消息顶在顶部、助手回复在下方展开”的交互为默认体验。
2. **允许在 `@anyhunt/ui` 引入新的 Viewport Store（如 Zustand）**，用于统一滚动状态与高度测量。
3. **Console 同步迁移到新交互**，并与 PC 一致默认 `turnAnchor="top"`，统一交互体验。
4. **完全替换现有滚动/布局逻辑**（包括 `use-stick-to-bottom` 与 placeholder 方案），不做历史兼容与 fallback。
5. **Streaming 滚动策略统一**：`turnAnchor="top"` 下默认不强制 autoScroll，仅在 `isAtBottom` 时跟随；run start/initialize/resize 采用一致的可预期行为（见下文“滚动策略”）。

## 最佳实践写法（本方案采用）

1. **显式 props 驱动滚动生命周期**：`MessageList`/Viewport 只依赖 `messages`、`status`、`threadId` 等显式 props，不依赖业务事件总线或外部副作用。
2. **Message 保持纯 UI**：高度注册与 slack 计算由 `MessageList` 内部 wrapper 负责（内部组件不导出），避免污染 Message 的 SRP。
3. **Conversation 体系统一**：`Conversation`/`ConversationContent` 直接迁移到新的 Viewport 体系并移除 `use-stick-to-bottom` 依赖，避免两套并存。

## 方案概要

### A. 在 @anyhunt/ui 新增 TurnAnchor 交互层

新增一组可复用的“消息列表交互 primitives”，建议放在 `packages/ui/src/ai/conversation-viewport/`：

- `ConversationViewport`：提供 turnAnchor/autoScroll 等配置，并注册 viewport 尺寸。
- `ConversationViewportFooter`：注册底部区域高度（输入框/工具栏）。
- `ConversationViewportSlack`：当 `turnAnchor="top"` 时，对最后一条 assistant message 添加 min-height。
- `useConversationViewportAutoScroll`：统一滚动逻辑，管理 `isAtBottom` 与 scrollToBottom 行为。
- `ConversationScrollButton`：基于 viewport 状态渲染“滚动到底部”按钮。

> 该层不触碰消息内容，只负责“滚动行为 + 布局测量”。

### B. Message 组件接入高度注册

- 在 `Message` 或新 wrapper（如 `MessageViewportAnchor`）中注册“锚点用户消息高度”。
- 与 slack 机制配合，只在符合条件时参与计算（最后一条 assistant message 的前一条用户消息）。

### C. 替换 useConversationLayout 的占位策略

- 新增 `MessageList` 的 turnAnchor 模式，使用 Viewport + Slack 机制，不再插入 placeholder message。
- **移除** `useConversationLayout` 及其占位逻辑（不保留兼容路径）。

### D. Moryflow PC 迁移

- ChatPane 的 `ConversationSection` 改为使用新的 `MessageList`/`ConversationViewport` 组合。
- 移除 `useConversationLayout` 返回的 `renderMessages/minHeight` 逻辑。
- 保持 `ChatMessage` 渲染逻辑不变，仅接入新的 Message wrapper/slot。

## API 草案（示意）

```tsx
<ConversationViewport turnAnchor="top" className="flex-1">
  <ConversationContent>
    {messages.map((message) => (
      <Message key={message.id} data-role={message.role} data-index={index}>
        <MessageContent>...</MessageContent>
      </Message>
    ))}
  </ConversationContent>

  <ConversationViewportFooter>
    <ChatPromptInput />
  </ConversationViewportFooter>

  <ConversationScrollButton />
</ConversationViewport>
```

## 实施阶段（建议）

### 阶段 1：UI 层新增 TurnAnchor primitives

- 在 `@anyhunt/ui` 内新增 Viewport Store（记录 viewport/inset/user message 高度）。
- 增加 `ConversationViewport`/`Footer`/`Slack`/`ScrollButton` 等基础组件。
- 为 `Message` 增加“注册 anchor 用户消息高度”的能力。
- 单测覆盖：高度变化、turnAnchor 切换、scrollToBottom 行为。

### 阶段 2：消息列表组件升级

- 在 `MessageList` 中新增 `turnAnchor` 与 `viewportFooter` 插槽支持。
- 在 `turnAnchor="top"` 模式下切换到新的 Viewport 逻辑。
- 删除旧的 placeholder 逻辑与相关依赖。

### 阶段 3：Moryflow PC 迁移

- `ChatPane` / `ConversationSection` 使用新的 `MessageList`/Viewport 方案。
- 删除对 `useConversationLayout` 的依赖。
- 验证编辑、重试、分支、工具卡等功能不受影响。

### 阶段 4：Console 迁移与一致性验证

- Anyhunt Console 的 `AgentMessageList` 迁移到同一套 MessageList + Viewport 方案。
- turnAnchor 与 PC 一致为 `top`，统一交互预期。

## 风险与缓解

- **滚动抖动/跳动**：新增滚动策略后，补齐关键行为的回归测试与可视化验证（不保留旧逻辑）。
- **高度测量不一致**：需要明确 `Message` 最外层的 padding/margin 计入规则。
- **流式输出期间的滚动体验**：需验证 `streaming` 状态下的 auto-scroll 行为与当前一致。

### 风险缓解检查清单

- [ ] 新消息发送后，用户消息锚定顶部且无明显跳动。
- [ ] 流式输出期间，滚动跟随稳定且不回弹。
- [ ] 手动滚动到历史消息后，不会被强制拉回底部。
- [ ] 视口尺寸变化（窗口缩放/侧栏展开）不会导致位置错乱。

## 错误边界与清理策略

- DOM refs 可能为空时直接跳过测量与滚动，避免报错。
- Resize/scroll 监听必须在卸载时清理，防止内存泄漏。
- 当测量值不可用时使用安全默认值（例如高度=0），保持布局稳定。

### 错误边界检查清单

- [ ] ref 为空或节点卸载时不触发滚动/测量逻辑。
- [ ] 所有监听与 observer 在 unmount 时清理。
- [ ] 任何测量异常不会阻断渲染流程（安全默认值生效）。
- [ ] SSR/无 window 环境下不访问 DOM API。

## 滚动策略（统一）

- `turnAnchor="top"` 默认 `autoScroll=false`，只有在 `isAtBottom=true` 时跟随新内容。
- `thread.runStart` / `thread.initialize` / `thread.switch` 统一采用可预测的滚动策略（如 `instant` 或 `auto`，保持一致）。
- resize/内容变化：当处于 “正在跟随” 状态时保持跟随；否则仅更新 `isAtBottom` 状态，不强制滚动。

### 滚动策略验收清单

- [ ] `turnAnchor="top"` 下默认不强制 autoScroll。
- [ ] `isAtBottom=true` 时新增内容保持跟随；`false` 时不跟随。
- [ ] runStart/initialize/switch 使用同一滚动策略，行为可预测。
- [ ] resize/内容变化不触发意外滚动。

## 验收标准

- 新消息发送后，用户消息能稳定停在可视区域顶部，助手回复在下方展开。
- 滚动到底部按钮在非底部状态下出现，行为稳定。
- 不插入 placeholder message，也能维持同样的布局体验。
- Moryflow PC 与 Console（若迁移）交互一致，消息渲染无回归。

## 执行计划（可跟踪）

> 以“可回滚、可分阶段”方式推进，允许大范围重构但保持可验证的阶段验收。

1. [ ] **设计与接口定稿**：补齐 `ConversationViewport` / `Footer` / `Slack` / `ScrollButton` 的 API 定义与使用示例；文档化 `turnAnchor` 语义与默认值（PC/Console=top）。
2. [ ] **UI Store 落地**：在 `@anyhunt/ui` 新增 Viewport Store（Zustand），提供高度注册与滚动状态（viewport/inset/userMessage/isAtBottom）。
3. [ ] **基础 primitives 落地**：实现 `ConversationViewport`、`ConversationViewportFooter`、`ConversationViewportSlack`、`useConversationViewportAutoScroll`。
4. [ ] **Message 接入高度注册**：通过 `MessageList` 内部 wrapper 注册“锚点用户消息高度”，保证 Slack 计算正确。
5. [ ] **MessageList 升级**：新增 `turnAnchor` 模式，切换到 Viewport/Slack 逻辑；**删除旧占位逻辑** 与 `useConversationLayout`。
6. [ ] **Moryflow PC 迁移**：`ConversationSection` 切换到新 MessageList；移除 `useConversationLayout` 依赖；保持消息内容渲染不变。
7. [ ] **Console 迁移**：`AgentMessageList` 切换到新 MessageList（默认 `turnAnchor="top"`）；验证交互一致性与滚动稳定性。
8. [ ] **测试补齐**：新增/更新 UI 单元测试（高度测量、turnAnchor 切换、scroll button）；补充 PC/Console 关键交互回归测试。
9. [ ] **依赖与发布影响**：补齐 `@anyhunt/ui` 对 Zustand 的依赖变更、打包影响与 tree-shaking 说明；移除 `use-stick-to-bottom` 依赖。
10. [ ] **文档与索引更新**：更新 `packages/ui/CLAUDE.md` 与相关模块 CLAUDE 说明；同步 docs/ 索引与变更记录。
