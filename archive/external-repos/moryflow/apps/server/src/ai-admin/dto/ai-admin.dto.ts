/**
 * AI Admin DTOs
 * Provider 和 Model 管理的请求/响应数据结构
 *
 * [DEFINES]: AI provider and model CRUD schemas
 * [USED_BY]: AiAdminController, AiAdminService
 */

import { z } from 'zod';

// ==================== Provider DTOs ====================

export const CreateProviderSchema = z.object({
  providerType: z.string().min(1, 'providerType is required'),
  name: z.string().min(1, 'name is required'),
  apiKey: z.string().min(1, 'apiKey is required'),
  baseUrl: z.string().optional(),
  enabled: z.boolean().optional().default(true),
  sortOrder: z.number().optional().default(0),
});

export type CreateProviderDto = z.infer<typeof CreateProviderSchema>;

export const UpdateProviderSchema = z.object({
  providerType: z.string().optional(),
  name: z.string().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export type UpdateProviderDto = z.infer<typeof UpdateProviderSchema>;

// ==================== Model DTOs ====================

/** Reasoning 配置 Schema */
export const ReasoningConfigSchema = z.object({
  /** 是否启用深度推理模式 */
  enabled: z.boolean().default(false),
  /** 思考强度（xhigh/high/medium/low/minimal/none） */
  effort: z
    .enum(['xhigh', 'high', 'medium', 'low', 'minimal', 'none'])
    .optional()
    .default('medium'),
  /** 思考 token 预算（可选） */
  maxTokens: z.number().positive().optional(),
  /** 是否在响应中排除思考内容 */
  exclude: z.boolean().optional().default(false),
  /** 原生配置覆盖（高级选项，直接透传给 API，会覆盖上方的通用配置） */
  rawConfig: z.record(z.string(), z.unknown()).optional(),
});

export type ReasoningConfig = z.infer<typeof ReasoningConfigSchema>;

export const CreateModelSchema = z.object({
  providerId: z.string().min(1, 'providerId is required'),
  modelId: z.string().min(1, 'modelId is required'),
  upstreamId: z.string().min(1, 'upstreamId is required'),
  displayName: z.string().min(1, 'displayName is required'),
  enabled: z.boolean().optional().default(true),
  inputTokenPrice: z.number().min(0, 'Price must be non-negative'),
  outputTokenPrice: z.number().min(0, 'Price must be non-negative'),
  minTier: z.enum(['free', 'starter', 'basic', 'pro', 'license']),
  maxContextTokens: z.number().positive('maxContextTokens must be positive'),
  maxOutputTokens: z.number().positive('maxOutputTokens must be positive'),
  capabilities: z
    .object({
      vision: z.boolean().optional().default(false),
      tools: z.boolean().optional().default(false),
      json: z.boolean().optional().default(false),
    })
    .optional(),
  /** 深度推理配置（启用后模型具备 thinking 能力） */
  reasoning: ReasoningConfigSchema.optional(),
  sortOrder: z.number().optional().default(0),
});

export type CreateModelDto = z.infer<typeof CreateModelSchema>;

export const UpdateModelSchema = z.object({
  modelId: z.string().optional(),
  upstreamId: z.string().optional(),
  displayName: z.string().optional(),
  enabled: z.boolean().optional(),
  inputTokenPrice: z.number().min(0).optional(),
  outputTokenPrice: z.number().min(0).optional(),
  minTier: z.enum(['free', 'starter', 'basic', 'pro', 'license']).optional(),
  maxContextTokens: z.number().positive().optional(),
  maxOutputTokens: z.number().positive().optional(),
  capabilities: z
    .object({
      vision: z.boolean().optional(),
      tools: z.boolean().optional(),
      json: z.boolean().optional(),
    })
    .optional(),
  /** 深度推理配置（启用后模型具备 thinking 能力） */
  reasoning: ReasoningConfigSchema.optional(),
  sortOrder: z.number().optional(),
});

export type UpdateModelDto = z.infer<typeof UpdateModelSchema>;
