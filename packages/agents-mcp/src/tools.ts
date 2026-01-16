/**
 * MCP 工具获取
 * 从已连接的服务器获取工具列表
 */

import type { MCPServer, Tool } from '@anyhunt/agents'
import { mcpToFunctionTool } from '@anyhunt/agents-core'

const LOG_PREFIX = '[mcp]'

/**
 * 从已连接的服务器获取所有工具
 * 直接使用 server.listTools() + mcpToFunctionTool 绕过追踪系统
 */
export const getToolsFromServers = async <TContext = unknown>(
  servers: MCPServer[]
): Promise<Tool<TContext>[]> => {
  if (servers.length === 0) return []
  try {
    const allTools: Tool<TContext>[] = []
    for (const server of servers) {
      const mcpTools = await server.listTools()
      const tools = mcpTools.map((t) => mcpToFunctionTool(t, server, false))
      allTools.push(...(tools as Tool<TContext>[]))
    }
    console.log(`${LOG_PREFIX} 已加载 ${allTools.length} 个工具`)
    return allTools
  } catch (error) {
    console.error(`${LOG_PREFIX} 获取工具失败`, error)
    return []
  }
}
