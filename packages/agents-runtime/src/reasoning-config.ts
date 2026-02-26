/**
 * [PROVIDES]: buildReasoningProviderOptions - 根据 SDK 类型构建 reasoning providerOptions
 * [DEPENDS]: ReasoningConfig, ProviderSdkType
 * [POS]: 统一处理不同服务商的 reasoning 配置差异
 */
import type {
  BuiltinThinkingLevelId,
  ReasoningConfig,
  ProviderSdkType,
  ThinkingLevelId,
  ThinkingLevelProviderPatches,
  ThinkingSelection,
} from './types'

const EFFORT_BY_LEVEL: Record<
  Exclude<BuiltinThinkingLevelId, 'off' | 'max'>,
  ReasoningConfig['effort']
> = {
  minimal: 'minimal',
  low: 'low',
  medium: 'medium',
  high: 'high',
  xhigh: 'xhigh',
}

const BUDGET_BY_LEVEL: Record<Exclude<BuiltinThinkingLevelId, 'off'>, number> = {
  minimal: 1_024,
  low: 4_096,
  medium: 8_192,
  high: 16_384,
  max: 32_768,
  xhigh: 49_152,
}

const SUPPORTED_EFFORT = new Set<NonNullable<ReasoningConfig['effort']>>([
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'none',
])

const MIN_REASONING_BUDGET = 1
const MAX_REASONING_BUDGET = 262_144

const toBudgetLevel = (
  level: ThinkingLevelId
): Exclude<BuiltinThinkingLevelId, 'off'> | undefined => {
  switch (level) {
    case 'minimal':
      return 'minimal'
    case 'low':
      return 'low'
    case 'medium':
      return 'medium'
    case 'high':
      return 'high'
    case 'max':
      return 'max'
    case 'xhigh':
      return 'xhigh'
    default:
      return undefined
  }
}

export function supportsThinkingForSdkType(sdkType: ProviderSdkType): boolean {
  return (
    sdkType === 'openai' ||
    sdkType === 'openai-compatible' ||
    sdkType === 'xai' ||
    sdkType === 'openrouter' ||
    sdkType === 'anthropic' ||
    sdkType === 'google'
  )
}

export function getDefaultThinkingLevelsForSdkType(
  sdkType: ProviderSdkType,
  supportsThinking: boolean
): ThinkingLevelId[] {
  if (!supportsThinking || !supportsThinkingForSdkType(sdkType)) {
    return ['off']
  }

  switch (sdkType) {
    case 'openai':
    case 'openai-compatible':
    case 'xai':
      return ['off', 'low', 'medium', 'high']
    case 'openrouter':
      return ['off', 'minimal', 'low', 'medium', 'high', 'xhigh']
    case 'anthropic':
      return ['off', 'low', 'medium', 'high', 'max']
    case 'google':
      return ['off', 'low', 'medium', 'high']
    default:
      return ['off']
  }
}

export function sanitizeThinkingLevels(levels: ThinkingLevelId[] | undefined): ThinkingLevelId[] {
  const normalized = Array.isArray(levels) ? levels.filter(Boolean) : []
  const deduped = Array.from(new Set(normalized))
  if (!deduped.includes('off')) {
    deduped.unshift('off')
  }
  return deduped.length > 0 ? deduped : ['off']
}

const clampReasoningBudget = (value: number | undefined): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }
  return Math.min(MAX_REASONING_BUDGET, Math.max(MIN_REASONING_BUDGET, Math.floor(value)))
}

const normalizeReasoningEffort = (
  value: unknown
): ReasoningConfig['effort'] | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const effort = value as NonNullable<ReasoningConfig['effort']>
  return SUPPORTED_EFFORT.has(effort) ? effort : undefined
}

export const clampReasoningConfigForSdkType = (
  sdkType: ProviderSdkType,
  config: ReasoningConfig | undefined
): ReasoningConfig | undefined => {
  if (!config?.enabled) {
    return undefined
  }

  switch (sdkType) {
    case 'openai':
    case 'openai-compatible':
    case 'xai':
      return {
        enabled: true,
        effort: normalizeReasoningEffort(config.effort) ?? 'medium',
      }
    case 'openrouter':
      return {
        enabled: true,
        effort: normalizeReasoningEffort(config.effort) ?? 'medium',
        maxTokens: clampReasoningBudget(config.maxTokens),
        exclude: config.exclude ?? false,
        ...(config.rawConfig ? { rawConfig: config.rawConfig } : {}),
      }
    case 'anthropic':
      return {
        enabled: true,
        maxTokens: clampReasoningBudget(config.maxTokens) ?? BUDGET_BY_LEVEL.medium,
      }
    case 'google':
      return {
        enabled: true,
        includeThoughts: config.includeThoughts ?? true,
        maxTokens: clampReasoningBudget(config.maxTokens),
      }
    default:
      return undefined
  }
}

