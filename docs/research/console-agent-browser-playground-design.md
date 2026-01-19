---
title: 设计方案：Console Agent Browser Playground（L2 Browser + L3 Agent）
date: 2026-01-19
scope: anyhunt-console + anyhunt-server
status: draft
---

<!--
[INPUT]: `docs/research/agent-browser-integration.md`（需求/背景）+ 现有 Console Playground proxy 架构
[OUTPUT]: 可落地的 Console Playground 设计（页面/接口/流式/闭环/安全/复用）
[POS]: Anyhunt Console 内部验收入口：用页面完成 L2/L3 能力测试与闭环验证

[PROTOCOL]: 本文件变更时，若影响索引定位/标题，需同步更新 `docs/index.md` 与 `docs/CLAUDE.md`。
-->

# 设计方案：Console Agent Browser Playground（L2 Browser + L3 Agent）

目标：在 Anyhunt Console 增加一个 Playground 模块，用于**在部署后的页面上**验证两项能力，并能“一键跑闭环”拿到可复核证据：

- **L2 Browser API**：`/api/v1/browser/session/*`（会话、open、snapshot+refs、action、screenshot、tabs/windows、intercept、storage、cdp）。
- **L3 Agent API**：`/api/v1/agent/*`（estimate / run / stream(SSE) / cancel / status / billing checkpoints）。

本方案的核心设计选择：Agent 面板采用 `@ai-sdk/react` 的 `useChat()` + 自定义 `ChatTransport`，像 `apps/moryflow/pc` 一样把“流式处理”放到 transport 层，而不是散落在 UI 组件里。

---

## 1. 目标与约束

### 1.1 目标（必须）

1. **覆盖功能测试**：在 Console 页面上完成 Browser/Agent 的关键接口验收（无需 swagger/curl）。
2. **闭环验收**：在同一个页面上跑通：选择 API Key → Browser 手动验证 → Agent 任务（含工具调用/计费）→ 结果可校验 → 资源清理。
3. **最佳实践（安全）**：Console 不要求用户粘贴明文 API Key；只使用 `apiKeyId`（UUID/cuid）+ Session Cookie 认证。
4. **最佳实践（可维护）**：流式处理、取消、事件映射采用统一的 transport + parser，而不是“页面里 split('\\n')”的临时代码。

### 1.2 约束（必须遵守）

- API Key 明文只在创建时展示一次；Console 列表只有 `keyPrefix`。
- Console 与 server 同域/跨域均可能存在；因此请求必须使用 `credentials:'include'`，服务端 CORS 允许 Cookie。
- 前端表单规范：Console 端所有表单使用 `react-hook-form` + `zod`（注意前端使用 `import { z } from 'zod/v3'`）。
- 用户可见文案使用英文（按钮/提示/错误信息）；开发者文档（本文）使用中文。

### 1.3 “参考既有架构”是否等于最佳实践？

不等于。最佳实践是“复用正确抽象 + 适配约束”，而不是照抄实现细节。

对本需求来说，参考 `apps/moryflow/pc` 的价值在于：

- 它把流式 UI 的复杂性收敛在 transport/stream writer 中，UI 组件只消费 `messages/status/error`。
- 它通过 `@anyhunt/ui` 提供的 `Conversation/Message/PromptInput` 组件实现一致的消息列表体验。

但 Console 是 Web，无法复用 PC 的 IPC transport；我们需要用 `fetch + SSE` 作为输入，并把服务端事件适配为 `UIMessageChunk`。这一步属于“按最佳实践改造后落地”，而不是“照抄”。

---

## 2. 产品形态（Console 页面）

### 2.1 路由与入口

- Base path：`/agent-browser`
- Menu label（英文）：`Agent Browser`
- Module description（英文）：`Run browser sessions and agent tasks with console proxy APIs.`

子页面拆分（按功能单一职责）：

