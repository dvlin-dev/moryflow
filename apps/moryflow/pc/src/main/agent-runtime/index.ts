/**
 * [PROVIDES]: createAgentRuntime - PC 端 Agent 运行时工厂（含 prompt/params 注入、输出截断、Doom Loop、会话压缩与预处理、模式注入）
 * [DEPENDS]: agents, agents-runtime, agents-runtime/prompt, agents-tools - Agent 框架核心
 * [POS]: PC 主进程核心模块，提供 AI 对话执行、MCP 服务器管理、标题生成
 * [NOTE]: 会话历史由 SessionStore 组装输入，流完成后追加输出
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */
import {
  run,
  user,
  type Agent,
  type ModelSettings,
  type AgentInputItem,
  type RunState,
} from '@openai/agents-core';
import type { RunStreamEvent } from '@openai/agents-core';
import {
  DEFAULT_TOOL_OUTPUT_TRUNCATION,
  DEFAULT_COMPACTION_CONFIG,
  applyContextToInput,
  compactHistory,
  createCompactionPreflightGate,
  createAgentFactory,
  createModelFactory,
  resolveContextWindow,
  generateCompactionSummary,
  createToolOutputPostProcessor,
  createVaultUtils,
  generateChatTitle,
  extractMembershipModelId,
  isMembershipModelId,
  wrapToolsWithOutputTruncation,
  type AgentContext,
  type AgentAccessMode,
  type AgentAttachmentContext,
  type ModelFactory,
  type CompactionResult,
  type Session,
} from '@anyhunt/agents-runtime';
import { getMorySystemPrompt } from '@anyhunt/agents-runtime/prompt';
import { createBaseTools } from '@anyhunt/agents-tools';
import { createSandboxBashTool } from '@anyhunt/agents-sandbox';

import type {
  AgentSettings,
  AgentChatContext,
  McpStatusSnapshot,
  McpStatusEvent,
  McpTestInput,
  McpTestResult,
} from '../../shared/ipc.js';
import { requestPathAuthorization, getSandboxManager } from '../sandbox/index.js';
import { getAgentSettings, onAgentSettingsChange } from '../agent-settings/index.js';
import { getStoredVault } from '../vault.js';
import { getModelById, providerRegistry, toApiModelId } from '../../shared/model-registry/index.js';
import { createDesktopCapabilities, createDesktopCrypto } from './desktop-adapter.js';
import { createMcpManager } from './core/mcp-manager.js';
import { membershipBridge } from '../membership-bridge.js';
import { setupAgentTracing } from './tracing-setup.js';
import { createDesktopToolOutputStorage } from './tool-output-storage.js';
import { initPermissionRuntime } from './permission-runtime.js';
import { initDoomLoopRuntime } from './doom-loop-runtime.js';

export { createChatSession } from './core/chat-session.js';
export type { AgentAttachmentContext, AgentContext };

// 初始化 Agent 日志收集
setupAgentTracing();

const MAX_AGENT_TURNS = 100;

export type AgentRuntimeOptions = {
  /**
   * 当前对话 ID，由 renderer 侧 Chat Transport 传入。
   */
  chatId: string;
  /**
   * 主动传入的文本输入（通常来自用户消息）。
   */
  input: string;
  /**
   * 指定首选模型，未传则使用默认配置。
   */
  preferredModelId?: string;
  /**
   * 结构化上下文信息（当前文件、摘要等）。
   */
  context?: AgentChatContext;
  /**
   * 会话级访问模式。
   */
  mode?: AgentAccessMode;
  /**
   * SDK Session 实例，用于管理多轮对话历史。
   */
  session: Session;
  /**
   * 需要注入的附件上下文。
   */
  attachments?: AgentAttachmentContext[];
  /**
   * 可选的中断信号，用于在主进程 stop 时终止当前回合。
   */
  signal?: AbortSignal;
};

/**
 * 流式运行结果的简化接口
 * SDK 的 StreamedRunResult 泛型约束有 variance 问题，这里只定义实际使用的属性
 */
