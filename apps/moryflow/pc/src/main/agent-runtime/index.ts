/**
 * [PROVIDES]: createAgentRuntime - PC 端 Agent 运行时工厂（含 taskStateService 注入、prompt/params 注入、Hook/Agent 配置、外部工具加载、输出截断、Doom Loop、会话压缩与预处理、模式注入）
 * [DEPENDS]: agents, agents-runtime, agents-runtime/prompt, agents-tools - Agent 框架核心
 * [POS]: PC 主进程核心模块，提供 AI 对话执行、MCP 服务器管理、标题生成
 * [NOTE]: 会话历史由 SessionStore 组装输入，流完成后追加输出
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */
import {
  run,
  user,
  type AgentInputItem,
  type Agent,
  type RunState,
  type Tool,
} from '@openai/agents-core';
import type { RunStreamEvent } from '@openai/agents-core';
import {
  DEFAULT_TOOL_OUTPUT_TRUNCATION,
  DEFAULT_COMPACTION_CONFIG,
  applyContextToInput,
  buildUserContent,
  compactHistory,
  createCompactionPreflightGate,
  createAgentFactory,
  bindDefaultModelProvider,
  createModelFactory,
  resolveContextWindow,
  generateCompactionSummary,
  createToolOutputPostProcessor,
  createVaultUtils,
  generateChatTitle,
  extractMembershipModelId,
  isMembershipModelId,
  mergeRuntimeConfig,
  wrapToolsWithHooks,
  wrapToolsWithOutputTruncation,
  type AgentContext,
  type AgentAccessMode,
  type AgentApprovalMode,
  type AgentAttachmentContext,
  type AgentImageContent,
  type AgentRuntimeConfig,
  type ModelFactory,
  type CompactionResult,
  type Session,
  type PresetProvider,
  type ThinkingDowngradeReason,
} from '@moryflow/agents-runtime';
import {
  createPcBashFirstToolset,
  createSubagentTool,
  type SubAgentToolsConfig,
} from '@moryflow/agents-tools';
import { createSandboxBashTool } from '@moryflow/agents-sandbox';

import type {
  AgentSettings,
  AgentChatContext,
  AgentThinkingProfile,
  AgentThinkingSelection,
  McpStatusSnapshot,
  McpStatusEvent,
  McpTestInput,
  McpTestResult,
} from '../../shared/ipc.js';
import { requestPathAuthorization, getSandboxManager } from '../sandbox/index.js';
import { getAgentSettings, onAgentSettingsChange } from '../agent-settings/index.js';
import { chatSessionStore } from '../chat-session-store/index.js';
import { ensureVaultAccess, getStoredVault } from '../vault.js';
import {
  buildProviderModelRef,
  getModelById,
  parseProviderModelRef,
  providerRegistry,
  toApiModelId,
} from '@moryflow/model-bank/registry';
import { createDesktopCapabilities, createDesktopCrypto } from './desktop-adapter.js';
import { createMcpManager } from './core/mcp-manager.js';
import { mcpRuntime } from '../mcp-runtime/index.js';
import { membershipBridge } from '../membership-bridge.js';
import { setupAgentTracing } from './tracing-setup.js';
import { createDesktopToolOutputStorage } from './tool-output-storage.js';
import { initPermissionRuntime } from './permission-runtime.js';
import { initDoomLoopRuntime } from './doom-loop-runtime.js';
import { findAgentById, loadAgentDefinitionsSync } from './agent-store.js';
import { loadExternalTools } from './external-tools.js';
import { getRuntimeConfigSync } from './runtime-config.js';
import { createRuntimeTaskStateService } from './task-state-runtime.js';
import { createSkillTool } from './skill-tool.js';
import { getSkillsRegistry } from '../skills/index.js';
import { isChatDebugEnabled, logChatDebug } from '../chat-debug-log.js';
import { getRuntimeVaultRoot } from './runtime-vault-context.js';
import { resolveModelSettings, resolveSystemPrompt } from './prompt-resolution.js';
import { createDesktopBashAuditWriter } from './bash-audit.js';
import { buildDelegatedSubagentTools } from './subagent-tools.js';
import { createMemoryTools, type MemoryToolDeps } from './memory-tools.js';
import { createKnowledgeTools, type KnowledgeToolDeps } from './knowledge-tools.js';
import { readWorkspaceFileIpc } from '../app/memory-ipc-handlers.js';
import { workspaceDocRegistry } from '../workspace-doc-registry/index.js';
import { buildMemoryPromptBlock, MEMORY_TOOL_INSTRUCTIONS } from './memory-prompt.js';
import { memoryApi } from '../memory/api/client.js';
import { workspaceProfileService } from '../workspace-profile/service.js';
import { resolveActiveWorkspaceProfileContext } from '../workspace-profile/context.js';

