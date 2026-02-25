---
title: OpenAI Agents JS 升级评估与重构建议（0.4.3 -> 0.5.1）
date: 2026-02-24
scope: monorepo
status: in-progress-v4
---

<!--
[INPUT]: openai-agents-js Releases（page 1-4 + GitHub Releases API）+ 本仓库 Anyhunt/Moryflow 相关实现
[OUTPUT]: 按“官方协议优先、无历史兼容、模块化/SRP”重写后的可执行重构方案
[POS]: docs/research 升级调研文档（供实施前审阅）

[PROTOCOL]: 本文件变更时，需同步更新 docs/index.md 与 docs/CLAUDE.md
-->

# OpenAI Agents JS 升级评估（第三次复核，按最终准则）

核对日期：2026-02-24  
核对范围：`apps/anyhunt/server`、`apps/anyhunt/console`、`apps/moryflow/pc`、`apps/moryflow/mobile`、`packages/agents-*`

## 1. 结论（直接回答你的要求）

1. Anyhunt 的聊天流可以直接切到官方标准协议，且应一刀切删除自定义 SSE 协议层。
2. 你的“不要自定义协议、功能要正常”目标可实现：
   - 前端改用 `ai` 官方 `DefaultChatTransport/HttpChatTransport`；
   - 后端改用 `@openai/agents-extensions/ai-sdk-ui` 的 `createAiSdkUiMessageStreamResponse`。
3. PC/Mobile 不是 HTTP SSE，但确实有“自定义流映射层”（`RunStreamEvent -> UIMessageChunk`）且存在重复实现；应抽成共享模块并保持官方 `UIMessageChunk` 为唯一内部协议。
4. MCP 生命周期也应按同一原则收敛到官方 helper（`connectMcpServers` / `MCPServers`），不再保留自研重试/并发/关闭编排逻辑。

## 2. 代码现状（证据）

### 2.1 Anyhunt 仍在用自定义 SSE 协议

- 后端自定义 `event: started/textDelta/reasoningDelta/toolCall/toolResult/progress/complete/failed`：
  - `apps/anyhunt/server/src/agent/agent.controller.ts`
  - `apps/anyhunt/server/src/agent/agent.service.ts`
  - `apps/anyhunt/server/src/agent/agent-stream.processor.ts`
  - `apps/anyhunt/server/src/agent/dto/agent.schema.ts`
- 前端手写 SSE parser + chunk 拼接：
  - `apps/anyhunt/console/src/features/agent-browser-playground/transport/agent-chat-transport.ts`
  - 依赖：`apps/anyhunt/console/package.json` 的 `eventsource-parser`

### 2.2 PC/Mobile 没有 HTTP SSE，但有重复的自定义流适配

- PC：
  - `apps/moryflow/pc/src/main/chat/messages.ts`
  - `apps/moryflow/pc/src/main/chat/tool-calls.ts`
- Mobile：
  - `apps/moryflow/mobile/lib/chat/transport.ts`
  - `apps/moryflow/mobile/lib/chat/tool-chunks.ts`
- 两端都在做：
  - 模型事件提取（`output_text_delta`/`reasoning-delta`/`response_done`）
  - 工具事件映射（`tool_called`/`tool_output`）
  - start/text/reasoning/finish chunk 组装

### 2.3 MCP 生命周期当前是自研编排

- `packages/agents-mcp/src/connection.ts`（超时/重试/关闭）
- `packages/agents-mcp/src/server-factory.ts`（实例构建）
- `apps/moryflow/pc/src/main/agent-runtime/core/mcp-manager.ts`（重载、状态广播、测试连接）

## 3. 上游发布核对（截至 2026-02-24）

基于你给的 Releases page 1-4，以及 GitHub Releases API：

- 最新 tag：`v0.5.1`，发布时间 `2026-02-24T01:49:44Z`
- 次新 tag：`v0.5.0`，发布时间 `2026-02-23T23:14:57Z`

与本仓库强相关的变化：

