import { setTracingDisabled, type MCPServer, type Tool } from '@openai/agents-core';
import type { AgentContext } from '@anyhunt/agents-runtime';
import {
  type McpServerState,
  type McpStatusSnapshot,
  type McpStatusEvent,
  type McpTestInput,
  type McpTestResult,
  type McpSettings,
  type McpManager,
  connectServer,
  closeServers,
  getToolsFromServers,
  createServersFromSettings,
} from '@anyhunt/agents-mcp';
import { MCPServerStdio, MCPServerStreamableHttp } from '@openai/agents-core';

// 从 PC 端 ipc 导入 AgentSettings（包含完整的配置结构）
import type { AgentSettings } from '../../../shared/ipc.js';

// 永久禁用 SDK 追踪功能
setTracingDisabled(true);

type ReloadCallback = () => void;
type StatusListener = (event: McpStatusEvent) => void;

/**
 * 管理 MCP 工具集与服务器生命周期。
 *
 * 核心职责：
 * 1. 服务器生命周期管理（创建、连接、关闭）
 * 2. 工具集缓存与更新
 * 3. 异步重载协调
 * 4. 状态跟踪与广播
 */
export const createMcpManager = (): McpManager<AgentContext> => {
  let connectedServers: MCPServer[] = [];
  let mcpTools: Tool<AgentContext>[] = [];
  let pendingReload: Promise<void> | null = null;
  let reloadCallback: ReloadCallback | null = null;
  let isReloading = false;

  // 状态跟踪
  const serverStates = new Map<string, McpServerState>();
  const statusListeners = new Set<StatusListener>();

  const notifyReload = () => {
    reloadCallback?.();
  };

  const emitStatusEvent = (event: McpStatusEvent) => {
    for (const listener of statusListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[mcp-manager] 状态监听器错误', error);
      }
    }
  };

  const updateServerState = (state: McpServerState) => {
    serverStates.set(state.id, state);
    emitStatusEvent({ type: 'server-updated', server: state });
  };

  const getStatus = (): McpStatusSnapshot => ({
    servers: Array.from(serverStates.values()),
    isReloading,
  });

  const doReload = async (settings: McpSettings): Promise<void> => {
    isReloading = true;
    emitStatusEvent({ type: 'reloading' });

    // 1. 关闭现有服务器
    await closeServers(connectedServers);
    connectedServers = [];
    mcpTools = [];
    serverStates.clear();

    // 2. 创建新服务器实例
    const serverConfigs = createServersFromSettings(settings);

    // 为每个服务器创建初始状态
    for (const config of serverConfigs) {
      updateServerState({
        id: config.id,
        name: config.name,
        type: config.type,
        status: 'connecting',
      });
    }

    if (serverConfigs.length === 0) {
      isReloading = false;
      emitStatusEvent({ type: 'reload-complete', snapshot: getStatus() });
      notifyReload();
      return;
    }

    // 3. 并行连接所有服务器
    const results = await Promise.all(
      serverConfigs.map(async ({ server, id, type, name }) => {
        const result = await connectServer(server);
        if (result.status === 'connected') {
          updateServerState({
            id,
            name,
            type,
            status: 'connected',
            connectedAt: Date.now(),
          });
        } else {
          updateServerState({
            id,
            name,
            type,
            status: 'failed',
            error: result.error?.message || '连接失败',
          });
        }
        return { server, result, id };
      })
    );

    // 4. 收集成功连接的服务器并获取每个服务器的工具
    connectedServers = [];
    mcpTools = [];

    for (const { server, result, id } of results) {
      if (result.status === 'connected') {
        connectedServers.push(server);
        // 为每个服务器单独获取工具
        const serverTools = await getToolsFromServers<AgentContext>([{ server, id }]);
        mcpTools.push(...serverTools);

        // 更新服务器状态，包含工具名称
        const state = serverStates.get(id);
        if (state) {
          updateServerState({
            ...state,
            toolCount: serverTools.length,
            toolNames: serverTools.map((t) => t.name),
          });
        }
      }
    }

    isReloading = false;
    emitStatusEvent({ type: 'reload-complete', snapshot: getStatus() });
    notifyReload();
  };

  const scheduleReload = (settings: McpSettings) => {
    const reloadPromise = doReload(settings).catch((error) => {
      console.error('[mcp-manager] 重载失败', error);
      connectedServers = [];
      mcpTools = [];
      isReloading = false;
      emitStatusEvent({ type: 'reload-complete', snapshot: getStatus() });
      notifyReload();
    });

    pendingReload = reloadPromise.finally(() => {
      if (pendingReload === reloadPromise) {
        pendingReload = null;
      }
    });
  };

  const ensureReady = async () => {
    if (pendingReload) {
      try {
        await pendingReload;
      } catch {
        // doReload 内部已记录错误
      }
    }
  };

  const setOnReload = (callback: ReloadCallback) => {
    reloadCallback = callback;
  };

  const addStatusListener = (listener: StatusListener): (() => void) => {
    statusListeners.add(listener);
    return () => statusListeners.delete(listener);
  };

  const testServer = async (input: McpTestInput): Promise<McpTestResult> => {
    // 打印测试配置日志（隐藏敏感信息）
    const safeInput = {
      type: input.type,
      config: {
        ...input.config,
        env:
          input.type === 'stdio' && input.config.env
            ? Object.keys(input.config.env).reduce(
                (acc, key) => {
                  acc[key] = '***';
                  return acc;
                },
                {} as Record<string, string>
              )
            : undefined,
        authorizationHeader:
          input.type === 'http' && input.config.authorizationHeader ? '***' : undefined,
      },
    };
    console.log('[mcp-manager] testServer 输入配置:', JSON.stringify(safeInput, null, 2));

    let server: MCPServer | null = null;

    try {
      if (input.type === 'stdio') {
        console.log('[mcp-manager] 创建 Stdio 服务器:', {
          command: input.config.command,
          args: input.config.args,
          cwd: input.config.cwd,
          hasEnv: !!input.config.env,
        });
        server = new MCPServerStdio({
          name: input.config.name || 'Test Stdio Server',
          command: input.config.command,
          args: input.config.args,
          cwd: input.config.cwd,
          env: input.config.env,
        });
      } else {
        // 合并 Authorization header 和自定义 headers
        const headers: Record<string, string> = { ...input.config.headers };
        if (input.config.authorizationHeader) {
          headers['Authorization'] = input.config.authorizationHeader;
        }
        const hasHeaders = Object.keys(headers).length > 0;
        console.log('[mcp-manager] 创建 HTTP 服务器:', {
          url: input.config.url,
          hasHeaders,
        });
        server = new MCPServerStreamableHttp({
          name: input.config.name || 'Test HTTP Server',
          url: input.config.url,
          requestInit: hasHeaders ? { headers } : undefined,
        });
      }

      // 连接服务器（带超时）
      console.log('[mcp-manager] 开始连接服务器...');
      const timeoutMs = 15_000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('连接超时')), timeoutMs)
      );
      await Promise.race([server.connect(), timeoutPromise]);
      console.log('[mcp-manager] 服务器连接成功');

      // 获取工具列表（直接使用 listTools 避免追踪问题）
      console.log('[mcp-manager] 获取工具列表...');
      const tools = await server.listTools();
      console.log('[mcp-manager] 获取到', tools.length, '个工具');

      return {
        success: true,
        toolCount: tools.length,
        toolNames: tools.map((t) => t.name),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[mcp-manager] testServer 错误:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      if (server) {
        try {
          await server.close();
          console.log('[mcp-manager] 服务器已关闭');
        } catch {
          // 忽略关闭错误
        }
      }
    }
  };

  return {
    getTools: () => mcpTools,
    scheduleReload,
    ensureReady,
    setOnReload,
    getStatus,
    addStatusListener,
    testServer,
  };
};

// 导出类型供 PC 端其他模块使用
export type { McpManager };
