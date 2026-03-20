/**
 * [PROVIDES]: createAgentRuntime - PC 主进程 Agent Runtime 组合入口（工具 wiring、模型工厂、会话压缩、MCP 状态、流式聊天）
 * [DEPENDS]: runtime 子模块、agents-runtime、agents-tools、sandbox、agent-settings
 * [POS]: agent-runtime 运行时工厂，负责把独立职责模块装配成可执行运行时
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { run, user, type Tool } from '@openai/agents-core';
import {
  applyContextToInput,
  buildUserContent,
  DEFAULT_TOOL_OUTPUT_TRUNCATION,
  bindDefaultModelProvider,
  createAgentFactory,
  createModelFactory,
  createToolOutputPostProcessor,
  generateChatTitle,
  mergeRuntimeConfig,
  type AgentContext,
  type ModelFactory,
  type PresetProvider,
  wrapToolsWithHooks,
  wrapToolsWithOutputTruncation,
  wrapToolsWithStreaming,
} from '@moryflow/agents-runtime';
import {
  createPcBashFirstToolset,
  createSubagentTool,
  type SubAgentToolsConfig,
} from '@moryflow/agents-tools';
import { createSandboxBashTool } from '@moryflow/agents-sandbox';
import { providerRegistry, toApiModelId } from '@moryflow/model-bank/registry';

import { requestPathAuthorization, getSandboxManager } from '../../sandbox/index.js';
import { getAgentSettings } from '../../agent-settings/index.js';
import { membershipBridge } from '../../membership-bridge.js';
import { getSkillsRegistry } from '../../skills/index.js';
import { isChatDebugEnabled, logChatDebug } from '../../chat-debug-log.js';
import { createDesktopCapabilities, createDesktopCrypto } from '../desktop-adapter.js';
import { createMcpManager } from '../core/mcp-manager.js';
import { setupAgentTracing } from '../tracing-setup.js';
import { createDesktopToolOutputStorage } from '../tool-output-storage.js';
import { initPermissionRuntime } from '../permissions/permission-runtime.js';
import { initDoomLoopRuntime } from '../doom-loop-runtime.js';
import { findAgentById, loadAgentDefinitionsSync } from '../agent-store.js';
import { loadExternalTools } from '../external-tools.js';
import { getRuntimeConfigSync } from '../runtime-config.js';
import { createRuntimeTaskStateService } from '../task-state-runtime.js';
import { createSkillTool } from '../skill-tool.js';
import { resolveModelSettings, resolveSystemPrompt } from '../prompt-resolution.js';
import { createDesktopBashAuditWriter } from '../bash-audit.js';
import { buildDelegatedSubagentTools } from '../subagent-tools.js';
import { createKnowledgeTools } from '../memory/knowledge-tools.js';
import { MEMORY_TOOL_INSTRUCTIONS } from '../memory/memory-prompt.js';
import { createMemoryTools } from '../memory/memory-tools.js';
import { createCompactionCoordinator } from './compaction.js';
import { createMemoryBlockCache } from './memory-block-cache.js';
import { wireRuntimeListeners } from './runtime-listeners.js';
import {
  summarizeProviderOptionsForThinkingDebug,
  summarizeThinkingProfile,
} from './thinking-debug.js';
import type { AgentRuntime } from './types.js';
import { createRuntimeVaultResolver, createWorkspaceScopedToolDeps } from './workspace-context.js';

setupAgentTracing();

const MAX_AGENT_TURNS = 100;
const DEFAULT_TOOL_BUDGET_WARN_THRESHOLD = 24;
const PC_BASH_FIRST_SUBAGENT_INSTRUCTIONS = `You are a subagent executor with the same full tool capabilities as the desktop runtime (including bash, web, task, skill, and other injected tools).
Break down the task goal into steps autonomously and select the most appropriate tools — do not rely on fixed role templates.
On completion, output structured results including: conclusion, key evidence, risks, and next-step recommendations.`;

export const createAgentRuntime = (): AgentRuntime => {
  const runtimeConfig = getRuntimeConfigSync();
  const runtimeHooks = runtimeConfig.hooks;
  const agentDefinitions = loadAgentDefinitionsSync();
  const selectedAgent = findAgentById(agentDefinitions, runtimeConfig.agent?.id);
  if (runtimeConfig.agent?.id && !selectedAgent) {
    console.warn('[agent-runtime] agent not found', runtimeConfig.agent.id);
  }

  const capabilities = createDesktopCapabilities();
  const crypto = createDesktopCrypto();
  const { resolveRuntimeVaultRoot, createVaultUtils } = createRuntimeVaultResolver({
    capabilities,
  });
  const vaultUtils = createVaultUtils(crypto);
  const taskStateService = createRuntimeTaskStateService();
  const skillsRegistry = getSkillsRegistry();
  const skillTool = createSkillTool();
  const readAvailableSkillsPrompt = () => skillsRegistry.getAvailableSkillsPrompt();

  const toolOutputConfig = {
    ...DEFAULT_TOOL_OUTPUT_TRUNCATION,
    ...(runtimeConfig.truncation ?? {}),
  };
  const toolOutputStorage = createDesktopToolOutputStorage({
    capabilities,
    crypto,
    ttlDays: toolOutputConfig.ttlDays,
  });
  const toolBudgetWarnThreshold =
    runtimeConfig.tools?.budgetWarnThreshold ?? DEFAULT_TOOL_BUDGET_WARN_THRESHOLD;
  const bashAuditWriter = createDesktopBashAuditWriter({
    persistCommandPreview: runtimeConfig.tools?.bashAudit?.persistCommandPreview,
    previewMaxChars: runtimeConfig.tools?.bashAudit?.previewMaxChars,
  });

  const isWithinVault = (vaultRoot: string | undefined, targetPath: string): boolean => {
    if (!vaultRoot) return false;
    const relative = capabilities.path.relative(vaultRoot, targetPath);
    if (relative === '') return true;
    return !relative.startsWith('..') && !capabilities.path.isAbsolute(relative);
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
    capabilities,
    crypto,
    vaultUtils,
    taskStateService,
  });

  let resetMemoryBlockCache = () => {};
  const { memoryToolDeps, knowledgeToolDeps } = createWorkspaceScopedToolDeps({
    capabilities,
    onMemoryMutated: () => resetMemoryBlockCache(),
  });
  const memoryTools = createMemoryTools(memoryToolDeps);
  const knowledgeTools = createKnowledgeTools(knowledgeToolDeps);

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
    capabilities,
    getMcpServerIds: () => mcpManager.getStatus().servers.map((server) => server.id),
  });
  const doomLoopRuntime = initDoomLoopRuntime({
    uiAvailable: true,
    config: runtimeConfig.doomLoop,
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
          permissionRuntime.wrapTools(wrapToolsWithHooks(mcpManager.getTools(), runtimeHooks))
        ),
        toolOutputPostProcessor
      )
    );

  let toolsWithTruncation: Tool<AgentContext>[] = [];
  const subagentTools: SubAgentToolsConfig = () =>
    buildDelegatedSubagentTools(toolsWithTruncation, buildWrappedMcpTools());
  const subagentTool = createSubagentTool(subagentTools, PC_BASH_FIRST_SUBAGENT_INSTRUCTIONS);

  const buildMainTools = (extraTools: Tool<AgentContext>[] = []) => {
    const base = [
      ...baseTools,
      ...memoryTools,
      ...knowledgeTools,
      sandboxBashTool,
      subagentTool,
      skillTool,
      ...extraTools,
    ];

    if (base.length > toolBudgetWarnThreshold) {
      console.warn('[agent-runtime] tool budget exceeded', {
        count: base.length,
        threshold: toolBudgetWarnThreshold,
        names: base.map((tool) => tool.name),
      });
    }

    return wrapToolsWithStreaming(
      wrapToolsWithOutputTruncation(
        doomLoopRuntime.wrapTools(
          permissionRuntime.wrapTools(wrapToolsWithHooks(base, runtimeHooks))
        ),
        toolOutputPostProcessor
      )
    );
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

  const createRuntimeAgentFactory = () =>
    createAgentFactory({
      getModelFactory: () => modelFactory,
      baseTools: toolsWithTruncation,
      getMcpTools: buildWrappedMcpTools,
      getInstructions: () => {
        const memoryBlock = [memoryBlockCache.getMemoryBlock(), MEMORY_TOOL_INSTRUCTIONS]
          .filter(Boolean)
          .join('\n\n');
        return resolveSystemPrompt({
          settings: getAgentSettings(),
          basePrompt: selectedAgent?.systemPrompt ?? undefined,
          hook: runtimeHooks?.chat?.system,
          memoryBlock: memoryBlock || undefined,
          availableSkillsBlock: readAvailableSkillsPrompt(),
        });
      },
      getModelSettings: () => resolveModelSettings(selectedAgent, runtimeHooks?.chat?.params),
    });

  let agentFactory = {} as ReturnType<typeof createAgentFactory>;
  const memoryBlockCache = createMemoryBlockCache({
    memoryToolDeps,
    invalidateAgentFactory: () => agentFactory.invalidate(),
  });
  resetMemoryBlockCache = memoryBlockCache.reset;

  toolsWithTruncation = buildMainTools();
  agentFactory = createRuntimeAgentFactory();

  const ensureExternalTools = (() => {
    let externalToolsLoaded = false;
    let externalToolsLoading: Promise<void> | null = null;

    const reloadExternalTools = async () => {
      if (!runtimeConfig.tools?.external?.enabled) return;
      try {
        const externalTools = await loadExternalTools({ capabilities, crypto, vaultUtils });
        if (externalTools.length === 0) {
          return;
        }
        toolsWithTruncation = buildMainTools(externalTools);
        agentFactory = createRuntimeAgentFactory();
        agentFactory.invalidate();
      } catch (error) {
        console.warn('[agent-runtime] failed to load external tools', error);
      }
    };

    return async () => {
      if (!runtimeConfig.tools?.external?.enabled || externalToolsLoaded) {
        return;
      }
      if (!externalToolsLoading) {
        externalToolsLoading = reloadExternalTools().finally(() => {
          externalToolsLoaded = true;
        });
      }
      await externalToolsLoading;
    };
  })();

  const compactionCoordinator = createCompactionCoordinator({
    runtimeConfig,
    getSettings: getAgentSettings,
    getModelFactory: () => modelFactory,
    getAgentModelId: (preferredModelId?: string) => agentFactory.getAgent(preferredModelId).modelId,
  });

  let lastSkillsPromptSnapshot = '';

  void ensureExternalTools();
  void memoryBlockCache.refreshMemoryBlock().catch(() => {});

  wireRuntimeListeners({
    mcpManager,
    initialSettings,
    runtimeProviderRegistry,
    toApiModelId,
    updateModelFactory: (nextFactory) => {
      modelFactory = nextFactory;
    },
    invalidateAgentFactory: () => agentFactory.invalidate(),
    refreshSkills: () => skillsRegistry.refresh(),
    logSkillsRefreshError: (error) => {
      console.warn('[agent-runtime] failed to load skills', error);
    },
  });

  return {
    async prepareCompaction({ chatId, preferredModelId, session }) {
      const { compaction, modelId } = await compactionCoordinator.applyCompactionIfNeeded({
        chatId,
        preferredModelId,
        session,
      });
      compactionCoordinator.markPrepared(chatId, modelId);
      return compaction;
    },
    async runChatTurn({
      chatId,
      input,
      preferredModelId,
      thinking,
      thinkingProfile,
      context,
      mode,
      approvalMode,
      selectedSkillName,
      session,
      attachments,
      images,
      signal,
      runtimeConfigOverride,
      toolStreamBridge,
    }) {
      const trimmed = input.trim();
      if (!trimmed && (!images || images.length === 0)) {
        throw new Error('Message must contain text or images');
      }

      const effectiveRuntimeConfig = mergeRuntimeConfig(runtimeConfig, runtimeConfigOverride);
      const vaultRoot = await resolveRuntimeVaultRoot(chatId);
      await skillsRegistry.ensureReady();
      void mcpManager.ensureReady();
      await ensureExternalTools();
      await memoryBlockCache.refreshMemoryBlock(chatId).catch(() => {});

      const currentSkillsPromptSnapshot = readAvailableSkillsPrompt();
      if (currentSkillsPromptSnapshot !== lastSkillsPromptSnapshot) {
        lastSkillsPromptSnapshot = currentSkillsPromptSnapshot;
        agentFactory.invalidate();
      }

      if (isChatDebugEnabled()) {
        logChatDebug('agent-runtime.run.request', {
          chatId,
          preferredModelId,
          selectedSkillName: selectedSkillName ?? null,
          mode: mode ?? effectiveRuntimeConfig.mode?.global ?? 'ask',
          approvalMode: approvalMode ?? 'interactive',
          inputLength: trimmed.length,
          attachmentCount: attachments?.length ?? 0,
          thinking,
          thinkingProfile: summarizeThinkingProfile(thinkingProfile),
        });
      }

      const { agent, modelId } = agentFactory.getAgent(preferredModelId, {
        thinking,
        thinkingProfile,
      });
      const builtModel = modelFactory.buildModel(modelId, {
        thinking,
        thinkingProfile,
      });
      const thinkingResolution = {
        requested: thinking,
        resolvedLevel: builtModel.resolvedThinkingLevel ?? 'off',
        downgradedToOff: builtModel.thinkingDowngradedToOff ?? false,
        downgradeReason: builtModel.thinkingDowngradeReason,
      };

      if (isChatDebugEnabled()) {
        const providerEntry = modelFactory.providers.find((provider) =>
          provider.modelIds.has(modelId)
        );
        logChatDebug('agent-runtime.model.resolved', {
          chatId,
          preferredModelId,
          resolvedModelId: modelId,
          providerId: providerEntry?.id ?? 'membership',
          providerName: providerEntry?.name ?? 'membership',
          sdkType: providerEntry?.sdkType ?? 'openai-compatible',
          isCustomProvider: providerEntry?.isCustom ?? false,
          resolvedThinkingLevel: builtModel.resolvedThinkingLevel ?? 'off',
          thinkingDowngradedToOff: builtModel.thinkingDowngradedToOff ?? false,
          thinkingDowngradeReason: builtModel.thinkingDowngradeReason ?? null,
          providerOptions: summarizeProviderOptionsForThinkingDebug(builtModel.providerOptions),
        });
      }

      const effectiveHistory = compactionCoordinator.consumePrepared(chatId, modelId)
        ? await session.getItems()
        : (
            await compactionCoordinator.applyCompactionIfNeeded({
              chatId,
              preferredModelId,
              session,
              modelId,
            })
          ).effectiveHistory;

      const effectiveMode = mode ?? effectiveRuntimeConfig.mode?.global ?? 'ask';
      const agentContext: AgentContext = {
        mode: effectiveMode,
        approvalMode: approvalMode ?? 'interactive',
        vaultRoot,
        chatId,
        permissionRulesOverride: effectiveRuntimeConfig.permission?.rules,
        toolPolicyOverride: effectiveRuntimeConfig.permission?.toolPolicy,
        buildModel: (nextModelId) =>
          modelFactory.buildModel(nextModelId, {
            thinking,
            thinkingProfile,
          }),
        createToolStreamHandle: toolStreamBridge
          ? ({ toolCallId, toolName }) => ({
              toolCallId,
              toolName,
              emit: (toolEvent) => {
                toolStreamBridge.emit?.({
                  ...toolEvent,
                  toolCallId,
                  toolName,
                });
              },
            })
          : undefined,
      };

      const composedInput = applyContextToInput(trimmed, context, attachments);
      const selectedSkillBlock =
        selectedSkillName && selectedSkillName.trim().length > 0
          ? await skillsRegistry.resolveSelectedSkillInjection(selectedSkillName)
          : null;
      const finalComposedInput = selectedSkillBlock
        ? `${selectedSkillBlock}\n\n=== User input ===\n${composedInput}`
        : composedInput;
      const userItem = user(buildUserContent(finalComposedInput, images));
      const runInput = effectiveHistory.length > 0 ? [...effectiveHistory, userItem] : [userItem];
      await session.addItems([userItem]);

      const result = await run(agent, runInput, {
        stream: true,
        maxTurns: MAX_AGENT_TURNS,
        signal,
        context: agentContext,
      });

      if (isChatDebugEnabled()) {
        logChatDebug('agent-runtime.run.started', {
          chatId,
          modelId,
          toolCount: agent.tools.length,
          historyItems: effectiveHistory.length,
        });
      }

      void result.completed
        .then(async () => {
          if (result.output.length > 0) {
            await session.addItems(result.output);
          }
        })
        .catch((error) => {
          console.warn('[agent-runtime] failed to persist session output', error);
        });

      return {
        result,
        agent,
        toolNames: agent.tools.map((tool) => tool.name),
        thinkingResolution,
      };
    },
    async generateTitle(userMessage: string, preferredModelId?: string) {
      const { model } = modelFactory.buildRawModel(preferredModelId);
      return generateChatTitle(model, userMessage);
    },
    getMcpStatus: () => mcpManager.getStatus(),
    onMcpStatusChange: (listener) => mcpManager.addStatusListener(listener),
    testMcpServer: (input) => mcpManager.testServer(input),
    reloadMcp: () => mcpManager.scheduleReload(getAgentSettings().mcp),
  };
};
