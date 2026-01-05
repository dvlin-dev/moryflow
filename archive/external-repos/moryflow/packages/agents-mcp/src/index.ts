/**
 * @moryflow/agents-mcp
 *
 * MCP 服务器管理包
 * 提供平台无关的 MCP 服务器连接、工具获取等功能
 *
 * 注意：React Native 环境需要等待 @modelcontextprotocol/sdk 原生支持后才能使用 HTTP MCP
 */

// 类型导出
export * from './types'

// 连接工具
export {
  connectServer,
  connectWithRetry,
  connectWithTimeout,
  closeServer,
  closeServers,
  delay,
  CONNECT_TIMEOUT_MS,
  MAX_RETRIES,
  RETRY_DELAY_MS,
} from './connection'

// 服务器工厂
export {
  createStdioServers,
  createHttpServers,
  createServersFromSettings,
  type ServerWithConfig,
} from './server-factory'

// 工具获取
export { getToolsFromServers } from './tools'
