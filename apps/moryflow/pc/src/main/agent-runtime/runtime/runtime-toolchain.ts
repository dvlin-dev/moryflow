/**
 * [PROVIDES]: createRuntimeToolchain - Agent Runtime 工具链装配与生命周期管理
 * [DEPENDS]: tools, permission, doom-loop, MCP, external-tools
 * [POS]: PC Agent Runtime 运行期工具编排层
 */

import type { Tool } from '@openai/agents-core';
import type { PlatformCapabilities, CryptoUtils } from '@moryflow/agents-adapter';
import {
  createToolOutputPostProcessor,
  wrapToolsWithHooks,
  wrapToolsWithOutputTruncation,
  wrapToolsWithStreaming,
  type AgentContext,
  type AgentRuntimeConfig,
  type VaultUtils,
} from '@moryflow/agents-runtime';
import {
  createPcBashFirstToolset,
  createSubagentTool,
  type SubAgentToolsConfig,
  type TaskStateService,
} from '@moryflow/agents-tools';
import { createSandboxBashTool } from '@moryflow/agents-sandbox';
import type { MCPSettings } from '../../../shared/ipc.js';
import { requestPathAuthorization, getSandboxManager } from '../../sandbox/index.js';
import { mcpRuntime } from '../../mcp-runtime/index.js';
import { createMcpManager, type DesktopMcpManager } from '../mcp/mcp-manager.js';
import { initPermissionRuntime } from '../permission/permission-runtime.js';
import { initDoomLoopRuntime } from '../permission/doom-loop-runtime.js';
import { createDesktopBashAuditWriter } from '../permission/bash-audit.js';
import { loadExternalTools } from '../tooling/external-tools.js';
import { createDesktopToolOutputStorage } from '../tooling/tool-output-storage.js';
import { buildDelegatedSubagentTools } from '../tooling/subagent-tools.js';

const DEFAULT_TOOL_OUTPUT_TRUNCATION = {
  maxLines: 120,
  maxChars: 12000,
  maxBytes: 16384,
  ttlDays: 7,
};

const DEFAULT_TOOL_BUDGET_WARN_THRESHOLD = 24;

const PC_BASH_FIRST_SUBAGENT_INSTRUCTIONS = `You are a subagent executor with the same full tool capabilities as the desktop runtime (including bash, web, task, skill, and other injected tools).
Break down the task goal into steps autonomously and select the most appropriate tools — do not rely on fixed role templates.
On completion, output structured results including: conclusion, key evidence, risks, and next-step recommendations.`;

type RuntimeToolchainInput = {
  capabilities: PlatformCapabilities;
  crypto: CryptoUtils;
  vaultUtils: VaultUtils;
  taskStateService: TaskStateService;
  runtimeConfig: AgentRuntimeConfig;
  runtimeHooks: AgentRuntimeConfig['hooks'];
  getMemoryTools: () => Tool<AgentContext>[];
  getKnowledgeTools: () => Tool<AgentContext>[];
  skillTool: Tool<AgentContext>;
  onMainToolsChanged: () => void;
};

export type RuntimeToolchain = {
  getMainTools: () => Tool<AgentContext>[];
  getWrappedMcpTools: () => Tool<AgentContext>[];
  refreshMainTools: () => void;
  ensureExternalTools: () => Promise<void>;
  initializeManagedMcp: (settings: MCPSettings) => Promise<void>;
  scheduleMcpReload: (settings: MCPSettings) => void;
  mcpManager: DesktopMcpManager<AgentContext>;
};