1. `v0.5.1`：realtime model type list 同步修复（低风险）。
2. `v0.5.0`：Responses API WebSocket mode（可选能力，默认行为不变）。
3. `v0.4.15`：`tracingDisabled` 对 function tool call 生效修复（对 PC/Mobile/Server tracing 一致性重要）。
4. `v0.4.14`：嵌套 agent-tool 审批恢复归属修复（与 PC/Mobile 审批恢复流程直接相关）。
5. `v0.4.13`：`reasoningItemIdPolicy: 'omit'`（降低 reasoning 400 风险）。
6. `v0.4.10`：function tool timeout（`timeoutMs` / `timeoutBehavior`）。
7. `v0.4.2`：
   - `aisdk` 推荐从 `@openai/agents-extensions/ai-sdk` 子路径导入；
   - 新增 `@openai/agents-extensions/ai-sdk-ui` 的 `createAiSdkUiMessageStreamResponse` / `createAiSdkTextStreamResponse`。

## 4. 版本矩阵（当前 vs 最新）

> 注：本节是实施前快照（baseline）。实施进度与最终版本以第 12 节记录为准。

| 包名                          | 当前版本 | 最新版本（2026-02-24） | 处理                     |
| ----------------------------- | -------- | ---------------------- | ------------------------ |
| `@openai/agents`              | 未使用   | `0.5.1`                | 新增并作为应用层统一入口 |
| `@openai/agents-core`         | `0.4.3`  | `0.5.1`                | 升级                     |
| `@openai/agents-extensions`   | `0.4.3`  | `0.5.1`                | 升级                     |
| `ai`                          | `6.0.49` | `6.0.97`               | 升级                     |
| `@ai-sdk/react`               | `3.0.51` | `3.0.99`               | 升级                     |
| `@ai-sdk/openai`              | `3.0.18` | `3.0.31`               | 升级                     |
| `@ai-sdk/anthropic`           | `3.0.23` | `3.0.46`               | 升级                     |
| `@ai-sdk/google`              | `3.0.13` | `3.0.30`               | 升级                     |
| `@ai-sdk/xai`                 | `3.0.34` | `3.0.57`               | 升级                     |
| `@ai-sdk/openai-compatible`   | `2.0.18` | `2.0.30`               | 升级                     |
| `@ai-sdk/provider`            | `3.0.5`  | `3.0.8`                | 升级                     |
| `@ai-sdk/provider-utils`      | `4.0.9`  | `4.0.15`               | 升级                     |
| `@openrouter/ai-sdk-provider` | `2.0.1`  | `2.2.3`                | 升级                     |
| `openai`                      | `6.16.0` | `6.24.0`               | 升级                     |

## 5. 目标架构（官方协议唯一实现）

### 5.1 Anyhunt（Web）

1. 聊天流：
   - 后端统一返回 `createAiSdkUiMessageStreamResponse(streamResult)`；
   - 纯文本场景使用 `createAiSdkTextStreamResponse(streamResult)`。
2. 前端 transport：
   - 使用 `new DefaultChatTransport(...)`；
   - 通过 `prepareSendMessagesRequest` 注入 `model/output/maxCredits`，并复用现有 `buildAgentChatMessages(...)`。
3. 停止能力：
   - `useChat().stop()` 走请求级 abort（官方行为）；
   - 后端在连接关闭时触发 `AbortController.abort()` 中止 `run()`，不再依赖 stream 内 `started.taskId`。
4. 任务态（可选）：
   - 查询/统计/计费走独立 Task API；
   - 不再塞进聊天 stream 协议。

### 5.2 PC/Mobile（本地 runtime）

1. 统一协议：仍使用官方 `UIMessageChunk`（不是 HTTP SSE）。
2. 抽取共享模块到 `packages/agents-runtime`（建议 `src/ui-stream/*`）：
   - `mapRunToolEventToChunk`
   - `extractModelStreamEvent`
   - `emitUiMessageChunks`（start/text/reasoning/finish）
3. PC 和 Mobile 仅保留平台职责：
   - PC：IPC 读写、会话持久化、窗口事件
   - Mobile：runtime 初始化、审批 UI 交互、平台权限

### 5.3 MCP

1. 连接生命周期改用官方 `connectMcpServers` / `MCPServers`。
2. 本地保留层只做：
   - 配置解析（stdio/http）
   - 状态投影（UI 用）
   - 手动测试入口（可选）
3. 删除自研重试/超时/关闭编排实现，避免双状态机。

