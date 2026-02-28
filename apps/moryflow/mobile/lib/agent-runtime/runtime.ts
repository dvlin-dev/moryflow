/**
 * [INPUT]: Mobile 端聊天输入/上下文/会话/中断信号
 * [OUTPUT]: Agent 运行结果流、会话历史更新与工具列表
 * [POS]: Mobile 端 Agent Runtime 主入口（与 PC runtime 对齐，含 Compaction 预处理/Permission/Truncation/Doom Loop/模式注入 + Hook/Agent 配置 + runtime config 兜底）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { UIMessage } from 'ai';
import {
  run,
  setTracingDisabled,
  user,
  type AgentInputItem,
  type ModelSettings,
} from '@openai/agents-core';
import {
  DEFAULT_TOOL_OUTPUT_TRUNCATION,
  DEFAULT_COMPACTION_CONFIG,
  applyChatParamsHook,
  applyChatSystemHook,
  applyContextToInput,
  compactHistory,
  createCompactionPreflightGate,
  createAgentFactory,
  bindDefaultModelProvider,
  createModelFactory,
  createSessionAdapter,
  createToolOutputPostProcessor,
  createVaultUtils,
  extractMembershipModelId,
  getMorySystemPrompt,
  resolveContextWindow,
  generateChatTitle,
  generateCompactionSummary,
  isMembershipModelId,
  wrapToolsWithHooks,
  wrapToolsWithOutputTruncation,
  type AgentFactory,
  type AgentContext,
  type ModelFactory,
  type CompactionResult,
  type AgentSettings,
  type AgentRuntimeConfig,
  type RuntimeHooksConfig,
  type AgentMarkdownDefinition,
  type PresetProvider,
} from '@moryflow/agents-runtime';
import { createMobileTools } from '@moryflow/agents-tools';
import { getModelById, providerRegistry, toApiModelId } from '@moryflow/model-bank/registry';

import { createMobileCapabilities, createMobileCrypto } from './mobile-adapter';
import { mobileFetch, createLogger } from './adapters';
import { mobileSessionStore, agentHistoryToUiMessages } from './session-store';
import { loadSettings, onSettingsChange, getSettings } from './settings-store';
import { getMembershipConfig } from './membership-bridge';
import { initVaultManager } from '../vault';
import { createMobileToolOutputStorage } from './tool-output-storage';
import { initPermissionRuntime } from './permission-runtime';
import { initDoomLoopRuntime } from './doom-loop-runtime';
import { getRuntimeConfig } from './runtime-config';
import { findAgentById, loadAgentDefinitions } from './agent-store';
import { getSharedTasksStore } from './tasks-service';

import type { MobileAgentRuntime, MobileAgentRuntimeOptions, MobileChatTurnResult } from './types';
import { MAX_AGENT_TURNS } from './types';

const logger = createLogger('[Runtime]');
const runtimeProviderRegistry: Record<string, PresetProvider> = providerRegistry;

// 禁用 tracing（Mobile 端的 AsyncLocalStorage 是简化实现）
setTracingDisabled(true);

const resolveCompactionContextWindow = (
  modelId: string,
  settings: AgentSettings
): number | undefined => {
  if (!modelId) return undefined;
  const isMembership = isMembershipModelId(modelId);
  const normalized = isMembership ? extractMembershipModelId(modelId) : modelId;
  return resolveContextWindow({
    modelId: normalized,
    providers: isMembership ? [] : settings.providers,
    getDefaultContext: (id) => getModelById(id)?.limits?.context,
  });
};

const resolveRuntimeSystemPrompt = (): string => {
  const base = selectedAgent?.systemPrompt ?? getMorySystemPrompt();
  return applyChatSystemHook(base, runtimeHooks?.chat?.system);
};

const resolveRuntimeModelSettings = (): ModelSettings | undefined => {
  const base = selectedAgent?.modelSettings as ModelSettings | undefined;
  return applyChatParamsHook(base, runtimeHooks?.chat?.params);
};

// ============ 内部状态 ============

let runtime: MobileAgentRuntime | null = null;
let agentFactory: AgentFactory | null = null;
let modelFactory: ModelFactory | null = null;
let vaultRoot: string | null = null;
let toolNames: string[] = [];
let runtimeConfig: AgentRuntimeConfig = {};
let runtimeHooks: RuntimeHooksConfig | undefined;
let selectedAgent: AgentMarkdownDefinition | null = null;

const COMPACTION_PREPARE_TTL_MS = 60_000;
const compactionPreflightGate = createCompactionPreflightGate({
  ttlMs: COMPACTION_PREPARE_TTL_MS,
});

const applyCompactionIfNeeded = async (input: {
  chatId: string;
  session: ReturnType<typeof createSessionAdapter>;
  preferredModelId?: string;
  modelId?: string;
}): Promise<{
  compaction: CompactionResult;
  effectiveHistory: AgentInputItem[];
  modelId: string;
}> => {
  if (!agentFactory || !modelFactory) {
    throw new Error('Agent Runtime 未初始化');
  }
  const activeModelFactory = modelFactory;
  const { chatId, session, preferredModelId, modelId } = input;
  const resolvedModelId = modelId ?? agentFactory.getAgent(preferredModelId).modelId;
  const history = await session.getItems();
  const settings = getSettings();
  const contextWindow =
    runtimeConfig.compaction?.contextWindow ??
    resolveCompactionContextWindow(resolvedModelId, settings);
  const compaction = await compactHistory({
    history,
    config: {
      ...DEFAULT_COMPACTION_CONFIG,
      ...(runtimeConfig.compaction ?? {}),
      contextWindow,
    },
    summaryBuilder: async (items) => {
      const { model } = activeModelFactory.buildRawModel(resolvedModelId);
      return generateCompactionSummary(model, items);
    },
  });

  if (compaction.triggered) {
    logger.info('会话压缩完成', {
      chatId,
      summaryApplied: compaction.summaryApplied,
      beforeTokens: compaction.stats.beforeTokens,
      afterTokens: compaction.stats.afterTokens,
      summaryTokens: compaction.stats.summaryTokens,
      droppedToolTypes: compaction.stats.droppedToolTypes,
    });
  }

  if (compaction.triggered && compaction.historyChanged) {
    await session.clearSession();
    if (compaction.history.length > 0) {
      await session.addItems(compaction.history);
    }
  }

  return {
    compaction,
    effectiveHistory: compaction.triggered ? compaction.history : history,
    modelId: resolvedModelId,
  };
};

// ============ 初始化 ============

/**
 * 初始化 Mobile Agent Runtime
 */
