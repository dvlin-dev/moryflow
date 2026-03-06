import {
  setTracingDisabled,
  MCPServerStdio,
  MCPServerStreamableHttp,
  type MCPServer,
  type MCPServers,
  type Tool,
} from '@openai/agents-core';
import type { AgentContext } from '@moryflow/agents-runtime';
import {
  type McpServerState,
  type McpStatusSnapshot,
  type McpStatusEvent,
  closeMcpServers,
  openMcpServers,
  getToolsFromServers,
  createServersFromSettings,
} from '@moryflow/agents-mcp';
import type { MCPSettings, McpTestInput, McpTestResult } from '../../../shared/ipc.js';
import { mcpRuntime } from '../../mcp-runtime/index.js';

// 永久禁用 SDK 追踪功能
setTracingDisabled(true);

type ReloadCallback = () => void;
type StatusListener = (event: McpStatusEvent) => void;
type ConnectionServerConfig = ReturnType<typeof createServersFromSettings>[number];
type RuntimeMcpSettings = Parameters<typeof createServersFromSettings>[0];

export type DesktopMcpManager<TContext = unknown> = {
  getTools(): Tool<TContext>[];
  scheduleReload(settings: MCPSettings): void;
  ensureReady(): Promise<void>;
  setOnReload(callback: () => void): void;
  getStatus(): McpStatusSnapshot;
  addStatusListener(listener: (event: McpStatusEvent) => void): () => void;
  testServer(input: McpTestInput): Promise<McpTestResult>;
};

export const MCP_CLIENT_SESSION_TIMEOUT_SECONDS = 30;

const MCP_TEST_CONNECT_TIMEOUT_MS = 45_000;
const MCP_TEST_CLOSE_TIMEOUT_MS = 15_000;

export const applyMcpServerSessionTimeout = (server: MCPServer): MCPServer => {
  const serverWithTimeout = server as MCPServer & {
    clientSessionTimeoutSeconds?: number;
  };
  const currentTimeout = serverWithTimeout.clientSessionTimeoutSeconds;

  if (typeof currentTimeout !== 'number') {
    return server;
  }

  if (currentTimeout < MCP_CLIENT_SESSION_TIMEOUT_SECONDS) {
    serverWithTimeout.clientSessionTimeoutSeconds = MCP_CLIENT_SESSION_TIMEOUT_SECONDS;
  }
  return server;
};

export const resolveMcpServerState = ({
  config,
  activeSet,
  failedSet,
  errors,
}: {
  config: ConnectionServerConfig;
  activeSet: ReadonlySet<MCPServer>;
  failedSet: ReadonlySet<MCPServer>;
  errors: ReadonlyMap<MCPServer, Error>;
}): McpServerState => {
  if (failedSet.has(config.server)) {
    return {
      id: config.id,
      name: config.name,
      type: config.type,
      status: 'failed',
      error: errors.get(config.server)?.message ?? '连接失败',
    };
  }

  if (activeSet.has(config.server)) {
    return {
      id: config.id,
      name: config.name,
      type: config.type,
      status: 'connected',
      connectedAt: Date.now(),
    };
  }

  return {
    id: config.id,
    name: config.name,
    type: config.type,
    status: 'failed',
    error: '连接状态未知',
  };
};

const buildRuntimeMcpSettings = (
  settings: MCPSettings,
  resolvedStdio: Awaited<ReturnType<typeof mcpRuntime.resolveEnabledServers>>['resolved']
): RuntimeMcpSettings => ({
  stdio: resolvedStdio.map((server) => ({
    id: server.id,
    enabled: true,
    name: server.name,
    command: server.command,
    args: server.args,
    env: server.env,
  })),
  streamableHttp: settings.streamableHttp,
});

/**
 * 管理 MCP 工具集与服务器生命周期。
 *
 * 核心职责：
 * 1. 服务器生命周期管理（创建、连接、关闭）
 * 2. 工具集缓存与更新
 * 3. 异步重载协调
 * 4. 状态跟踪与广播
 */