## 6. 必删清单（无历史兼容）

1. Anyhunt Console 自定义 SSE transport：
   - `apps/anyhunt/console/src/features/agent-browser-playground/transport/agent-chat-transport.ts`
   - 对应测试 `agent-chat-transport.test.ts`
   - 依赖 `eventsource-parser`
2. Anyhunt Server 自定义 stream 协议类型与映射：
   - `apps/anyhunt/server/src/agent/agent-stream.processor.ts` 的 `convertRunEventToSSE`
   - `apps/anyhunt/server/src/agent/dto/agent.schema.ts` 中 `AgentStreamEvent` 私有协议定义
3. PC/Mobile 重复的 tool/model event 映射实现（迁移到共享模块后删除重复代码）。
4. `@openai/agents-extensions` 顶层 `aisdk` 导入（统一改为 `/ai-sdk` 子路径）。

## 7. SRP 模块边界（最终）

1. `AgentRunService`：只负责 `run/Runner.run` 与模型/工具策略。
2. `AiSdkUiStreamAdapter`：只负责把 `RunStreamEvent` 源转为官方 UI stream Response。
3. `AgentTaskService`：只负责任务状态、计费、查询、取消。
4. `UiChunkAdapter`（shared）：只负责 `Run*Event -> UIMessageChunk` 纯映射。
5. `Transport`（前端）：只负责网络/IPC 通道，不做业务语义映射。

## 8. 分阶段实施（重构口径）

1. P0（协议一刀切）
   - 升级全部版本到第 4 节；
   - Anyhunt 切官方 `ai-sdk-ui` + `DefaultChatTransport`；
   - 删除自定义 SSE 协议与 parser。
2. P1（稳定性）
   - 引入 `reasoningItemIdPolicy: 'omit'` 策略化配置；
   - 为关键工具加 `timeoutMs/timeoutBehavior`；
   - 审批恢复与 tracing 一致性回归。
3. P2（结构收敛）
   - PC/Mobile 映射逻辑抽共享模块；
   - MCP 生命周期切官方 helper；
   - 清理重复与过渡代码。

## 9. 验证与回归

本次属于 L2（跨包 + 运行时路径变更）：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

手工回归：

1. Anyhunt Playground：发送、停止、报错、tool call 展示。
2. Moryflow PC/Mobile：审批中断恢复、截断续写、会话持久化。
3. MCP：多 server 连接、失败恢复、重载。

## 10. DoD

1. Anyhunt 不再出现私有 SSE event 协议定义。
2. Anyhunt `useChat` 仅使用官方 transport + 官方 stream 协议。
3. PC/Mobile 的事件映射逻辑只保留一份共享实现。
4. MCP 生命周期不再依赖自研重试/关闭编排。
5. 升级后 lint/typecheck/test:unit 全通过，核心流程回归通过。

## 11. 参考

- Releases：
  - `https://github.com/openai/openai-agents-js/releases?page=1`
  - `https://github.com/openai/openai-agents-js/releases?page=2`
  - `https://github.com/openai/openai-agents-js/releases?page=3`
  - `https://github.com/openai/openai-agents-js/releases?page=4`
- 重点 tags：
  - `https://github.com/openai/openai-agents-js/releases/tag/v0.5.1`
  - `https://github.com/openai/openai-agents-js/releases/tag/v0.5.0`
  - `https://github.com/openai/openai-agents-js/releases/tag/v0.4.15`
  - `https://github.com/openai/openai-agents-js/releases/tag/v0.4.14`
  - `https://github.com/openai/openai-agents-js/releases/tag/v0.4.13`
  - `https://github.com/openai/openai-agents-js/releases/tag/v0.4.10`
  - `https://github.com/openai/openai-agents-js/releases/tag/v0.4.2`

## 12. 执行进度（按“每步回写文档”）

