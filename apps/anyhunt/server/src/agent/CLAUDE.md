# Agent

> L3 Agent API（SSE）+ Browser Tools（基于 `@openai/agents-core`）

## Overview

Agent 模块提供 `/api/v1/agent` 能力：将用户的自然语言需求编排为一组工具调用（Browser Tools），并以 SSE 方式流式返回思考过程、工具调用与最终结构化输出。

本模块是 Agent 能力在 Anyhunt Dev 业务线的唯一实现入口；旧品牌遗留的 `apps/aiget/*` 已移除，避免出现重复实现与漂移。

## Responsibilities

- 任务管理：创建/查询/取消（DB：`AgentTask`；Redis：进度/取消标记）
- 流式输出：SSE（`textDelta/reasoningDelta/toolCall/toolResult/progress/complete/failed`）
- Browser Tools：基于 `BrowserAgentPort`，提供语义定位与批量动作（`browser_action`/`browser_action_batch`）
- 动态计费：分段 checkpoint（每 100 credits）+ 最终结算 + 失败退款

## Constraints

- **Ports 边界**：Agent 只能依赖 `src/browser/ports/*`（禁止直接依赖 Playwright 类型）
- **SDK 依赖**：统一使用 `@openai/agents-core@0.4.3`，不引入 realtime
- **ApiKeyGuard 依赖**：Agent L3 API 使用 `ApiKeyGuard`，对应模块必须导入 `ApiKeyModule`，否则会导致 Nest 启动失败
- **工具收敛**：仅保留 `browser_open`、`browser_snapshot`、`browser_action`、`browser_action_batch`、`web_search`，不保留 click/fill/type 等旧工具
- **LLM API 约束**：只允许使用 `/chat/completions`（`useResponses=false`），禁止 Responses API（避免网关不兼容导致 400）
- **网关兼容性**：对“纯文本输出”任务需移除 `response_format: { type: 'text' }`（部分 OpenAI-compatible 网关会对该字段报 400）；实现见 `AgentService.buildAgent`
- **浏览器 Session 惰性创建**：Agent 不应在 LLM 首次调用前创建 Browser Session；仅在首次 Browser Tool 调用时创建（避免无效 session、降低资源占用）
- **回合上限**：单次运行最大 `100` turns（`AgentService` 内部常量）
- **输出格式收紧**：请求使用 `output`（`text` / `json_schema`），并对 `json_schema` 的 schema 做规模/深度/required 校验；不再支持旧的 `schema` 透传
- **Model 选择**：请求可选传 `model`（标准模型名），不传则使用 Admin 配置的默认模型；最终 provider + upstreamId 由 `LlmRoutingService` 决定，并由 Runner 使用对应 ModelProvider
- **用户归属绑定**：Browser 端口必须通过 `BrowserAgentPortService.forUser(userId)` 获取
- **取消语义**：必须支持硬取消（AbortSignal）+ Redis 取消标记（跨实例）
- **竞态保护**：任务终态更新必须使用 `updateTaskIfStatus`（compare-and-set）
- **退费幂等**：退款必须基于 `deduct.breakdown`，并使用稳定 referenceId（推荐 `refund:${transactionId}`）
- **Daily 退款参数**：Daily bucket 退款必须携带 `deductTransactionId`

## File Structure

| File/Dir                       | Description                              |
| ------------------------------ | ---------------------------------------- |
| `agent.controller.ts`          | L3 API 入口（JSON/SSE）                  |
| `agent.service.ts`             | 任务执行编排（run + ports + 任务管理）   |
| `agent-billing.service.ts`     | 分段扣费/结算/退款                       |
| `agent-stream.processor.ts`    | SDK 流事件 → SSE + 计费/取消检查         |
| `agent-task.repository.ts`     | AgentTask/Charge DB 读写                 |
| `agent-task.progress.store.ts` | Redis 进度与取消标记                     |
| `tools/`                       | Browser Tools（依赖 ports）              |
| `dto/`                         | 请求/响应/SSE 事件类型（Zod 单一数据源） |

## API

- `POST /api/v1/agent`：创建任务（默认 SSE；`stream=false` 返回 JSON）
- `GET /api/v1/agent/:id`：查询任务状态（合并 DB + Redis）
- `DELETE /api/v1/agent/:id`：取消任务（按已消耗结算，不退款）
- `POST /api/v1/agent/estimate`：成本预估（免费）

## LLM Env（Admin 动态配置）

- `ANYHUNT_LLM_SECRET_KEY`: required（用于加密存储在 DB 的 provider apiKey）

## 最近更新

- 2026-01-27：Agent 运行时使用模型 maxOutputTokens 作为输出上限；prompt/messages 互斥校验
- 2026-01-26：CreateAgentTaskSchema 拆分 Base/Console 版本，支持 console 复用且保留 refine 校验
- 2026-01-26：Agent cancel 状态映射为 204/404/409，并统一 RFC7807 错误体
- 2026-01-26：修复流式任务在 LLM 路由失败时清理 Redis 进度；补充对应单测
- 2026-01-25：Agent 浏览器工具收敛为 action/action_batch + open/snapshot/search，移除冗余工具