export const createMcpManager = (): DesktopMcpManager<AgentContext> => {
  let managedServers: MCPServers | null = null;
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

  const doReload = async (settings: MCPSettings): Promise<void> => {
    isReloading = true;
    emitStatusEvent({ type: 'reloading' });

    // 1. 关闭现有服务器
    await closeMcpServers(managedServers);
    managedServers = null;
    mcpTools = [];
    serverStates.clear();

    const stdioResolution = await mcpRuntime.resolveEnabledServers(settings.stdio, 'if-missing');
    for (const failedServer of stdioResolution.failed) {
      updateServerState({
        id: failedServer.id,
        name: failedServer.name,
        type: 'stdio',
        status: 'failed',
        error: failedServer.error,
      });
    }

    // 2. 创建新服务器实例
    const runtimeSettings = buildRuntimeMcpSettings(settings, stdioResolution.resolved);
    const serverConfigs = createServersFromSettings(runtimeSettings).map((config) => ({
      ...config,
      server: applyMcpServerSessionTimeout(config.server),
    }));

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

    // 3. 使用官方 MCPServers 生命周期托管连接与失败状态
    managedServers = await openMcpServers(serverConfigs.map((config) => config.server));
    const activeSet = new Set(managedServers.active);
    const failedSet = new Set(managedServers.failed);
    mcpTools = [];

    // 4. 收集成功连接的服务器并获取每个服务器的工具
    for (const config of serverConfigs) {
      const baseState = resolveMcpServerState({
        config,
        activeSet,
        failedSet,
        errors: managedServers.errors,
      });
      updateServerState(baseState);

      if (baseState.status !== 'connected') {
        continue;
      }

      const serverTools = await getToolsFromServers<AgentContext>([
        { server: config.server, id: config.id },
      ]);
      mcpTools.push(...serverTools);

      updateServerState({
        ...baseState,
        toolCount: serverTools.length,
        toolNames: serverTools.map((tool) => tool.name),
      });
    }

    isReloading = false;
    emitStatusEvent({ type: 'reload-complete', snapshot: getStatus() });
    notifyReload();
  };

  const scheduleReload = (settings: MCPSettings) => {
    const previousReload = pendingReload;
    const queuedReload = (previousReload ?? Promise.resolve())
      .catch(() => {
        // previous reload error is already handled
      })
      .then(() => doReload(settings))
      .catch(async (error) => {
        console.error('[mcp-manager] 重载失败', error);
        await closeMcpServers(managedServers);
        managedServers = null;
        mcpTools = [];
        serverStates.clear();
        isReloading = false;
        emitStatusEvent({ type: 'reload-complete', snapshot: getStatus() });
        notifyReload();
      });

    const nextReload = queuedReload.finally(() => {
      if (pendingReload === nextReload) {
        pendingReload = null;
      }
    });
    pendingReload = nextReload;
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
    let testServers: MCPServers | null = null;

    try {
      if (input.type === 'stdio') {
        console.log('[mcp-manager] 创建 Stdio 服务器:', {
          packageName: input.config.packageName,
          binName: input.config.binName,
          args: input.config.args,
          hasEnv: !!input.config.env,
        });
        const resolution = await mcpRuntime.resolveEnabledServers(
          [
            {
              id: '__mcp_test__',
              enabled: true,
              name: input.config.name || 'Test Stdio Server',
              autoUpdate: 'startup-latest',
              packageName: input.config.packageName,
              binName: input.config.binName,
              args: input.config.args ?? [],
              env: input.config.env,
            },
          ],
          'if-missing'
        );
        const resolvedServer = resolution.resolved[0];
        if (!resolvedServer) {
          return {
            success: false,
            error: resolution.failed[0]?.error ?? 'Failed to resolve MCP package runtime',
          };
        }
        server = new MCPServerStdio({
          name: input.config.name || 'Test Stdio Server',
          command: resolvedServer.command,
          args: resolvedServer.args,
          env: resolvedServer.env,
          clientSessionTimeoutSeconds: MCP_CLIENT_SESSION_TIMEOUT_SECONDS,
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
          clientSessionTimeoutSeconds: MCP_CLIENT_SESSION_TIMEOUT_SECONDS,
        });
      }

      // 使用官方 MCPServers 建立连接与错误收敛
      console.log('[mcp-manager] 开始连接服务器...');
      testServers = await openMcpServers([server], {
        connectTimeoutMs: MCP_TEST_CONNECT_TIMEOUT_MS,
        closeTimeoutMs: MCP_TEST_CLOSE_TIMEOUT_MS,
        strict: false,
        dropFailed: true,
        connectInParallel: false,
      });
      const connectedServer = testServers.active[0];
      if (!connectedServer) {
        const error =
          testServers.errors.get(server)?.message ??
          (testServers.failed.length > 0 ? '连接失败' : '连接状态未知');
        return {
          success: false,
          error,
        };
      }
      console.log('[mcp-manager] 服务器连接成功');

      // 获取工具列表（直接使用 listTools）
      console.log('[mcp-manager] 获取工具列表...');
      const tools = await connectedServer.listTools();
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
      if (testServers) {
        try {
          await closeMcpServers(testServers);
          console.log('[mcp-manager] 服务器已关闭');
        } catch {
          // 忽略关闭错误
        }
      } else if (server) {
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
