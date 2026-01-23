# Agents Core

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Agent 框架的核心包，基于 OpenAI Agents SDK 定制，提供 Agent 抽象、运行时、工具调用等核心能力。

## 职责

- Agent 定义与生命周期管理
- 运行时执行（run、runImplementation）
- 工具（Tool）抽象与调用
- MCP 协议支持
- Handoff（Agent 间切换）机制
- Guardrail（安全护栏）
- Tracing（追踪与日志）
  - `GenerationSpanData` 属于公开导出（供 agents-openai 使用）

## 约束

- 被所有 agents-\* 包依赖，修改需谨慎
- 保持与 OpenAI Agents SDK 的 API 兼容性
- 跨平台支持（Node.js、Browser、React Native、Cloudflare Workers）

## 技术栈

| 技术       | 用途             |
| ---------- | ---------------- |
| TypeScript | 开发语言         |
| OpenAI SDK | 底层模型调用     |
| MCP SDK    | MCP 协议支持     |
| Zod        | 参数校验（可选） |

## 成员清单

| 文件                   | 类型 | 说明               |
| ---------------------- | ---- | ------------------ |
| `index.ts`             | 入口 | 主导出             |
| `agent.ts`             | 核心 | Agent 定义与配置   |
| `run.ts`               | 核心 | Agent 运行入口     |
| `runImplementation.ts` | 核心 | 运行实现（最复杂） |
| `runState.ts`          | 核心 | 运行状态管理       |
| `runContext.ts`        | 核心 | 运行上下文         |
| `tool.ts`              | 核心 | Tool 抽象定义      |
| `model.ts`             | 核心 | 模型抽象           |
| `mcp.ts`               | 核心 | MCP 协议实现       |
| `handoff.ts`           | 核心 | Agent 切换机制     |
| `guardrail.ts`         | 核心 | 安全护栏           |
| `result.ts`            | 核心 | 运行结果类型       |
| `lifecycle.ts`         | 核心 | 生命周期钩子       |
| `items.ts`             | 类型 | 消息项类型         |
| `events.ts`            | 类型 | 事件类型           |
| `errors.ts`            | 类型 | 错误类型           |
| `usage.ts`             | 工具 | Token 用量统计     |
| `logger.ts`            | 工具 | 日志工具           |

### 子目录

| 目录          | 说明                                    |
| ------------- | --------------------------------------- |
| `types/`      | 类型定义（协议、别名、Provider 数据）   |
| `tracing/`    | 追踪与 Span 管理                        |
| `extensions/` | 扩展机制                                |
| `utils/`      | 工具函数                                |
| `shims/`      | 跨平台兼容层（Node/Browser/RN/Workerd） |
| `memory/`     | 记忆管理                                |
| `helpers/`    | 辅助函数                                |

## 核心概念

### Agent

```typescript
const agent = new Agent({
  name: 'assistant',
  model: 'gpt-4o',
  instructions: '你是一个助手',
  tools: [myTool],
});
```

### Tool

```typescript
const myTool = new Tool({
  name: 'search',
  description: '搜索信息',
  parameters: z.object({ query: z.string() }),
  execute: async ({ query }) => { ... }
})
```

### Run

```typescript
const result = await run(agent, messages, {
  stream: true,
  onEvent: (event) => { ... }
})
```

## 常见修改场景

| 场景            | 涉及文件                         | 注意事项             |
| --------------- | -------------------------------- | -------------------- |
| 修改 Agent 配置 | `agent.ts`                       | 影响所有 Agent 实例  |
| 修改运行逻辑    | `run.ts`, `runImplementation.ts` | 核心流程，需充分测试 |
| 新增工具类型    | `tool.ts`                        | 保持向后兼容         |
| 修改 MCP 支持   | `mcp.ts`, `mcpUtil.ts`           | 遵循 MCP 协议规范    |
| 新增平台支持    | `shims/`                         | 添加对应 shim 文件   |
| 修改追踪逻辑    | `tracing/`                       | 不影响核心功能       |

## 依赖关系

```
agents-core/
├── 被依赖 ← agents-adapter
├── 被依赖 ← agents-openai
├── 被依赖 ← agents-runtime
├── 被依赖 ← agents-realtime
├── 被依赖 ← agents-tools
├── 被依赖 ← agents-mcp
├── 被依赖 ← agents-extensions
├── 被依赖 ← agents-model-registry
└── 依赖 → openai（底层 SDK）
```

## 导出结构

```
@moryflow/agents-core
├── /          # 主导出（Agent, Tool, run 等）
├── /model     # 模型相关
├── /utils     # 工具函数
├── /extensions# 扩展
├── /types     # 类型定义
└── /_shims    # 平台兼容层
```

## 近期变更

- 刷新自动生成的 `metadata.ts`
