/* @vitest-environment node */

import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const wrapToolsWithStreaming = vi.fn((tools: unknown[]) => tools);

describe('createRuntimeToolchain', () => {
  beforeEach(() => {
    vi.resetModules();
    wrapToolsWithStreaming.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('为主工具链和 MCP 工具链恢复 streaming 包装', async () => {
    vi.doMock('@moryflow/agents-runtime', () => ({
      createToolOutputPostProcessor: vi.fn(() => ({ kind: 'post-processor' })),
      wrapToolsWithHooks: vi.fn((tools: unknown[]) => tools),
      wrapToolsWithOutputTruncation: vi.fn((tools: unknown[]) => tools),
      wrapToolsWithStreaming,
    }));

    vi.doMock('@moryflow/agents-tools', () => ({
      createPcBashFirstToolset: vi.fn(() => [
        { name: 'base_tool', type: 'function', invoke: vi.fn() },
      ]),
      createSubagentTool: vi.fn(() => ({
        name: 'subagent',
        type: 'function',
        invoke: vi.fn(),
      })),
    }));

    vi.doMock('@moryflow/agents-sandbox', () => ({
      createSandboxBashTool: vi.fn(() => ({
        name: 'bash',
        type: 'function',
        invoke: vi.fn(),
      })),
    }));

    vi.doMock('../../sandbox/index.js', () => ({
      requestPathAuthorization: vi.fn(),
      getSandboxManager: vi.fn(),
    }));

    vi.doMock('../../mcp-runtime/index.js', () => ({
      mcpRuntime: {
        refreshEnabledServers: vi.fn(async () => ({ changedServerIds: [], failed: [] })),
      },
    }));

    vi.doMock('../mcp/mcp-manager.js', () => ({
      createMcpManager: vi.fn(() => ({
        getTools: () => [{ name: 'mcp_tool', type: 'function', invoke: vi.fn() }],
        setOnReload: vi.fn(),
        scheduleReload: vi.fn(),
        ensureReady: vi.fn(async () => undefined),
        getStatus: () => ({ servers: [] }),
      })),
    }));

    vi.doMock('../permission/permission-runtime.js', () => ({
      initPermissionRuntime: vi.fn(() => ({
        wrapTools: (tools: unknown[]) => tools,
        getDecision: vi.fn(),
      })),
    }));

    vi.doMock('../permission/doom-loop-runtime.js', () => ({
      initDoomLoopRuntime: vi.fn(() => ({
        wrapTools: (tools: unknown[]) => tools,
      })),
    }));

    vi.doMock('../permission/bash-audit.js', () => ({
      createDesktopBashAuditWriter: vi.fn(() => ({
        append: vi.fn(async () => undefined),
      })),
    }));

    vi.doMock('../tooling/external-tools.js', () => ({
      loadExternalTools: vi.fn(async () => []),
    }));

    vi.doMock('../tooling/tool-output-storage.js', () => ({
      createDesktopToolOutputStorage: vi.fn(() => ({})),
    }));

    vi.doMock('../tooling/subagent-tools.js', () => ({
      buildDelegatedSubagentTools: vi.fn(() => []),
    }));

    const { createRuntimeToolchain } = await import('./runtime-toolchain.js');

    const toolchain = createRuntimeToolchain({
      capabilities: {
        path,
      } as never,
      crypto: {} as never,
      vaultUtils: {} as never,
      taskStateService: {} as never,
      runtimeConfig: {} as never,
      runtimeHooks: undefined,
      getMemoryTools: () => [{ name: 'memory_search', type: 'function', invoke: vi.fn() }],
      getKnowledgeTools: () => [{ name: 'knowledge_search', type: 'function', invoke: vi.fn() }],
      skillTool: { name: 'skill', type: 'function', invoke: vi.fn() } as never,
      onMainToolsChanged: vi.fn(),
    });

    const mainTools = toolchain.getMainTools();
    const mcpTools = toolchain.getWrappedMcpTools();

    expect(mainTools.map((tool) => tool.name)).toContain('memory_search');
    expect(mcpTools.map((tool) => tool.name)).toContain('mcp_tool');
    expect(wrapToolsWithStreaming).toHaveBeenCalledTimes(2);
  });
});
