# Agent

> L3 Agent API（SSE）+ Browser Tools（基于 `@anyhunt/agents-core`）

## Overview

Agent 模块提供 `/api/v1/agent` 能力：将用户的自然语言需求编排为一组工具调用（Browser Tools），并以 SSE 方式流式返回思考过程、工具调用与最终结构化输出。

## Responsibilities

- 任务管理：创建/查询/取消（DB：`AgentTask`；Redis：进度/取消标记）
- 流式输出：SSE（`thinking/tool_call/tool_result/progress/complete/failed`）
- Browser Tools：基于 `BrowserAgentPort`，禁止透传 Playwright 类型
- 动态计费：分段 checkpoint（每 100 credits）+ 最终结算 + 失败退款

## Constraints

- **Ports 边界**：Agent 只能依赖 `src/browser/ports/*`（禁止直接依赖 Playwright 类型）
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
