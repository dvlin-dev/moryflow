/**
 * Mobile Agent Runtime 类型定义
 */

import type { Agent, RunStreamEvent } from '@anyhunt/agents'
import type { AgentContext, AgentChatContext, AgentAttachmentContext } from '@anyhunt/agents-runtime'
import type { Session } from '@anyhunt/agents'

// ============ Runtime 选项 ============

export interface MobileAgentRuntimeOptions {
  /** 当前对话 ID */
  chatId: string
  /** 用户输入文本 */
  input: string
  /** 指定首选模型 */
  preferredModelId?: string
  /** 结构化上下文信息 */
  context?: AgentChatContext
  /** SDK Session 实例 */
  session: Session
  /** 附件上下文 */
  attachments?: AgentAttachmentContext[]
  /** 中断信号 */
  signal?: AbortSignal
}

// ============ 结果类型 ============

/**
 * 流式运行结果
 */
export interface MobileAgentStreamResult extends AsyncIterable<RunStreamEvent> {
  completed: Promise<void>
  finalOutput?: string
}

/**
 * 聊天回合返回结果
 */
export interface MobileChatTurnResult {
  result: MobileAgentStreamResult
  agent: Agent<AgentContext>
  toolNames: string[]
}

// ============ Runtime 接口 ============

/**
 * Mobile Agent Runtime 接口
 */
export interface MobileAgentRuntime {
  /** 执行单轮对话 */
  runChatTurn(options: MobileAgentRuntimeOptions): Promise<MobileChatTurnResult>
  /** 获取 Vault 根目录 */
  getVaultRoot(): Promise<string>
  /** 当前是否已初始化 */
  isInitialized(): boolean
  /** 获取可用工具列表 */
  getToolNames(): string[]
}

// ============ 常量 ============

export const MAX_AGENT_TURNS = 40
