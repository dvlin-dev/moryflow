/**
 * [DEFINES]: SettingsDialog form schema + types（含 system prompt/params）
 * [USED_BY]: settings-dialog components
 * [POS]: Settings form schema source of truth
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { ReactNode } from 'react';
import { z, type ZodNumber } from 'zod/v3';

export type SettingsSection =
  | 'account'
  | 'general'
  | 'system-prompt'
  | 'providers'
  | 'mcp'
  | 'cloud-sync'
  | 'about';

export const settingsSections = [
  { id: 'account', labelKey: 'account', descriptionKey: 'accountDescription' },
  { id: 'general', labelKey: 'general', descriptionKey: 'generalDescription' },
  { id: 'system-prompt', labelKey: 'systemPrompt', descriptionKey: 'systemPromptDescription' },
  { id: 'providers', labelKey: 'providers', descriptionKey: 'providersDescription' },
  { id: 'mcp', labelKey: 'mcp', descriptionKey: 'mcpDescription' },
  { id: 'cloud-sync', labelKey: 'cloudSync', descriptionKey: 'cloudSyncDescription' },
  { id: 'about', labelKey: 'about', descriptionKey: 'aboutDescription' },
] as const;

export const sectionContentLayout: Record<SettingsSection, { useScrollArea: boolean }> = {
  account: { useScrollArea: true },
  general: { useScrollArea: true },
  'system-prompt': { useScrollArea: true },
  providers: { useScrollArea: false },
  mcp: { useScrollArea: false },
  'cloud-sync': { useScrollArea: true },
  about: { useScrollArea: true },
};

/** 环境变量条目 */
export const envEntrySchema = z.object({
  key: z.string(),
  value: z.string(),
});

export const stdioEntrySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  command: z.string().min(1, 'Command is required'),
  args: z.string().optional().default(''),
  cwd: z.string().optional().default(''),
  enabled: z.boolean().default(true),
  env: z.array(envEntrySchema).optional().default([]),
  autoApprove: z.boolean().optional().default(false),
});

/** HTTP 请求头条目 */
export const headerEntrySchema = z.object({
  key: z.string(),
  value: z.string(),
});

export const httpEntrySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  url: z
    .string()
    .refine((value) => value.length === 0 || /^https?:\/\//.test(value), 'Invalid URL'),
  authorizationHeader: z.string().optional().default(''),
  enabled: z.boolean().default(true),
  headers: z.array(headerEntrySchema).optional().default([]),
  autoApprove: z.boolean().optional().default(false),
});

/** 自定义模型能力 Schema */
export const customModelCapabilitiesSchema = z.object({
  attachment: z.boolean().optional(),
  reasoning: z.boolean().optional(),
  temperature: z.boolean().optional(),
  toolCall: z.boolean().optional(),
});

export const modelThinkingOverrideSchema = z.object({
  defaultLevel: z.string().min(1).optional(),
});

/** 输入模态 Schema */
export const modelModalitySchema = z.enum(['text', 'image', 'audio', 'video', 'pdf']);

/** 用户模型配置 Schema */
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

/** 自定义服务商的 models：新用户最佳实践（不做 legacy 兼容） */
export const customProviderModelSchema = userModelConfigSchema.extend({
  isCustom: z.literal(true).default(true),
  customName: z.string().min(1, 'Model name is required'),
});

/** 预设服务商配置 Schema */
export const userProviderConfigSchema = z.object({
  providerId: z.string(),
  enabled: z.boolean().default(false),
  apiKey: z.string().optional().default(''),
  baseUrl: z.string().optional().default(''),
  models: z.array(userModelConfigSchema).optional().default([]),
  defaultModelId: z.string().nullable().optional().default(null),
});

/** 自定义服务商配置 Schema */
export const customProviderConfigSchema = z.object({
  providerId: z.string(),
  name: z.string().min(1, 'Name is required'),
  enabled: z.boolean().default(false),
  apiKey: z.string().optional().default(''),
  baseUrl: z
    .string()
    .optional()
    .refine((value) => !value || value.length === 0 || /^https?:\/\//.test(value), 'Invalid URL'),
  sdkType: z
    .enum(['openai', 'anthropic', 'google', 'xai', 'openrouter', 'openai-compatible'])
    .default('openai-compatible'),
  models: z.array(customProviderModelSchema).optional().default([]),
  defaultModelId: z.string().nullable().optional().default(null),
});

export const systemPromptSchema = z.object({
  mode: z.enum(['default', 'custom']).default('default'),
  template: z.string().default(''),
});

const modelParamEntrySchema = (valueSchema: ZodNumber) =>
  z.object({
    mode: z.enum(['default', 'custom']).default('default'),
    value: valueSchema,
  });

export const modelParamsSchema = z.object({
  temperature: modelParamEntrySchema(z.coerce.number().min(0).max(2)),
  topP: modelParamEntrySchema(z.coerce.number().min(0).max(1)),
  maxTokens: modelParamEntrySchema(z.coerce.number().int().min(1)),
});

export const formSchema = z.object({
  model: z.object({
    defaultModel: z.string().nullable().optional().default(null),
  }),
  systemPrompt: systemPromptSchema,
  modelParams: modelParamsSchema,
  mcp: z.object({
    stdio: z.array(stdioEntrySchema),
    streamableHttp: z.array(httpEntrySchema),
  }),
  providers: z.array(userProviderConfigSchema),
  customProviders: z.array(customProviderConfigSchema),
  ui: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
  }),
});

export type FormValues = z.infer<typeof formSchema>;

export type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 打开时跳转到的 section */
  initialSection?: SettingsSection;
  /** 当前 Vault 路径（用于云同步设置） */
  vaultPath?: string | null;
};

export type ServerEntriesProps<TField> = {
  title: string;
  emptyHint: string;
  onAdd: () => void;
  items: TField[];
  renderEntry: (field: TField, index: number) => ReactNode;
};

export const defaultValues: FormValues = {
  model: {
    defaultModel: null,
  },
  systemPrompt: {
    mode: 'default',
    template: '',
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
};
