# Agent 日志收集系统

## 需求

收集 Agent 执行链路日志：
- 追踪完整执行链路
- 记录 Tool 执行入参和错误信息
- 支持性能分析和优化

## 技术方案

### 数据模型

**AgentTrace 表**：

| 字段 | 类型 | 说明 |
|------|------|------|
| traceId | String | 唯一标识 |
| agentName | String | Agent 名称 |
| status | String | pending / completed / failed / interrupted |
| turnCount | Int | 执行轮次 |
| totalTokens | Int | Token 消耗 |
| duration | Int? | 耗时（毫秒） |

**AgentSpan 表**：

| 字段 | 类型 | 说明 |
|------|------|------|
| spanId | String | Span 标识 |
| type | String | agent / function / generation |
| name | String | 如 Tool 名称 |
| input | Json? | 输入参数（失败时必填） |
| output | Json? | 输出结果（失败时必填） |
| errorType | String? | 错误类型 |

### 上报策略

| 场景 | 策略 |
|------|------|
| Tool 执行成功 | 仅记录概要 |
| Tool 执行失败 | 完整记录 input/output |
| Agent 完成 | 批量上报所有 Spans |

### 数据裁剪

- 输入/输出：最大 4KB
- 错误消息：最大 2KB

### 告警规则

```
Tool 失败率告警：
  条件：1h 内失败率 > 10% 且调用 > 10

Agent 连续失败告警：
  条件：同一 Agent 连续 5 次失败
```

### 日志清理

| 数据类型 | 保留期 |
|----------|--------|
| 成功的 Trace | 7 天 |
| 失败的 Trace | 30 天 |
| 告警历史 | 90 天 |

## 代码索引

| 模块 | 路径 |
|------|------|
| TracingProcessor | `packages/agents-core/src/tracing/serverTracingProcessor.ts` |
| PC Tracing 集成 | `apps/pc/src/main/agent-runtime/tracing-setup.ts` |
| Server API (用户) | `apps/server/src/agent-trace/` |
| Server API (管理) | `apps/server/src/admin/agent-trace/` |
| 日志清理服务 | `apps/server/src/agent-trace/agent-trace-cleanup.service.ts` |
| 告警系统 | `apps/server/src/alert/` |
| Admin 前端 | `apps/admin/src/features/agent-traces/` |
