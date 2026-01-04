/**
 * MCP 服务器工厂
 * 根据配置创建服务器实例
 *
 * 注意：此模块依赖 @aiget/agents 中的 MCPServerStdio 和 MCPServerStreamableHttp
 * 在 React Native 环境中，需要等待 @modelcontextprotocol/sdk 支持后才能正常使用
 */

import {
  MCPServerStdio,
  MCPServerStreamableHttp,
  type MCPServer,
} from '@aiget/agents'
import type { McpSettings } from './types'

const LOG_PREFIX = '[mcp]'

/**
 * 根据 Stdio 配置创建服务器实例（不连接）
 *
 * 注意：仅在 Node.js/Electron 环境中可用
 * React Native 不支持 Stdio MCP
 */
export const createStdioServers = (settings: McpSettings): MCPServer[] => {
  const servers: MCPServer[] = []
  for (const config of settings.stdio ?? []) {
    if (!config.enabled || !config.command) continue
    try {
      servers.push(
        new MCPServerStdio({
          name: config.name || `Stdio MCP (${config.id})`,
          command: config.command,
          args: config.args.length > 0 ? config.args : undefined,
          cwd: config.cwd,
          env: config.env,
        })
      )
    } catch (error) {
      console.error(`${LOG_PREFIX} 创建 Stdio 服务器失败: ${config.name}`, error)
    }
  }
  return servers
}

/**
 * 根据 StreamableHttp 配置创建服务器实例（不连接）
 *
 * 注意：在 React Native 环境中，需要等待 @modelcontextprotocol/sdk 原生支持后才能使用
 * 当前 agents-core 的 shims-react-native.ts 中的实现只是占位符
 */
export const createHttpServers = (settings: McpSettings): MCPServer[] => {
  const servers: MCPServer[] = []
  for (const config of settings.streamableHttp ?? []) {
    if (!config.enabled || !config.url) continue
    try {
      // 合并 Authorization header 和自定义 headers
      const headers: Record<string, string> = { ...config.headers }
      if (config.authorizationHeader) {
        headers['Authorization'] = config.authorizationHeader
      }
      const hasHeaders = Object.keys(headers).length > 0
      servers.push(
        new MCPServerStreamableHttp({
          name: config.name || `HTTP MCP (${config.id})`,
          url: config.url,
          requestInit: hasHeaders ? { headers } : undefined,
        })
      )
    } catch (error) {
      console.error(`${LOG_PREFIX} 创建 HTTP 服务器失败: ${config.name}`, error)
    }
  }
  return servers
}

/**
 * 根据配置创建所有服务器实例
 * 返回服务器实例及其配置信息
 */
export interface ServerWithConfig {
  server: MCPServer
  id: string
  name: string
  type: 'stdio' | 'http'
}

export const createServersFromSettings = (settings: McpSettings): ServerWithConfig[] => {
  const result: ServerWithConfig[] = []

  // 创建 Stdio 服务器
  const stdioServers = createStdioServers(settings)
  let stdioIndex = 0
  for (const config of settings.stdio ?? []) {
    if (!config.enabled || !config.command) continue
    const server = stdioServers[stdioIndex]
    if (server) {
      result.push({
        server,
        id: config.id,
        name: config.name || `Stdio MCP (${config.id})`,
        type: 'stdio',
      })
      stdioIndex++
    }
  }

  // 创建 HTTP 服务器
  const httpServers = createHttpServers(settings)
  let httpIndex = 0
  for (const config of settings.streamableHttp ?? []) {
    if (!config.enabled || !config.url) continue
    const server = httpServers[httpIndex]
    if (server) {
      result.push({
        server,
        id: config.id,
        name: config.name || `HTTP MCP (${config.id})`,
        type: 'http',
      })
      httpIndex++
    }
  }

  return result
}
