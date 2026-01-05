/**
 * Model 工具函数
 */
import type { ModelCapabilities, ReasoningConfig } from '../../types/api'

/** 解析 capabilities JSON（支持字符串和对象输入） */
export function parseCapabilities(
  json: string | Record<string, unknown>
): ModelCapabilities {
  try {
    const data = typeof json === 'string' ? JSON.parse(json) : json
    return {
      vision: data.vision === true,
      tools: data.tools === true,
      json: data.json === true,
      maxContextTokens:
        typeof data.maxContextTokens === 'number' ? data.maxContextTokens : 0,
      maxOutputTokens:
        typeof data.maxOutputTokens === 'number' ? data.maxOutputTokens : 0,
      reasoning: parseReasoningConfig(data.reasoning),
    }
  } catch {
    return {
      vision: false,
      tools: false,
      json: false,
      maxContextTokens: 0,
      maxOutputTokens: 0,
    }
  }
}

/** 解析 reasoning 配置 */
function parseReasoningConfig(
  data: unknown
): ReasoningConfig | undefined {
  if (!data || typeof data !== 'object') {
    return undefined
  }
  const config = data as Record<string, unknown>
  if (!config.enabled && !config.rawConfig) {
    return undefined
  }
  return {
    enabled: config.enabled === true,
    effort: isValidEffort(config.effort) ? config.effort : 'medium',
    maxTokens:
      typeof config.maxTokens === 'number' ? config.maxTokens : undefined,
    exclude: config.exclude === true,
    rawConfig:
      config.rawConfig && typeof config.rawConfig === 'object'
        ? (config.rawConfig as Record<string, unknown>)
        : undefined,
  }
}

/** 验证思考强度 */
function isValidEffort(
  value: unknown
): value is 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none' {
  return (
    typeof value === 'string' &&
    ['xhigh', 'high', 'medium', 'low', 'minimal', 'none'].includes(value)
  )
}
