/**
 * [PROVIDES]: buildReasoningProviderOptions - 根据 SDK 类型构建 reasoning providerOptions
 * [DEPENDS]: ReasoningConfig, ProviderSdkType
 * [POS]: 统一处理不同服务商的 reasoning 配置差异
 */
import type { ReasoningConfig, ProviderSdkType } from './types'

/**
 * 根据 SDK 类型构建 providerOptions
 */
export function buildReasoningProviderOptions(
  sdkType: ProviderSdkType,
  config: ReasoningConfig
): Record<string, unknown> {
  if (!config.enabled) return {}

  switch (sdkType) {
    case 'openrouter':
      return {
        openrouter: {
          reasoning: {
            effort: config.effort ?? 'medium',
            max_tokens: config.maxTokens,
            exclude: config.exclude ?? false,
          },
        },
      }

    case 'google':
      return {
        google: {
          thinkingConfig: {
            includeThoughts: config.includeThoughts ?? true,
            thinkingBudget: config.maxTokens,
          },
        },
      }

    case 'anthropic':
      return {
        anthropic: {
          thinking: {
            type: 'enabled',
            budgetTokens: config.maxTokens ?? 12000,
          },
        },
      }

    default:
      return {}
  }
}
