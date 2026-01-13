/**
 * Mobile Agent Runtime 核心逻辑
 *
 * 负责 Agent 初始化、运行时管理和聊天执行。
 * 与 PC 端 apps/moryflow/pc/src/main/agent-runtime/index.ts 对应。
 */

import { run, setTracingDisabled } from '@aiget/agents';
import {
  createAgentFactory,
  createModelFactory,
  createVaultUtils,
  createSessionAdapter,
  applyContextToInput,
  generateChatTitle,
  type AgentFactory,
  type AgentContext,
  type ModelFactory,
  type VaultUtils,
  type AgentSettings,
} from '@aiget/agents-runtime';
import { createMobileTools } from '@aiget/agents-tools';
import { providerRegistry, toApiModelId } from '@aiget/agents-model-registry';

import { createMobileCapabilities, createMobileCrypto } from './mobile-adapter';
import { mobileFetch, createLogger } from './adapters';
import { mobileSessionStore } from './session-store';
import { loadSettings, onSettingsChange } from './settings-store';
import { getMembershipConfig } from './membership-bridge';
import { initVaultManager } from '../vault';

import type { MobileAgentRuntime, MobileAgentRuntimeOptions, MobileChatTurnResult } from './types';
import { MAX_AGENT_TURNS } from './types';

const logger = createLogger('[Runtime]');

// 禁用 tracing（Mobile 端的 AsyncLocalStorage 是简化实现）
setTracingDisabled(true);

// ============ 内部状态 ============

let runtime: MobileAgentRuntime | null = null;
let agentFactory: AgentFactory | null = null;
let modelFactory: ModelFactory | null = null;
let vaultUtils: VaultUtils | null = null;
let vaultRoot: string | null = null;
let toolNames: string[] = [];

// ============ 初始化 ============

/**
 * 初始化 Mobile Agent Runtime
 */
export async function initAgentRuntime(): Promise<MobileAgentRuntime> {
  if (runtime) {
    return runtime;
  }

  const settings = await loadSettings();
  const capabilities = createMobileCapabilities();
  const crypto = createMobileCrypto();

  // 使用 VaultManager 初始化，确保 UI 层和 Agent Runtime 使用同一个 Vault
  const vault = await initVaultManager();
  vaultRoot = vault.path;

  vaultUtils = createVaultUtils(capabilities, crypto, async () => {
    if (!vaultRoot) throw new Error('Vault 未初始化');
    return vaultRoot;
  });

  const baseTools = createMobileTools({ capabilities, crypto, vaultUtils });
  toolNames = baseTools.map((tool) => tool.name);
  if (__DEV__) {
    logger.debug('加载的工具:', toolNames);
  }

  modelFactory = createModelFactory({
    settings,
    providerRegistry,
    toApiModelId,
    membership: getMembershipConfig,
    customFetch: mobileFetch,
  });

  agentFactory = createAgentFactory({
    getModelFactory: () => modelFactory!,
    baseTools,
    getMcpTools: () => [], // 移动端暂不支持 MCP
  });

  onSettingsChange((next: AgentSettings) => {
    try {
      modelFactory = createModelFactory({
        settings: next,
        providerRegistry,
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
    async runChatTurn(options: MobileAgentRuntimeOptions): Promise<MobileChatTurnResult> {
      const { chatId, input, preferredModelId, context, session, attachments, signal } = options;

      const trimmed = input.trim();
      if (!trimmed) throw new Error('输入不能为空');
      if (!vaultRoot) throw new Error('Vault 未初始化');
      if (!agentFactory) throw new Error('Agent Runtime 未初始化');

      const { agent } = agentFactory.getAgent(preferredModelId);
      if (__DEV__) {
        logger.debug(
          'runChatTurn agent.tools:',
          agent.tools.map((t) => t.name)
        );
      }

      const inputWithContext = applyContextToInput(trimmed, context, attachments);
      const agentContext: AgentContext = {
        vaultRoot,
        chatId,
        buildModel: modelFactory?.buildModel,
      };

      // 使用 expo/fetch 支持流式响应
      const result = await run(agent, inputWithContext, {
        stream: true,
        maxTurns: MAX_AGENT_TURNS,
        signal,
        session,
        context: agentContext,
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
  context?: import('@aiget/agents-runtime').AgentChatContext;
  attachments?: import('@aiget/agents-runtime').AgentAttachmentContext[];
  signal?: AbortSignal;
}): Promise<MobileChatTurnResult> {
  const rt = await getAgentRuntime();
  const session = createSessionAdapter(params.chatId, mobileSessionStore);
  return rt.runChatTurn({ ...params, session });
}

/**
 * 创建新的聊天会话
 */
export async function createChatSession(title?: string) {
  return mobileSessionStore.createSession(title);
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
