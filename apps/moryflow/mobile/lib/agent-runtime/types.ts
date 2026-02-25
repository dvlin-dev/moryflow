/**
 * Mobile Agent Runtime 类型定义
 */

import type { Agent, RunStreamEvent, RunState, AgentInputItem } from '@openai/agents-core';
import type {
  AgentContext,
  AgentChatContext,
  AgentAttachmentContext,
  Session,
  CompactionResult,
  AgentAccessMode,
} from '@moryflow/agents-runtime';

// ============ Runtime 选项 ============

export interface MobileAgentRuntimeOptions {
  /** 当前对话 ID */
  chatId: string;
  /** 用户输入文本 */
  input: string;
  /** 指定首选模型 */
  preferredModelId?: string;
  /** 结构化上下文信息 */
  context?: AgentChatContext;
  /** 会话级访问模式 */
  mode?: AgentAccessMode;
  /** SDK Session 实例 */
  session: Session;
  /** 附件上下文 */
  attachments?: AgentAttachmentContext[];
  /** 中断信号 */
  signal?: AbortSignal;
}

// ============ 结果类型 ============

/**
 * 流式运行结果
 */
export interface MobileAgentStreamResult extends AsyncIterable<RunStreamEvent> {
  readonly completed: Promise<void>;
  readonly finalOutput?: unknown;
  readonly state: RunState<AgentContext, Agent<AgentContext>>;
  readonly output: AgentInputItem[];
}

/**
 * 聊天回合返回结果
 */
export interface MobileChatTurnResult {
  result: MobileAgentStreamResult;
  agent: Agent<AgentContext>;
  toolNames: string[];
}

// ============ Runtime 接口 ============

/**
 * Mobile Agent Runtime 接口
 */
export interface MobileAgentRuntime {
  /** 执行单轮对话 */
  runChatTurn(options: MobileAgentRuntimeOptions): Promise<MobileChatTurnResult>;
  /** 预处理会话压缩（用于发送前同步 UI 状态） */
  prepareCompaction(options: {
    chatId: string;
    preferredModelId?: string;
    session: Session;
  }): Promise<CompactionResult>;
  /** 获取 Vault 根目录 */
  getVaultRoot(): Promise<string>;
  /** 当前是否已初始化 */
  isInitialized(): boolean;
  /** 获取可用工具列表 */
  getToolNames(): string[];
}

// ============ 常量 ============

export const MAX_AGENT_TURNS = 100;
