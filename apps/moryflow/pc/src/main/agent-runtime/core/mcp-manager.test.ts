/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';
import type { MCPServer } from '@openai/agents-core';

vi.mock('electron-store', () => ({
  default: class MockElectronStore<T extends Record<string, unknown>> {
    store: T;

    constructor(options?: { defaults?: T }) {
      this.store = (options?.defaults ?? ({} as T)) as T;
    }
  },
}));

import {
  applyMcpServerSessionTimeout,
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
