/**
 * AI 模型相关的 Zod 验证模式
 */
import { z } from 'zod'
import { tierEnum } from './user'

// 模型能力验证
export const modelCapabilitiesSchema = z.object({
  vision: z.boolean(),
  tools: z.boolean(),
  json: z.boolean(),
})

// 思考强度枚举
export const reasoningEffortEnum = z.enum([
  'xhigh',
  'high',
  'medium',
  'low',
  'minimal',
  'none',
])

// 深度推理配置验证
export const reasoningConfigSchema = z.object({
  enabled: z.boolean(),
  effort: reasoningEffortEnum.optional(),
  maxTokens: z.number().positive().optional(),
  exclude: z.boolean().optional(),
  rawConfig: z.record(z.string(), z.unknown()).optional(),
})

// 创建模型表单验证
export const createModelSchema = z.object({
  providerId: z.string().min(1, '请选择提供商'),
  modelId: z.string().min(1, '请输入模型 ID'),
  upstreamId: z.string().min(1, '请输入上游模型 ID'),
  displayName: z.string().min(1, '请输入显示名称'),
  enabled: z.boolean(),
  inputTokenPrice: z.number().min(0, '价格不能为负数'),
  outputTokenPrice: z.number().min(0, '价格不能为负数'),
  minTier: tierEnum,
  maxContextTokens: z.number().min(1, '上下文长度至少为 1'),
  maxOutputTokens: z.number().min(1, '输出长度至少为 1'),
  capabilities: modelCapabilitiesSchema,
  reasoning: reasoningConfigSchema.optional(),
  sortOrder: z.number().min(0),
})

// 更新模型表单验证
export const updateModelSchema = z.object({
  modelId: z.string().min(1, '请输入模型 ID').optional(),
  upstreamId: z.string().min(1, '请输入上游模型 ID').optional(),
  displayName: z.string().min(1, '请输入显示名称').optional(),
  enabled: z.boolean().optional(),
  inputTokenPrice: z.coerce.number().min(0, '价格不能为负数').optional(),
  outputTokenPrice: z.coerce.number().min(0, '价格不能为负数').optional(),
  minTier: tierEnum.optional(),
  maxContextTokens: z.coerce.number().min(1, '上下文长度至少为 1').optional(),
  maxOutputTokens: z.coerce.number().min(1, '输出长度至少为 1').optional(),
  capabilities: modelCapabilitiesSchema.optional(),
  reasoning: reasoningConfigSchema.optional(),
  sortOrder: z.coerce.number().min(0).optional(),
})

export type CreateModelFormData = z.infer<typeof createModelSchema>
export type UpdateModelFormData = z.infer<typeof updateModelSchema>
export type ReasoningConfigFormData = z.infer<typeof reasoningConfigSchema>