export async function initAgentRuntime(): Promise<MobileAgentRuntime> {
  if (runtime) {
    return runtime;
  }

  const settings = await loadSettings();
  runtimeConfig = await getRuntimeConfig();
  runtimeHooks = runtimeConfig.hooks;
  const agentDefinitions = await loadAgentDefinitions();
  selectedAgent = findAgentById(agentDefinitions, runtimeConfig.agent?.id);
  if (runtimeConfig.agent?.id && !selectedAgent) {
    logger.warn('Agent not found:', runtimeConfig.agent.id);
  }
  const capabilities = createMobileCapabilities();
  const crypto = createMobileCrypto();

  // 使用 VaultManager 初始化，确保 UI 层和 Agent Runtime 使用同一个 Vault
  const vault = await initVaultManager();
  vaultRoot = vault.path;

  const vaultUtils = createVaultUtils(capabilities, crypto, async () => {
    if (!vaultRoot) throw new Error('Vault 未初始化');
    return vaultRoot;
  });

  const tasksStore = getSharedTasksStore();
  const toolOutputConfig = {
    ...DEFAULT_TOOL_OUTPUT_TRUNCATION,
    ...(runtimeConfig.truncation ?? {}),
  };
  const toolOutputStorage = createMobileToolOutputStorage({
    crypto,
    ttlDays: toolOutputConfig.ttlDays,
  });

  const toolOutputPostProcessor = createToolOutputPostProcessor({
    config: toolOutputConfig,
    storage: toolOutputStorage,
    buildHint: ({ fullPath }) => {
      if (!fullPath) {
        return 'Full output could not be saved. Please retry the command if needed.';
      }
      return `Full output saved at ${fullPath}. Open it in the app to view the full content.`;
    },
  });

  const permissionRuntime = initPermissionRuntime({ capabilities });
  const doomLoopRuntime = initDoomLoopRuntime({
    uiAvailable: true,
    config: runtimeConfig.doomLoop,
    shouldSkip: ({ callId }) => {
      if (!callId) return false;
      const decision = permissionRuntime.getDecision(callId);
      return decision?.decision === 'deny';
    },
  });
  const baseTools = wrapToolsWithOutputTruncation(
    doomLoopRuntime.wrapTools(
      permissionRuntime.wrapTools(
        wrapToolsWithHooks(
          createMobileTools({ capabilities, crypto, vaultUtils, tasksStore }),
          runtimeHooks
        )
      )
    ),
    toolOutputPostProcessor
  );
  toolNames = baseTools.map((tool) => tool.name);
  if (__DEV__) {
    logger.debug('加载的工具:', toolNames);
  }

  modelFactory = createModelFactory({
    settings,
    providerRegistry: runtimeProviderRegistry,
    toApiModelId,
    membership: getMembershipConfig,
    customFetch: mobileFetch,
  });
  bindDefaultModelProvider(() => {
    if (!modelFactory) {
      throw new Error('Model factory is not initialized');
    }
    return modelFactory;
  });

  agentFactory = createAgentFactory({
    getModelFactory: () => modelFactory!,
    baseTools,
    getMcpTools: () => [], // 移动端暂不支持 MCP
    getInstructions: resolveRuntimeSystemPrompt,
    getModelSettings: resolveRuntimeModelSettings,
  });

  onSettingsChange((next: AgentSettings) => {
    try {
      modelFactory = createModelFactory({
        settings: next,
        providerRegistry: runtimeProviderRegistry,
        toApiModelId,
        membership: getMembershipConfig,
        customFetch: mobileFetch,
      });
      agentFactory?.invalidate();
    } catch (error) {
      console.error('[MobileAgentRuntime] Failed to reload model factory:', error);
    }
  });

  runtime = createRuntimeInstance();
  return runtime;
}

