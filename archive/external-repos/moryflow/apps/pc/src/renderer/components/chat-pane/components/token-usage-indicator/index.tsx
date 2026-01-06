import { useMemo } from 'react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@moryflow/ui/components/tooltip'
import { useTranslation } from '@/lib/i18n'
import type { TokenUsage } from '@shared/ipc'

export type TokenUsageIndicatorProps = {
  /** 当前 token 使用量 */
  usage?: TokenUsage | null
  /** 模型的 context window 大小 */
  contextWindow: number
}

/** 格式化 token 数量为 K 单位 */
const formatTokens = (tokens: number): string => {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`
  }
  return String(tokens)
}

/** 进度环组件 */
const ProgressRing = ({ percentage }: { percentage: number }) => {
  const radius = 8
  const strokeWidth = 2
  const normalizedRadius = radius - strokeWidth / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <svg width={radius * 2} height={radius * 2} className="-rotate-90">
      {/* 背景圆环 */}
      <circle
        stroke="currentColor"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        className="opacity-20"
      />
      {/* 进度圆环 */}
      <circle
        stroke="currentColor"
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        style={{ strokeDashoffset }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        className="transition-all duration-300"
      />
    </svg>
  )
}

export const TokenUsageIndicator = ({ usage, contextWindow }: TokenUsageIndicatorProps) => {
  const { t } = useTranslation('chat')
  const stats = useMemo(() => {
    if (!usage || usage.totalTokens === 0) {
      return null
    }
    // 使用 prompt tokens 作为已使用上下文（因为它包含历史消息）
    const usedTokens = usage.promptTokens
    const percentage = Math.min((usedTokens / contextWindow) * 100, 100)
    return {
      usedTokens,
      percentage,
      formattedUsed: formatTokens(usedTokens),
      formattedTotal: formatTokens(contextWindow),
      percentageDisplay: percentage.toFixed(1),
    }
  }, [usage, contextWindow])

  // 没有使用量时不显示
  if (!stats) {
    return null
  }

  const label = t('usedContext', {
    percent: stats.percentageDisplay,
    used: stats.formattedUsed,
    total: stats.formattedTotal,
  })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="img"
          aria-label={label}
          className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-default"
        >
          <ProgressRing percentage={stats.percentage} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <span>{label}</span>
      </TooltipContent>
    </Tooltip>
  )
}
