---
title: Moryflow 对话 UI 与流式运行时架构
date: 2026-03-08
scope: apps/moryflow/pc + apps/moryflow/mobile + apps/anyhunt/console + apps/moryflow/admin + packages/ui + packages/agents-runtime + packages/model-bank
status: active
---

<!--
[INPUT]: 当前对话流协议、Tool / Reasoning 可见性、轮次折叠与视口滚动语义
[OUTPUT]: 对话运行时唯一事实源（协议 + 可见性 + 视口 + 验证基线）
[POS]: Moryflow Core / Conversation Runtime

[PROTOCOL]: 仅在协议、不变量、共享 UI 语义或验证基线失真时更新；不维护过程稿。
-->

# Moryflow 对话 UI 与流式运行时架构

## 1. 当前状态

1. canonical 单轨协议已经冻结为 `text-delta / reasoning-delta / done`，provider 差异统一在 normalizer 层吸收。
2. Tool / Reasoning 的开合语义已经统一收口到 `@moryflow/agents-runtime`，各端不再维护本地状态机。
3. assistant round 折叠已升级为“同轮前置 messages + 结论 message 前置 orderedParts”双层折叠。
4. shared web viewport 已冻结为意图驱动模型，inspection 交互统一通过 `preserve-anchor` 处理，不再靠 DOM 变化猜测业务动作。
5. 输入区本地布局和任务面板规范继续独立保留在 [chat-input-and-chat-pane.md](/Users/lin/.codex/worktrees/17b2/moryflow/docs/design/moryflow/features/chat-input-and-chat-pane.md)。
6. 对话界面 Harness 已固定为“shared UI 场景 + 端侧壳层桥接”两层：
   - shared UI：`packages/ui/test/conversation-harness.test.tsx`
   - Mobile：`apps/moryflow/mobile/lib/chat/__tests__/conversation-harness.spec.ts`
   - PC：`tests/agent-runtime-harness.spec.ts` + `conversation-section` / `tool-part` / `approval` / `task-hover-panel` 相关测试

## 2. 协议冻结

### 2.1 流式协议

1. 共享协议固定为 `text-delta / reasoning-delta / done`。
2. provider 差异只能在 normalizer / runtime adapter 内收口，不能向 UI 扩散分支。
3. 运行时事件处理必须遵循单一状态机，禁止原始 provider event 与语义 event 混用。

### 2.2 模型与 thinking

1. `packages/model-bank` 是模型与 thinking 的唯一事实源。
2. `thinking_profile` 是统一契约；等级映射由运行时适配，不在 UI 写死 provider patch。
3. 无原生 thinking 合同的模型只能在合同层收口，不能由端侧 UI 做补丁式兜底。

## 3. Tool / Reasoning 可见性

### 3.1 交互语义

1. Tool 在消息流中只展示输出内容，不再展示参数 JSON。
2. Tool 与 Reasoning 都采用同一心智：
   - 运行中展开
   - 完成后自动折叠
   - 用户手动展开后，手动偏好优先
3. Tool / Reasoning 都是消息文字流中的可交互段落，不是独立工具面板。

### 3.2 职责边界

1. `@moryflow/agents-runtime` 负责 visibility policy 与 assistant placeholder policy。
2. `@moryflow/ui` 负责共享渲染样式与消息化结构。
3. PC / Mobile / Console / Admin 只做平台壳层适配，不复制状态迁移逻辑。

## 4. Assistant Round 折叠

### 4.1 目标语义

1. 运行中：当前轮 assistant messages 与最后一条 message 内部 orderedParts 全部可见。
2. 结束后：只保留最后一条 assistant message 的最后一个非文件 part 可见。
3. 折叠区展示摘要触发器；用户手动展开后保持展开，手动收起后恢复“仅结论可见”。

### 4.2 共享事实源

1. 折叠算法唯一事实源是 `packages/agents-runtime/src/ui-message/assistant-round-collapse.ts`。
2. 各端列表组件只消费 shared view model。
3. Tool / Reasoning / Text part 组件不感知轮次折叠状态机。

## 5. 视口滚动语义

### 5.1 允许自动移动视口的场景

1. `navigate-to-latest`
2. `stream-append-while-following`

### 5.2 禁止自动移动视口的场景

1. Assistant Round Summary 展开 / 折叠
2. Tool 展开 / 折叠
3. Reasoning 展开 / 折叠
4. 其他 inspection / layout 交互

### 5.3 冻结模型

1. `ConversationViewport` 负责滚动状态机、following 模式与 anchor preservation。
2. `MessageList` 负责把消息流事件映射为 viewport intent。
3. disclosure 组件只声明 `preserve-anchor`，不直接操作 `scrollTop`。

## 6. 状态管理约束

1. 共享业务状态遵循 Store-first。
2. Zustand selector 禁止返回对象或数组字面量。
3. `useSync*Store` 写入前必须做等价判断。
4. 端侧不允许为 Tool / Reasoning / round collapse / viewport follow 语义再造一份本地状态机。

## 7. 代码索引

1. `packages/agents-runtime/src/ui-message/visibility-policy.ts`
2. `packages/agents-runtime/src/ui-message/assistant-placeholder-policy.ts`
3. `packages/agents-runtime/src/ui-message/assistant-round-collapse.ts`
4. `packages/ui/src/ai/conversation-viewport/*`
5. `packages/ui/src/ai/tool.tsx`
6. `packages/ui/src/ai/reasoning.tsx`
7. `packages/ui/src/ai/message-list.tsx`

## 8. 当前验证基线

1. `@moryflow/agents-runtime` 负责 visibility policy、assistant placeholder 与 round collapse 回归。
2. `@moryflow/ui` 负责 shared disclosure、viewport intent 与 anchor preservation 回归。
3. Mobile 负责 approval 恢复与 task snapshot 投影桥接回归。
4. PC 负责 `agent-runtime-harness.spec.ts` 冒烟，以及 assistant round、tool part、approval controller 与 task hover panel 壳层回归。
5. 涉及共享 `UIMessage.parts`、跨端渲染协议或 shared viewport 语义变更时，按 L2 执行根级校验。
