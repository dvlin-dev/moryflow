/**
 * MCP 工具获取
 * 从已连接的服务器获取工具列表
 */

import type { MCPServer, Tool } from '@openai/agents-core';
import { mcpToFunctionTool } from '@openai/agents-core';

const LOG_PREFIX = '[mcp]';

type McpServerDescriptor =
  | MCPServer
  | {
      server: MCPServer;
      id: string;
    };

const resolveDescriptor = (entry: McpServerDescriptor) => {
  if ('server' in entry) {
    return { server: entry.server, id: entry.id };
  }
  return { server: entry, id: entry.name || 'unknown' };
};

/**
 * 从已连接的服务器获取所有工具
 * 直接使用 server.listTools() + mcpToFunctionTool 绕过追踪系统
 */
export const getToolsFromServers = async <TContext = unknown>(
  servers: McpServerDescriptor[]
): Promise<Tool<TContext>[]> => {
  if (servers.length === 0) return [];
  try {
    const allTools: Tool<TContext>[] = [];
    for (const entry of servers) {
      const { server, id } = resolveDescriptor(entry);
      const mcpTools = await server.listTools();
      const tools = mcpTools.map((t) => {
        const tool = mcpToFunctionTool(t, server, false) as Tool<TContext> & {
          __mcpServerId?: string;
        };
        Object.defineProperty(tool, '__mcpServerId', {
          value: id,
          enumerable: false,
        });
        return tool;
      });
      allTools.push(...(tools as Tool<TContext>[]));
    }
    console.log(`${LOG_PREFIX} 已加载 ${allTools.length} 个工具`);
    return allTools;
  } catch (error) {
    console.error(`${LOG_PREFIX} 获取工具失败`, error);
    return [];
  }
};
