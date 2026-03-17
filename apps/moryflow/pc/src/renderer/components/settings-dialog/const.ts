/**
 * [DEFINES]: SettingsDialog form schema + types（含 personalization）
 * [USED_BY]: settings-dialog components
 * [POS]: Settings form schema source of truth
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { ReactNode } from 'react';
import { z } from 'zod/v3';

export type SettingsSection =
  | 'account'
  | 'general'
  | 'personalization'
  | 'providers'
  | 'mcp'
  | 'cloud-sync'
  | 'about';

export const settingsSections = [
  { id: 'account', labelKey: 'account', descriptionKey: 'accountDescription' },
  { id: 'general', labelKey: 'general', descriptionKey: 'generalDescription' },
  {
    id: 'personalization',
    labelKey: 'personalization',
    descriptionKey: 'personalizationDescription',
  },
  { id: 'providers', labelKey: 'providers', descriptionKey: 'providersDescription' },
  { id: 'mcp', labelKey: 'mcp', descriptionKey: 'mcpDescription' },
  { id: 'cloud-sync', labelKey: 'cloudSync', descriptionKey: 'cloudSyncDescription' },
  { id: 'about', labelKey: 'about', descriptionKey: 'aboutDescription' },
] as const;

export const sectionContentLayout: Record<SettingsSection, { useScrollArea: boolean }> = {
  account: { useScrollArea: true },
  general: { useScrollArea: true },
  personalization: { useScrollArea: true },
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
  autoUpdate: z.literal('startup-latest').default('startup-latest'),
  packageName: z.string().min(1, 'Package is required'),
  binName: z.string().optional().default(''),
  args: z.string().optional().default(''),
  enabled: z.boolean().default(true),
  env: z.array(envEntrySchema).optional().default([]),
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
  models: z.array(customProviderModelSchema).optional().default([]),
  defaultModelId: z.string().nullable().optional().default(null),
});

export const personalizationSchema = z.object({
  customInstructions: z.string().default(''),
});

export const formSchema = z.object({
  model: z.object({
    defaultModel: z.string().nullable().optional().default(null),
  }),
  personalization: personalizationSchema,
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
    theme: 'dark',
  },
};
