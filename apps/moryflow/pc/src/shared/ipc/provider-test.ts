export type AgentProviderTestInput = {
  /** 服务商 ID（预设或自定义） */
  providerId: string;
  /** 服务商类型（显式契约，避免字符串前缀推断） */
  providerType: 'preset' | 'custom';
  /** API Key */
  apiKey: string;
  /** 自定义 API 地址 */
  baseUrl?: string;
  /** 测试用的模型 ID */
  modelId?: string;
};

export type AgentProviderTestResult = {
  success: boolean;
  message?: string;
  error?: string;
};
