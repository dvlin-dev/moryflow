/**
 * MCP 连接生命周期工具
 * 基于官方 MCPServers/connectMcpServers 实现
 */

import {
  connectMcpServers,
  type MCPServer,
  type MCPServers,
  type MCPServersOptions,
} from '@openai/agents-core';

export const DEFAULT_MCP_SERVERS_OPTIONS: MCPServersOptions = {
  connectTimeoutMs: 30_000,
  closeTimeoutMs: 30_000,
  dropFailed: false,
  strict: false,
  suppressAbortError: true,
  connectInParallel: true,
};

export type OpenMcpServersOptions = Partial<MCPServersOptions>;

export const openMcpServers = async (
  servers: MCPServer[],
  options: OpenMcpServersOptions = {}
): Promise<MCPServers> => {
  return connectMcpServers(servers, {
    ...DEFAULT_MCP_SERVERS_OPTIONS,
    ...options,
  });
};

export const closeMcpServers = async (servers: MCPServers | null | undefined): Promise<void> => {
  if (!servers) {
    return;
  }
  await servers.close();
};
