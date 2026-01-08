/**
 * AI 提供商相关的 Zod 验证模式
 */
import { z } from 'zod'

// Provider SDK 类型枚举
export const providerSdkTypeEnum = z.enum([
  'openai',
  'anthropic',
  'google',
  'openrouter',
  'openai-compatible',
])

// 创建提供商表单验证
export const createProviderSchema = z.object({
  providerType: z.string().min(1, '请选择提供商类型'),
  name: z.string().min(1, '请输入提供商名称'),
  apiKey: z.string().min(1, '请输入 API Key'),
  baseUrl: z.string().url('请输入有效的 API 端点').optional().or(z.literal('')),
  enabled: z.boolean(),
  sortOrder: z.number().min(0),
})

// 更新提供商表单验证
export const updateProviderSchema = z.object({
  providerType: z.string().min(1, '请选择提供商类型').optional(),
  name: z.string().min(1, '请输入提供商名称').optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().url('请输入有效的 API 端点').optional().or(z.literal('')).nullable(),
  enabled: z.boolean().optional(),
  sortOrder: z.coerce.number().min(0).optional(),
})

export type CreateProviderFormData = z.infer<typeof createProviderSchema>
export type UpdateProviderFormData = z.infer<typeof updateProviderSchema>
