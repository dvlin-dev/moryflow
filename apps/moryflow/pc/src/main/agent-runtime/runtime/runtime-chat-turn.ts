/**
 * [PROVIDES]: createRuntimeChatTurnRunner - 单次聊天 turn 执行器
 * [DEPENDS]: agents-core run, runtime factory deps, memory runtime support
 * [POS]: PC Agent Runtime 对话执行子模块
 */

import { run, user, type Agent, type AgentInputItem } from '@openai/agents-core';
import {
  applyContextToInput,
  buildUserContent,
  mergeRuntimeConfig,
  type AgentContext,
  type AgentRuntimeConfig,
  type ModelFactory,
} from '@moryflow/agents-runtime';
import { isChatDebugEnabled, logChatDebug } from '../../chat-debug-log.js';
import type { MemoryToolCapability } from '../memory/memory-capability.js';
import type { MemoryRuntimeSupport } from '../memory/memory-runtime-support.js';
import {
  summarizeProviderOptionsForThinkingDebug,
  summarizeThinkingProfile,
} from './runtime-model-utils.js';
import type { AgentRuntimeOptions, ChatTurnResult } from './runtime-types.js';

type AgentFactoryLike = {
  getAgent: (
    preferredModelId?: string,
    overrides?: {
      thinking?: AgentRuntimeOptions['thinking'];
      thinkingProfile?: AgentRuntimeOptions['thinkingProfile'];
    }
  ) => {
    agent: Agent<AgentContext>;
    modelId: string;
  };
  invalidate: () => void;
};

type RuntimeSkillsRegistryLike = {
  ensureReady: () => Promise<void>;
  getAvailableSkillsPrompt: () => string;
  resolveSelectedSkillInjection: (skillName: string) => Promise<string | null>;
};

type CreateRuntimeChatTurnRunnerInput = {
  runtimeConfig: AgentRuntimeConfig;
  resolveRuntimeVaultRoot: (chatId?: string) => Promise<string>;
  skillsRegistry: RuntimeSkillsRegistryLike;
  ensureExternalTools: () => Promise<void>;
  memoryRuntime: MemoryRuntimeSupport;
  getAgentFactory: () => AgentFactoryLike;
  getModelFactory: () => ModelFactory;
  getEffectiveHistory: (input: {
    chatId: string;
    preferredModelId?: string;
    modelId: string;
    session: AgentRuntimeOptions['session'];
  }) => Promise<AgentInputItem[]>;
  maxAgentTurns: number;
};

const unavailableCapability: MemoryToolCapability = {
  state: 'profile_unavailable',
  canRead: false,
  canWrite: false,
  canReadKnowledgeFile: false,
  workspaceId: null,
  vaultPath: null,
  profileKey: null,
};

export const createRuntimeChatTurnRunner = (
  input: CreateRuntimeChatTurnRunnerInput
): ((options: AgentRuntimeOptions) => Promise<ChatTurnResult>) => {
  let lastSkillsPromptSnapshot = '';

  return async ({
    chatId,
    input: rawInput,
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
    toolStreamBridge,
    runtimeConfigOverride,
  }) => {
    const trimmed = rawInput.trim();
    if (!trimmed && (!images || images.length === 0)) {
      throw new Error('Message must contain text or images');
    }

    const effectiveRuntimeConfig = mergeRuntimeConfig(input.runtimeConfig, runtimeConfigOverride);
    const vaultRoot = await input.resolveRuntimeVaultRoot(chatId);
    await input.skillsRegistry.ensureReady();
    await input.ensureExternalTools();

    const memoryCapability = await input.memoryRuntime
      .refreshTooling(chatId)
      .catch(() => unavailableCapability);
    await input.memoryRuntime.refreshPromptBlock(memoryCapability).catch(() => {});

    const currentSkillsPromptSnapshot = input.skillsRegistry.getAvailableSkillsPrompt();
    if (currentSkillsPromptSnapshot !== lastSkillsPromptSnapshot) {
      lastSkillsPromptSnapshot = currentSkillsPromptSnapshot;
      input.getAgentFactory().invalidate();
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

    const agentFactory = input.getAgentFactory();
    const { agent, modelId } = agentFactory.getAgent(preferredModelId, {
      thinking,
      thinkingProfile,
    });
    const modelFactory = input.getModelFactory();
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

    const effectiveHistory = await input.getEffectiveHistory({
      chatId,
      preferredModelId,
      modelId,
      session,
    });

    const inputWithContext = applyContextToInput(trimmed, context, attachments);
    const selectedSkillBlock =
      selectedSkillName && selectedSkillName.trim().length > 0
        ? await input.skillsRegistry.resolveSelectedSkillInjection(selectedSkillName)
        : null;
    const finalInput = selectedSkillBlock
      ? `${selectedSkillBlock}\n\n=== 用户输入 ===\n${inputWithContext}`
      : inputWithContext;

    const effectiveMode = mode ?? effectiveRuntimeConfig.mode?.global ?? 'ask';
    const agentContext: AgentContext = {
      mode: effectiveMode,
      approvalMode: approvalMode ?? 'interactive',
      vaultRoot,
      chatId,
      permissionRulesOverride: effectiveRuntimeConfig.permission?.rules,
      toolPolicyOverride: effectiveRuntimeConfig.permission?.toolPolicy,
      buildModel: (requestedModelId) =>
        modelFactory.buildModel(requestedModelId, {
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

    const userContent = buildUserContent(finalInput, images);
    const userItem = user(userContent);
    const runInput = effectiveHistory.length > 0 ? [...effectiveHistory, userItem] : [userItem];
    await session.addItems([userItem]);

    const result = await run(agent, runInput, {
      stream: true,
      maxTurns: input.maxAgentTurns,
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
        const outputItems = result.output;
        if (outputItems.length > 0) {
          await session.addItems(outputItems);
        }
      })
      .catch((error) => {
        console.warn('[agent-runtime] 会话输出持久化失败', error);
      });

    return {
      result,
      agent,
      toolNames: agent.tools.map((tool) => tool.name),
      thinkingResolution,
    };
  };
};
