/**
 * AI Proxy DTO 模块
 * 统一导出所有 Schema 和类型
 */

// Zod Schemas
export {
  ChatCompletionRequestSchema,
  MessageSchema,
  ToolFunctionSchema,
  ToolCallSchema,
  ToolChoiceSchema,
  MessageContentPartSchema,
  ReasoningRequestSchema,
  ReasoningDetailSchema,
} from './schemas';

// Types
export type {
  // 请求类型
  ChatCompletionRequest,
  Message,
  MessageContentPart,
  ToolFunction,
  ToolCall,
  ToolChoice,
  ReasoningRequest,
  ReasoningDetail,
  ReasoningDetailFormat,
  // AI SDK 类型
  AISDKMessage,
  AISDKSystemMessage,
  AISDKUserMessage,
  AISDKUserContentPart,
  AISDKAssistantTextMessage,
  AISDKAssistantToolCallMessage,
  AISDKToolResultMessage,
  AISDKToolChoice,
  // 响应类型
  ToolCallResponse,
  MessageResponse,
  FinishReason,
  ChatCompletionChoice,
  ChatCompletionResponse,
  TokenUsage,
  InternalTokenUsage,
  // 流式类型
  DeltaToolCall,
  StreamDelta,
  StreamChoice,
  ChatCompletionChunk,
  // 模型类型
  ModelInfo,
  ModelsListResponse,
  // 错误类型
  OpenAIError,
  // 用户类型
  UserTier,
} from './types';
