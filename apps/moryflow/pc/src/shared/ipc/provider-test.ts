import type { ProviderSdkType } from './agent-settings'

export type AgentProviderTestInput = {
  /** 服务商 ID（预设或自定义） */
  providerId: string
  /** API Key */
  apiKey: string
  /** 自定义 API 地址 */
  baseUrl?: string
  /** 测试用的模型 ID */
  modelId?: string
  /** SDK 类型（仅自定义服务商需要） */
  sdkType?: ProviderSdkType
}

export type AgentProviderTestResult = {
  success: boolean
  message?: string
  error?: string
}
