/**
 * [PROVIDES]: createAgentRuntime - PC 端 Agent 运行时工厂
 * [DEPENDS]: agents, agents-runtime, agents-tools - Agent 框架核心
 * [POS]: PC 主进程核心模块，提供 AI 对话执行、MCP 服务器管理、标题生成
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */
import { run, type Agent, type Session } from '@anyhunt/agents';
import type { RunStreamEvent } from '@anyhunt/agents-core';
import {
  createAgentFactory,
  createModelFactory,
  createVaultUtils,
  applyContextToInput,
  generateChatTitle,
  type AgentContext,
  type AgentAttachmentContext,
  type ModelFactory,
} from '@anyhunt/agents-runtime';
import { createBaseTools } from '@anyhunt/agents-tools';
import { createSandboxBashTool } from '@anyhunt/agents-sandbox';

import type {
  AgentChatContext,
  McpStatusSnapshot,
  McpStatusEvent,
  McpTestInput,
  McpTestResult,
} from '../../shared/ipc.js';
import { requestPathAuthorization, getSandboxManager } from '../sandbox/index.js';
import { getAgentSettings, onAgentSettingsChange } from '../agent-settings/index.js';
import { getStoredVault } from '../vault.js';
import { providerRegistry, toApiModelId } from '../../shared/model-registry/index.js';
import { createDesktopCapabilities, createDesktopCrypto } from './desktop-adapter.js';
import { createMcpManager } from './core/mcp-manager.js';
import { membershipBridge } from '../membership-bridge.js';
import { setupAgentTracing } from './tracing-setup.js';

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
  completed: Promise<void>;
  /** 最终输出文本 */
  finalOutput?: string;
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
  baseTools.push(sandboxBashTool);

  // 创建模型工厂
  const initialSettings = getAgentSettings();
  let modelFactory: ModelFactory = createModelFactory({
    settings: initialSettings,
    providerRegistry,
    toApiModelId,
    membership: membershipBridge.getConfig(),
  });

  // 创建 MCP 管理器
  const mcpManager = createMcpManager();

  // 创建 Agent 工厂
  const agentFactory = createAgentFactory({
    getModelFactory: () => modelFactory,
    baseTools,
    getMcpTools: mcpManager.getTools,
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
    if (mcpChanged) {
      mcpManager.scheduleReload(next.mcp);
    }
  });

  return {
    async runChatTurn({ chatId, input, preferredModelId, context, session, attachments, signal }) {
      const trimmed = input.trim();
      if (!trimmed) {
        throw new Error('输入不能为空');
      }
      const vaultInfo = await getStoredVault();
      if (!vaultInfo) {
        throw new Error('尚未选择 Vault，无法启动对话');
      }
      await mcpManager.ensureReady();
      const { agent } = agentFactory.getAgent(preferredModelId);
      const inputWithContext = applyContextToInput(trimmed, context, attachments);

      const agentContext: AgentContext = {
        vaultRoot: vaultInfo.path,
        chatId,
        buildModel: modelFactory.buildModel,
      };

      const result = await run(agent, inputWithContext, {
        stream: true,
        maxTurns: MAX_AGENT_TURNS,
        signal,
        session,
        context: agentContext,
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
