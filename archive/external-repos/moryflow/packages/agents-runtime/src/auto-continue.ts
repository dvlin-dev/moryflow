/**
 * 自动续写配置和工具
 *
 * 处理输出被截断的情况（finish_reason 为 length/max_tokens）
 */

/** 自动续写配置 */
export interface AutoContinueConfig {
  /** 是否启用自动续写 */
  enabled: boolean
  /** 输出截断时的最大续写次数 */
  maxTruncateContinues: number
  /** 触发截断续写的 finish_reason 列表 */
  truncateTriggerReasons: string[]
}

/** 默认配置 */
export const DEFAULT_AUTO_CONTINUE_CONFIG: AutoContinueConfig = {
  enabled: true,
  maxTruncateContinues: 3,
  truncateTriggerReasons: ['length', 'max_tokens'],
}

/** 检查是否应该因为输出截断而续写 */
export function shouldContinueForTruncation(
  finishReason: string | undefined,
  config: AutoContinueConfig = DEFAULT_AUTO_CONTINUE_CONFIG
): boolean {
  if (!config.enabled || !finishReason) {
    return false
  }
  return config.truncateTriggerReasons.includes(finishReason)
}

/** 构建截断续写提示 */
export function buildTruncateContinuePrompt(): string {
  return '请从上次中断的地方继续。不要重复之前的内容，直接继续。'
}
