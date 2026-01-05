/**
 * MCP 工具函数（PC 端）
 *
 * 重新导出 agent-runtime-mcp 的共享函数，并添加 PC 特定的功能
 */

// 重新导出共享函数
export {
  connectServer,
  closeServers,
  getToolsFromServers,
  createStdioServers,
  createHttpServers,
  createServersFromSettings,
  type ServerConnectionResult,
  type ServerWithConfig,
} from '@moryflow/agents-mcp'
