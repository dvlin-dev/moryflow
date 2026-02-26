/**
 * Token 使用量指示器
 * 显示当前对话使用的 token 占模型最大 token 的比例
 */
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

interface TokenUsageIndicatorProps {
  usedTokens?: number
  maxTokens?: number
  className?: string
}

function resolveUsageColorClass(percentage: number): string {
  if (percentage >= 90) {
    return 'text-destructive'
  }
  if (percentage >= 70) {
    return 'text-yellow-500'
  }
  return 'text-muted-foreground'
}

export function TokenUsageIndicator({
  usedTokens = 0,
  maxTokens = 0,
  className,
}: TokenUsageIndicatorProps) {
  // 计算百分比
  const percentage = maxTokens > 0 ? Math.min((usedTokens / maxTokens) * 100, 100) : 0
  
  // 圆环参数
  const size = 20
  const strokeWidth = 2
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  
  // 格式化 token 数量
  const formatTokens = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
    return n.toString()
  }

  // 不显示如果没有最大值
  if (maxTokens === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center cursor-default', className)}>
            <svg
              width={size}
              height={size}
              className="rotate-[-90deg]"
            >
              {/* 背景圆环 */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted-foreground/20"
              />
              {/* 进度圆环 */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={cn(
                  'transition-all duration-300',
                  resolveUsageColorClass(percentage)
                )}
              />
            </svg>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {formatTokens(usedTokens)} / {formatTokens(maxTokens)} ({percentage.toFixed(1)}%)
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
