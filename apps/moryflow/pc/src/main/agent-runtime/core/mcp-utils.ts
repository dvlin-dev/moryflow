/**
 * MCP 工具函数（PC 端）
 *
 * 重新导出 agent-runtime-mcp 的共享函数，并添加 PC 特定的功能
 */

// 重新导出共享函数
export {
  openMcpServers,
  closeMcpServers,
  getToolsFromServers,
  createStdioServers,
  createHttpServers,
  createServersFromSettings,
  DEFAULT_MCP_SERVERS_OPTIONS,
  type OpenMcpServersOptions,
  type ServerWithConfig,
} from '@moryflow/agents-mcp';
