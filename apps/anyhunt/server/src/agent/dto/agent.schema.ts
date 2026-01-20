/**
 * Agent DTO - Zod Schemas
 *
 * [DEFINES]: L3 Agent API 请求/响应类型（支持可选 model 覆盖）
 * [USED_BY]: agent.controller.ts, agent.service.ts
 * [POS]: Zod schemas + 推断类型（单一数据源）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { z } from 'zod';

export const CreateAgentTaskSchema = z.object({
  prompt: z.string().min(1).max(10000),
  urls: z.array(z.string().url()).max(10).optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
  model: z.string().min(1).max(200).optional(),
  maxCredits: z.number().int().positive().optional(),
  stream: z.boolean().default(true),
});

export type CreateAgentTaskInput = z.infer<typeof CreateAgentTaskSchema>;

export type AgentTaskStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentTaskInfo {
  id: string;
  status: AgentTaskStatus;
  createdAt: string;
  expiresAt: string;
}

export interface AgentTaskResult {
  id: string;
  status: AgentTaskStatus;
  data?: unknown;
  creditsUsed?: number;
  error?: string;
  progress?: AgentTaskProgress;
}

export interface AgentTaskProgress {
  creditsUsed: number;
  toolCallCount: number;
  elapsedMs: number;
}

export interface AgentEventStarted {
  type: 'started';
  id: string;
  expiresAt: string;
}

export interface AgentEventThinking {
  type: 'thinking';
  content: string;
}

export interface AgentEventToolCall {
  type: 'tool_call';
  callId: string;
  tool: string;
  args: Record<string, unknown>;
}

export interface AgentEventToolResult {
  type: 'tool_result';
  callId: string;
  tool: string;
  result: unknown;
  error?: string;
}

export interface AgentEventProgress {
  type: 'progress';
  message: string;
  step: number;
  totalSteps?: number;
}

export interface AgentEventComplete {
  type: 'complete';
  data: unknown;
  creditsUsed: number;
}

export interface AgentEventFailed {
  type: 'failed';
  error: string;
  creditsUsed?: number;
  progress?: AgentTaskProgress;
}

export type AgentStreamEvent =
  | AgentEventStarted
  | AgentEventThinking
  | AgentEventToolCall
  | AgentEventToolResult
  | AgentEventProgress
  | AgentEventComplete
  | AgentEventFailed;