- 核对时间：2026-02-24（本地仓库 + 发布日志）
- 进度标记：
  - [x] P0-1 Anyhunt Server 流式协议切换为官方 `ai-sdk-ui`（移除私有 SSE 协议映射）
  - [x] P0-2 Anyhunt Console 切换官方 `DefaultChatTransport`（移除手写 SSE parser 与 `eventsource-parser` 依赖）
  - [x] P0-3 `aisdk` 导入统一改为 `@openai/agents-extensions/ai-sdk`
  - [x] P0-4 PC/Mobile 流映射抽取到共享模块（官方 `UIMessageChunk` 唯一协议）
  - [x] P0-5 MCP 生命周期切换官方 helper（`connectMcpServers` / `MCPServers`）
  - [x] P0-6 统一升级依赖版本到 `@openai/agents* 0.5.1` + AI SDK 最新矩阵
  - [x] P0-7 全量校验（L2：`pnpm lint && pnpm typecheck && pnpm test:unit`）
  - [x] P0-8 Review 修复：`llm-routing` 单测 mock 路径改为 `@openai/agents-extensions/ai-sdk`
  - [x] P0-9 Review 修复：`AgentChatTransport` 测试 `reasoning` part 字段改为官方 `text`
  - [x] P0-10 Review 修复：`mcp-manager` 重载失败时清理 `serverStates`，避免 `connecting` 假状态残留
  - [x] P0-11 环境修复：执行 `pnpm install` 成功，`node_modules` 与 postinstall 构建恢复
  - [x] P0-12 环境回归修复：`AgentChatTransport` 测试中 Headers 读取方式改为 `new Headers(...).get('authorization')`
  - [x] P0-13 构建链路兼容修复：`LlmRoutingService` 的 `aisdk` 回退顶层导出；`agent.controller` 对 `ai-sdk-ui` helper 增加显式函数类型，消除 `no-unsafe-*`
  - [x] P0-14 lint 修复：`agent.controller` 区分 Express `Response` 与 Web `Response` 类型，清除 `unbound-method` 与剩余 `no-unsafe-*`
  - [x] P0-15 TS 修复：`AgentChatTransport.headers` 固定返回 `Headers`；`MobileChatTransport` 流 source 中不再使用错误 `this` 上下文
  - [x] P0-16 Runtime 修复：为 `@openai/agents-core run()` 统一绑定默认 `ModelProvider`，修复 PC/Mobile `No default model provider set`
  - [x] P0-17 Google 兼容修复：`tasks_delete.confirm` 参数 schema 改为 `boolean`（执行前强制 `confirm===true`），规避 function declaration 生成布尔 enum 导致的 400
  - [x] P0-18 Runtime Config 修复：空文件/空字符串不再触发 JSONC `ValueExpected` 告警
  - [x] P0-19 Electron ABI 修复：本地重建 `better-sqlite3/keytar`，恢复 App 运行时 ABI
  - [x] P0-20 定向回归通过：`agents-tools`/`agents-runtime` 单测通过，`moryflow-pc` typecheck 通过
  - [x] P0-21 全局闸门通过：`pnpm lint` + `pnpm typecheck` 全通过（含 Anyhunt/Moryflow 全包）
  - [x] P0-22 Gemini 根因修复：新增统一 Tool Schema 兼容层，递归补齐 `enum` 缺失 `type`（主代理 + 子代理）
  - [x] P0-23 ABI 双态修复：`moryflow-pc` 单测前编译 Node ABI、单测后恢复 Electron ABI
  - [x] P0-24 全量 L2 校验通过：`pnpm lint && pnpm typecheck && pnpm test:unit` 全通过

### P0-4 实施记录（2026-02-24）

- 新增共享模块：`packages/agents-runtime/src/ui-stream.ts`
  - 统一 `RunStreamEvent` 类型识别
  - 统一 tool 事件到 `UIMessageChunk` 的映射
  - 统一 model raw event（`output_text_delta`/`reasoning-delta`/`response_done`/`finish`）提取
  - 统一审批场景 `toolCallId` 解析
- PC 改造：`apps/moryflow/pc/src/main/chat/messages.ts`
  - 删除本地事件提取逻辑，改用共享 `ui-stream` 工具
  - 删除 class `instanceof` 分支，统一使用结构化事件识别
- Mobile 改造：`apps/moryflow/mobile/lib/chat/transport.ts`
  - 删除本地 `getEventType/isEventType/getRunItemType/extractModelStreamEvent` 重复实现
  - 删除 `apps/moryflow/mobile/lib/chat/tool-chunks.ts`，改用共享映射
