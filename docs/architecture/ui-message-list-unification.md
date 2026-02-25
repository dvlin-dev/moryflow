---
title: 消息列表与输入框 UI 组件抽离方案（Moryflow/Anyhunt 统一）
date: 2026-01-21
scope: ui
status: completed
---

<!--
[INPUT]: Moryflow PC 与 Anyhunt Console 的消息列表/输入框渲染与消息结构现状
[OUTPUT]: 抽离到 @moryflow/ui 的组件分层与改造方案（含输入与数据结构统一）
[POS]: 统一消息列表与输入框渲染的实施路线图（先对齐样式再统一结构）

[PROTOCOL]: 本文为方案草案，落地时需同步更新相关 CLAUDE.md 文档索引。
-->

# 消息列表与输入框 UI 组件抽离方案（Moryflow/Anyhunt 统一）

## 目标

- 让 `console.anyhunt.app/agent-browser/agent` 的消息列表渲染与 Moryflow PC 右侧消息列表一致。
- 把可复用的消息列表 UI 组件抽离到 `@moryflow/ui`，形成跨产品统一的基础能力。
- 保持 `@moryflow/ui` 纯 UI：不包含业务逻辑、不依赖业务文案、不触发平台副作用（如 Electron API / toast）。
- 先让 Console 追随 Moryflow 现有样式，再统一调整样式。

## 范围

**同一阶段（本次方案重点）**

- 消息列表渲染相关：消息卡、Reasoning、Tool 卡、附件、分支、滚动与占位布局。
- 输入框 UI：Prompt Input、附件展示、工具按钮区、提交按钮、模型选择入口等。
- 允许通过 props/slots 控制业务行为，避免 UI 内嵌业务逻辑。

> 说明：输入框“行为”（发送、校验、附件选择、模型数据源等）仍由业务层负责，UI 只提供可组合的结构与样式。

## 进度

- ✅ 已完成：消息列表 UI 组件与输入框 UI 抽离到 `@moryflow/ui`
- ✅ 已完成：Moryflow PC 已切换使用 `@moryflow/ui/ai/*` 组件
- ✅ 已完成：清理占位逻辑并补齐 PromptInput 错误边界
- ✅ 已完成：Anyhunt Console 切换与样式对齐（消息列表 + 输入框）

## 现状梳理（高层）

**已在 `@moryflow/ui` 抽离的基础组件**

- `packages/ui/src/ai/conversation.tsx`：Conversation 容器 + EmptyState + ScrollButton
- `packages/ui/src/ai/message/*`：Message 容器 + Response + Attachments + Branch + MetaAttachments
- `packages/ui/src/ai/reasoning.tsx`：Reasoning 展开/折叠
- `packages/ui/src/ai/code-block.tsx`、`packages/ui/src/ai/shimmer.tsx`
- `packages/ui/src/ai/tool.tsx`：Tool 卡（Header/Input/Output）
- `packages/ui/src/ai/use-conversation-layout.ts`：消息占位与滚动布局
- `packages/ui/src/ai/prompt-input/*`：PromptInput Provider/结构/附件/语音按钮

**仍在 Moryflow PC 内部的核心渲染与逻辑**

- 消息卡渲染与动作：`apps/moryflow/pc/src/renderer/components/chat-pane/components/message/index.tsx`
- 消息编辑：`apps/moryflow/pc/src/renderer/components/chat-pane/components/message/use-message-edit.ts`
- Chat Prompt 输入装配与业务逻辑：`apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/*`
- Moryflow 消息 metadata 扩展：`apps/moryflow/pc/src/renderer/components/chat-pane/types/message.ts`
- Moryflow 附件结构定义：`apps/moryflow/pc/src/renderer/components/chat-pane/types/attachment.ts`

**Console 当前实现**

- `apps/anyhunt/console/src/features/agent-browser-playground/components/agent-message-list.tsx`
  - 使用基础 Message/Conversation 组件
  - Tool/Reasoning/文本渲染为轻量版本
  - 布局逻辑简化，未复用 Moryflow 的占位/滚动策略
- `apps/anyhunt/console/src/features/agent-browser-playground/components/agent-run-panel.tsx`
  - 输入区基于 Form + InputGroup，复用较少
  - 仅使用 `PromptInputSubmit`，未统一整体输入结构

