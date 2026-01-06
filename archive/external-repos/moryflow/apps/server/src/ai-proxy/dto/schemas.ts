/**
 * AI Proxy Zod Schemas
 * 定义请求验证的 Zod Schema
 */

import { z } from 'zod';

// ==================== Tool 相关 Schema ====================

/** Function 参数定义（JSON Schema 格式） */
const FunctionParametersSchema = z.record(z.string(), z.unknown());

/** Tool Function 定义 */
export const ToolFunctionSchema = z.object({
  type: z.literal('function'),
  function: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    parameters: FunctionParametersSchema.optional(),
  }),
});

/**
 * Tool Choice 选项
 * - 'auto': 模型自动决定是否使用工具
 * - 'none': 禁用工具
 * - 'required': 强制使用工具
 * - { type: 'function', function: { name: '...' } }: 指定特定工具
 */
export const ToolChoiceSchema = z.union([
  z.literal('auto'),
  z.literal('none'),
  z.literal('required'),
  z.object({
    type: z.literal('function'),
    function: z.object({ name: z.string() }),
  }),
]);

// ==================== Message 相关 Schema ====================

/** 消息内容部分（支持文本和图片） */
export const MessageContentPartSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({
    type: z.literal('image_url'),
    image_url: z.object({
      url: z.string(),
      detail: z.enum(['auto', 'low', 'high']).optional(),
    }),
  }),
]);

// ==================== Reasoning Detail Schema ====================

/** Reasoning Detail 基础字段 */
const ReasoningDetailBaseSchema = z.object({
  id: z.string().nullable().optional(),
  format: z
    .enum([
      'unknown',
      'openai-responses-v1',
      'xai-responses-v1',
      'anthropic-claude-v1',
    ])
    .optional(),
  index: z.number().optional(),
});

/** Reasoning Detail Schema（三种类型） */
export const ReasoningDetailSchema = z.discriminatedUnion('type', [
  ReasoningDetailBaseSchema.extend({
    type: z.literal('reasoning.summary'),
    summary: z.string(),
  }),
  ReasoningDetailBaseSchema.extend({
    type: z.literal('reasoning.text'),
    text: z.string(),
    signature: z.string().nullable().optional(),
  }),
  ReasoningDetailBaseSchema.extend({
    type: z.literal('reasoning.encrypted'),
    data: z.string(),
  }),
]);

/** Tool Call 定义（assistant 消息中） */
export const ToolCallSchema = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    arguments: z.string(), // JSON 字符串
  }),
});

/**
 * 完整的 Message Schema
 * 支持 system、user、assistant、tool 四种角色
 */
export const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  // content 可以是字符串、内容数组、或 null（当 assistant 只返回 tool_calls 时）
  content: z
    .union([z.string(), z.array(MessageContentPartSchema), z.null()])
    .optional(),
  // assistant 消息专用：名称
  name: z.string().optional(),
  // assistant 消息专用：工具调用列表
  tool_calls: z.array(ToolCallSchema).optional(),
  // tool 消息专用：关联的 tool_call_id
  tool_call_id: z.string().optional(),
  // 新增：reasoning_details（仅 assistant 消息，用于保持推理连续性）
  reasoning_details: z.array(ReasoningDetailSchema).optional(),
});

// ==================== Request Schema ====================

/** Reasoning 配置 Schema（请求级别覆盖） */
export const ReasoningRequestSchema = z.object({
  /** 是否启用深度推理模式 */
  enabled: z.boolean().optional(),
  /** 思考强度（xhigh/high/medium/low/minimal/none） */
  effort: z
    .enum(['xhigh', 'high', 'medium', 'low', 'minimal', 'none'])
    .optional(),
  /** 思考 token 预算（可选） */
  max_tokens: z.number().positive().optional(),
  /** 是否在响应中排除思考内容 */
  exclude: z.boolean().optional(),
});

/** Chat Completions 请求 Schema（OpenAI 兼容） */
export const ChatCompletionRequestSchema = z
  .object({
    // 必填字段
    model: z.string().min(1, 'model is required'),
    messages: z.array(MessageSchema).min(1, 'messages is required'),

    // Tools 相关
    tools: z.array(ToolFunctionSchema).optional(),
    tool_choice: ToolChoiceSchema.optional(),

    // 流式控制
    stream: z.boolean().optional(),

    // 生成参数
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().positive().optional(),
    top_p: z.number().min(0).max(1).optional(),
    frequency_penalty: z.number().min(-2).max(2).optional(),
    presence_penalty: z.number().min(-2).max(2).optional(),

    // 深度推理配置（可覆盖模型默认配置）
    reasoning: ReasoningRequestSchema.optional(),

    // 其他参数
    stop: z.union([z.string(), z.array(z.string())]).optional(),
    n: z.number().positive().optional(),
    user: z.string().optional(),
  })
  .passthrough(); // 允许额外字段透传