- `/agent-browser/overview`：E2E Flow Runner（闭环一键跑通）
- `/agent-browser/browser`：Browser Session + 页面操作
- `/agent-browser/agent`：Agent 任务与流式对话
- `/agent-browser/network`：Network Intercept + History
- `/agent-browser/storage`：Storage Export/Import/Clear
- `/agent-browser/cdp`：CDP Connect

### 2.2 页面布局（建议）

模块级共享区（布局层统一提供）：

- API Key Selector（输出 `apiKeyId`）
- Session ID 状态（跨页面复用）

各页面职责：

- Overview：一键闭环脚本 + 结果摘要
- Browser：Session/Open/Snapshot/Action/Screenshot/Tabs/Windows
- Agent：Prompt/Schema/Estimate + Stream 对话
- Network：拦截规则 + 网络历史
- Storage：导入/导出/清理
- CDP：CDP 连接与复用

---

## 3. 最佳实践架构（前端）

### 3.1 为什么用 `@ai-sdk/react` + 自定义 `ChatTransport`？

对 Console Playground 来说，它的优势是工程化而不是“潮流”：

- **状态机复用**：`useChat()` 已经覆盖 “submitted/streaming/error/stop/retry”等状态管理。
- **流式 backpressure**：`ChatTransport` 的 `ReadableStream` + reader 模式天然支持流式消费与 UI 渲染节奏。
- **工具调用展示**：`UIMessageChunk` 支持 tool input/output parts；我们可以把 Agent 的 `tool_call/tool_result` 直接映射为 tool chunks（参考 `apps/moryflow/mobile/lib/chat/tool-chunks.ts`）。
- **取消语义一致**：`abortSignal` 会被 `useChat().stop()` 触发；transport 内同时做 reader cancel +（可选）调用服务端 cancel。

### 3.2 Console 的落地差异点（相比 PC）

- PC：输入流来自 IPC（本地 agent runtime）；Console：输入流来自 `fetch + text/event-stream`。
- PC：工具事件来自 agents-core `RunItemStreamEvent`；Console：工具事件来自 server 输出的 `AgentStreamEvent`。
- 结论：Console 需要一个“事件适配层”，把 SSE event → `UIMessageChunk`。

---

## 4. 后端方案（anyhunt-server）

### 4.1 继续沿用 Console Playground proxy 模式（最佳实践：不使用明文 key）

现有模式（已存在）：

- `apps/anyhunt/server/src/console-playground/*`
- 路径：`/api/console/playground/*`（`VERSION_NEUTRAL`）
- 认证：Session Cookie（Better Auth）
- 输入：`apiKeyId`（cuid）+ 参数
- 服务端校验 `apiKeyId` ownership + isActive + expiresAt

新增：为 Browser 与 Agent 增加同样的 proxy endpoints（本设计的 MVP 依赖它们）。

### 4.2 Browser 代理接口（建议）

Controller path（建议）：

- `POST /api/console/playground/browser/session`（create）
- `GET /api/console/playground/browser/session/:id?apiKeyId=...`（status）
- `DELETE /api/console/playground/browser/session/:id?apiKeyId=...`（close）
- `POST /api/console/playground/browser/session/:id/open`
- `POST /api/console/playground/browser/session/:id/snapshot`
- `POST /api/console/playground/browser/session/:id/action`
- `POST /api/console/playground/browser/session/:id/screenshot`
- 可选：`tabs/windows/intercept/storage/cdp`（按需扩展）

DTO 规则：

- base schema：`{ apiKeyId: cuid }`
- merge 现有 browser dto：`apps/anyhunt/server/src/browser/dto/*`

关键最佳实践点：

1. **计费一致性**：对齐公网 API 的计费点（例如 create session / screenshot），Console proxy controller 也应加同样的 `@BillingKey(...)`，避免 proxy 层绕过统一计费机制。
2. **会话所有权（强烈建议在 core 层做）**：Browser session 必须与 `userId` 绑定并强校验（防止 sessionId 泄露造成越权）。
   - 推荐：SessionManager 保存 `ownerUserId`，所有操作校验 owner；公网上的 ApiKeyGuard 也能提供 `@CurrentUser()`，可把 userId 传入 service。
   - 不推荐：仅在 Console proxy 层维护 `sessionId -> userId` 映射（边界分散，容易遗漏）。

