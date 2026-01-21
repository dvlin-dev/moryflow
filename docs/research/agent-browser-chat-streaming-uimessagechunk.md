---
title: Agent Browser Chat 流式消息分段（对齐 Moryflow/pc：UIMessageChunk）
date: 2026-01-21
scope: anyhunt-console + anyhunt-server
status: implemented
---

<!--
[INPUT]: 当前 console.anyhunt.app 的 Agent Browser Chat 流式输出（SSE）与 UI 渲染现状
[OUTPUT]: 对齐 apps/moryflow/pc 的“UIMessageChunk 单协议 + 自动分段”方案与落地计划
[POS]: 解决“AI 文本始终累加在第一条消息”问题的最终实现方案（draft）

[PROTOCOL]: 本文件变更时，需同步更新 docs/index.md 与 docs/CLAUDE.md（最近更新）。
-->

# 背景

当前 `console.anyhunt.app/agent-browser/agent` 的 Agent Chat 采用：

- Server：输出自定义 SSE event（文本/推理/tool/progress/complete…）
- Console：把 SSE event 再映射成 `ai` 的 `UIMessageChunk`
- UI：用 `@anyhunt/ui/ai/*` 组件渲染 `messages`

近期已修复 tool 调用被覆盖的问题（`toolCallId` 稳定、tool part 按顺序追加）。但仍存在一个体验问题：

- AI 的文字内容会持续追加在“第一条 assistant 文本块”上，而不是像正常消息流一样按时间顺序分段展示。

对照 `apps/moryflow/pc`，其 Chat UI 的关键能力是：

- 同一条 assistant message 内可以出现多个 `text` part（多个文本段落块），并与 tool part 按时间顺序交错显示。

# 落地状态（已实现）

- Server：`POST /api/v1/console/playground/agent/stream` 现在直接输出 `UIMessageChunk`（SSE），并在 tool 边界结束当前文本段，形成多个 `text` part
- Console：transport 只做 SSE 解析 + chunk 透传，不再维护“自定义事件 → chunk”的二次状态机
- 回归测试：覆盖 “text → tool → text” 的分段顺序

# 需求

## 功能需求

1. **多个 text part**：AI 输出的文本应像 tool part 一样，按时间顺序分段追加（而不是无限累加到第一个 text part）。
2. **顺序一致**：text / reasoning / tool 的展示顺序要与真实运行时序一致（tool 卡片应插入在文本段之间）。
3. **不做历史兼容**：允许重构现有 SSE 协议与 console 侧映射层，删除旧实现。

## 非功能需求

- **最佳实践**：遵循 `ai` SDK 的标准协议与状态机，不在两端重复维护自定义协议。
- **单一职责 / 模块化**：stream 映射、SSE 输出、前端 transport、UI 渲染职责清晰。
- **错误边界**：流解析/渲染失败要有清晰的 fail-fast 与 fallback。
- **不过度设计**：不引入额外抽象层；优先用“单协议”减少复杂度。
- **易读易维护**：新增的 mapping 逻辑必须可单测、可定位问题。

# 技术方案（对齐 Moryflow/pc）

## 核心结论

要得到“多个 text part”，必须在正确时机写入 `text-end`（结束当前文本段），下一次文本增量到来再写 `text-start`。

`apps/moryflow/pc` 之所以能做到，是因为它：

- 直接将模型流事件转换为 `UIMessageChunk`
- 在检测到一次模型输出结束（如 `response_done` / `finish`）时立刻写 `text-end`（并 `reasoning-end`）
- 允许同一个 `textMessageId` 多次 `text-start/text-end` 循环，从而在同一条 message 里生成多个 text part

## 方案概述

将 Anyhunt 的 Agent Browser Chat 也改成同样的架构：

1. **后端直接输出 `UIMessageChunk` 流（SSE）**：不再输出“自定义 Agent SSE event”。
2. **前端 transport 只做“解析 + 透传”**：不再维护第二套“事件 → chunk”的状态机。
3. **分段逻辑在后端完成**：后端依据模型流的 done 信号/工具调用边界，写入 `text-end`，自然形成多个 text part。

## 协议（唯一真相）

全链路只使用 `ai` 的 `UIMessageChunk`（不额外发明事件类型），包括：

- 文本：`text-start` / `text-delta` / `text-end`
- 推理：`reasoning-start` / `reasoning-delta` / `reasoning-end`
- 工具：`tool-input-available`、`tool-output-available`、`tool-output-error` 等
- 元信息：`start` / `finish`（可选）

## 后端实现细节（推荐）

### 1) 新增纯函数/纯类：AgentStreamEvent → UIMessageChunk[]

