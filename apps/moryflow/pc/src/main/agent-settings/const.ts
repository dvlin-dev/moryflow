import { z } from 'zod';
import type { AgentSettings } from '../../shared/ipc.js';

// MCP 服务器配置 Schema
export const stdioSchema = z.object({
  id: z.string(),
  enabled: z.boolean().default(true),
  name: z.string().default('Stdio MCP'),
  autoUpdate: z.literal('startup-latest').default('startup-latest'),
  packageName: z.string().min(1),
  binName: z.string().min(1).optional(),
  args: z.array(z.string()).default([]),
  env: z.record(z.string(), z.string()).optional(),
});

export const streamableHttpSchema = z.object({
  id: z.string(),
  enabled: z.boolean().default(true),
  name: z.string().default('HTTP MCP'),
  url: z.string(),
  authorizationHeader: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

export const mcpSchema = z.object({
  stdio: z.array(stdioSchema).default([]),
  streamableHttp: z.array(streamableHttpSchema).default([]),
});

// 全局模型设置 Schema
export const modelSchema = z.object({
  defaultModel: z.string().nullable().default(null),
});

export const personalizationSchema = z.object({
  customInstructions: z.string().default(''),
});

// UI 设置 Schema
export const uiSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
});

// 自定义模型能力 Schema
export const customModelCapabilitiesSchema = z.object({
  attachment: z.boolean().optional(),
  reasoning: z.boolean().optional(),
  temperature: z.boolean().optional(),
  toolCall: z.boolean().optional(),
});

export const modelThinkingOverrideSchema = z.object({
  defaultLevel: z.string().min(1).optional(),
});

// 输入模态 Schema
export const modelModalitySchema = z.enum(['text', 'image', 'audio', 'video', 'pdf']);

// 用户模型配置 Schema
export const userModelConfigSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean().default(true),
  isCustom: z.boolean().optional(),
  customName: z.string().optional(),
  customContext: z.number().optional(),
  customOutput: z.number().optional(),
  customCapabilities: customModelCapabilitiesSchema.optional(),
  customInputModalities: z.array(modelModalitySchema).optional(),
  thinking: modelThinkingOverrideSchema.optional(),
});

const customProviderModelSchema = userModelConfigSchema.extend({
  // 自定义服务商的 models 都是用户添加的自定义模型（新用户最佳实践：不做 legacy 兼容）
  isCustom: z.literal(true).default(true),
  customName: z.string().min(1),
});

// 预设服务商用户配置 Schema
export const userProviderConfigSchema = z.object({
  providerId: z.string(),
  enabled: z.boolean().default(false),
  apiKey: z.string().nullable().default(null),
  baseUrl: z.string().nullable().default(null),
  models: z.array(userModelConfigSchema).default([]),
  defaultModelId: z.string().nullable().default(null),
});

// 自定义服务商配置 Schema
export const customProviderConfigSchema = z.object({
  providerId: z
    .string()
    .min(1)
    .regex(/^[^/]+$/, 'Custom provider ID cannot contain "/"'),
  name: z.string().min(1),
  enabled: z.boolean().default(false),
  apiKey: z.string().nullable().default(null),
  baseUrl: z.string().nullable().default(null),
  models: z.array(customProviderModelSchema).default([]),
  defaultModelId: z.string().nullable().default(null),
});

// Agent 设置 Schema
export const agentSettingsSchema = z.object({
  model: modelSchema,
  personalization: personalizationSchema,
  mcp: mcpSchema,
  providers: z.array(userProviderConfigSchema).default([]),
  customProviders: z.array(customProviderConfigSchema).default([]),
  ui: uiSchema,
});

/**
 * 创建默认 Agent 设置
 */
export const createDefaultAgentSettings = (): AgentSettings =>
  agentSettingsSchema.parse({
    model: {
      defaultModel: null,
    },
    personalization: {
      customInstructions: '',
    },
    mcp: {
      stdio: [],
      streamableHttp: [],
    },
    providers: [],
    customProviders: [],
    ui: {
      theme: 'system',
    },
  }) as AgentSettings;

export const defaultAgentSettings = createDefaultAgentSettings();
