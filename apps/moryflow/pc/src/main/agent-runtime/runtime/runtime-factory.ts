/**
 * [PROVIDES]: createAgentRuntime - PC Agent Runtime composition root
 * [DEPENDS]: runtime 子模块、memory 子模块、MCP/permission/tooling 适配层
 * [POS]: PC 主进程 Agent Runtime 装配入口，仅负责依赖接线与对外 API 导出
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import {
  createAgentFactory,
  bindDefaultModelProvider,
  createModelFactory,
  createVaultUtils,
  generateChatTitle,
  type ModelFactory,
  type PresetProvider,
} from '@moryflow/agents-runtime';
import { providerRegistry, toApiModelId } from '@moryflow/model-bank/registry';
import { getAgentSettings, onAgentSettingsChange } from '../../agent-settings/index.js';
import { chatSessionStore } from '../../chat-session-store/index.js';
import { ensureVaultAccess, getStoredVault } from '../../vault/index.js';
import { membershipBridge } from '../../membership/bridge.js';
import { getSkillsRegistry } from '../../skills/index.js';
import { memoryApi } from '../../memory/api/client.js';
import { workspaceProfileService } from '../../workspace-profile/service.js';
import { resolveActiveWorkspaceProfileContext } from '../../workspace-profile/context.js';
import { setupAgentTracing } from '../tracing/tracing-setup.js';
import { findAgentById, loadAgentDefinitionsSync } from '../registry/agent-store.js';
import { createRuntimeTaskStateService } from '../session/task-state-runtime.js';
import { createSkillTool } from '../tooling/skill-tool.js';
import type { KnowledgeToolDeps } from '../memory/knowledge-tools.js';
import type { MemoryToolDeps } from '../memory/memory-tools.js';
import { createKnowledgeReader } from '../memory/knowledge-reader.js';
import { createMemoryRuntimeSupport } from '../memory/memory-runtime-support.js';
import { createDesktopCapabilities, createDesktopCrypto } from './desktop-adapter.js';
import { bindRuntimeEvents } from './runtime-events.js';
import { getRuntimeConfigSync } from './runtime-config.js';
import { getRuntimeVaultRoot } from './runtime-vault-context.js';
import { resolveModelSettings, resolveSystemPrompt } from '../prompt/prompt-resolution.js';
import { createRuntimeToolchain } from './runtime-toolchain.js';
import { createRuntimeCompactionSupport } from './runtime-compaction-support.js';
import { createRuntimeChatTurnRunner } from './runtime-chat-turn.js';
import type { AgentRuntime } from './runtime-types.js';

setupAgentTracing();

const MAX_AGENT_TURNS = 100;

export const createAgentRuntime = (): AgentRuntime => {
  const runtimeConfig = getRuntimeConfigSync();
  const runtimeHooks = runtimeConfig.hooks;
  const agentDefinitions = loadAgentDefinitionsSync();
  const selectedAgent = findAgentById(agentDefinitions, runtimeConfig.agent?.id);
  if (runtimeConfig.agent?.id && !selectedAgent) {
    console.warn('[agent-runtime] Agent not found:', runtimeConfig.agent.id);
  }

  const capabilities = createDesktopCapabilities();
  const crypto = createDesktopCrypto();

  const resolveFallbackVaultRoot = async (): Promise<string> => {
    const activeVault = await getStoredVault();
    if (!activeVault?.path) {
      throw new Error('尚未选择 Vault');
    }
    return activeVault.path;
  };

  const resolveSessionVaultRoot = (chatId: string): string | null => {
    try {
      const session = chatSessionStore.getSummary(chatId);
      const scopedVaultPath = session.vaultPath.trim();
      return scopedVaultPath.length > 0 && capabilities.path.isAbsolute(scopedVaultPath)
        ? scopedVaultPath
        : null;
    } catch {
      return null;
    }
  };

  const resolveRuntimeVaultRoot = async (chatId?: string): Promise<string> => {
    const runtimeScopedVaultRoot = getRuntimeVaultRoot();
    const sessionScopedVaultRoot = chatId ? resolveSessionVaultRoot(chatId) : null;
    const rawVaultRoot =
      runtimeScopedVaultRoot ?? sessionScopedVaultRoot ?? (await resolveFallbackVaultRoot());
    await ensureVaultAccess(rawVaultRoot);
    return capabilities.path.resolve(rawVaultRoot);
  };

  const vaultUtils = createVaultUtils(capabilities, crypto, async () => resolveRuntimeVaultRoot());
  const taskStateService = createRuntimeTaskStateService();
  const skillsRegistry = getSkillsRegistry();
  const skillTool = createSkillTool();

  const memoryToolDeps: MemoryToolDeps = {
    getWorkspaceId: async (chatId?: string, requireSession?: boolean) => {
      if (chatId) {
        try {
          const summary = chatSessionStore.getSummary(chatId);
          if (summary.profileKey) {
            const sepIdx = summary.profileKey.indexOf(':');
            if (sepIdx > 0) {
              const userId = summary.profileKey.slice(0, sepIdx);
              const clientWorkspaceId = summary.profileKey.slice(sepIdx + 1);
              const profile = workspaceProfileService.getProfile(userId, clientWorkspaceId);
              if (profile?.workspaceId) return profile.workspaceId;
            }
          }
        } catch {
          // ignore
        }
      }

      if (requireSession) {
        throw new Error('Cannot resolve session workspace for memory write operation');
      }

      const ctx = await resolveActiveWorkspaceProfileContext();
      if (!ctx.profile?.workspaceId) throw new Error('No active workspace profile');
      return ctx.profile.workspaceId;
    },
    api: memoryApi,
    onMemoryMutated: () => {
      memoryRuntime.resetPromptCache();
    },
  };

  const knowledgeToolDeps: KnowledgeToolDeps = {
    ...memoryToolDeps,
    readWorkspaceFile: createKnowledgeReader({
      pathUtils: capabilities.path,
      getSessionSummary: (sessionChatId) => {
        try {
          return chatSessionStore.getSummary(sessionChatId);
        } catch {
          return null;
        }
      },
      getProfile: (userId, clientWorkspaceId) =>
        workspaceProfileService.getProfile(userId, clientWorkspaceId),
    }),
  };

  const runtimeProviderRegistry: Record<string, PresetProvider> = providerRegistry;
  const initialSettings = getAgentSettings();
  let modelFactory: ModelFactory = createModelFactory({
    settings: initialSettings,
    providerRegistry: runtimeProviderRegistry,
    toApiModelId,
    membership: membershipBridge.getConfig(),
  });
  bindDefaultModelProvider(() => modelFactory);

  let agentFactory: ReturnType<typeof createAgentFactory>;

  const memoryRuntime = createMemoryRuntimeSupport({
    capabilityDeps: {
      getActiveContext: () => resolveActiveWorkspaceProfileContext(),
      getSessionSummary: (sessionChatId) => {
        try {
          return chatSessionStore.getSummary(sessionChatId);
        } catch {
          return null;
        }
      },
      getProfile: (userId, clientWorkspaceId) =>
        workspaceProfileService.getProfile(userId, clientWorkspaceId),
      isAbsolutePath: capabilities.path.isAbsolute,
    },
    memoryToolDeps,
    knowledgeToolDeps,
    onToolsChanged: () => {
      runtimeToolchain.refreshMainTools();
      agentFactory = createRuntimeAgentFactory();
      agentFactory.invalidate();
    },
    onPromptChanged: () => {
      agentFactory.invalidate();
    },
  });

  const runtimeToolchain = createRuntimeToolchain({
    capabilities,
    crypto,
    vaultUtils,
    taskStateService,
    runtimeConfig,
    runtimeHooks,
    getMemoryTools: () => memoryRuntime.getMemoryTools(),
    getKnowledgeTools: () => memoryRuntime.getKnowledgeTools(),
    skillTool,
    onMainToolsChanged: () => {
      agentFactory = createRuntimeAgentFactory();
      agentFactory.invalidate();
    },
  });

  const createRuntimeAgentFactory = () =>
    createAgentFactory({
      getModelFactory: () => modelFactory,
      baseTools: runtimeToolchain.getMainTools(),
      getMcpTools: runtimeToolchain.getWrappedMcpTools,
      getInstructions: () => {
        const memoryBlock = [memoryRuntime.getPromptBlock(), memoryRuntime.getInstructions()]
          .filter(Boolean)
          .join('\n\n');
        return resolveSystemPrompt({
          settings: getAgentSettings(),
          basePrompt: selectedAgent?.systemPrompt ?? undefined,
          hook: runtimeHooks?.chat?.system,
          memoryBlock: memoryBlock || undefined,
          availableSkillsBlock: skillsRegistry.getAvailableSkillsPrompt(),
        });
      },
      getModelSettings: () => resolveModelSettings(selectedAgent, runtimeHooks?.chat?.params),
    });

  agentFactory = createRuntimeAgentFactory();

  void runtimeToolchain.ensureExternalTools();
  memoryRuntime.prime();
  void skillsRegistry.refresh().catch((error) => {
    console.warn('[agent-runtime] failed to load skills', error);
  });
  void runtimeToolchain.initializeManagedMcp(initialSettings.mcp);

  const refreshModelFactory = () => {
    memoryRuntime.resetCapabilityCache();
    modelFactory = createModelFactory({
      settings: getAgentSettings(),
      providerRegistry: runtimeProviderRegistry,
      toApiModelId,
      membership: membershipBridge.getConfig(),
    });
  };

  bindRuntimeEvents(
    {
      onMembershipChange: (listener) => membershipBridge.addListener(listener),
      onSettingsChange: (listener) => onAgentSettingsChange(listener),
    },
    {
      refreshModelFactory,
      refreshMemoryTooling: async () => {
        await memoryRuntime.refreshTooling();
      },
      invalidateAgentFactory: () => {
        agentFactory.invalidate();
      },
      scheduleMcpReload: (settings) => {
        runtimeToolchain.scheduleMcpReload(settings);
      },
    }
  );

  const compactionSupport = createRuntimeCompactionSupport({
    runtimeConfig,
    getModelFactory: () => modelFactory,
    resolveModelId: (preferredModelId) => agentFactory.getAgent(preferredModelId).modelId,
  });

  const runChatTurn = createRuntimeChatTurnRunner({
    runtimeConfig,
    resolveRuntimeVaultRoot,
    skillsRegistry,
    ensureExternalTools: runtimeToolchain.ensureExternalTools,
    ensureMcpReady: () => runtimeToolchain.mcpManager.ensureReady(),
    memoryRuntime,
    getAgentFactory: () => agentFactory,
    getModelFactory: () => modelFactory,
    getEffectiveHistory: compactionSupport.consumePreparedOrApply,
    maxAgentTurns: MAX_AGENT_TURNS,
  });

  return {
    prepareCompaction: compactionSupport.prepareCompaction,
    runChatTurn,
    async generateTitle(userMessage: string, preferredModelId?: string): Promise<string> {
      const { model } = modelFactory.buildRawModel(preferredModelId);
      return generateChatTitle(model, userMessage);
    },
    getMcpStatus: () => runtimeToolchain.mcpManager.getStatus(),
    onMcpStatusChange: (listener) => runtimeToolchain.mcpManager.addStatusListener(listener),
    testMcpServer: (input) => runtimeToolchain.mcpManager.testServer(input),
    reloadMcp: () => runtimeToolchain.scheduleMcpReload(getAgentSettings().mcp),
  };
};