export { createChatSession } from './core/chat-session.js';
export { runWithRuntimeVaultRoot } from './runtime-vault-context.js';
export type { AgentAttachmentContext, AgentImageContent, AgentContext };

// 初始化 Agent 日志收集
setupAgentTracing();

const MAX_AGENT_TURNS = 100;
const DEFAULT_TOOL_BUDGET_WARN_THRESHOLD = 24;

const PC_BASH_FIRST_SUBAGENT_INSTRUCTIONS = `You are a subagent executor with the same full tool capabilities as the desktop runtime (including bash, web, task, skill, and other injected tools).
Break down the task goal into steps autonomously and select the most appropriate tools — do not rely on fixed role templates.
On completion, output structured results including: conclusion, key evidence, risks, and next-step recommendations.`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const pickRecordFields = (
  input: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> => {
  const output: Record<string, unknown> = {};
  for (const key of keys) {
    const value = input[key];
    if (value === undefined) {
      continue;
    }
    output[key] = value;
  }
  return output;
};

const summarizeProviderOptionsForThinkingDebug = (
  providerOptions: unknown
): Record<string, unknown> | undefined => {
  if (!isRecord(providerOptions)) {
    return undefined;
  }

  const summary: Record<string, unknown> = {};
  for (const [providerKey, providerConfig] of Object.entries(providerOptions)) {
    if (!isRecord(providerConfig)) {
      continue;
    }

    const providerSummary: Record<string, unknown> = {};
    if (isRecord(providerConfig.reasoning)) {
      providerSummary.reasoning = pickRecordFields(providerConfig.reasoning, [
        'effort',
        'max_tokens',
        'exclude',
      ]);
    }
    if (typeof providerConfig.reasoningEffort === 'string') {
      providerSummary.reasoningEffort = providerConfig.reasoningEffort;
    }
    if (typeof providerConfig.reasoningSummary === 'string') {
      providerSummary.reasoningSummary = providerConfig.reasoningSummary;
    }
    if (isRecord(providerConfig.thinking)) {
      providerSummary.thinking = pickRecordFields(providerConfig.thinking, [
        'type',
        'budget_tokens',
        'tokenBudget',
      ]);
    }
    if (isRecord(providerConfig.thinkingConfig)) {
      providerSummary.thinkingConfig = pickRecordFields(providerConfig.thinkingConfig, [
        'thinkingBudget',
        'includeThoughts',
      ]);
    }
    if (typeof providerConfig.includeReasoning === 'boolean') {
      providerSummary.includeReasoning = providerConfig.includeReasoning;
    }

    if (Object.keys(providerSummary).length === 0) {
      continue;
    }
    summary[providerKey] = providerSummary;
  }

  return Object.keys(summary).length > 0 ? summary : undefined;
};

const summarizeThinkingProfile = (profile?: AgentThinkingProfile) => {
  if (!profile) {
    return undefined;
  }
  return {
    supportsThinking: profile.supportsThinking,
    defaultLevel: profile.defaultLevel,
    levels: profile.levels.map((level) => ({
      id: level.id,
      label: level.label,
      visibleParams: level.visibleParams ?? [],
    })),
  };
};

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
   * 本轮思考等级选择。
   */
  thinking?: AgentThinkingSelection;
  /**
   * 本轮模型思考档案（Renderer 显式透传，保证执行参数与 UI 一致）。
   */
  thinkingProfile?: AgentThinkingProfile;
  /**
   * 结构化上下文信息（当前文件、摘要等）。
   */
  context?: AgentChatContext;
  /**
   * 会话级访问模式。
   */
  mode?: AgentAccessMode;
  /**
   * 审批模式。自动化运行固定使用 deny_on_ask。
   */
  approvalMode?: AgentApprovalMode;
  /**
   * 输入框显式选中的 skill（可选）。
   */
  selectedSkillName?: string;
  /**
   * SDK Session 实例，用于管理多轮对话历史。
   */
  session: Session;
  /**
   * 需要注入的附件上下文。
   */
  attachments?: AgentAttachmentContext[];
  /**
   * 需要注入的图片内容（多模态）。
   */
  images?: AgentImageContent[];
  /**
   * 可选的中断信号，用于在主进程 stop 时终止当前回合。
   */
  signal?: AbortSignal;
  /**
   * 当前 run 的 runtime 配置覆盖。
   */
  runtimeConfigOverride?: AgentRuntimeConfig;
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
  thinkingResolution: {
    requested: AgentThinkingSelection | undefined;
    resolvedLevel: string;
    downgradedToOff: boolean;
    downgradeReason?: ThinkingDowngradeReason;
  };
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

const resolveCompactionContextWindow = (
  modelId: string,
  settings: AgentSettings
): number | undefined => {
  if (!modelId) return undefined;
  const isMembership = isMembershipModelId(modelId);
  const normalized = isMembership ? extractMembershipModelId(modelId) : modelId;
  const parsedModelRef = parseProviderModelRef(normalized);
  const canonicalModelRef = parsedModelRef
    ? buildProviderModelRef(parsedModelRef.providerId, parsedModelRef.modelId)
    : null;
  const normalizedModelId = parsedModelRef?.modelId ?? normalized;
  const normalizedProviderId = parsedModelRef?.providerId;
  const providerSources = isMembership
    ? []
    : [...settings.providers, ...(settings.customProviders || [])].filter((provider) =>
        normalizedProviderId ? provider.providerId === normalizedProviderId : true
      );

  return resolveContextWindow({
    modelId: normalizedModelId,
    // 自定义服务商也可能包含 customContext（来自 AddModelDialog 的参数面板）
    providers: providerSources,
    getDefaultContext: (id) => {
      if (canonicalModelRef) {
        return getModelById(canonicalModelRef)?.limits?.context;
      }
      if (!normalizedProviderId) {
        return undefined;
      }
      return getModelById(buildProviderModelRef(normalizedProviderId, id))?.limits?.context;
    },
  });
};

export const createAgentRuntime = (): AgentRuntime => {
  const runtimeConfig = getRuntimeConfigSync();
  const runtimeHooks = runtimeConfig.hooks;
  const agentDefinitions = loadAgentDefinitionsSync();
  const selectedAgent = findAgentById(agentDefinitions, runtimeConfig.agent?.id);
  if (runtimeConfig.agent?.id && !selectedAgent) {
    console.warn('[agent-runtime] Agent not found:', runtimeConfig.agent.id);
  }

  // 创建平台能力和工具
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
    const fallbackVaultRoot = runtimeScopedVaultRoot ?? sessionScopedVaultRoot;
    const rawVaultRoot = fallbackVaultRoot ?? (await resolveFallbackVaultRoot());
    await ensureVaultAccess(rawVaultRoot);
    return capabilities.path.resolve(rawVaultRoot);
  };

  const vaultUtils = createVaultUtils(capabilities, crypto, async () => resolveRuntimeVaultRoot());
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
  let toolsWithTruncation: Tool<AgentContext>[] = [];
  const bashAuditWriter = createDesktopBashAuditWriter({
    persistCommandPreview: runtimeConfig.tools?.bashAudit?.persistCommandPreview,
    previewMaxChars: runtimeConfig.tools?.bashAudit?.previewMaxChars,
  });
  const toolBudgetWarnThreshold =
    runtimeConfig.tools?.budgetWarnThreshold ?? DEFAULT_TOOL_BUDGET_WARN_THRESHOLD;

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

  // 创建工具集（Bash-First：默认不注入文件/搜索工具）
  const baseTools = createPcBashFirstToolset({
    capabilities,
    crypto,
    vaultUtils,
    taskStateService,
  });

  // Memory & Knowledge tools（AI 驱动记忆读写 + 文件知识检索）
  // Session-first workspace resolution: chatId → session.profileKey → workspaceId
  // Falls back to active profile when chatId is unavailable (e.g. prompt pre-load)
  const memoryToolDeps: MemoryToolDeps = {
    getWorkspaceId: async (chatId?: string, requireSession?: boolean) => {
      // Try session-bound workspace first (prevents cross-workspace pollution during conversation)
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
          // Session lookup failed
        }
      }
      // Write operations must be session-scoped — never fall back to active profile
      if (requireSession) {
        throw new Error('Cannot resolve session workspace for memory write operation');
      }
      // Read-only fallback: active workspace profile (used for prompt pre-load and search)
      const ctx = await resolveActiveWorkspaceProfileContext();
      if (!ctx.profile?.workspaceId) throw new Error('No active workspace profile');
      return ctx.profile.workspaceId;
    },
    api: memoryApi,
    onMemoryMutated: () => {
      // Reset TTL so next turn picks up the fresh memory
      memoryBlockCachedAt = 0;
    },
  };
  const memoryTools = createMemoryTools(memoryToolDeps);
  const knowledgeToolDeps: KnowledgeToolDeps = {
    ...memoryToolDeps,
    readWorkspaceFile: (input, chatId) => {
      // Resolve vault from session-bound workspace (same scope as knowledge_search)
      // to avoid reading files from a different workspace when user switches mid-conversation
      const resolveProfile = async () => {
        const ctx = await resolveActiveWorkspaceProfileContext();

        // Use session-bound vault path if available (not active vault)
        if (chatId) {
          try {
            const summary = chatSessionStore.getSummary(chatId);
            const sessionVaultPath = summary.vaultPath?.trim();
            const sessionProfileKey = summary.profileKey;

            if (sessionVaultPath && capabilities.path.isAbsolute(sessionVaultPath)) {
              // Build vault info from session
              const sessionVault = {
                id: ctx.activeVault?.id ?? '',
                name: ctx.activeVault?.name ?? '',
                path: sessionVaultPath,
                addedAt: ctx.activeVault?.addedAt ?? 0,
              };

              // Resolve workspaceId from session profileKey
              let sessionProfile = ctx.profile;
              if (sessionProfileKey) {
                const sepIdx = sessionProfileKey.indexOf(':');
                if (sepIdx > 0) {
                  const userId = sessionProfileKey.slice(0, sepIdx);
                  const clientWorkspaceId = sessionProfileKey.slice(sepIdx + 1);
                  const resolvedProfile = workspaceProfileService.getProfile(userId, clientWorkspaceId);
                  if (resolvedProfile?.workspaceId && sessionProfile) {
                    sessionProfile = { ...sessionProfile, workspaceId: resolvedProfile.workspaceId };
                  }
                }
              }

              return {
                loggedIn: ctx.loggedIn,
                activeVault: sessionVault,
                profile: sessionProfile,
              };
            }
          } catch {
            // Fall through to active profile
          }
        }

        return { loggedIn: ctx.loggedIn, activeVault: ctx.activeVault, profile: ctx.profile };
      };

      return readWorkspaceFileIpc(
        {
          profiles: { resolveActiveProfile: resolveProfile },
          engine: { getStatus: () => ({ engineStatus: 'idle' as const, pendingCount: 0, lastSyncAt: null }) },
          usage: { getUsage: async () => ({ storage: { used: 0, limit: 0, percentage: 0 } }) },
          documentRegistry: workspaceDocRegistry,
          api: memoryApi,
        },
        input,
      );
    },
  };
  const knowledgeTools = createKnowledgeTools(knowledgeToolDeps);

  // 添加沙盒化的 bash 工具
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

  // 创建 MCP 管理器
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
    wrapToolsWithOutputTruncation(
      doomLoopRuntime.wrapTools(
        permissionRuntime.wrapTools(wrapToolsWithHooks(mcpManager.getTools(), runtimeHooks))
      ),
      toolOutputPostProcessor
    );

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
      const names = base.map((tool) => tool.name);
      console.warn('[agent-runtime] tool budget exceeded', {
        count: base.length,
        threshold: toolBudgetWarnThreshold,
        names,
      });
    }
    const withHooks = wrapToolsWithHooks(base, runtimeHooks);
    const withPermission = permissionRuntime.wrapTools(withHooks);
    const withDoomLoop = doomLoopRuntime.wrapTools(withPermission);
    return wrapToolsWithOutputTruncation(withDoomLoop, toolOutputPostProcessor);
  };

  toolsWithTruncation = buildMainTools();
  const runtimeProviderRegistry: Record<string, PresetProvider> = providerRegistry;

  // 创建模型工厂
  const initialSettings = getAgentSettings();
  let modelFactory: ModelFactory = createModelFactory({
    settings: initialSettings,
    providerRegistry: runtimeProviderRegistry,
    toApiModelId,
    membership: membershipBridge.getConfig(),
  });
  bindDefaultModelProvider(() => modelFactory);

  // Per-workspace memory block cache with TTL (avoid per-turn API calls)
  const MEMORY_BLOCK_TTL_MS = 60_000; // 1 minute
  let cachedMemoryBlock = '';
  let memoryBlockCachedAt = 0;
  let memoryBlockWorkspaceId = '';

  const refreshMemoryBlock = async (chatId?: string) => {
    const now = Date.now();
    // Resolve workspace from session first (same logic as tool deps), fallback to active profile
    let currentWorkspaceId = '';
    try {
      currentWorkspaceId = await memoryToolDeps.getWorkspaceId(chatId);
    } catch {
      // No workspace — clear cache and reset metadata so next call re-fetches immediately
      memoryBlockCachedAt = 0;
      memoryBlockWorkspaceId = '';
      if (cachedMemoryBlock) {
        cachedMemoryBlock = '';
        agentFactory.invalidate();
      }
      return;
    }

    // Skip refresh if same workspace and within TTL
    if (
      currentWorkspaceId === memoryBlockWorkspaceId &&
      now - memoryBlockCachedAt < MEMORY_BLOCK_TTL_MS
    ) {
      return;
    }

    const prev = cachedMemoryBlock;
    const fresh = await buildMemoryPromptBlock(memoryToolDeps, chatId);

    // Only update cache if we got a real result, or if switching workspace.
    // An empty string from a transient API failure should not wipe valid cached memories.
    if (fresh || currentWorkspaceId !== memoryBlockWorkspaceId) {
      cachedMemoryBlock = fresh;
      memoryBlockCachedAt = now;
      memoryBlockWorkspaceId = currentWorkspaceId;

      if (cachedMemoryBlock !== prev) {
        agentFactory.invalidate();
      }
    }
  };

  const createRuntimeAgentFactory = () =>
    createAgentFactory({
      getModelFactory: () => modelFactory,
      baseTools: toolsWithTruncation,
      getMcpTools: buildWrappedMcpTools,
      getInstructions: () => {
        const memoryBlock = [cachedMemoryBlock, MEMORY_TOOL_INSTRUCTIONS]
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

  // 创建 Agent 工厂
  let agentFactory = createRuntimeAgentFactory();

  const reloadExternalTools = async () => {
    if (!runtimeConfig.tools?.external?.enabled) return;
    try {
      const externalTools = await loadExternalTools({ capabilities, crypto, vaultUtils });
      if (externalTools.length === 0) return;
      toolsWithTruncation = buildMainTools(externalTools);
      agentFactory = createRuntimeAgentFactory();
      agentFactory.invalidate();
    } catch (error) {
      console.warn('[agent-runtime] failed to load external tools', error);
    }
  };

  let externalToolsLoaded = false;
  let externalToolsLoading: Promise<void> | null = null;
  let lastSkillsPromptSnapshot = '';

  const ensureExternalTools = async () => {
    if (!runtimeConfig.tools?.external?.enabled) return;
    if (externalToolsLoaded) return;
    if (!externalToolsLoading) {
      externalToolsLoading = reloadExternalTools().finally(() => {
        externalToolsLoaded = true;
      });
    }
    await externalToolsLoading;
  };

  void ensureExternalTools();
  void refreshMemoryBlock().catch(() => {});
  void skillsRegistry.refresh().catch((error) => {
    console.warn('[agent-runtime] failed to load skills', error);
  });

  mcpManager.setOnReload(() => agentFactory.invalidate());
  mcpManager.scheduleReload(initialSettings.mcp);
  void (async () => {
    try {
      await mcpManager.ensureReady();
      const { changedServerIds, failed } = await mcpRuntime.refreshEnabledServers(
        initialSettings.mcp.stdio
      );
      if (failed.length > 0) {
        console.warn('[agent-runtime] managed MCP update failed', failed);
      }
      if (changedServerIds.length > 0) {
        mcpManager.scheduleReload(getAgentSettings().mcp);
      }
    } catch (error) {
      console.warn('[agent-runtime] failed to run managed MCP updates', error);
    }
  })();

  // 监听会员状态变更
  membershipBridge.addListener(() => {
    try {
      const currentSettings = getAgentSettings();
      modelFactory = createModelFactory({
        settings: currentSettings,
        providerRegistry: runtimeProviderRegistry,
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
      next.personalization.customInstructions !== previous.personalization.customInstructions;
    const mcpChanged =
      JSON.stringify(next.mcp.stdio) !== JSON.stringify(previous.mcp.stdio) ||
      JSON.stringify(next.mcp.streamableHttp) !== JSON.stringify(previous.mcp.streamableHttp);

    if (modelChanged) {
      try {
        modelFactory = createModelFactory({
          settings: next,
          providerRegistry: runtimeProviderRegistry,
          toApiModelId,
          membership: membershipBridge.getConfig(),
        });
        agentFactory.invalidate();
      } catch (error) {
        console.error('[agent-runtime] failed to reload model', error);
      }
    }
    if (promptChanged && !modelChanged) {
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

      // Refresh memory block scoped to this turn's workspace (non-blocking on failure)
      await refreshMemoryBlock(chatId).catch(() => {});

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
      const selectedSkillBlock =
        selectedSkillName && selectedSkillName.trim().length > 0
          ? await skillsRegistry.resolveSelectedSkillInjection(selectedSkillName)
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
        buildModel: (modelId) =>
          modelFactory.buildModel(modelId, {
            thinking,
            thinkingProfile,
          }),
      };

      const userContent = buildUserContent(finalInput, images);
      const userItem = user(userContent);
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
