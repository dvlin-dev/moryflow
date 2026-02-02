---
title: Moryflow PC 消息列表交互复用改造方案（TurnAnchor 机制）
date: 2026-02-02
scope: ui
status: implemented
---

<!--
[INPUT]: Moryflow PC 现有消息列表实现 + @anyhunt/ui 组件库封装现状 + 参考项目 TurnAnchor 交互
[OUTPUT]: 在 @anyhunt/ui 内落地可复用的 TurnAnchor（固定为 top）机制与组件分层，并同步迁移 Moryflow PC/Console
[POS]: 消息列表交互复用与组件库演进的执行结果与规范

[PROTOCOL]: 本文为最终落地文档；如继续调整需同步更新相关 CLAUDE.md 与 docs/CLAUDE.md 索引。
-->

# Moryflow PC 消息列表交互复用改造方案（TurnAnchor 机制）

## 结论（已落地）

- 统一交互：**用户消息固定顶住可视区域顶部**，助手回复在下方展开。
- TurnAnchor 机制 **默认固定为 `top`，不对外暴露配置参数**。
- 完全替换旧方案：移除 `useConversationLayout` 与 `use-stick-to-bottom`，不做历史兼容。
- PC 与 Console 共用同一套 `@anyhunt/ui` 交互层，滚动与布局行为一致。

## 背景（旧实现问题）

旧的 Moryflow PC 消息列表依赖 `useConversationLayout` 的 placeholder + minHeight 占位方案，并通过 `use-stick-to-bottom` 管理滚动。这导致：

- 交互逻辑分散在 UI/业务层多个位置，难以复用。
- 占位/滚动策略耦合 Message 渲染，单一职责被破坏。
- Console 无法无损复用，交互体验不一致。

## 设计目标（最佳实践）

1. **UI 纯粹**：滚动/布局逻辑集中在 `@anyhunt/ui`，业务层只负责内容渲染与行为注入。
2. **单一职责**：Message 组件保持纯内容渲染，测量/锚定由内部 wrapper 负责。
3. **模块化**：Viewport/Slack/Footer/ScrollButton 各司其职，可单独测试与维护。
4. **错误边界明确**：DOM 不存在、ResizeObserver 不可用时安全降级。
5. **不做历史兼容**：旧占位策略与依赖全部删除。

## 交互机制（TurnAnchor=top，固定默认）

### 机制核心

- **Anchor User Message**：在 MessageList 内部包裹“最后一条用户消息”（当最后一条是 assistant 时），测量其高度。
- **Slack 补位**：对最后一条 assistant message 注入 `min-height`，保证滚动到底部时用户消息顶住顶部。
- **Viewport Store**：统一维护 `viewport`、`inset`、`userMessage` 高度与 `isAtBottom` 状态。

### Slack 计算公式（逻辑说明）

```
minHeight = max(0, viewportHeight - insetHeight - clamp(userMessageHeight))
clamp: userMessageHeight <= 160 ? userMessageHeight : 96
```

> 这样在“滚动到底部”时，最后一条用户消息稳定位于顶部，assistant 内容在下方自然展开。

## 组件分层（职责清单）

- `ConversationViewport`：滚动容器 + Viewport Provider（不对外暴露 TurnAnchor 配置）。
- `ConversationViewportFooter`：测量底部输入区高度（inset）。
- `ConversationViewportSlack`：对最后一条 assistant message 注入补位高度。
- `useConversationViewportAutoScroll`：维护 `isAtBottom` 与滚动监听。
- `ConversationScrollButton`：基于 `isAtBottom` 的“滚动到底部”按钮。
- `MessageList`：内部 wrapper 负责 anchor/slack，业务层只提供 `renderMessage`。

## 使用方式（示例）

```tsx
<MessageList
  messages={messages}
  status={status}
  threadId={threadId}
  emptyState={{ title: t('waitingForYou'), description: t('startChatPrompt') }}
  footer={<ChatFooter />}
  renderMessage={({ message, index }) => (
    <ChatMessage message={message} messageIndex={index} status={status} />
  )}
/>
```

> 不再需要 `turnAnchor` 或 `autoScroll` 参数；交互行为固定为默认方案。

## 滚动策略（统一）

- **默认不强制跟随**：仅当 `isAtBottom=true` 时跟随新增内容。
- **发送新消息**：状态进入 `submitted` 时滚动到底部。
- **线程切换**：`threadId` 变化时滚动到底部。
- **窗口/底部输入区变化**：在 `isAtBottom=true` 时保持锚定。

## 错误边界与安全降级

- DOM ref 为空时不触发测量或滚动。
- `ResizeObserver` 不可用时仅做一次高度测量。
- 任何测量失败都回退为高度 0，不阻断渲染。
- 监听与 observer 在卸载时清理，避免内存泄漏。

## 落地清单（已完成）

- 新增 `ConversationViewport` 系列 primitives 与 Store（Zustand）。
- MessageList 内部完成 anchor/slack 逻辑，移除占位方案。
- PC/Console 均迁移到 MessageList + Viewport 交互体系。
- 删除 `useConversationLayout` 与 `use-stick-to-bottom` 依赖。
- 补齐 UI 单测：Slack minHeight 行为。

## 验收标准

- 新消息发送后，用户消息稳定停在可视区域顶部。
- 流式输出期间仅在 `isAtBottom=true` 时跟随更新。
- 手动滚动历史消息后，不被强制拉回底部。
- 输入区高度变化/窗口缩放时无明显跳动。

## 执行计划（已完成，可追踪）

1. [x] **设计与接口定稿**：明确 TurnAnchor 默认固定为 top，且不对外暴露配置。
2. [x] **UI Store 落地**：新增 Viewport Store（viewport/inset/userMessage/isAtBottom）。
3. [x] **基础 primitives 落地**：实现 Viewport/Footer/Slack/ScrollButton。
4. [x] **Message 接入高度注册**：MessageList 内部 wrapper 负责 anchor 测量。
5. [x] **MessageList 升级**：切换到 Viewport/Slack 机制并删除占位逻辑。
6. [x] **Moryflow PC 迁移**：ConversationSection 切换到新 MessageList + Footer 注入。
7. [x] **Console 迁移**：AgentMessageList 切换到新 MessageList 交互。
8. [x] **测试补齐**：新增 Slack minHeight 单测。
9. [x] **依赖清理**：移除 `use-stick-to-bottom`，引入 Zustand。
10. [x] **文档同步**：更新 CLAUDE.md 与架构说明。