export interface AgentStreamResult extends AsyncIterable<RunStreamEvent> {
  /** 等待流完成 */
  readonly completed: Promise<void>;
  /** 最终输出 */
  readonly finalOutput?: unknown;
  /** RunState（用于审批中断恢复） */
  readonly state: RunState<AgentContext, Agent<AgentContext>>;
  /** 本次 run 的输出 item */
  readonly output: AgentInputItem[];
}

/**
 * 聊天回合返回结果
 */
export type ChatTurnResult = {
  result: AgentStreamResult;
  agent: Agent<AgentContext>;
  toolNames: string[];
};

export type AgentRuntime = {
  /**
   * 执行单轮对话，返回流式结果。
   */
  runChatTurn(options: AgentRuntimeOptions): Promise<ChatTurnResult>;
  /**
   * 预处理会话压缩（用于发送前同步 UI 状态）。
   */
  prepareCompaction(options: {
    chatId: string;
    preferredModelId?: string;
    session: Session;
  }): Promise<CompactionResult>;
  /**
   * 使用 AI 生成对话标题
   */
  generateTitle(userMessage: string, preferredModelId?: string): Promise<string>;
  /**
   * 获取 MCP 服务器状态快照
   */
  getMcpStatus(): McpStatusSnapshot;
  /**
   * 添加 MCP 状态变更监听器
   */
  onMcpStatusChange(listener: (event: McpStatusEvent) => void): () => void;
  /**
   * 测试单个 MCP 服务器连接
   */
  testMcpServer(input: McpTestInput): Promise<McpTestResult>;
  /**
   * 手动重新加载 MCP 服务器
   */
  reloadMcp(): void;
};

const resolveSystemPrompt = (settings: AgentSettings): string => {
  if (
    settings.systemPrompt?.mode === 'custom' &&
    settings.systemPrompt.template.trim().length > 0
  ) {
    return settings.systemPrompt.template;
  }
  return getMorySystemPrompt();
};

const resolveModelSettings = (settings: AgentSettings): ModelSettings | undefined => {
  if (settings.systemPrompt?.mode !== 'custom') {
    return undefined;
  }
  const modelSettings: Partial<ModelSettings> = {};
  if (settings.modelParams.temperature.mode === 'custom') {
    modelSettings.temperature = settings.modelParams.temperature.value;
  }
  if (settings.modelParams.topP.mode === 'custom') {
    modelSettings.topP = settings.modelParams.topP.value;
  }
  if (settings.modelParams.maxTokens.mode === 'custom') {
    modelSettings.maxTokens = settings.modelParams.maxTokens.value;
  }
  return Object.keys(modelSettings).length > 0 ? (modelSettings as ModelSettings) : undefined;
};

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