/**
 * 创建 Runtime 实例
 */
function createRuntimeInstance(): MobileAgentRuntime {
  return {
    async prepareCompaction({ chatId, preferredModelId, session }) {
      const { compaction, modelId } = await applyCompactionIfNeeded({
        chatId,
        session,
        preferredModelId,
      });
      compactionPreflightGate.markPrepared(chatId, modelId);
      return compaction;
    },
    async runChatTurn(options: MobileAgentRuntimeOptions): Promise<MobileChatTurnResult> {
      const { chatId, input, preferredModelId, context, session, attachments, signal, mode } =
        options;

      const trimmed = input.trim();
      if (!trimmed) throw new Error('输入不能为空');
      if (!vaultRoot) throw new Error('Vault 未初始化');
      if (!agentFactory) throw new Error('Agent Runtime 未初始化');

      const { agent, modelId } = agentFactory.getAgent(preferredModelId);
      if (__DEV__) {
        logger.debug(
          'runChatTurn agent.tools:',
          agent.tools.map((t) => t.name)
        );
      }

      const effectiveHistory = compactionPreflightGate.consumePrepared(chatId, modelId)
        ? await session.getItems()
        : (
            await applyCompactionIfNeeded({
              chatId,
              session,
              preferredModelId,
              modelId,
            })
          ).effectiveHistory;

      const inputWithContext = applyContextToInput(trimmed, context, attachments);
      const effectiveMode = mode ?? runtimeConfig.mode?.default ?? 'agent';
      const agentContext: AgentContext = {
        mode: effectiveMode,
        vaultRoot,
        chatId,
        buildModel: modelFactory?.buildModel,
      };

      // 使用 expo/fetch 支持流式响应
      const userItem = user(inputWithContext);
      const runInput = effectiveHistory.length > 0 ? [...effectiveHistory, userItem] : [userItem];
      await session.addItems([userItem]);

      const result = await run(agent, runInput, {
        stream: true,
        maxTurns: MAX_AGENT_TURNS,
        signal,
        context: agentContext,
      });

      void result.completed
        .then(async () => {
          const outputItems = result.output;
          if (outputItems.length > 0) {
            await session.addItems(outputItems);
          }
        })
        .catch((error) => {
          console.warn('[mobile-agent-runtime] 会话输出持久化失败', error);
        });

      return {
        result,
        agent,
        toolNames: agent.tools.map((tool) => tool.name),
      };
    },

    async getVaultRoot(): Promise<string> {
      if (!vaultRoot) {
        const vault = await initVaultManager();
        vaultRoot = vault.path;
      }
      return vaultRoot;
    },

    isInitialized(): boolean {
      return runtime !== null;
    },

    getToolNames(): string[] {
      return toolNames;
    },
  };
}