### 4.3 Agent 代理接口（建议）

为了让 Console 能安全使用 Agent（不需要明文 key），提供 proxy endpoints：

- `POST /api/console/playground/agent/estimate`
- `POST /api/console/playground/agent`（`stream=false` 返回 JSON；`stream=true` 返回 SSE）
- `GET /api/console/playground/agent/:id?apiKeyId=...`
- `DELETE /api/console/playground/agent/:id?apiKeyId=...`

实现原则：

- 先 `validateApiKeyOwnership(userId, apiKeyId)`（确保用户确实有活跃 key）
- 调用 `AgentService`（计费/持久化以 `userId` 为主键）
- `stream=true` 直接输出 `text/event-stream`，并保持与公网接口一致的 event 格式：
  - 参考：`apps/anyhunt/server/src/agent/agent.controller.ts`

---

## 5. 闭环测试（E2E Flow Runner）

### 5.1 目标

闭环验收强调“确定性”，不依赖 prompt 偶然性：

- 每一步有可复核 artifacts（snapshot/screenshot/result JSON）
- 输出可校验（schema + 断言）
- 资源可回收（finally close session）

### 5.2 MVP 流程（确定性脚本）

输入：

- `apiKeyId`
- `targetUrl`（默认 `https://example.com`）
- `agentPrompt`（默认英文）
- `schema`（JSON Schema-like object；后续可收敛为 Zod/JSON Schema）
- `maxCredits`

步骤：

1. Browser：create session
2. Browser：open targetUrl
3. Browser：snapshot（tree+refs）
4. Browser：screenshot（base64 preview）
5. Agent：estimate（展示预计 credits）
6. Agent：run（建议默认 `stream=false`，保证可复现；用户可切换 `stream=true` 看过程）
7. Agent：status（确认 completed + metrics）
8. Cleanup：close browser session

验收输出：

- sessionId、snapshot、screenshot
- agentTaskId、result JSON（可复制/下载）
- metrics：creditsUsed/toolCallCount/elapsedMs

### 5.3 闭环的“更强最佳实践版本”（建议迭代）

如果要让 Agent 与手动 Browser **共享同一个 session**（真正串联 L2/L3），建议在后续迭代中支持：

- Agent 输入可选 `browserSessionId`
- Agent Browser Tools 复用该 session，并强校验 owner
- 约定资源所有权：由 Flow Runner 统一 close；或由客户端显式 close（禁止隐式泄漏）

MVP 先不依赖该能力，避免在验收阶段引入权限/生命周期复杂度。

---

## 6. Streaming 落地：SSE → `UIMessageChunk`

### 6.1 服务端 SSE 输入（现状）

公网 Agent SSE 格式：

```
event: started|thinking|tool_call|tool_result|progress|complete|failed
data: {"type":"started", ...}

```

类型定义：

- `apps/anyhunt/server/src/agent/dto/agent.schema.ts` 的 `AgentStreamEvent`

### 6.2 前端输出目标

Console 侧使用：

- `@ai-sdk/react`：`useChat()`
- 自定义 `ChatTransport`：返回 `ReadableStream<UIMessageChunk>`

参考实现（同仓库）：

- 流式工具 chunk：`apps/moryflow/mobile/lib/chat/tool-chunks.ts`
- 消息/滚动体验：`apps/moryflow/pc/src/renderer/components/chat-pane/*`

### 6.3 关键依赖（推荐）

- `eventsource-parser`：稳定解析 SSE（跨 chunk、多行 data），避免“split('\\n')”造成半包/丢事件。

### 6.4 映射表（推荐）

