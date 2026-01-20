/**
 * [DEFINES]: LLM Provider/Model/Settings DTO schemas (Admin) + runtime model selector input
 * [USED_BY]: llm-admin.controller.ts, llm-admin.service.ts, llm-routing.service.ts
 * [POS]: 作为 Anyhunt Server 动态 LLM 配置的唯一入参校验来源（Zod v4）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { z } from 'zod';

export const LlmProviderTypeSchema = z.enum([
  'openai',
  'openai_compatible',
  'openrouter',
]);
export type LlmProviderType = z.infer<typeof LlmProviderTypeSchema>;

export const LlmModelIdSchema = z.string().trim().min(1).max(200);

export const CreateLlmProviderSchema = z.object({
  providerType: LlmProviderTypeSchema,
  name: z.string().trim().min(1).max(100),
  apiKey: z.string().trim().min(1).max(5000),
  baseUrl: z.string().trim().url().optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});
export type CreateLlmProviderDto = z.infer<typeof CreateLlmProviderSchema>;

export const UpdateLlmProviderSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  apiKey: z.string().trim().min(1).max(5000).optional(),
  baseUrl: z.string().trim().url().optional().nullable(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});
export type UpdateLlmProviderDto = z.infer<typeof UpdateLlmProviderSchema>;

export const CreateLlmModelSchema = z.object({
  providerId: z.string().trim().min(1).max(50),
  modelId: LlmModelIdSchema,
  upstreamId: z.string().trim().min(1).max(200),
  enabled: z.boolean().optional(),
});
export type CreateLlmModelDto = z.infer<typeof CreateLlmModelSchema>;

export const UpdateLlmModelSchema = z.object({
  modelId: LlmModelIdSchema.optional(),
  upstreamId: z.string().trim().min(1).max(200).optional(),
  enabled: z.boolean().optional(),
});
export type UpdateLlmModelDto = z.infer<typeof UpdateLlmModelSchema>;

export const UpdateLlmSettingsSchema = z.object({
  defaultAgentModelId: LlmModelIdSchema,
  defaultExtractModelId: LlmModelIdSchema,
});
export type UpdateLlmSettingsDto = z.infer<typeof UpdateLlmSettingsSchema>;
