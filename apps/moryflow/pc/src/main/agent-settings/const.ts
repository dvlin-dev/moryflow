import { z, type ZodNumber } from 'zod';
import { getMorySystemPrompt } from '@anyhunt/agents-runtime/prompt';
import type { AgentSettings } from '../../shared/ipc.js';

// MCP 服务器配置 Schema
export const stdioSchema = z.object({
  id: z.string(),
  enabled: z.boolean().default(true),
  name: z.string().default('Stdio MCP'),
  command: z.string(),
  args: z.array(z.string()).default([]),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  autoApprove: z.boolean().optional(),
});

export const streamableHttpSchema = z.object({
  id: z.string(),
  enabled: z.boolean().default(true),
  name: z.string().default('HTTP MCP'),
  url: z.string(),
  authorizationHeader: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  autoApprove: z.boolean().optional(),
});

export const mcpSchema = z.object({
  stdio: z.array(stdioSchema).default([]),
  streamableHttp: z.array(streamableHttpSchema).default([]),
});

// 全局模型设置 Schema
export const modelSchema = z.object({
  defaultModel: z.string().nullable().default(null),
});

// System prompt Schema
export const systemPromptSchema = z.object({
  mode: z.enum(['default', 'custom']).default('default'),
  template: z.string().min(1),
});

const modelParamEntrySchema = (valueSchema: ZodNumber) =>
  z.object({
    mode: z.enum(['default', 'custom']).default('default'),
    value: valueSchema,
  });

// 常用模型参数 Schema
export const modelParamsSchema = z.object({
  temperature: modelParamEntrySchema(z.number().min(0).max(2)),
  topP: modelParamEntrySchema(z.number().min(0).max(1)),
  maxTokens: modelParamEntrySchema(z.number().int().min(1)),
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

// 输入模态 Schema
export const modelModalitySchema = z.enum(['text', 'image', 'audio', 'video', 'pdf']);

// 用户模型配置 Schema
export const userModelConfigSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  isCustom: z.boolean().optional(),
  customName: z.string().optional(),
  customContext: z.number().optional(),
  customOutput: z.number().optional(),
  customCapabilities: customModelCapabilitiesSchema.optional(),
  customInputModalities: z.array(modelModalitySchema).optional(),
});

/**
 * CustomProviderConfig 的模型条目兼容层：
 * - 新结构：UserModelConfig（id/enabled/customName/...）
 * - 旧结构：{ id, name, enabled }（将 name 迁移到 customName）
 *
 * 注意：这是用户设置数据，必须兼容历史持久化结构。
 */
const customProviderModelSchema = z.preprocess((input) => {
  if (!input || typeof input !== 'object') {
    return input;
  }
  const raw = input as Record<string, unknown> & { name?: unknown; customName?: unknown };

  const enabled = typeof raw.enabled === 'boolean' ? raw.enabled : true;
  const customName =
    typeof raw.customName === 'string'
      ? raw.customName
      : typeof raw.name === 'string'
        ? raw.name
        : undefined;
  const isCustom = typeof raw.isCustom === 'boolean' ? raw.isCustom : true;

  return {
    ...raw,
    enabled,
    isCustom,
    customName,
  };
}, userModelConfigSchema);

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
  providerId: z.string().startsWith('custom-'),
  name: z.string().min(1),
  enabled: z.boolean().default(false),
  apiKey: z.string().nullable().default(null),
  baseUrl: z.string().nullable().default(null),
  sdkType: z
    .enum(['openai', 'anthropic', 'google', 'xai', 'openrouter', 'openai-compatible'])
    .default('openai-compatible'),
  models: z.array(customProviderModelSchema).default([]),
  defaultModelId: z.string().nullable().default(null),
});

// Agent 设置 Schema
export const agentSettingsSchema = z.object({
  model: modelSchema,
  systemPrompt: systemPromptSchema,
  modelParams: modelParamsSchema,
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
    systemPrompt: {
      mode: 'default',
      template: getMorySystemPrompt(),
    },
    modelParams: {
      temperature: { mode: 'default', value: 0.7 },
      topP: { mode: 'default', value: 1 },
      maxTokens: { mode: 'default', value: 4096 },
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