| AgentStreamEvent.type | UIMessageChunk（建议）                                                     | 说明                                                             |
| --------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `started`             | transport 内记录 `taskId`；可选把 taskId 写到页面状态                      | `useChat` 不强制需要 started chunk，但 Cancel/Status 需要 taskId |
| `thinking`            | `reasoning-start` + `reasoning-delta`（同一个 reasoning id）               | 作为 Debug logs 折叠展示，避免中间态污染“最终输出”               |
| `tool_call`           | `tool-input-available`                                                     | `toolCallId=callId`，`toolName=tool`，`input=args`               |
| `tool_result`         | `tool-output-available` / `tool-output-error`                              | `toolCallId=callId`，`output=result`，`errorText=error`          |
| `progress`            | 页面单独状态（进度条/stepper），不强塞进消息                               | `useChat` 无原生 progress part，强塞会降低可读性                 |
| `complete`            | `text-start/text-delta/text-end`（输出结果 JSON 文本）+ `finish`           | 最终输出可复制；同时可在 UI 单独 JSON viewer 展示                |
| `failed`              | `text-start/text-delta/text-end`（输出错误信息）+ `finish`（reason=error） | 同时 toast/error 提示                                            |

> 备注：当前 `thinking` 事件可能混合 output_text_delta 与 reasoning-delta。更严格的最佳实践是：服务端把它拆成两个 channel（例如 `output_delta` / `reasoning_delta`，或为 `thinking` 增加 `channel` 字段）。MVP 阶段按折叠日志处理即可。

### 6.5 Transport 伪代码（可直接落地）

建议实现文件：

- `apps/anyhunt/console/src/features/agent-browser-playground/agent-chat-transport.ts`

核心行为：

1. `sendMessages()` 内 `fetch('/api/console/playground/agent', { credentials:'include', signal: abortSignal, body:{ apiKeyId, prompt, ... , stream:true } })`
2. 用 `eventsource-parser` 逐条解析 `event/data`
3. 把 event 映射成 `UIMessageChunk` 并 `controller.enqueue(chunk)`
4. `abortSignal` 触发：
   - cancel reader
   - 如果已拿到 `taskId`：调用 `DELETE /api/console/playground/agent/:id?apiKeyId=...`
5. `complete/failed` 后：enqueue `finish` 并 close stream

---

## 7. 组件复用结论（跨项目抽象）

已抽离、可跨项目直接复用（`@anyhunt/ui`）：

- 消息列表与滚动：`@anyhunt/ui/ai/conversation`
- 消息基础结构：`@anyhunt/ui/ai/message`
- Reasoning 折叠、shimmer：`@anyhunt/ui/ai/reasoning`、`@anyhunt/ui/ai/shimmer`
- PromptInput 的按钮/菜单等基础件：`@anyhunt/ui/ai/prompt-input`

暂未完整抽离（Console 需要自建或后续上移到 `@anyhunt/ui`）：

- 完整 PromptInput 主体（textarea/附件/键盘行为）与 Tool UI 组件（目前主要在 moryflow 的 app 内 `ai-elements/*`）。

建议策略：

- MVP：Console 直接在 `apps/anyhunt/console/src/features/agent-browser-playground/components/*` 实现最小 Prompt + Tool 展示，并复用 `@anyhunt/ui` 的基础件。
- 迭代：将 “PromptInput 主体 + Tool UI” 抽到 `packages/ui/src/ai/*`，让 PC/Console/Admin 共享（避免重复实现）。

---

## 8. 落地计划（最小可交付）

1. Server：实现 Browser proxy endpoints（含 owner 校验方案与计费点对齐）
2. Server：实现 Agent proxy endpoints（含 SSE passthrough）
3. Console：新增页面 `/agent-browser/overview`（模块入口）
4. Console：Agent 面板采用 `useChat + ChatTransport` 跑通 streaming（先能看到 tool_call/tool_result + final JSON）
5. Console：Browser 面板跑通 create/open/snapshot/action/screenshot
6. Console：E2E Flow Runner（确定性脚本）+ 一键清理