export const createRuntimeToolchain = (input: RuntimeToolchainInput): RuntimeToolchain => {
  const toolOutputConfig = {
    ...DEFAULT_TOOL_OUTPUT_TRUNCATION,
    ...(input.runtimeConfig.truncation ?? {}),
  };
  const toolOutputStorage = createDesktopToolOutputStorage({
    capabilities: input.capabilities,
    crypto: input.crypto,
    ttlDays: toolOutputConfig.ttlDays,
  });
  const bashAuditWriter = createDesktopBashAuditWriter({
    persistCommandPreview: input.runtimeConfig.tools?.bashAudit?.persistCommandPreview,
    previewMaxChars: input.runtimeConfig.tools?.bashAudit?.previewMaxChars,
  });
  const toolBudgetWarnThreshold =
    input.runtimeConfig.tools?.budgetWarnThreshold ?? DEFAULT_TOOL_BUDGET_WARN_THRESHOLD;

  const isWithinVault = (vaultRoot: string | undefined, targetPath: string): boolean => {
    if (!vaultRoot) return false;
    const relative = input.capabilities.path.relative(vaultRoot, targetPath);
    if (relative === '') return true;
    return !relative.startsWith('..') && !input.capabilities.path.isAbsolute(relative);
  };

  const toolOutputPostProcessor = createToolOutputPostProcessor({
    config: toolOutputConfig,
    storage: toolOutputStorage,
    buildHint: ({ fullPath, runContext }) => {
      if (!fullPath) {
        return 'Full output could not be saved. Please retry the command if needed.';
      }
      const vaultRoot = runContext?.context?.vaultRoot;
      if (isWithinVault(vaultRoot, fullPath)) {
        return `Full output saved at ${fullPath}. Use bash (cat/grep) or open the file to inspect it.`;
      }
      return `Full output saved at ${fullPath}. Open the file to view the full content.`;
    },
  });

  const baseTools = createPcBashFirstToolset({
    capabilities: input.capabilities,
    crypto: input.crypto,
    vaultUtils: input.vaultUtils,
    taskStateService: input.taskStateService,
  });
  const sandboxBashTool = createSandboxBashTool({
    getSandbox: getSandboxManager,
    onAuthRequest: requestPathAuthorization,
    onCommandAudit: async (event) => {
      try {
        await bashAuditWriter.append({
          sessionId: event.chatId,
          userId: event.userId,
          command: event.command,
          requestedCwd: event.requestedCwd,
          resolvedCwd: event.resolvedCwd,
          exitCode: event.exitCode,
          durationMs: event.durationMs,
          failed: event.failed,
          error: event.error,
          timestamp: event.finishedAt,
        });
      } catch (error) {
        console.warn('[agent-runtime] failed to write bash audit event', error);
      }
    },
  });

  const mcpManager = createMcpManager();
  const permissionRuntime = initPermissionRuntime({
    capabilities: input.capabilities,
    getMcpServerIds: () => mcpManager.getStatus().servers.map((server) => server.id),
  });
  const doomLoopRuntime = initDoomLoopRuntime({
    uiAvailable: true,
    config: input.runtimeConfig.doomLoop,
    shouldSkip: ({ callId }) => {
      if (!callId) return false;
      const decision = permissionRuntime.getDecision(callId);
      return decision?.decision === 'deny';
    },
  });

  const buildWrappedMcpTools = (): Tool<AgentContext>[] =>
    wrapToolsWithStreaming(
      wrapToolsWithOutputTruncation(
        doomLoopRuntime.wrapTools(
          permissionRuntime.wrapTools(wrapToolsWithHooks(mcpManager.getTools(), input.runtimeHooks))
        ),
        toolOutputPostProcessor
      )
    );

  let mainTools: Tool<AgentContext>[] = [];
  let loadedExternalTools: Tool<AgentContext>[] = [];
  let externalToolsLoaded = false;
  let externalToolsLoading: Promise<void> | null = null;

  const subagentTools: SubAgentToolsConfig = () =>
    buildDelegatedSubagentTools(mainTools, buildWrappedMcpTools());
  const subagentTool = createSubagentTool(subagentTools, PC_BASH_FIRST_SUBAGENT_INSTRUCTIONS);

  const rebuildMainTools = (extraTools: Tool<AgentContext>[] = loadedExternalTools) => {
    const base = [
      ...baseTools,
      ...input.getMemoryTools(),
      ...input.getKnowledgeTools(),
      sandboxBashTool,
      subagentTool,
      input.skillTool,
      ...extraTools,
    ];
    if (base.length > toolBudgetWarnThreshold) {
      console.warn('[agent-runtime] tool budget exceeded', {
        count: base.length,
        threshold: toolBudgetWarnThreshold,
        names: base.map((tool) => tool.name),
      });
    }
    const withHooks = wrapToolsWithHooks(base, input.runtimeHooks);
    const withPermission = permissionRuntime.wrapTools(withHooks);
    const withDoomLoop = doomLoopRuntime.wrapTools(withPermission);
    mainTools = wrapToolsWithStreaming(
      wrapToolsWithOutputTruncation(withDoomLoop, toolOutputPostProcessor)
    );
  };

  const reloadExternalTools = async () => {
    if (!input.runtimeConfig.tools?.external?.enabled) return;
    try {
      loadedExternalTools = await loadExternalTools({
        capabilities: input.capabilities,
        crypto: input.crypto,
        vaultUtils: input.vaultUtils,
      });
      rebuildMainTools(loadedExternalTools);
      input.onMainToolsChanged();
    } catch (error) {
      console.warn('[agent-runtime] failed to load external tools', error);
    }
  };

  const ensureExternalTools = async () => {
    if (!input.runtimeConfig.tools?.external?.enabled) return;
    if (externalToolsLoaded) return;
    if (!externalToolsLoading) {
      externalToolsLoading = reloadExternalTools().finally(() => {
        externalToolsLoaded = true;
      });
    }
    await externalToolsLoading;
  };

  const initializeManagedMcp = async (settings: MCPSettings) => {
    mcpManager.setOnReload(input.onMainToolsChanged);
    mcpManager.scheduleReload(settings);
    try {
      await mcpManager.ensureReady();
      const { changedServerIds, failed } = await mcpRuntime.refreshEnabledServers(settings.stdio);
      if (failed.length > 0) {
        console.warn('[agent-runtime] managed MCP update failed', failed);
      }
      if (changedServerIds.length > 0) {
        mcpManager.scheduleReload(settings);
      }
    } catch (error) {
      console.warn('[agent-runtime] failed to run managed MCP updates', error);
    }
  };

  rebuildMainTools([]);

  return {
    getMainTools: () => mainTools,
    getWrappedMcpTools: buildWrappedMcpTools,
    refreshMainTools: () => {
      rebuildMainTools(loadedExternalTools);
    },
    ensureExternalTools,
    initializeManagedMcp,
    scheduleMcpReload: (settings) => {
      mcpManager.scheduleReload(settings);
    },
    mcpManager,
  };
};