## 设计原则

1. `@moryflow/ui` 只提供 UI 能力，不耦合业务数据和副作用。
2. 文案/翻译统一由业务层注入，UI 层只接受 props。
3. 所有跨产品一致的 UI 逻辑都尽量放入 `@moryflow/ui`（包括滚动/占位等布局策略）。
4. 保留“插槽/回调/renderer”扩展机制，允许业务层注入特殊渲染或行为。
5. 消息结构统一为跨产品共享的 metadata 规范，避免 UI 依赖产品私有字段。
6. 遵循最佳实践：单一职责、模块化、错误边界明确、易读易维护。
7. 不做历史兼容；无用代码直接删除，避免过度设计与复杂抽象。

## 数据结构统一方案

### 统一目标

- **基础消息结构仍以 `ai` 的 `UIMessage` 为准**（`role/id/parts` 等不改动）。
- 统一扩展字段到 **中立的 metadata 命名空间**，避免产品名耦合，建议使用：`UIMessage.metadata.chat`。
- 统一附件结构，作为跨产品共享类型放入 `@moryflow/types`。
- Moryflow PC/移动端与 Anyhunt Console 统一采用同一套 metadata 规范。

### 建议的共享类型（示意）

> 仅作为方向说明，具体字段以最终实现为准。

```ts
export type ChatMessageMeta = {
  attachments?: ChatAttachment[];
  context?: {
    usedAsContext?: boolean;
    preview?: string;
    previewTruncated?: boolean;
  };
};

export type ChatAttachment =
  | { id: string; type: 'file-ref'; path: string; name: string; extension: string }
  | {
      id: string;
      type: 'file-embed';
      name: string;
      mediaType: string;
      content: string;
      size?: number;
    }
  | { id: string; type: 'image'; url: string; mediaType: string; alt?: string; filename?: string };

export type ChatMessageMetadata = {
  chat?: ChatMessageMeta;
  [key: string]: unknown;
};
```

### Prompt Input 的数据统一

- `PromptInputMessage` 保持 UI 层字段（`text` + `files`），**结构化附件通过 `ChatMessageMeta` 传入业务层**。
- 业务层在发送消息时统一把结构化附件写入 `UIMessage.metadata.chat.attachments`。
- Console 若暂不支持附件，仅写入空或不写入该字段。

### FileUIPart 的上下文预览元数据

- 文件类附件的上下文预览信息统一写入 `FileUIPart.providerMetadata.chat`。
- 字段统一为：`usedAsContext`、`preview`、`previewTruncated`，由业务层填充，UI 层仅负责展示。

### 迁移策略（用户数据安全）

- 不保留向后兼容：删除 `metadata.moryflow` 的读取/迁移逻辑，旧数据不再支持。
- Console 当前无历史 metadata，无需迁移。

## 统一后的使用方式（高层）

- UI 组件只关心 `metadata.chat`，不关心产品名。
- 业务层负责组装 `ChatMessageMeta`，并在发送/存储时写入。
- 各产品只保留一个数据源，避免同一语义写在多个 metadata 节点。

## 目标结构（@moryflow/ui）

> 目标是把 Moryflow PC 的消息列表渲染“形态”抽离出来，但通过参数控制“业务行为”。

### 新增/迁移的 UI 组件与 Hook

- ✅ `packages/ui/src/ai/message/response.tsx`
  - 统一 `MessageResponse`（Streamdown 渲染）
  - 支持 `className` 等扩展

- ✅ `packages/ui/src/ai/message/attachments.tsx`
  - 统一附件 UI（FileUIPart 展示）
  - 通过 `labels` 由业务层注入文案

- ✅ `packages/ui/src/ai/message/meta-attachments.tsx`
  - 结构化附件（file-ref/image）展示

- ✅ `packages/ui/src/ai/message/branch.tsx`
  - 消息分支 UI（上下切换 + 计数）

- ✅ `packages/ui/src/ai/tool.tsx`
  - Tool 卡 UI（Header / Input / Output）
  - `onApplyDiff` / 文案通过 props 注入

