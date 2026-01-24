/**
 * MCP 连接工具函数
 * 平台无关的连接、重试逻辑
 */

import type { MCPServer } from '@openai/agents-core';
import type { ServerConnectionResult } from './types';

const LOG_PREFIX = '[mcp]';

/**
 * 连接超时时间（毫秒）
 */
export const CONNECT_TIMEOUT_MS = 30_000;

/**
 * 最大重试次数
 */
export const MAX_RETRIES = 3;

/**
 * 重试间隔（毫秒）
 */
export const RETRY_DELAY_MS = 1000;

/**
 * 延迟函数
 */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 带超时的连接
 */
export const connectWithTimeout = async (
  server: MCPServer,
  timeoutMs: number = CONNECT_TIMEOUT_MS
): Promise<void> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`连接超时: ${server.name}`)), timeoutMs);
  });
  await Promise.race([server.connect(), timeoutPromise]);
};

/**
 * 带重试的连接
 */
export const connectWithRetry = async (
  server: MCPServer,
  maxRetries: number = MAX_RETRIES,
  retryDelay: number = RETRY_DELAY_MS
): Promise<void> => {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await connectWithTimeout(server);
      console.log(`${LOG_PREFIX} 已连接: ${server.name}`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        console.warn(`${LOG_PREFIX} 重试连接 ${server.name} (${attempt}/${maxRetries})...`);
        await delay(retryDelay);
      }
    }
  }
  throw lastError;
};

/**
 * 连接单个服务器，返回连接结果
 */
export const connectServer = async (server: MCPServer): Promise<ServerConnectionResult> => {
  try {
    await connectWithRetry(server);
    return { status: 'connected' };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`${LOG_PREFIX} 连接失败: ${server.name}`, err.message);
    return { status: 'failed', error: err };
  }
};

/**
 * 关闭单个服务器
 */
export const closeServer = async (server: MCPServer): Promise<void> => {
  try {
    await server.close();
  } catch (error) {
    console.warn(`${LOG_PREFIX} 关闭服务器失败: ${server.name}`, error);
  }
};

/**
 * 批量关闭服务器
 */
export const closeServers = async (servers: MCPServer[]): Promise<void> => {
  await Promise.all(servers.map(closeServer));
};
