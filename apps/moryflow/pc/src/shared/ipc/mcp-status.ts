/**
 * MCP 状态类型
 *
 * 重新导出 agent-runtime-mcp 的类型，保持 PC 端 IPC 兼容性
 */

export type {
  McpServerStatus,
  McpServerState,
  McpStatusSnapshot,
  McpStatusEvent,
  McpTestInput,
  McpTestResult,
} from '@aiget/agents-mcp'
