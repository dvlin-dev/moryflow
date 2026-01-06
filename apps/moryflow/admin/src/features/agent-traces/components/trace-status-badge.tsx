/**
 * Trace/Span 状态徽章
 */

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Clock, AlertTriangle, Ban } from 'lucide-react'
import type { TraceStatus, SpanStatus } from '../types'

interface TraceStatusBadgeProps {
  status: TraceStatus
}

const TRACE_STATUS_CONFIG: Record<
  TraceStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  completed: {
    label: '完成',
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  failed: {
    label: '失败',
    icon: <XCircle className="h-3 w-3" />,
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  pending: {
    label: '进行中',
    icon: <Clock className="h-3 w-3" />,
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  },
  interrupted: {
    label: '中断',
    icon: <AlertTriangle className="h-3 w-3" />,
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
}

export function TraceStatusBadge({ status }: TraceStatusBadgeProps) {
  const config = TRACE_STATUS_CONFIG[status] ?? TRACE_STATUS_CONFIG.pending
  return (
    <Badge className={`gap-1 ${config.className}`}>
      {config.icon}
      {config.label}
    </Badge>
  )
}

interface SpanStatusBadgeProps {
  status: SpanStatus
}

const SPAN_STATUS_CONFIG: Record<
  SpanStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  success: {
    label: '成功',
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  failed: {
    label: '失败',
    icon: <XCircle className="h-3 w-3" />,
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  pending: {
    label: '进行中',
    icon: <Clock className="h-3 w-3" />,
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  },
  cancelled: {
    label: '已取消',
    icon: <Ban className="h-3 w-3" />,
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  },
}

export function SpanStatusBadge({ status }: SpanStatusBadgeProps) {
  const config = SPAN_STATUS_CONFIG[status] ?? SPAN_STATUS_CONFIG.pending
  return (
    <Badge className={`gap-1 ${config.className}`}>
      {config.icon}
      {config.label}
    </Badge>
  )
}

interface ErrorTypeBadgeProps {
  errorType?: string
}

const ERROR_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  TIMEOUT: {
    label: 'TIMEOUT',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  VALIDATION: {
    label: 'VALIDATION',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
  EXECUTION: {
    label: 'EXECUTION',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  NETWORK: {
    label: 'NETWORK',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  },
}

const DEFAULT_ERROR_CONFIG = {
  label: 'UNKNOWN',
  className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

export function ErrorTypeBadge({ errorType }: ErrorTypeBadgeProps) {
  if (!errorType) return null

  const normalizedType = errorType.toUpperCase()
  const config = ERROR_TYPE_CONFIG[normalizedType] ?? {
    ...DEFAULT_ERROR_CONFIG,
    label: errorType.slice(0, 20),
  }

  return <Badge className={config.className}>{config.label}</Badge>
}
