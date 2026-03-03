/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';
import type { MCPServer } from '@openai/agents-core';

const mcpRuntimeMock = vi.hoisted(() => ({
  resolveEnabledServers: vi.fn(),
}));

const agentsMcpMock = vi.hoisted(() => {
  const createMockServer = (name = 'mock-server') => ({
    cacheToolsList: false,
    name,
    connect: async () => undefined,
    close: async () => undefined,
    listTools: async () => [],
    callTool: async () => [],
    invalidateToolsCache: async () => undefined,
    clientSessionTimeoutSeconds: 30,
  });

  return {
    createMockServer,
    closeMcpServers: vi.fn(async () => undefined),
    openMcpServers: vi.fn(async (servers: MCPServer[]) => ({
      active: servers,
      failed: [],
      errors: new Map<MCPServer, Error>(),
    })),
    getToolsFromServers: vi.fn(async () => []),
    createServersFromSettings: vi.fn(
      (settings: {
        stdio: Array<{ id: string; name: string }>;
        streamableHttp: Array<{ id: string; name: string }>;
      }) => {
        const stdio = settings.stdio.map((server) => ({
          id: server.id,
          name: server.name,
          type: 'stdio' as const,
          server: createMockServer(server.name),
        }));

        const streamableHttp = settings.streamableHttp.map((server) => ({
          id: server.id,
          name: server.name,
          type: 'streamable-http' as const,
          server: createMockServer(server.name),
        }));

        return [...stdio, ...streamableHttp];
      }
    ),
  };
});

vi.mock('@moryflow/agents-mcp', () => ({
  closeMcpServers: agentsMcpMock.closeMcpServers,
  openMcpServers: agentsMcpMock.openMcpServers,
  getToolsFromServers: agentsMcpMock.getToolsFromServers,
  createServersFromSettings: agentsMcpMock.createServersFromSettings,
}));

vi.mock('../../mcp-runtime/index.js', () => ({
  mcpRuntime: {
    resolveEnabledServers: mcpRuntimeMock.resolveEnabledServers,
  },
}));

vi.mock('@openai/agents-core', async () => {
  const actual = await vi.importActual<typeof import('@openai/agents-core')>('@openai/agents-core');
  class MockMCPServerStdio {
    name: string;
    cacheToolsList = false;
    clientSessionTimeoutSeconds?: number;

    constructor(options: { name: string; clientSessionTimeoutSeconds?: number }) {
      this.name = options.name;
      this.clientSessionTimeoutSeconds = options.clientSessionTimeoutSeconds;
    }

    async connect() {}
    async close() {}
    async listTools() {
      return [];
    }
    async callTool() {
      return [];
    }
    async invalidateToolsCache() {}
  }

  class MockMCPServerStreamableHttp extends MockMCPServerStdio {}

  return {
    ...actual,
    setTracingDisabled: vi.fn(),
    MCPServerStdio: MockMCPServerStdio,
    MCPServerStreamableHttp: MockMCPServerStreamableHttp,
  };
});

import {
  applyMcpServerSessionTimeout,
  createMcpManager,
  MCP_CLIENT_SESSION_TIMEOUT_SECONDS,
  resolveMcpServerState,
} from './mcp-manager';

const createMockServer = (): MCPServer => ({
  cacheToolsList: false,
  name: 'mock-server',
  connect: async () => undefined,
  close: async () => undefined,
  listTools: async () => [],
  callTool: async () => [],
  invalidateToolsCache: async () => undefined,
});

const createSettings = () => ({
  stdio: [
    {
      id: 'managed-stdio',
      enabled: true,
      name: 'Managed MCP',
      autoUpdate: 'startup-latest' as const,
      packageName: '@scope/managed-mcp',
      binName: 'managed-mcp',
      args: [],
    },
  ],
  streamableHttp: [],
});

describe('resolveMcpServerState', () => {
  it('marks failed when server is in failed set even if active set also includes it', () => {
    const server = createMockServer();
    const config = { server, id: 's1', name: 'S1', type: 'stdio' as const };
    const activeSet = new Set<MCPServer>([server]);
    const failedSet = new Set<MCPServer>([server]);
    const errors = new Map<MCPServer, Error>([[server, new Error('MCP timeout')]]);

    const state = resolveMcpServerState({ config, activeSet, failedSet, errors });
    expect(state).toMatchObject({
      id: 's1',
      status: 'failed',
      error: 'MCP timeout',
    });
  });
});

describe('applyMcpServerSessionTimeout', () => {
  it('upgrades stdio/http session timeout floor to avoid 5s init/listTools timeout', () => {
    const server = {
      ...createMockServer(),
      clientSessionTimeoutSeconds: 5,
    } as MCPServer & { clientSessionTimeoutSeconds: number };

    applyMcpServerSessionTimeout(server);
    expect(server.clientSessionTimeoutSeconds).toBe(MCP_CLIENT_SESSION_TIMEOUT_SECONDS);
  });
});

describe('createMcpManager', () => {
  it('switches server status from failed to connected after runtime package becomes available', async () => {
    mcpRuntimeMock.resolveEnabledServers
      .mockResolvedValueOnce({
        resolved: [],
        failed: [
          {
            id: 'managed-stdio',
            name: 'Managed MCP',
            error: 'Failed to resolve MCP package runtime',
          },
        ],
      })
      .mockResolvedValueOnce({
        resolved: [
          {
            id: 'managed-stdio',
            name: 'Managed MCP',
            command: process.execPath,
            args: ['/tmp/managed-mcp.js'],
          },
        ],
        failed: [],
      });

    const manager = createMcpManager();

    manager.scheduleReload(createSettings());
    await manager.ensureReady();

    const first = manager.getStatus().servers.find((server) => server.id === 'managed-stdio');
    expect(first?.status).toBe('failed');

    manager.scheduleReload(createSettings());
    await manager.ensureReady();

    const second = manager.getStatus().servers.find((server) => server.id === 'managed-stdio');
    expect(second?.status).toBe('connected');
    expect(agentsMcpMock.openMcpServers).toHaveBeenCalledTimes(1);
  });
});
