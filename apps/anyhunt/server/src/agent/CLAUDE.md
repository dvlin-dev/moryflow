# Agent

> L3 Agent API（SSE）+ Browser Tools（基于 `@anyhunt/agents-core`）

## Overview

Agent 模块提供 `/api/v1/agent` 能力：将用户的自然语言需求编排为一组工具调用（Browser Tools），并以 SSE 方式流式返回思考过程、工具调用与最终结构化输出。

本模块是 Agent 能力在 Anyhunt Dev 业务线的唯一实现入口；旧品牌遗留的 `apps/aiget/*` 已移除，避免出现重复实现与漂移。

## Responsibilities

- 任务管理：创建/查询/取消（DB：`AgentTask`；Redis：进度/取消标记）
- 流式输出：SSE（`thinking/tool_call/tool_result/progress/complete/failed`）
- Browser Tools：基于 `BrowserAgentPort`，禁止透传 Playwright 类型
- 动态计费：分段 checkpoint（每 100 credits）+ 最终结算 + 失败退款

## Constraints

- **Ports 边界**：Agent 只能依赖 `src/browser/ports/*`（禁止直接依赖 Playwright 类型）
- **ApiKeyGuard 依赖**：Agent L3 API 使用 `ApiKeyGuard`，对应模块必须导入 `ApiKeyModule`，否则会导致 Nest 启动失败
- **LLM Provider 初始化**：anyhunt-server 必须在启动期调用 `setDefaultModelProvider(...)`（见 `AgentModelProviderInitializer`），否则会报 `No default model provider set`
- **LLM API 约束**：只允许使用 `/chat/completions`（`useResponses=false`），禁止 Responses API（避免网关不兼容导致 400）
- **网关兼容性**：对“纯文本输出”任务需移除 `response_format: { type: 'text' }`（部分 OpenAI-compatible 网关会对该字段报 400）；实现见 `AgentService.buildAgent`
- **浏览器 Session 惰性创建**：Agent 不应在 LLM 首次调用前创建 Browser Session；仅在首次 Browser Tool 调用时创建（避免无效 session、降低资源占用）
- **输出格式收紧**：请求使用 `output`（`text` / `json_schema`），并对 `json_schema` 的 schema 做规模/深度/required 校验；不再支持旧的 `schema` 透传
- **Model/Provider 策略**：model/provider 由 `ApiKey.llmProviderId/llmModelId/llmEnabled` 决定，请求不允许覆盖
- **Provider 对齐**：运行时通过 `ANYHUNT_LLM_PROVIDER_ID` 与 `ApiKey.llmProviderId` 对齐，避免 baseURL/provider 不一致导致不可预测错误
- **生产环境配置校验**：`NODE_ENV=production` 且缺少 `OPENAI_API_KEY` 时，任务必须 fail-fast（不创建 Browser Session）
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

## LLM Env

- `OPENAI_API_KEY`: required (or the key for an OpenAI-compatible gateway)
- `OPENAI_BASE_URL`: optional (set when using a gateway, e.g. OpenRouter/AI Gateway)
- `ANYHUNT_LLM_PROVIDER_ID`: optional (default `openai`, must match ApiKey.llmProviderId)
