/**
 * Agent DTO - Zod Schemas
 *
 * [DEFINES]: L3 Agent API 请求/响应类型
 * [USED_BY]: agent.controller.ts, agent.service.ts
 * [POS]: Zod schemas + 推断类型（单一数据源）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { z } from 'zod';

// ========== 任务管理 Schemas ==========

/** 创建 Agent 任务请求 */
export const CreateAgentTaskSchema = z.object({
  /** 自然语言描述（必填） */
  prompt: z.string().min(1).max(10000),
  /** 可选的起始 URL 列表 */
  urls: z.array(z.string().url()).max(10).optional(),
  /** 输出格式 JSON Schema（可选，不传则返回纯文本） */
  schema: z.record(z.string(), z.unknown()).optional(),
  /** 最大消耗 credits（可选，不传则不限制） */
  maxCredits: z.number().int().positive().optional(),
  /** 是否流式返回（默认 true） */
  stream: z.boolean().default(true),
});

export type CreateAgentTaskInput = z.infer<typeof CreateAgentTaskSchema>;

// ========== 响应类型 ==========

/** Agent 任务状态 */
export type AgentTaskStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Agent 任务信息 */
export interface AgentTaskInfo {
  id: string;
  status: AgentTaskStatus;
  createdAt: string;
  expiresAt: string;
}

/** Agent 任务结果 */
export interface AgentTaskResult {
  id: string;
  status: AgentTaskStatus;
  data?: unknown;
  creditsUsed?: number;
  error?: string;
  progress?: AgentTaskProgress;
}

/** Agent 任务进度 */
export interface AgentTaskProgress {
  creditsUsed: number;
  toolCallCount: number;
  elapsedMs: number;
}

// ========== SSE 事件类型 ==========

/** SSE 事件 - 任务开始 */
export interface AgentEventStarted {
  type: 'started';
  id: string;
  expiresAt: string;
}

/** SSE 事件 - Agent 思考过程 */
export interface AgentEventThinking {
  type: 'thinking';
  content: string;
}

/** SSE 事件 - 工具调用开始 */
export interface AgentEventToolCall {
  type: 'tool_call';
  callId: string;
  tool: string;
  args: Record<string, unknown>;
}

/** SSE 事件 - 工具调用结果 */
export interface AgentEventToolResult {
  type: 'tool_result';
  callId: string;
  tool: string;
  result: unknown;
  error?: string;
}

/** SSE 事件 - 进度更新 */
export interface AgentEventProgress {
  type: 'progress';
  message: string;
  step: number;
  totalSteps?: number;
}

/** SSE 事件 - 任务完成 */
export interface AgentEventComplete {
  type: 'complete';
  data: unknown;
  creditsUsed: number;
}

/** SSE 事件 - 任务失败 */
export interface AgentEventFailed {
  type: 'failed';
  error: string;
  creditsUsed?: number;
  progress?: AgentTaskProgress;
}

/** SSE 事件联合类型 */
export type AgentStreamEvent =
  | AgentEventStarted
  | AgentEventThinking
  | AgentEventToolCall
  | AgentEventToolResult
  | AgentEventProgress
  | AgentEventComplete
  | AgentEventFailed;