- 回归保障：新增 `packages/agents-runtime/src/__tests__/ui-stream.test.ts`

### P0-5 实施记录（2026-02-24）

- `packages/agents-mcp/src/connection.ts`
  - 删除自研超时/重试/批量关闭编排
  - 新增官方生命周期包装：`openMcpServers` / `closeMcpServers`
  - 默认连接选项统一收敛到 `DEFAULT_MCP_SERVERS_OPTIONS`
- `apps/moryflow/pc/src/main/agent-runtime/core/mcp-manager.ts`
  - 重载链路改为 `openMcpServers(...)`，状态来源统一读取 `MCPServers.active/failed/errors`
  - 测试连接改为官方 helper 托管，不再手写 `Promise.race` 超时逻辑
  - 保留原有状态广播与工具统计能力（UI 行为不变）
- `packages/agents-mcp/src/types.ts`
  - 删除不再使用的 `ServerConnectionResult` 类型，清理历史包袱

### P0-6 实施记录（2026-02-24）

- 升级版本来源：npm registry 实时核对（2026-02-24）。
- 已统一升级到最新矩阵：
  - `@openai/agents-core` / `@openai/agents-extensions` -> `0.5.1`
  - `ai` -> `6.0.97`
  - `@ai-sdk/react` -> `3.0.99`
  - `@ai-sdk/openai` -> `3.0.31`
  - `@ai-sdk/anthropic` -> `3.0.46`
  - `@ai-sdk/google` -> `3.0.30`
  - `@ai-sdk/xai` -> `3.0.57`
  - `@ai-sdk/openai-compatible` -> `2.0.30`
  - `@ai-sdk/provider` -> `3.0.8`
  - `@ai-sdk/provider-utils` -> `4.0.15`
  - `@openrouter/ai-sdk-provider` -> `2.2.3`
  - `openai` -> `6.24.0`
- 涉及 `package.json`：`apps/anyhunt/server`、`apps/anyhunt/console`、`apps/moryflow/{pc,mobile,server,admin}`、`packages/{agents-runtime,agents-mcp,agents-tools,agents-sandbox,ui}`。

### P0-7 校验结果（2026-02-24）