export const mergeReasoningWithLevelPatches = (input: {
  sdkType: ProviderSdkType
  base?: ReasoningConfig
  levelPatches?: ThinkingLevelProviderPatches
}): ReasoningConfig | undefined => {
  const { sdkType, base, levelPatches } = input
  if (!base?.enabled || !levelPatches) {
    return clampReasoningConfigForSdkType(sdkType, base)
  }

  switch (sdkType) {
    case 'openai':
    case 'openai-compatible':
    case 'xai': {
      const patch = levelPatches[sdkType]
      return clampReasoningConfigForSdkType(sdkType, {
        ...base,
        effort: patch?.reasoningEffort ?? base.effort,
      })
    }
    case 'openrouter': {
      const patch = levelPatches.openrouter
      return clampReasoningConfigForSdkType(sdkType, {
        ...base,
        effort: patch?.effort ?? base.effort,
        maxTokens:
          typeof patch?.maxTokens === 'number' ? patch.maxTokens : base.maxTokens,
        exclude: patch?.exclude ?? base.exclude,
        rawConfig: patch?.rawConfig ?? base.rawConfig,
      })
    }
    case 'anthropic': {
      const patch = levelPatches.anthropic
      return clampReasoningConfigForSdkType(sdkType, {
        ...base,
        maxTokens:
          typeof patch?.budgetTokens === 'number'
            ? patch.budgetTokens
            : base.maxTokens,
      })
    }
    case 'google': {
      const patch = levelPatches.google
      return clampReasoningConfigForSdkType(sdkType, {
        ...base,
        maxTokens:
          typeof patch?.thinkingBudget === 'number'
            ? patch.thinkingBudget
            : base.maxTokens,
        includeThoughts: patch?.includeThoughts ?? base.includeThoughts,
      })
    }
    default:
      return clampReasoningConfigForSdkType(sdkType, base)
  }
}

export function resolveReasoningConfigFromThinkingSelection(
  sdkType: ProviderSdkType,
  selection?: ThinkingSelection
): ReasoningConfig | undefined {
  if (!selection || selection.mode === 'off') {
    return undefined
  }
  if (!supportsThinkingForSdkType(sdkType)) {
    return undefined
  }

  const level = toBudgetLevel(selection.level)
  if (!level) {
    return undefined
  }
  const effort =
    level === 'max' ? 'xhigh' : EFFORT_BY_LEVEL[level as keyof typeof EFFORT_BY_LEVEL]
  const budget = BUDGET_BY_LEVEL[level]

  const mapped = (() => {
    switch (sdkType) {
      case 'openai':
      case 'openai-compatible':
      case 'xai':
        return {
          enabled: true,
          effort: effort ?? 'medium',
        } satisfies ReasoningConfig
      case 'openrouter':
        return {
          enabled: true,
          effort: effort ?? 'medium',
          maxTokens: budget,
          exclude: false,
        } satisfies ReasoningConfig
      case 'anthropic':
        return {
          enabled: true,
          maxTokens: budget,
        } satisfies ReasoningConfig
      case 'google':
        return {
          enabled: true,
          includeThoughts: true,
          maxTokens: budget,
        } satisfies ReasoningConfig
      default:
        return undefined
    }
  })()

  return clampReasoningConfigForSdkType(sdkType, mapped)
}

/**
 * 根据 SDK 类型构建 providerOptions
 */
export function buildReasoningProviderOptions(
  sdkType: ProviderSdkType,
  config: ReasoningConfig
): Record<string, unknown> {
  if (!config.enabled) return {}

  switch (sdkType) {
    case 'openai':
    case 'openai-compatible':
    case 'xai':
      return {
        openai: {
          reasoningEffort: config.effort ?? 'medium',
        },
      }

    case 'openrouter':
      return {
        openrouter: {
          ...(config.rawConfig
            ? config.rawConfig
            : {
                reasoning: {
                  effort: config.effort ?? 'medium',
                  max_tokens: config.maxTokens,
                  exclude: config.exclude ?? false,
                },
              }),
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