- ✅ `packages/ui/src/ai/use-conversation-layout.ts`
  - 迁移 `useConversationLayout` 逻辑（占位、滚动跟随）
  - 只依赖 `UIMessage` 和 `status`

- ✅ `packages/ui/src/ai/message-list.tsx`
  - 封装消息列表渲染循环
  - 通过 props 注入：`renderMessage`, `emptyState`

- ✅ `packages/ui/src/ai/prompt-input/*`
  - 迁移 Moryflow 的 PromptInput Provider/Attachments/布局组件
  - 保留纯 UI 逻辑，业务行为通过 props 注入

### 业务层 Adapter（各产品）

每个产品提供 adapter 将业务数据映射为纯 UI 组件所需的 props：

- **Moryflow PC**：
  - 负责把 `message.metadata.chat` 映射为 `MessageAttachment` 需要的参数
  - 负责注入 `onApplyDiff`, `onRetry`, `onEditAndResend` 等行为
  - 负责输入框的业务行为（提交、附件选择、模型数据源）

- **Anyhunt Console**：
  - 初期只注入基础文本/Reasoning/Tool 渲染
  - 输入框复用 UI 结构，但行为保持 Console 现有逻辑

## 关键改造点（去业务化）

### Tool 卡去业务化

已完成：

- `@moryflow/ui/ai/tool` 仅保留 UI + callback（`onApplyDiff` 等）
- 文案与副作用由业务层注入

### Attachment 去业务化

已完成：

- `@moryflow/ui/ai/message` 仅依赖 `providerMetadata.chat` 并通过 `labels` 注入文案
- 元数据与翻译由业务层处理

### Reasoning/Message 文案

- `Thinking...`、`Thought for` 等文案必须由业务层传入或由上层国际化封装。

### Prompt Input 去业务化

- 输入框 UI 只负责布局与交互外观，不处理提交、附件选择、模型数据来源。
- `@moryflow/ui` 提供可控的 `onSubmit`/`onAction`/`renderers`，业务层实现副作用。

## 分阶段落地建议

### Phase 1：抽离 UI 基座（消息列表 + 输入框）

1. ✅ 在 `@moryflow/ui` 添加 message/attachments/branch/response/tool 组件与 hook。
2. ✅ 保持 API 通用，避免 Moryflow 专属字段进入 UI。
3. ✅ 扩展 `@moryflow/ui` 的 prompt-input 组件，迁移输入框 UI 结构。
4. ✅ 在 Moryflow PC 内用业务层适配现有行为。

### Phase 2：迁移 Moryflow PC

1. ✅ 用 `@moryflow/ui` 替换 `apps/moryflow/pc` 的 UI 实现。
2. ✅ 保持行为不变（编辑/重发/工具输出/附件展示）。
3. ✅ 删除 `apps/moryflow/pc/src/renderer/components/ai-elements/*` 中的 UI 代码。

### Phase 3：迁移 Anyhunt Console

1. ✅ 用同一套 `@moryflow/ui` 组件替换 `AgentMessageList` 与输入区。
2. ✅ 默认渲染对齐 Moryflow 样式，保留可选插槽用于差异化需求。

## 风险与对策

- **风险：** UI 抽离导致业务回调过多，API 变复杂。
  - **对策：** 增加 `renderers` 插槽而非细碎 props；将“业务行为”集中在 Adapter。

- **风险：** Moryflow 特殊渲染逻辑难以泛化。
  - **对策：** 先实现默认渲染，对特殊部分开放 `renderOutput` 覆盖。

- **风险：** 数据迁移导致旧消息展示丢失或附件缺失。
  - **对策：** 做一次性迁移并加入数据校验；迁移失败时阻断升级并提示回滚。

## 交付验收（定义对齐）

- Console 的消息列表在布局、气泡、Tool 卡、Reasoning 展开等视觉与交互上与 Moryflow PC 对齐。
- `@moryflow/ui` 中无业务依赖与副作用（i18n、API、Electron、toast）。
- Moryflow PC 依然具备原有功能（编辑/重发/工具输出/附件展示）。
- Console 输入框结构与样式对齐 Moryflow，但业务行为仍由 Console 管理。
- 两端消息 metadata 统一为 `metadata.chat`，无 `metadata.moryflow` 残留。