// ============ 公共 API ============

/**
 * 获取 Agent Runtime 实例（懒加载）
 */
export async function getAgentRuntime(): Promise<MobileAgentRuntime> {
  if (!runtime) {
    return initAgentRuntime();
  }
  return runtime;
}

/**
 * 检查 Runtime 是否已初始化
 */
export function isRuntimeInitialized(): boolean {
  return runtime !== null;
}

/**
 * 运行一次聊天对话（便捷方法）
 */
export async function runChatTurn(params: {
  chatId: string;
  input: string;
  preferredModelId?: string;
  context?: import('@moryflow/agents-runtime').AgentChatContext;
  attachments?: import('@moryflow/agents-runtime').AgentAttachmentContext[];
  mode?: import('@moryflow/agents-runtime').AgentAccessMode;
  signal?: AbortSignal;
}): Promise<MobileChatTurnResult> {
  const rt = await getAgentRuntime();
  const session = createSessionAdapter(params.chatId, mobileSessionStore);
  return rt.runChatTurn({ ...params, session });
}

/**
 * 发送前预处理会话压缩
 */
export async function prepareCompaction(params: {
  chatId: string;
  preferredModelId?: string;
}): Promise<{ changed: boolean; messages?: UIMessage[] }> {
  const rt = await getAgentRuntime();
  const session = createSessionAdapter(params.chatId, mobileSessionStore);
  const compaction = await rt.prepareCompaction({
    chatId: params.chatId,
    preferredModelId: params.preferredModelId,
    session,
  });
  if (!compaction.historyChanged) {
    return { changed: false };
  }
  // 从压缩后的历史重新生成 UI 消息，确保 UI 与 agent 历史一致
  const uiMessages = agentHistoryToUiMessages(params.chatId, compaction.history);
  await mobileSessionStore.saveUiMessages(params.chatId, uiMessages);
  return { changed: true, messages: uiMessages };
}

/**
 * 创建新的聊天会话
 */
export async function createChatSession(title?: string) {
  const config = await getRuntimeConfig();
  runtimeConfig = config;
  return mobileSessionStore.createSession(title, config.mode?.default);
}

/**
 * 获取 Vault 根目录
 */
export async function getVaultRoot(): Promise<string> {
  if (vaultRoot) return vaultRoot;
  const rt = await getAgentRuntime();
  return rt.getVaultRoot();
}

/**
 * 使用 AI 生成并更新会话标题
 *
 * @param sessionId - 会话 ID
 * @param userMessage - 用户发送的第一条消息
 * @param preferredModelId - 首选模型 ID（可选，默认使用当前选中模型）
 */
export async function generateSessionTitle(
  sessionId: string,
  userMessage: string,
  preferredModelId?: string
): Promise<void> {
  if (!modelFactory) {
    console.warn('[Runtime] modelFactory not initialized, skip title generation');
    return;
  }

  try {
    const { model } = modelFactory.buildRawModel(preferredModelId);
    const title = await generateChatTitle(model, userMessage);
    await mobileSessionStore.updateSession(sessionId, { title });
  } catch (error) {
    // 静默失败，保持默认标题
    console.error('[Runtime] Failed to generate session title:', error);
  }
}