新增一个 mapper（单一职责、可单测），例如：

- `apps/anyhunt/server/src/console-playground/streaming/console-agent-ui-chunk.mapper.ts`

输入：Console Playground 代理层的 `AgentStreamEvent`（来自 `AgentService.executeTaskStream`）  
输出：`UIMessageChunk[]`

内部维护最小状态：

- `textPartId` / `reasoningPartId`（固定 UUID；允许多次 start/end）
- `textSegmentStarted` / `reasoningSegmentStarted`

映射规则（与 Moryflow/pc 对齐）：

- `output_text_delta` → `ensureTextStart()` + `text-delta`
- `reasoning-delta` → `ensureReasoningStart()` + `reasoning-delta`
- `response_done` 或 `finish` → `reasoning-end`（如需要）+ `text-end`（如需要）
- `tool_call_item`：
  - **先结束文本段**：`reasoning-end` + `text-end`
  - 再发 `tool-input-available`（稳定 `toolCallId`）
- `tool_call_output_item` → `tool-output-available` / `tool-output-error`

### 2) Controller 直接 SSE 输出 UIMessageChunk

改造 `apps/anyhunt/server/src/console-playground/console-playground-agent.controller.ts`：

- SSE 的 `data:` 内容直接是 `UIMessageChunk` 的 JSON
- 可选：开始时发 `{ type: 'start', messageId }`，结束时发 `{ type: 'finish' }`
- 错误时发 `{ type: 'error', errorText }`

## 前端实现细节（推荐）

### 1) Transport 只做透传

改造 `apps/anyhunt/console/src/features/agent-browser-playground/transport/agent-chat-transport.ts`：

- SSE JSON 直接 parse 成 `UIMessageChunk` 并 `controller.enqueue(chunk)`
- 不再需要 `agent-stream.ts`（自定义 event → chunk 的映射层）
- 不再需要 `types.ts` 中的 `AgentStreamEvent`（自定义 event 类型）

### 2) UI 无需特殊逻辑

`@anyhunt/ui/ai/message` 会把同一个 message 内的多个 text part 按顺序渲染，所以只要 chunk 流正确产生多个 `text-start/text-end` 循环，UI 会自然达到目标效果。

# 按步骤执行的计划（落地清单）

## Phase 0：冻结目标与验收用例

1. 明确验收：一轮 agent run 中，出现多个文本段落块，且 tool 卡片插入在两段文本之间。
2. 定义回归用例：最少覆盖“文本 → tool_call → tool_result → 文本”。

## Phase 1：后端改造为 UIMessageChunk 单协议

1. 新增 mapper：`AgentStreamEvent -> UIMessageChunk[]`（带单测）。
2. 改造 console playground SSE endpoint：直接输出 chunk。
3. 删除旧的“自定义 Agent SSE event”定义与相关映射（不做兼容）。

## Phase 2：前端 Transport 透传 + 删除旧映射层

1. transport 改为解析 `UIMessageChunk` 并透传。
2. 删除 `agent-stream.ts` 与 `types.ts` 内自定义 `AgentStreamEvent`（或改为仅保留 request/response 类型）。
3. 更新 console 单测：验证分段 chunk 能在 message.parts 中形成多个 text part（或至少验证 chunk 顺序与边界）。

## Phase 3：UI/体验收敛

1. tool 卡片保持折叠（默认收起 output），避免刷屏。
2. 补齐错误提示与 ErrorBoundary 覆盖：SSE 解析错误、断流、取消等。

## Phase 4：质量门禁

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:unit`

# 行为规范（强制）

- **最佳实践**：全链路只使用 `UIMessageChunk`，不再维护“自定义事件协议 + 二次映射”的双状态机。
- **单一职责**：
  - server mapper 只负责事件到 chunk 的映射与分段策略
  - controller 只负责 SSE 输出与连接管理
  - console transport 只负责解析与透传
  - UI 只负责渲染
- **模块化**：新增文件必须放在职责明确的目录，命名体现边界（`streaming/*`、`transport/*`）。
- **错误边界**：任何解析/映射错误必须 fail-fast，并通过 `{ type: 'error' }` 或 UI ErrorBoundary 明确呈现。
- **不考虑历史兼容**：旧事件类型、旧字段、旧映射层一律删除，不保留 `legacy/*` 或注释兼容逻辑。
- **删除无用代码**：发现未使用文件、死代码、无效抽象直接移除；禁止保留废弃注释与“未来可能用到”的 TODO。
- **不过度设计**：不引入额外框架/复杂抽象；优先用最小状态机实现分段。
- **易读易维护**：mapper 必须有单测覆盖关键边界（tool 插入、model done 断段、error）。