export const createAgentRuntime = (): AgentRuntime => {
  // 创建平台能力和工具
  const capabilities = createDesktopCapabilities();
  const crypto = createDesktopCrypto();
  const vaultUtils = createVaultUtils(capabilities, crypto, async () => {
    const vaultInfo = await getStoredVault();
    if (!vaultInfo) {
      throw new Error('尚未选择 Vault');
    }
    return vaultInfo.path;
  });

  const toolOutputStorage = createDesktopToolOutputStorage({
    capabilities,
    crypto,
    ttlDays: DEFAULT_TOOL_OUTPUT_TRUNCATION.ttlDays,
  });

  const isWithinVault = (vaultRoot: string | undefined, targetPath: string): boolean => {
    if (!vaultRoot) return false;
    const relative = capabilities.path.relative(vaultRoot, targetPath);
    if (relative === '') return true;
    return !relative.startsWith('..') && !capabilities.path.isAbsolute(relative);
  };

  const toolOutputPostProcessor = createToolOutputPostProcessor({
    config: DEFAULT_TOOL_OUTPUT_TRUNCATION,
    storage: toolOutputStorage,
    buildHint: ({ fullPath, runContext }) => {
      if (!fullPath) {
        return 'Full output could not be saved. Please retry the command if needed.';
      }
      const vaultRoot = runContext?.context?.vaultRoot;
      if (isWithinVault(vaultRoot, fullPath)) {
        return `Full output saved at ${fullPath}. Use read/grep or open the file to inspect it.`;
      }
      return `Full output saved at ${fullPath}. Open the file to view the full content.`;
    },
  });

  // 创建工具集（不含 bash，bash 使用沙盒版本）
  const baseTools = createBaseTools({
    capabilities,
    crypto,
    vaultUtils,
    enableBash: false, // 禁用默认 bash，使用沙盒版本
  });

  // 添加沙盒化的 bash 工具
  const sandboxBashTool = createSandboxBashTool({
    getSandbox: getSandboxManager,
    onAuthRequest: requestPathAuthorization,
  });

  // 创建 MCP 管理器
  const mcpManager = createMcpManager();

  const permissionRuntime = initPermissionRuntime({
    capabilities,
    getMcpServerIds: () => mcpManager.getStatus().servers.map((server) => server.id),
  });
  const doomLoopRuntime = initDoomLoopRuntime({
    uiAvailable: true,
    shouldSkip: ({ callId }) => {
      if (!callId) return false;
      const decision = permissionRuntime.getDecision(callId);
      return decision?.decision === 'deny';
    },
  });

  const toolsWithPermission = permissionRuntime.wrapTools([...baseTools, sandboxBashTool]);
  const toolsWithDoomLoop = doomLoopRuntime.wrapTools(toolsWithPermission);
  const toolsWithTruncation = wrapToolsWithOutputTruncation(
    toolsWithDoomLoop,
    toolOutputPostProcessor
  );

  // 创建模型工厂
  const initialSettings = getAgentSettings();
  let modelFactory: ModelFactory = createModelFactory({
    settings: initialSettings,
    providerRegistry,
    toApiModelId,
    membership: membershipBridge.getConfig(),
  });

  // 创建 Agent 工厂
  const agentFactory = createAgentFactory({
    getModelFactory: () => modelFactory,
    baseTools: toolsWithTruncation,
    getMcpTools: () =>
      wrapToolsWithOutputTruncation(
        doomLoopRuntime.wrapTools(permissionRuntime.wrapTools(mcpManager.getTools())),
        toolOutputPostProcessor
      ),
    getInstructions: () => resolveSystemPrompt(getAgentSettings()),
    getModelSettings: () => resolveModelSettings(getAgentSettings()),
  });

  mcpManager.setOnReload(agentFactory.invalidate);
  mcpManager.scheduleReload(initialSettings.mcp);

  // 监听会员状态变更
  membershipBridge.addListener(() => {
    try {
      const currentSettings = getAgentSettings();
      modelFactory = createModelFactory({
        settings: currentSettings,
        providerRegistry,
        toApiModelId,
        membership: membershipBridge.getConfig(),
      });
      agentFactory.invalidate();
    } catch (error) {
      console.error('[agent-runtime] failed to reload model factory on membership change', error);
    }
  });

  // 监听配置变更
  onAgentSettingsChange((next, previous) => {
    const modelChanged =
      next.model.defaultModel !== previous.model.defaultModel ||
      JSON.stringify(next.providers) !== JSON.stringify(previous.providers) ||
      JSON.stringify(next.customProviders) !== JSON.stringify(previous.customProviders);
    const promptChanged =
      next.systemPrompt.mode !== previous.systemPrompt.mode ||
      next.systemPrompt.template !== previous.systemPrompt.template;
    const hasParamChanged = (
      nextParam: AgentSettings['modelParams']['temperature'],
      prevParam: AgentSettings['modelParams']['temperature']
    ) =>
      nextParam.mode !== prevParam.mode ||
      (nextParam.mode === 'custom' && nextParam.value !== prevParam.value);
    const modelParamsChanged =
      hasParamChanged(next.modelParams.temperature, previous.modelParams.temperature) ||
      hasParamChanged(next.modelParams.topP, previous.modelParams.topP) ||
      hasParamChanged(next.modelParams.maxTokens, previous.modelParams.maxTokens);
    const mcpChanged =
      JSON.stringify(next.mcp.stdio) !== JSON.stringify(previous.mcp.stdio) ||
      JSON.stringify(next.mcp.streamableHttp) !== JSON.stringify(previous.mcp.streamableHttp);

    if (modelChanged) {
      try {
        modelFactory = createModelFactory({
          settings: next,
          providerRegistry,
          toApiModelId,
          membership: membershipBridge.getConfig(),
        });
        agentFactory.invalidate();
      } catch (error) {
        console.error('[agent-runtime] failed to reload model', error);
      }
    }
    if ((promptChanged || modelParamsChanged) && !modelChanged) {
      agentFactory.invalidate();
    }
    if (mcpChanged) {
      mcpManager.scheduleReload(next.mcp);
    }
  });

  const COMPACTION_PREPARE_TTL_MS = 60_000;
  const compactionPreflightGate = createCompactionPreflightGate({
    ttlMs: COMPACTION_PREPARE_TTL_MS,
  });

  const applyCompactionIfNeeded = async (input: {
    chatId: string;
    session: Session;
    preferredModelId?: string;
    modelId?: string;
  }): Promise<{
    compaction: CompactionResult;
    effectiveHistory: AgentInputItem[];
    modelId: string;
  }> => {
    const { chatId, session, preferredModelId, modelId } = input;
    const resolvedModelId = modelId ?? agentFactory.getAgent(preferredModelId).modelId;
    const history = await session.getItems();
    const settings = getAgentSettings();
    const compaction = await compactHistory({
      history,
      config: {
        ...DEFAULT_COMPACTION_CONFIG,
        contextWindow: resolveCompactionContextWindow(resolvedModelId, settings),
      },
      summaryBuilder: async (items) => {
        const { model } = modelFactory.buildRawModel(resolvedModelId);
        return generateCompactionSummary(model, items);
      },
    });

    if (compaction.triggered) {
      console.info('[agent-runtime] 会话压缩完成', {
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

  return {
    async prepareCompaction({ chatId, preferredModelId, session }) {
      const { compaction, modelId } = await applyCompactionIfNeeded({
        chatId,
        preferredModelId,
        session,
      });
      compactionPreflightGate.markPrepared(chatId, modelId);
      return compaction;
    },
    async runChatTurn({
      chatId,
      input,
      preferredModelId,
      context,
      mode,
      session,
      attachments,
      signal,
    }) {
      const trimmed = input.trim();
      if (!trimmed) {
        throw new Error('输入不能为空');
      }
      const vaultInfo = await getStoredVault();
      if (!vaultInfo) {
        throw new Error('尚未选择 Vault，无法启动对话');
      }
      await mcpManager.ensureReady();
      const { agent, modelId } = agentFactory.getAgent(preferredModelId);
      const effectiveHistory = compactionPreflightGate.consumePrepared(chatId, modelId)
        ? await session.getItems()
        : (
            await applyCompactionIfNeeded({
              chatId,
              preferredModelId,
              session,
              modelId,
            })
          ).effectiveHistory;

      const inputWithContext = applyContextToInput(trimmed, context, attachments);

      const agentContext: AgentContext = {
        mode: mode ?? 'agent',
        vaultRoot: vaultInfo.path,
        chatId,
        buildModel: modelFactory.buildModel,
      };

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
          console.warn('[agent-runtime] 会话输出持久化失败', error);
        });

      return { result, agent, toolNames: agent.tools.map((tool) => tool.name) };
    },
    async generateTitle(userMessage: string, preferredModelId?: string): Promise<string> {
      const { model } = modelFactory.buildRawModel(preferredModelId);
      return generateChatTitle(model, userMessage);
    },
    getMcpStatus: () => mcpManager.getStatus(),
    onMcpStatusChange: (listener) => mcpManager.addStatusListener(listener),
    testMcpServer: (input) => mcpManager.testServer(input),
    reloadMcp: () => mcpManager.scheduleReload(getAgentSettings().mcp),
  };
};