- 已执行命令：
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test:unit`
- 当前结果：全部通过（退出码 0）。
  - `pnpm lint`：通过
  - `pnpm typecheck`：通过
  - `pnpm test:unit`：通过
- 结论：P0-7 已完成。

### P0-15 实施记录（2026-02-24）

- `apps/anyhunt/console/src/features/agent-browser-playground/transport/agent-chat-transport.ts`
  - 修复 `headers` 类型不兼容：由条件对象改为固定返回 `Headers`，避免 `Authorization?: undefined` 导致 `TS2322`
- `apps/moryflow/mobile/lib/chat/transport.ts`
  - 修复 `ReadableStream` source 的 `this` 语义：将 `this.options` 外提为 `transportOptions`，避免 `UnderlyingDefaultSource.options` 报错（`TS2339`）

### P0-16 实施记录（2026-02-24）

- 根因：`@openai/agents-core@0.5.1` 的 `run()` 会构造默认 `Runner`；若未提前设置 `setDefaultModelProvider`，会在构造阶段抛错。
- 方案：新增共享模块 `packages/agents-runtime/src/default-model-provider.ts`
  - 提供 `bindDefaultModelProvider(getModelFactory)`，将运行时 `ModelFactory` 绑定到 `setDefaultModelProvider`。
- 接入点：
  - `apps/moryflow/pc/src/main/agent-runtime/index.ts`：初始化 `modelFactory` 后立即绑定。
  - `apps/moryflow/mobile/lib/agent-runtime/runtime.ts`：初始化 `modelFactory` 后立即绑定（含空值保护）。
- 回归测试：
  - 新增 `packages/agents-runtime/src/__tests__/default-model-provider.test.ts`，覆盖“未绑定时报错/绑定后 Runner 可构造”场景。

### P0-17 实施记录（2026-02-24）

- 根因：`tasks_delete` 使用 `z.literal(true)` 时，会在部分 Google function declaration 兼容层产出 `enum: [true]`，触发 upstream 400。
- 修复：
  - `packages/agents-tools/src/task/tasks-tools.ts`
    - `confirm` 参数改为 `z.boolean()`
    - 执行入口显式校验 `confirm !== true` 时返回 `confirm_required`
    - 真正删除时固定传递 `{ confirm: true }`
- 回归测试：
  - `packages/agents-tools/test/tasks-tools.spec.ts`
    - 新增 `tasks_delete` 用例：`confirm=false` 返回 `confirm_required` 且不会触发 `store.deleteTask`

### P0-18 实施记录（2026-02-24）

- 根因：PC/Mobile 首次运行未生成 `~/.moryflow/config.jsonc` 时会读取到空字符串，`parseJsonc('')` 返回 `ValueExpected`，导致重复 warning。
- 修复：
  - `packages/agents-runtime/src/runtime-config.ts`
    - `parseRuntimeConfig` 对空白内容短路返回 `{ config: {}, errors: [] }`，不进入 JSONC parser。
- 回归测试：
  - `packages/agents-runtime/src/__tests__/runtime-config.test.ts`
    - 新增空白内容测试，断言无 parse errors。

### P0-19 实施记录（2026-02-24）

- 环境恢复（运行时）：
  - 已执行：`pnpm --filter @moryflow/pc exec electron-rebuild -f -w better-sqlite3,keytar`
  - 结果：`Rebuild Complete`

### P0-20 校验结果（2026-02-24）

- 已执行命令：
  - `pnpm --filter @moryflow/agents-tools test:unit`
  - `pnpm --filter @moryflow/agents-runtime test:unit`
  - `pnpm --filter @moryflow/pc typecheck`
- 结果：
  - `agents-tools`：2 files / 7 tests 全通过
  - `agents-runtime`：12 files / 41 tests 全通过
  - `moryflow-pc typecheck`：通过（0 error）

### P0-21 校验结果（2026-02-24）

- 已执行命令：
  - `pnpm lint`
  - `pnpm typecheck`
- 结果：
  - monorepo lint：通过（turbo in-scope 包全部成功）
  - monorepo typecheck：通过（turbo in-scope 包全部成功）

### P0-22 实施记录（2026-02-24）

- 根因：`@openai/agents-core` 的 Zod 兼容转换在 `enum` 节点可能缺失 `type` 字段；OpenAI 容忍，Gemini 严格校验导致 400。
- 修复策略（模块化、单一职责）：
  - 新增共享兼容层：`packages/agents-runtime/src/tool-schema-compat.ts`
    - 递归遍历 function tool JSON schema
    - 对 `enum` 且缺失 `type` 的节点自动推断并补齐 `type`
  - 主代理接入：`packages/agents-runtime/src/agent-factory.ts`
    - 在创建 Agent 前统一调用 `normalizeToolSchemasForInterop(...)`
  - 子代理接入：`packages/agents-tools/src/task/task-tool.ts`
    - `task` 子代理创建前统一调用 `normalizeToolSchemasForInterop(...)`
  - 导出：`packages/agents-runtime/src/index.ts`
- 回归测试：
  - 新增：`packages/agents-runtime/src/__tests__/tool-schema-compat.test.ts`
    - 覆盖 zod 生成 schema 的 `enum/type` 修复
    - 覆盖 number/boolean enum 推断
  - 新增：`packages/agents-tools/test/tasks-tools.spec.ts`
    - 覆盖真实 `tasks_list` schema 经过兼容层后，`status` enum 节点具备 `type: string`

### P0-23 实施记录（2026-02-24）

- 根因：`moryflow-pc` 单测进程使用 Node ABI，而桌面运行使用 Electron ABI，同一个 `better-sqlite3` 产物无法同时满足。
- 修复：
  - `apps/moryflow/pc/package.json`
    - `pretest:unit`: `pnpm rebuild better-sqlite3`（单测前切换 Node ABI）
    - `posttest:unit`: `electron-rebuild -f -w better-sqlite3,keytar`（单测后恢复 Electron ABI）
- 结果：单测与本地运行 ABI 不再互相破坏。

### P0-24 校验结果（2026-02-24）

- 已执行命令：
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test:unit`
- 结果：
  - lint：通过
  - typecheck：通过
  - test:unit：通过（包含 `@moryflow/pc`，并在结束后自动恢复 Electron ABI）
