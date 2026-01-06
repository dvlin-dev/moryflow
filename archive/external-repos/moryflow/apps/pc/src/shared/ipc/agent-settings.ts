import type {
  UserProviderConfig,
  CustomProviderConfig,
  ProviderConfig,
  ProviderSdkType,
  UserModelConfig,
} from '../model-registry/index.js'

// MCP 设置类型
export type MCPStdioServerSetting = {
  id: string
  enabled: boolean
  name: string
  command: string
  args: string[]
  cwd?: string
  env?: Record<string, string>
  autoApprove?: boolean
}

export type MCPStreamableHttpServerSetting = {
  id: string
  enabled: boolean
  name: string
  url: string
  authorizationHeader?: string
  headers?: Record<string, string>
  autoApprove?: boolean
}

export type MCPSettings = {
  stdio: MCPStdioServerSetting[]
  streamableHttp: MCPStreamableHttpServerSetting[]
}

// 全局模型设置（兜底配置）
export type AgentModelSettings = {
  /** 全局默认模型 ID（格式: providerId/modelId） */
  defaultModel: string | null
}

// UI 设置
export type AgentUISettings = {
  theme: 'light' | 'dark' | 'system'
}

/**
 * Agent 设置
 * 采用预设服务商 + 预设模型的模式
 */
export type AgentSettings = {
  /** 全局模型设置 */
  model: AgentModelSettings
  /** MCP 服务器配置 */
  mcp: MCPSettings
  /** 预设服务商配置（仅存储用户修改的部分） */
  providers: UserProviderConfig[]
  /** 自定义服务商配置 */
  customProviders: CustomProviderConfig[]
  /** UI 设置 */
  ui: AgentUISettings
}

/**
 * Agent 设置更新（部分更新）
 */
export type AgentSettingsUpdate = {
  model?: Partial<AgentModelSettings>
  mcp?: Partial<MCPSettings>
  providers?: UserProviderConfig[]
  customProviders?: CustomProviderConfig[]
  ui?: Partial<AgentUISettings>
}

// 重新导出模型注册表类型
export type {
  UserProviderConfig,
  CustomProviderConfig,
  ProviderConfig,
  ProviderSdkType,
  UserModelConfig,
}
