/**
 * AI Proxy 类型定义
 * 导出所有 Zod Schema 推断的类型，供其他模块使用
 */

import { z } from 'zod';
import {
  ChatCompletionRequestSchema,
  MessageSchema,
  ToolFunctionSchema,
  ToolCallSchema,
  ToolChoiceSchema,
  MessageContentPartSchema,
  ReasoningRequestSchema,
  ReasoningDetailSchema,
} from './schemas';

// ==================== 请求类型 ====================

/** Chat Completions 请求 */
export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;

/** Reasoning 请求配置 */
export type ReasoningRequest = z.infer<typeof ReasoningRequestSchema>;

/** 消息 */
export type Message = z.infer<typeof MessageSchema>;

/** 消息内容部分 */
export type MessageContentPart = z.infer<typeof MessageContentPartSchema>;

/** Tool 函数定义 */
export type ToolFunction = z.infer<typeof ToolFunctionSchema>;

/** Tool Call */
export type ToolCall = z.infer<typeof ToolCallSchema>;

/** Tool Choice */
export type ToolChoice = z.infer<typeof ToolChoiceSchema>;

// ==================== Reasoning Detail 类型 ====================

/** Reasoning Detail（从 Schema 推断） */
export type ReasoningDetail = z.infer<typeof ReasoningDetailSchema>;

/** Reasoning Detail 格式 */
export type ReasoningDetailFormat =
  | 'unknown'
  | 'openai-responses-v1'
  | 'xai-responses-v1'
  | 'anthropic-claude-v1';

// ==================== AI SDK 转换类型 ====================

/** AI SDK 系统消息 */
export interface AISDKSystemMessage {
  role: 'system';
  content: string;
}

/** AI SDK 用户消息内容部分 */
export type AISDKUserContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string }; // base64 或 URL

/** AI SDK 用户消息 */
export interface AISDKUserMessage {
  role: 'user';
  content: string | AISDKUserContentPart[];
}

/** AI SDK 纯文本助手消息 */
export interface AISDKAssistantTextMessage {
  role: 'assistant';
  content: string;
}

/** AI SDK 工具调用助手消息 */
export interface AISDKAssistantToolCallMessage {
  role: 'assistant';
  content: Array<{
    type: 'tool-call';
    toolCallId: string;
    toolName: string;
    input: unknown;
  }>;
}

/** AI SDK 工具结果输出格式 */
export type AISDKToolResultOutput =
  | { type: 'text'; value: string }
  | { type: 'json'; value: unknown };

/** AI SDK 工具结果消息 */
export interface AISDKToolResultMessage {
  role: 'tool';
  content: Array<{
    type: 'tool-result';
    toolCallId: string;
    toolName: string;
    output: AISDKToolResultOutput;
  }>;
}

/** AI SDK 消息联合类型 */
export type AISDKMessage =
  | AISDKSystemMessage
  | AISDKUserMessage
  | AISDKAssistantTextMessage
  | AISDKAssistantToolCallMessage
  | AISDKToolResultMessage;

/** AI SDK Tool Choice */
export type AISDKToolChoice =
  | 'auto'
  | 'none'
  | 'required'
  | { type: 'tool'; toolName: string };

// ==================== 响应类型 ====================

/** Tool Call 响应 */
export interface ToolCallResponse {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/** Message 响应 */
export interface MessageResponse {
  role: 'assistant';
  content: string | null;
  tool_calls?: ToolCallResponse[];
  reasoning_details?: ReasoningDetail[];
}

/** Finish Reason */
export type FinishReason =
  | 'stop'
  | 'length'
  | 'tool_calls'
  | 'content_filter'
  | null;

/** Chat Completion Choice */
export interface ChatCompletionChoice {
  index: number;
  message: MessageResponse;
  finish_reason: FinishReason;
}

/** Chat Completion 响应 */
export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: TokenUsage;
}

/** Token 使用量（OpenAI 格式） */
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/** Token 使用量（内部格式） */
export interface InternalTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ==================== 流式响应类型 ====================

/** Delta Tool Call */
export interface DeltaToolCall {
  index: number;
  id?: string;
  type?: 'function';
  function?: {
    name?: string;
    arguments?: string;
  };
}

/** Stream Delta */
export interface StreamDelta {
  role?: 'assistant';
  content?: string | null;
  tool_calls?: DeltaToolCall[];
  /** Reasoning 内容（思考模型扩展字段，向后兼容） */
  reasoning_content?: string | null;
  /** Reasoning Details（新增，用于保持推理连续性） */
  reasoning_details?: ReasoningDetail[];
}

/** Stream Choice */
export interface StreamChoice {
  index: number;
  delta: StreamDelta;
  finish_reason: FinishReason;
}

/** Chat Completion Chunk */
export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: StreamChoice[];
  usage?: TokenUsage;
}

// ==================== 模型信息类型 ====================

/** 模型信息 */
export interface ModelInfo {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
  display_name: string;
  min_tier: string;
  available: boolean;
  permission: unknown[];
  root: string;
  parent: null;
}

/** 模型列表响应 */
export interface ModelsListResponse {
  object: 'list';
  data: ModelInfo[];
}

// ==================== 错误类型 ====================

/** OpenAI 错误响应 */
export interface OpenAIError {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

// ==================== Re-export ====================

export type { UserTier } from '../../types';
