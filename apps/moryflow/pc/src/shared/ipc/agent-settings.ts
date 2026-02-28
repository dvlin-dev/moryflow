import type { ProviderSdkType as ModelBankProviderSdkType } from '@moryflow/model-bank/registry';

export type ProviderSdkType = ModelBankProviderSdkType;

export type ModelModality = 'text' | 'image' | 'audio' | 'video' | 'pdf';

export type UserModelConfig = {
  id: string;
  enabled: boolean;
  isCustom?: boolean;
  customName?: string;
  customContext?: number;
  customOutput?: number;
  customCapabilities?: {
    attachment?: boolean;
    reasoning?: boolean;
    temperature?: boolean;
    toolCall?: boolean;
  };
  customInputModalities?: ModelModality[];
  thinking?: {
    defaultLevel?: string;
  };
};

export type UserProviderConfig = {
  providerId: string;
  enabled: boolean;
  apiKey: string | null;
  baseUrl: string | null;
  models: UserModelConfig[];
  defaultModelId: string | null;
};

export type CustomProviderConfig = {
  providerId: string;
  name: string;
  enabled: boolean;
  apiKey: string | null;
  baseUrl: string | null;
  models: UserModelConfig[];
  defaultModelId: string | null;
};

export type ProviderConfig = UserProviderConfig | CustomProviderConfig;

// MCP 设置类型
export type MCPStdioServerSetting = {
  id: string;
  enabled: boolean;
  name: string;
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  autoApprove?: boolean;
};

export type MCPStreamableHttpServerSetting = {
  id: string;
  enabled: boolean;
  name: string;
  url: string;
  authorizationHeader?: string;
  headers?: Record<string, string>;
  autoApprove?: boolean;
};

export type MCPSettings = {
  stdio: MCPStdioServerSetting[];
  streamableHttp: MCPStreamableHttpServerSetting[];
};

// 全局模型设置（兜底配置）
export type AgentModelSettings = {
  /** 全局默认模型 ID（格式: providerId/modelId） */
  defaultModel: string | null;
};

// System prompt 模式
export type AgentSystemPromptMode = 'default' | 'custom';

// System prompt 设置
export type AgentSystemPromptSettings = {
  mode: AgentSystemPromptMode;
  template: string;
};

// 模型参数模式
export type AgentModelParamMode = 'default' | 'custom';

// 单个参数设置
export type AgentModelParamSetting = {
  mode: AgentModelParamMode;
  value: number;
};

// 模型参数（常用集）
export type AgentModelParams = {
  temperature: AgentModelParamSetting;
  topP: AgentModelParamSetting;
  maxTokens: AgentModelParamSetting;
};

// UI 设置
export type AgentUISettings = {
  theme: 'light' | 'dark' | 'system';
};

/**
 * Agent 设置
 * 采用预设服务商 + 预设模型的模式
 */
export type AgentSettings = {
  /** 全局模型设置 */
  model: AgentModelSettings;
  /** System prompt 设置 */
  systemPrompt: AgentSystemPromptSettings;
  /** 模型参数设置 */
  modelParams: AgentModelParams;
  /** MCP 服务器配置 */
  mcp: MCPSettings;
  /** 预设服务商配置（仅存储用户修改的部分） */
  providers: UserProviderConfig[];
  /** 自定义服务商配置 */
  customProviders: CustomProviderConfig[];
  /** UI 设置 */
  ui: AgentUISettings;
};

/**
 * Agent 设置更新（部分更新）
 */
export type AgentSettingsUpdate = {
  model?: Partial<AgentModelSettings>;
  systemPrompt?: Partial<AgentSystemPromptSettings>;
  modelParams?: Partial<AgentModelParams>;
  mcp?: Partial<MCPSettings>;
  providers?: UserProviderConfig[];
  customProviders?: CustomProviderConfig[];
  ui?: Partial<AgentUISettings>;
};
