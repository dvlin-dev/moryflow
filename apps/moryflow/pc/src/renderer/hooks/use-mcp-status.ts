/**
 * [PROVIDES]: useMcpStatus - MCP 状态订阅与测试
 * [DEPENDS]: desktopAPI.agent
 * [POS]: MCP 服务状态管理
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  McpServerState,
  McpStatusSnapshot,
  McpStatusEvent,
  McpTestInput,
  McpTestResult,
} from '@shared/ipc';

type UseMcpStatusReturn = {
  /** 所有服务器状态 */
  servers: McpServerState[];
  /** 是否正在重载 */
  isReloading: boolean;
  /** 是否已加载 */
  isLoaded: boolean;
  /** 根据 ID 获取服务器状态 */
  getServerById: (id: string) => McpServerState | undefined;
  /** 测试单个服务器连接 */
  testServer: (input: McpTestInput) => Promise<McpTestResult>;
  /** 刷新状态（仅获取最新状态） */
  refresh: () => Promise<void>;
  /** 重新加载所有 MCP 服务器 */
  reload: () => Promise<void>;
};

/**
 * 订阅 MCP 服务器状态变更
 */
export const useMcpStatus = (): UseMcpStatusReturn => {
  const [status, setStatus] = useState<McpStatusSnapshot | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!window.desktopAPI?.agent?.getMcpStatus) return;
    try {
      const snapshot = await window.desktopAPI.agent.getMcpStatus();
      setStatus(snapshot);
      setIsLoaded(true);
    } catch (error) {
      console.error('[use-mcp-status] 获取状态失败', error);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!window.desktopAPI?.agent?.onMcpStatusChange) return;

    const dispose = window.desktopAPI.agent.onMcpStatusChange((event: McpStatusEvent) => {
      setStatus((prev) => {
        if (!prev) {
          return { servers: [], isReloading: false };
        }

        switch (event.type) {
          case 'reloading':
            return { ...prev, isReloading: true };

          case 'server-updated': {
            const servers = prev.servers.filter((s) => s.id !== event.server.id);
            return {
              ...prev,
              servers: [...servers, event.server],
            };
          }

          case 'reload-complete':
            return event.snapshot;

          default:
            return prev;
        }
      });
    });

    return dispose;
  }, []);

  const getServerById = useCallback(
    (id: string) => status?.servers.find((s) => s.id === id),
    [status?.servers]
  );

  const testServer = useCallback(async (input: McpTestInput): Promise<McpTestResult> => {
    if (!window.desktopAPI?.agent?.testMcpServer) {
      return { success: false, error: 'API unavailable' };
    }
    return window.desktopAPI.agent.testMcpServer(input);
  }, []);

  const reload = useCallback(async () => {
    if (!window.desktopAPI?.agent?.reloadMcp) return;
    try {
      await window.desktopAPI.agent.reloadMcp();
    } catch (error) {
      console.error('[use-mcp-status] 重新加载失败', error);
    }
  }, []);

  return {
    servers: status?.servers ?? [],
    isReloading: status?.isReloading ?? false,
    isLoaded,
    getServerById,
    testServer,
    refresh,
    reload,
  };
};
